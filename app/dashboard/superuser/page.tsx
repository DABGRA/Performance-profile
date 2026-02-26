import { createClient } from '@/lib/supabase/server'

export default async function SuperuserDashboard() {
  const supabase = await createClient()

  const [{ count: orgCount }, { count: teamCount }, { count: userCount }] = await Promise.all([
    supabase.from('organizations').select('*', { count: 'exact', head: true }),
    supabase.from('teams').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
  ])

  const stats = [
    { label: 'Organisaties', value: orgCount ?? 0, description: 'Actieve klanten' },
    { label: 'Teams', value: teamCount ?? 0, description: 'Alle teams' },
    { label: 'Gebruikers', value: userCount ?? 0, description: 'Coaches & teamleden' },
  ]

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-foreground text-balance">Beheerder Overzicht</h1>
        <p className="text-sm text-muted-foreground mt-1">Overzicht van alle organisaties, teams en gebruikers</p>
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

      {/* Quick actions */}
      <div className="mb-8">
        <h2 className="text-base font-semibold text-foreground mb-4">Snelle acties</h2>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Nieuwe organisatie toevoegen', href: '/dashboard/superuser/organisaties/nieuw' },
            { label: 'Nieuw team aanmaken', href: '/dashboard/superuser/teams/nieuw' },
            { label: 'Gebruiker uitnodigen', href: '/dashboard/superuser/gebruikers/uitnodigen' },
            { label: 'Rapportage bekijken', href: '/dashboard/superuser/rapportage' },
          ].map((action) => (
            <a
              key={action.label}
              href={action.href}
              className="flex items-center gap-3 p-4 bg-card border border-border rounded-xl hover:border-primary/40 hover:bg-primary/5 transition group"
            >
              <div className="w-2 h-2 rounded-full bg-primary shrink-0 group-hover:scale-110 transition" />
              <span className="text-sm font-medium text-foreground">{action.label}</span>
            </a>
          ))}
        </div>
      </div>

      {/* Status notice */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-5">
        <p className="text-sm font-medium text-primary mb-1">Platform in opbouw</p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          De database is succesvol aangemaakt met 22 tabellen. De volgende stap is het opzetten van coaches, teams en teamleden. Gebruik de navigatie links om te beginnen.
        </p>
      </div>
    </div>
  )
}
