import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PerformanceGoalsWorkshop } from '@/components/goals/performance-goals-workshop'
import Link from 'next/link'

export default async function PerformanceGoalsPage({
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

  // Get outcome goals session
  let { data: session } = await supabase
    .from('goal_sessions')
    .select('*')
    .eq('team_id', teamId)
    .eq('session_type', 'performance_goals')
    .order('session_number', { ascending: false })
    .limit(1)
    .single()

  if (!session) {
    const { data: newSession } = await supabase
      .from('goal_sessions')
      .insert({
        team_id: teamId,
        session_type: 'performance_goals',
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

  // Load selected outcome goals for linking
  const { data: outcomeGoals } = await supabase
    .from('outcome_goals')
    .select('*')
    .eq('team_id', teamId)
    .in('status', ['selected', 'approved'])

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-2 text-sm text-muted mb-6">
        <Link href="/dashboard/coach/doelstellingen" className="hover:text-foreground transition-colors">
          Doelstellingen
        </Link>
        <span>/</span>
        <span className="text-foreground">{team.name}</span>
        <span>/</span>
        <span className="text-foreground">Performance Goals</span>
      </div>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Performance Goals Workshop</h1>
        <p className="text-muted text-sm mt-1">
          Fase 2 — {team.name} — Sessie {session.session_number}
        </p>
      </div>

      <div className="bg-card border border-border rounded-xl p-5 mb-8">
        <h3 className="font-semibold text-foreground text-sm mb-2">Werkwijze</h3>
        <ol className="space-y-1 text-sm text-muted list-decimal list-inside">
          <li>Elke subgroep bedenkt: "Wat moeten we KUNNEN om de outcome goal te halen?"</li>
          <li>Voer voor elke subgroep max 5 performance goals in met een meetbaar component</li>
          <li>Koppel elk doel aan een outcome goal</li>
          <li>De groep kiest samen de TOP 10 performance goals</li>
          <li>Coach beoordeelt haalbaarheid in de volgende sessie</li>
        </ol>
      </div>

      <PerformanceGoalsWorkshop
        teamId={teamId}
        sessionId={session.id}
        userId={user.id}
        outcomeGoals={outcomeGoals ?? []}
      />
    </div>
  )
}
