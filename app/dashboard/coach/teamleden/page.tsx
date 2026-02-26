import { createClient } from '@/lib/supabase/server'
import { TeamledenClient } from '@/components/gebruikers/teamleden-client'

export default async function CoachTeamledenPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: coach } = await supabase
    .from('profiles')
    .select('team_id, full_name')
    .eq('id', user.id)
    .single()

  const teamId = coach?.team_id

  const { data: teamleden } = teamId
    ? await supabase
        .from('profiles')
        .select('id, full_name, email, invited_at, onboarded')
        .eq('team_id', teamId)
        .eq('role', 'teamlid')
        .order('full_name')
    : { data: [] }

  const { data: team } = teamId
    ? await supabase.from('teams').select('name').eq('id', teamId).single()
    : { data: null }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-foreground">Teamleden</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {team?.name ?? 'Jouw team'} · {teamleden?.length ?? 0} leden
        </p>
      </div>
      <TeamledenClient teamleden={teamleden ?? []} teamId={teamId ?? null} />
    </div>
  )
}
