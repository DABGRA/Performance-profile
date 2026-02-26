import { createClient } from '@/lib/supabase/server'

export default async function TeamlidDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user!.id)
    .single()

  // Get teams this user is in
  const { data: memberships } = await supabase
    .from('team_members')
    .select('team_id, teams(name)')
    .eq('user_id', user!.id)
    .eq('is_active', true)

  // Get open evaluations
  const teamIds = memberships?.map((m) => m.team_id) ?? []
  const { data: openCampaigns } = await supabase
    .from('evaluation_campaigns')
    .select('id, questionnaire_type, campaign_date, teams(name)')
    .in('team_id', teamIds.length ? teamIds : ['none'])
    .eq('status', 'sent')

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-foreground text-balance">
          Welkom, {profile?.full_name ?? 'Teamlid'}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Jouw persoonlijk performance dashboard</p>
      </div>

      {/* Open evaluations alert */}
      {openCampaigns && openCampaigns.length > 0 && (
        <div className="mb-6 bg-warning/10 border border-warning/30 rounded-xl p-4 flex items-start gap-3">
          <svg className="w-5 h-5 text-warning shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <p className="text-sm font-medium text-foreground">
              {openCampaigns.length} open {openCampaigns.length === 1 ? 'evaluatie' : 'evaluaties'} wachten op jou
            </p>
            <a href="/dashboard/teamlid/evaluaties" className="text-xs text-primary hover:underline mt-0.5 inline-block">
              Invullen →
            </a>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 mb-8">
        {/* Performance Profiel card */}
        <a
          href="/dashboard/teamlid/performance-profiel"
          className="bg-card border border-border rounded-xl p-5 hover:border-primary/40 transition group"
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h2 className="text-sm font-semibold text-foreground">Performance Profiel</h2>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Vul je performance profiel in via Butler &amp; Hardy, Jones of Gucciardi methode. Volg je voortgang over het seizoen.
          </p>
          <p className="text-xs text-primary mt-3 group-hover:underline">Openen →</p>
        </a>

        {/* Doelstellingen card */}
        <a
          href="/dashboard/teamlid/doelstellingen"
          className="bg-card border border-border rounded-xl p-5 hover:border-primary/40 transition group"
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h2 className="text-sm font-semibold text-foreground">Team Doelstellingen</h2>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Bekijk de outcome, performance en process doelen van jouw team. Zie hoe jouw bijdrage past in het grotere geheel.
          </p>
          <p className="text-xs text-primary mt-3 group-hover:underline">Bekijken →</p>
        </a>
      </div>

      {/* Teams */}
      <div>
        <h2 className="text-base font-semibold text-foreground mb-4">Mijn Teams</h2>
        {memberships && memberships.length > 0 ? (
          <div className="flex flex-col gap-2">
            {memberships.map((m) => (
              <div key={m.team_id} className="flex items-center gap-3 p-4 bg-card border border-border rounded-xl">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-foreground">{(m.teams as any)?.name ?? 'Team'}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl p-8 text-center">
            <p className="text-sm text-muted-foreground">Je bent nog niet aan een team toegevoegd.</p>
          </div>
        )}
      </div>
    </div>
  )
}
