import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { OutcomeGoalsWorkshop } from '@/components/goals/outcome-goals-workshop'
import Link from 'next/link'

export default async function OutcomeGoalsPage({
  searchParams,
}: {
  searchParams: Promise<{ team?: string }>
}) {
  const { team: teamId } = await searchParams
  if (!teamId) redirect('/dashboard/coach/doelstellingen')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: team } = await supabase
    .from('teams')
    .select('id, name')
    .eq('id', teamId)
    .eq('coach_id', user.id)
    .single()

  if (!team) redirect('/dashboard/coach/doelstellingen')

  // Get or create outcome goal session
  let { data: session } = await supabase
    .from('goal_sessions')
    .select('*')
    .eq('team_id', teamId)
    .eq('session_type', 'outcome_goals')
    .order('session_number', { ascending: false })
    .limit(1)
    .single()

  if (!session) {
    const { data: newSession } = await supabase
      .from('goal_sessions')
      .insert({
        team_id: teamId,
        session_type: 'outcome_goals',
        session_number: 1,
        session_date: new Date().toISOString().split('T')[0],
        status: 'active',
        created_by: user.id,
      })
      .select()
      .single()
    session = newSession
  }

  if (!session) redirect('/dashboard/coach/doelstellingen')

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-2 text-sm text-muted mb-6">
        <Link href="/dashboard/coach/doelstellingen" className="hover:text-foreground transition-colors">
          Doelstellingen
        </Link>
        <span>/</span>
        <span className="text-foreground">{team.name}</span>
        <span>/</span>
        <span className="text-foreground">Outcome Goals</span>
      </div>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Outcome Goals Workshop</h1>
        <p className="text-muted text-sm mt-1">
          Fase 1 — {team.name} — Sessie {session.session_number}
        </p>
      </div>

      {/* Instructies */}
      <div className="bg-card border border-border rounded-xl p-5 mb-8">
        <h3 className="font-semibold text-foreground text-sm mb-2">Werkwijze</h3>
        <ol className="space-y-1 text-sm text-muted list-decimal list-inside">
          <li>Elke subgroep brainstormt en voert max 5 outcome goals in</li>
          <li>Elke subgroep presenteert hun doelen aan de groep</li>
          <li>De groep kiest samen de TOP 3 outcome goals (markeer als "Selecteer")</li>
          <li>Coach keurt de selectie goed in de volgende sessie</li>
        </ol>
      </div>

      <OutcomeGoalsWorkshop
        teamId={teamId}
        sessionId={session.id}
        userId={user.id}
      />
    </div>
  )
}
