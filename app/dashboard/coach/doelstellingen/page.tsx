import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function DoelstellingenPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Get teams for this coach
  const { data: teams } = await supabase
    .from('teams')
    .select('id, name')
    .eq('coach_id', user.id)

  // Get all goal sessions
  const { data: sessions } = await supabase
    .from('goal_sessions')
    .select('*')
    .in('team_id', (teams ?? []).map(t => t.id))
    .order('created_at', { ascending: false })

  const teamMap = Object.fromEntries((teams ?? []).map(t => [t.id, t.name]))

  const sessionsByTeam: Record<string, typeof sessions> = {}
  for (const session of sessions ?? []) {
    if (!sessionsByTeam[session.team_id]) sessionsByTeam[session.team_id] = []
    sessionsByTeam[session.team_id]!.push(session)
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Doelstellingen</h1>
          <p className="text-muted mt-1 text-sm">Beheer de goal-setting sessies per team</p>
        </div>
        <Link
          href="/dashboard/coach/doelstellingen/nieuw"
          className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          Nieuwe sessie starten
        </Link>
      </div>

      {(teams ?? []).length === 0 && (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <p className="text-muted text-sm">Je hebt nog geen teams. Maak eerst een team aan.</p>
          <Link href="/dashboard/coach/teams" className="text-primary text-sm mt-2 inline-block hover:underline">
            Naar Teams
          </Link>
        </div>
      )}

      {(teams ?? []).map(team => (
        <div key={team.id} className="mb-8">
          <h2 className="text-lg font-semibold text-foreground mb-3">{team.name}</h2>

          {/* Goal Hierarchy Status */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            {(['outcome_goals', 'performance_goals', 'process_goals'] as const).map((type, i) => {
              const label = ['Outcome Goals', 'Performance Goals', 'Process Goals'][i]
              const href = [
                `/dashboard/coach/doelstellingen/outcome?team=${team.id}`,
                `/dashboard/coach/doelstellingen/performance?team=${team.id}`,
                `/dashboard/coach/doelstellingen/process?team=${team.id}`,
              ][i]
              const session = (sessionsByTeam[team.id] ?? []).find(s => s.session_type === type)
              const statusColors: Record<string, string> = {
                draft: 'bg-muted/30 text-muted border-border',
                active: 'bg-accent/20 text-accent border-accent/30',
                concluded: 'bg-primary/10 text-primary border-primary/20',
                approved: 'bg-success/20 text-success border-success/30',
              }
              const statusLabels: Record<string, string> = {
                draft: 'Concept',
                active: 'Actief',
                concluded: 'Afgerond',
                approved: 'Goedgekeurd',
              }

              return (
                <Link
                  key={type}
                  href={href}
                  className="bg-card border border-border rounded-xl p-5 hover:border-primary/40 transition-colors group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-xs font-medium text-muted uppercase tracking-wide">
                      Fase {i + 1}
                    </span>
                    {session && (
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${statusColors[session.status] ?? ''}`}>
                        {statusLabels[session.status]}
                      </span>
                    )}
                  </div>
                  <p className="font-semibold text-foreground group-hover:text-primary transition-colors">{label}</p>
                  <p className="text-xs text-muted mt-1">
                    {session ? `Sessie ${session.session_number}` : 'Nog niet gestart'}
                  </p>
                </Link>
              )
            })}
          </div>

          {/* Goal Tree Preview Link */}
          <Link
            href={`/dashboard/coach/doelstellingen/boom?team=${team.id}`}
            className="w-full flex items-center justify-between bg-card border border-border rounded-xl p-4 hover:border-primary/40 transition-colors group"
          >
            <span className="text-sm text-foreground font-medium group-hover:text-primary transition-colors">
              Doelstellingen boom bekijken
            </span>
            <svg className="w-4 h-4 text-muted group-hover:text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      ))}
    </div>
  )
}
