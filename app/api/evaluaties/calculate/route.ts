import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { campaign_id } = await req.json()

  if (!campaign_id) return NextResponse.json({ error: 'campaign_id required' }, { status: 400 })

  // Auth check - must be coach or superuser
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['coach', 'superuser'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Get campaign + questionnaire
  const { data: campaign } = await supabase
    .from('evaluation_campaigns')
    .select(`*, questionnaire:questionnaire_definitions(*)`)
    .eq('id', campaign_id)
    .single()

  if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })

  // Get all responses for this campaign
  const { data: responses } = await supabase
    .from('evaluation_responses')
    .select('*')
    .eq('campaign_id', campaign_id)

  if (!responses || responses.length === 0) {
    return NextResponse.json({ error: 'No responses yet' }, { status: 400 })
  }

  // Get subscales for aggregation
  const { data: subscales } = await supabase
    .from('questionnaire_subscales')
    .select('*')
    .eq('questionnaire_id', campaign.questionnaire_id)

  // Calculate team averages
  const teamAvg = responses.reduce((sum, r) => sum + (r.calculated_avg ?? 0), 0) / responses.length

  // Aggregate subscale averages
  const subscaleAverages: Record<string, number> = {}
  if (subscales && subscales.length > 0) {
    for (const sub of subscales) {
      const scoresForSub = responses
        .map(r => r.subscale_scores?.[sub.subscale_key])
        .filter((s): s is number => s !== undefined && s !== null)

      if (scoresForSub.length > 0) {
        subscaleAverages[sub.subscale_key] = scoresForSub.reduce((a, b) => a + b, 0) / scoresForSub.length
      }
    }
  }

  // Calculate U3 score (% of team scoring above median of previous period)
  // Get previous period summary for this team + questionnaire
  const { data: previousSummaries } = await supabase
    .from('evaluation_team_summaries')
    .select('*')
    .eq('team_id', campaign.team_id)
    .neq('campaign_id', campaign_id)
    .order('calculated_at', { ascending: false })
    .limit(1)

  let u3Score: number | null = null
  if (previousSummaries && previousSummaries.length > 0) {
    const previousAvg = previousSummaries[0].team_avg ?? 0
    const abovePrevious = responses.filter(r => (r.calculated_avg ?? 0) > previousAvg).length
    u3Score = Math.round((abovePrevious / responses.length) * 100 * 100) / 100
  }

  // Upsert the team summary
  const { error } = await supabase.from('evaluation_team_summaries').upsert({
    campaign_id,
    team_id: campaign.team_id,
    period: campaign.period,
    response_count: responses.length,
    team_avg: Math.round(teamAvg * 1000) / 1000,
    subscale_averages: Object.keys(subscaleAverages).length > 0 ? subscaleAverages : null,
    u3_score: u3Score,
    calculated_at: new Date().toISOString(),
  }, { onConflict: 'campaign_id,team_id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    success: true,
    team_avg: teamAvg,
    response_count: responses.length,
    subscale_averages: subscaleAverages,
    u3_score: u3Score,
  })
}
