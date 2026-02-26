import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Try profiles table first, fall back to user_metadata if RLS blocks the query
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = profile?.role ?? (user.user_metadata?.role as string | undefined)

  if (role === 'superuser') {
    redirect('/dashboard/superuser')
  } else if (role === 'coach') {
    redirect('/dashboard/coach')
  } else if (role === 'teamlid') {
    redirect('/dashboard/teamlid')
  } else {
    redirect('/auth/login')
  }
}
