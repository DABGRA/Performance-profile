'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { TrendLineChart } from '@/components/charts/trend-line-chart'
import { MotivationContinuumChart } from '@/components/charts/motivation-continuum-chart'
import { PNSSSRadarChart } from '@/components/charts/pnsss-radar-chart'

interface Props { userId: string }

export function IndividualDashboard({ userId }: Props) {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)
  const [responses, setResponses] = useState<any[]>([])
  const [perfEvals, setPerfEvals] = useState<any[]>([])

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [profileRes, respRes, perfRes] = await Promise.all([
        supabase.from('profiles').select('full_name, role').eq('id', userId).single(),
        supabase
          .from('evaluation_responses')
          .select('*, evaluation_campaigns(period, questionnaire_definitions(name, questionnaire_key, has_special_chart, chart_type))')
          .eq('respondent_id', userId)
          .order('completed_at', { ascending: true }),
        supabase
          .from('coach_performance_evaluations')
          .select('period, evaluation_score, coach_notes, performance_goals(goal_text)')
          .eq('teamlid_id', userId)
          .order('period', { ascending: true }),
      ])
      setProfile(profileRes.data)
      setResponses(respRes.data ?? [])
      setPerfEvals(perfRes.data ?? [])
      setLoading(false)
    }
    load()
  }, [userId])

  // Group responses by questionnaire key
  const byKey = responses.reduce((acc, r) => {
    const key = r.evaluation_campaigns?.questionnaire_definitions?.questionnaire_key ?? 'onbekend'
    if (!acc[key]) acc[key] = []
    acc[key].push(r)
    return acc
  }, {} as Record<string, any[]>)

  // Trend data: eigen scores per periode per vragenlijst
  const trendData = responses.reduce((acc, r) => {
    const period = r.evaluation_campaigns?.period
    const key = r.evaluation_campaigns?.questionnaire_definitions?.questionnaire_key
    if (!period || !key || r.total_score == null) return acc
    const existing = acc.find((x: any) => x.period === period)
    if (existing) { existing[key] = r.total_score } else { acc.push({ period, [key]: r.total_score }) }
    return acc
  }, [] as any[])

  // Latest SMS-II subscale scores for individual
  const latestSMS = (byKey['sms_ii'] ?? []).slice(-1)[0]
  const smsData = latestSMS?.subscale_scores ?? {}

  // Latest PNSSS
  const latestPNSSS = (byKey['pnsss'] ?? []).slice(-1)[0]
  const pnsssData = latestPNSSS?.subscale_scores
    ? [
        { subscale: 'Autonomie', satisfaction: latestPNSSS.subscale_scores['autonomy_sat'] ?? 0, frustration: latestPNSSS.subscale_scores['autonomy_fru'] ?? 0 },
        { subscale: 'Competentie', satisfaction: latestPNSSS.subscale_scores['competence_sat'] ?? 0, frustration: latestPNSSS.subscale_scores['competence_fru'] ?? 0 },
        { subscale: 'Verbondenheid', satisfaction: latestPNSSS.subscale_scores['relatedness_sat'] ?? 0, frustration: latestPNSSS.subscale_scores['relatedness_fru'] ?? 0 },
      ]
    : []

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-foreground text-balance">Mijn Analyse</h1>
        <p className="text-sm text-muted-foreground mt-1">Jouw persoonlijke scores en trends</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">Laden...</div>
      ) : (
        <div className="space-y-6">
          {/* Trend eigen scores */}
          {trendData.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-5">
              <TrendLineChart
                data={trendData}
                series={[
                  { key: 'psychological_safety', label: 'Psych. Veiligheid', color: 'hsl(var(--primary))' },
                  { key: 'pnsss', label: 'Basisbehoeften', color: 'hsl(142 60% 45%)' },
                  { key: 'sms_ii', label: 'Motivatie', color: 'hsl(45 95% 50%)' },
                ]}
                title="Mijn scores over periodes"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-6">
            {/* PNSSS */}
            {pnsssData.length > 0 && (
              <div className="bg-card border border-border rounded-xl p-5">
                <PNSSSRadarChart data={pnsssData} title="Psychologische Basisbehoeften" />
              </div>
            )}

            {/* SMS-II */}
            <div className="bg-card border border-border rounded-xl p-5">
              <MotivationContinuumChart data={smsData} title="Motivatiecontinuüm" />
            </div>
          </div>

          {/* Coach feedback */}
          {perfEvals.length > 0 && (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-border">
                <h2 className="text-sm font-semibold text-foreground">Coach beoordeling</h2>
              </div>
              <div className="divide-y divide-border/50">
                {perfEvals.map((e, i) => (
                  <div key={i} className="flex items-start gap-4 px-5 py-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 ${
                      e.evaluation_score >= 7 ? 'bg-emerald-400/15 text-emerald-400'
                      : e.evaluation_score >= 5 ? 'bg-amber-400/15 text-amber-400'
                      : 'bg-red-400/15 text-red-400'
                    }`}>
                      {e.evaluation_score}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{e.performance_goals?.goal_text}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{e.period}</p>
                      {e.coach_notes && (
                        <p className="text-xs text-muted-foreground mt-2 leading-relaxed italic">{e.coach_notes}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {trendData.length === 0 && perfEvals.length === 0 && (
            <div className="bg-card border border-border rounded-xl p-12 text-center">
              <p className="text-sm text-muted-foreground">Nog geen data beschikbaar. Vul eerst een evaluatie in via het evaluatiemenu.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
