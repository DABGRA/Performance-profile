import { createClient } from '@/lib/supabase/server'
import { TeamAnalyticsDashboard } from '@/components/dashboards/team-analytics-dashboard'
import { notFound } from 'next/navigation'

export default async function TeamAnalyticsPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: team } = await supabase
    .from('teams')
    .select('id, name')
    .eq('id', params.id)
    .single()

  if (!team) notFound()

  return <TeamAnalyticsDashboard teamId={team.id} />
}
