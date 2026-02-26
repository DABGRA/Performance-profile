import { createClient } from '@/lib/supabase/server'

export default async function CoachDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: teams } = await supabase
    .from('teams')
    .select('id, name, season_start, season_end')
    .eq('coach_id', user!.id)

  const teamIds = teams?.map((t) => t.id) ?? []

  const { count: memberCount } = await supabase
    .from('team_members')
    .select('*', { count: 'exact', head: true })
    .in('team_id', teamIds.length ? teamIds : ['none'])

  const { count: campaignCount } = await supabase
    .from('evaluation_campaigns')
    .select('*', { count: 'exact', head: true })
    .eq('created_by', user!.id)
    .eq('status', 'sent')

  const stats = [
    { label: 'Mijn Teams', value: teams?.length ?? 0, description: 'Actieve teams' },
    { label: 'Teamleden', value: memberCount ?? 0, description: 'Totaal across teams' },
    { label: 'Open Evaluaties', value: campaignCount ?? 0, description: 'Wachten op respons' },
  ]

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-foreground text-balance">Coach Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Beheer je teams, doelstellingen en evaluaties</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-card border border-border rounded-xl p-5">
            <p className="text-sm text-muted-foreground">{stat.label}</p>
            <p className="text-3xl font-semibold text-foreground mt-1">{stat.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
          </div>
        ))}
      </div>

      {/* Teams list */}
      <div className="mb-8">
        <h2 className="text-base font-semibold text-foreground mb-4">Mijn Teams</h2>
        {teams && teams.length > 0 ? (
          <div className="flex flex-col gap-2">
            {teams.map((team) => (
              <a
                key={team.id}
                href={`/dashboard/coach/teams/${team.id}`}
                className="flex items-center justify-between p-4 bg-card border border-border rounded-xl hover:border-primary/40 transition group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <span className="text-sm font-semibold text-primary">{team.name.charAt(0)}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{team.name}</p>
                    {team.season_start && (
                      <p className="text-xs text-muted-foreground">
                        Seizoen: {new Date(team.season_start).toLocaleDateString('nl-NL')}
                        {team.season_end ? ` – ${new Date(team.season_end).toLocaleDateString('nl-NL')}` : ''}
                      </p>
                    )}
                  </div>
                </div>
                <svg className="w-4 h-4 text-muted-foreground group-hover:text-primary transition" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </a>
            ))}
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl p-8 text-center">
            <p className="text-sm text-muted-foreground">Nog geen teams toegewezen. Neem contact op met de beheerder.</p>
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="text-base font-semibold text-foreground mb-4">Snelle acties</h2>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Evaluatie versturen', href: '/dashboard/coach/evaluaties/nieuw' },
            { label: 'Goalsetting starten', href: '/dashboard/coach/doelstellingen/nieuw' },
            { label: 'Performance bekijken', href: '/dashboard/coach/performance' },
            { label: 'Team dashboard', href: '/dashboard/coach/teams' },
          ].map((action) => (
            <a
              key={action.label}
              href={action.href}
              className="flex items-center gap-3 p-4 bg-card border border-border rounded-xl hover:border-primary/40 hover:bg-primary/5 transition group"
            >
              <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
              <span className="text-sm font-medium text-foreground">{action.label}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
