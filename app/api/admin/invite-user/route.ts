import { createServerClient } from '@supabase/ssr'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { InviteEmail } from '@/components/emails/invite-email'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: Request) {
  // Auth check via session client
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch {}
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: inviter } = await supabase
    .from('profiles')
    .select('role, full_name, team_id')
    .eq('id', user.id)
    .single()

  if (!inviter || !['coach', 'superuser'].includes(inviter.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { email, full_name, role, team_id } = await req.json()

  if (!email || !full_name || !role) {
    return NextResponse.json({ error: 'email, full_name en role zijn verplicht' }, { status: 400 })
  }

  // Coach can only invite teamleden to their own team
  if (inviter.role === 'coach') {
    if (role !== 'teamlid') return NextResponse.json({ error: 'Coaches kunnen alleen teamleden uitnodigen' }, { status: 403 })
    if (team_id && team_id !== inviter.team_id) return NextResponse.json({ error: 'Geen toegang tot dit team' }, { status: 403 })
  }

  const effectiveTeamId = team_id ?? inviter.team_id ?? null
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  // Use service role to invite (bypasses RLS)
  const adminSupabase = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: inviteData, error: inviteError } = await adminSupabase.auth.admin.inviteUserByEmail(
    email,
    {
      redirectTo: `${appUrl}/auth/set-password`,
      data: {
        full_name,
        role,
        team_id: effectiveTeamId,
        invited_by: user.id,
      },
    }
  )

  if (inviteError) {
    console.error('[v0] Invite error:', inviteError.message)
    return NextResponse.json({ error: inviteError.message }, { status: 400 })
  }

  // Update profile with invite metadata (trigger creates the row, we update it)
  if (inviteData.user) {
    await adminSupabase
      .from('profiles')
      .upsert({
        id: inviteData.user.id,
        full_name,
        email,
        role,
        team_id: effectiveTeamId,
        invited_by: user.id,
        invited_at: new Date().toISOString(),
        onboarded: false,
      }, { onConflict: 'id' })

    // If teamlid, add to team_members
    if (role === 'teamlid' && effectiveTeamId) {
      await adminSupabase
        .from('team_members')
        .upsert({ team_id: effectiveTeamId, user_id: inviteData.user.id }, { onConflict: 'team_id,user_id' })
    }
  }

  // Send branded email via Resend
  const { error: mailError } = await resend.emails.send({
    from: 'Performance Profile <no-reply@performanceprofiel.nl>',
    to: email,
    subject: `Je bent uitgenodigd voor Performance Profile`,
    react: InviteEmail({
      inviteeName: full_name,
      inviterName: inviter.full_name ?? 'Je coach',
      role,
      // Supabase invite link comes via the redirectTo flow, we use a magic link fallback
      loginUrl: `${appUrl}/auth/login`,
    }),
  })

  if (mailError) {
    console.error('[v0] Resend error:', mailError)
    // Don't fail the whole request — user is created, mail is nice-to-have
  }

  return NextResponse.json({ success: true, userId: inviteData.user?.id })
}
