import { createClient } from '@/lib/supabase/server'
import { GebruikersClient } from '@/components/gebruikers/gebruikers-client'

export default async function GebruikersPage() {
  const supabase = await createClient()

  const [{ data: gebruikers }, { data: teams }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, full_name, email, role, team_id, invited_at, onboarded, teams(name)')
      .order('invited_at', { ascending: false }),
    supabase
      .from('teams')
      .select('id, name')
      .order('name'),
  ])

  return (
    <div className="p-8">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Gebruikers</h1>
          <p className="text-sm text-muted-foreground mt-1">Nodig coaches en teamleden uit voor het platform</p>
        </div>
      </div>
      <GebruikersClient gebruikers={gebruikers ?? []} teams={teams ?? []} />
    </div>
  )
}
