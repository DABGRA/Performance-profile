'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { TrendLineChart } from '@/components/charts/trend-line-chart'
import { U3BarChart, PSYCH_SAFETY_NORM } from '@/components/charts/u3-bar-chart'
import { PNSSSRadarChart } from '@/components/charts/pnsss-radar-chart'
import { MotivationContinuumChart } from '@/components/charts/motivation-continuum-chart'

interface Props { teamId: string }

type Tab = 'evaluaties' | 'performance' | 'leden'

export function TeamAnalyticsDashboard({ teamId }: Props) {
  const supabase = createClient()
  const [tab, setTab] = useState<Tab>('evaluaties')
  const [loading, setLoading] = useState(true)
  const [teamName, setTeamName] = useState('')
  const [summaries, setSummaries] = useState<any[]>([])
  const [members, setMembers] = useState<any[]>([])
  const [perfEvals, setPerfEvals] = useState<any[]>([])

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [teamRes, sumRes, membersRes, perfRes] = await Promise.all([
        supabase.from('teams').select('name').eq('id', teamId).single(),
        supabase
          .from('evaluation_team_summaries')
          .select('*, evaluation_campaigns(period, questionnaire_definitions(name, questionnaire_key, has_special_chart, chart_type))')
          .eq('team_id', teamId)
          .order('created_at', { ascending: true }),
        supabase.from('team_members').select('profiles(id, full_name, email)').eq('team_id', teamId),
        supabase
          .from('coach_performance_evaluations')
          .select('*, performance_goals(goal_text), profiles(full_name)')
          .eq('team_id', teamId)
          .order('period', { ascending: true }),
      ])
      setTeamName(teamRes.data?.name ?? '')
      setSummaries(sumRes.data ?? [])
      setMembers(membersRes.data ?? [])
      setPerfEvals(perfRes.data ?? [])
      setLoading(false)
    }
    load()
  }, [teamId])

  // Group summaries by questionnaire
  const byQuestionnaire = summaries.reduce((acc, s) => {
    const key = s.evaluation_campaigns?.questionnaire_definitions?.questionnaire_key ?? 'onbekend'
    if (!acc[key]) acc[key] = []
    acc[key].push(s)
    return acc
  }, {} as Record<string, any[]>)

  // Build trend data for psychologische veiligheid (U3)
  const psTrend = (byQuestionnaire['psychological_safety'] ?? []).map((s: any) => ({
    period: s.evaluation_campaigns?.period ?? '',
    team_avg: s.team_avg ?? 0,
    response_count: s.response_count ?? 0,
  }))

  // Build trend line data for all questionnaires
  const trendData = summaries.reduce((acc, s) => {
    const period = s.evaluation_campaigns?.period
    const key = s.evaluation_campaigns?.questionnaire_definitions?.questionnaire_key
    if (!period || !key) return acc
    const existing = acc.find((r: any) => r.period === period)
    if (existing) { existing[key] = s.team_avg } else { acc.push({ period, [key]: s.team_avg }) }
    return acc
  }, [] as any[])

  // Latest PNSSS radar data
  const latestPNSSS = (byQuestionnaire['pnsss'] ?? []).slice(-1)[0]
  const pnsssRadarData = latestPNSSS?.subscale_averages
    ? [
        { subscale: 'Autonomie', satisfaction: latestPNSSS.subscale_averages['autonomy_sat'] ?? 0, frustration: latestPNSSS.subscale_averages['autonomy_fru'] ?? 0 },
        { subscale: 'Competentie', satisfaction: latestPNSSS.subscale_averages['competence_sat'] ?? 0, frustration: latestPNSSS.subscale_averages['competence_fru'] ?? 0 },
        { subscale: 'Verbondenheid', satisfaction: latestPNSSS.subscale_averages['relatedness_sat'] ?? 0, frustration: latestPNSSS.subscale_averages['relatedness_fru'] ?? 0 },
      ]
    : []

  // Latest SMS-II data
  const latestSMS = (byQuestionnaire['sms_ii'] ?? []).slice(-1)[0]
  const smsData = latestSMS?.subscale_averages ?? {}

  // Performance goals matrix
  const goalLabels = [...new Set(perfEvals.map(e => e.performance_goals?.goal_text ?? 'Doel'))]
  const memberNames = [...new Set(perfEvals.map(e => e.profiles?.full_name ?? 'Teamlid'))]

  const tabs: { key: Tab; label: string }[] = [
    { key: 'evaluaties', label: 'Evaluaties' },
    { key: 'performance', label: 'Performance' },
    { key: 'leden', label: `Leden (${members.length})` },
  ]

  return (
    <div>
      <div className="px-8 pt-8 pb-0">
        <h1 className="text-2xl font-semibold text-foreground text-balance">{teamName}</h1>
        <p className="text-sm text-muted-foreground mt-1">Team analytics</p>
        <div className="flex gap-1 mt-6 border-b border-border">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                tab === t.key
                  ? 'text-foreground border-primary'
                  : 'text-muted-foreground border-transparent hover:text-foreground'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-8">
        {loading ? (
          <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">Laden...</div>
        ) : tab === 'evaluaties' ? (
          <div className="space-y-6">
            {/* U3 Psychologische Veiligheid */}
            <div className="bg-card border border-border rounded-xl p-5">
              <U3BarChart
                data={psTrend}
                norm={PSYCH_SAFETY_NORM}
                title="Psychologische Veiligheid t.o.v. norm (Edmondson)"
              />
            </div>

            {/* Trend over periodes */}
            {trendData.length > 0 && (
              <div className="bg-card border border-border rounded-xl p-5">
                <TrendLineChart
                  data={trendData}
                  series={[
                    { key: 'psychological_safety', label: 'Psych. Veiligheid', color: 'hsl(var(--primary))' },
                    { key: 'pnsss', label: 'Basisbehoeften', color: 'hsl(142 60% 45%)' },
                    { key: 'sms_ii', label: 'Motivatie', color: 'hsl(45 95% 50%)' },
                  ]}
                  title="Teamtrends over periodes"
                />
              </div>
            )}

            {/* PNSSS Radar */}
            {pnsssRadarData.length > 0 && (
              <div className="bg-card border border-border rounded-xl p-5">
                <PNSSSRadarChart data={pnsssRadarData} title="Psychologische Basisbehoeften (laatste meting)" />
              </div>
            )}

            {/* Motivatie continuüm */}
            <div className="bg-card border border-border rounded-xl p-5">
              <MotivationContinuumChart data={smsData} title="Motivatiecontinuüm (laatste meting)" />
            </div>
          </div>
        ) : tab === 'performance' ? (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-border">
              <h2 className="text-sm font-semibold text-foreground">Performance scores per teamlid</h2>
            </div>
            {goalLabels.length === 0 ? (
              <p className="px-5 py-8 text-xs text-muted-foreground text-center">Nog geen scores ingevoerd</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left px-5 py-3 text-muted-foreground font-medium w-36">Teamlid</th>
                      {goalLabels.map(g => (
                        <th key={g} className="text-center px-3 py-3 text-muted-foreground font-medium max-w-28">
                          <span className="block truncate max-w-24 mx-auto" title={g}>{g}</span>
                        </th>
                      ))}
                      <th className="text-center px-3 py-3 text-muted-foreground font-medium">Gem.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {memberNames.map(name => {
                      const memberEvals = perfEvals.filter(e => e.profiles?.full_name === name)
                      const scores = goalLabels.map(g => {
                        const e = memberEvals.find(ev => ev.performance_goals?.goal_text === g)
                        return e?.evaluation_score ?? null
                      })
                      const validScores = scores.filter(s => s !== null) as number[]
                      const avg = validScores.length ? validScores.reduce((a, b) => a + b, 0) / validScores.length : null
                      return (
                        <tr key={name} className="border-b border-border/50 hover:bg-accent/20">
                          <td className="px-5 py-3 font-medium text-foreground">{name}</td>
                          {scores.map((score, i) => (
                            <td key={i} className="text-center px-3 py-3">
                              {score !== null ? (
                                <span className={`inline-block w-8 h-8 leading-8 rounded-full text-xs font-semibold ${
                                  score >= 7 ? 'bg-emerald-400/15 text-emerald-400'
                                  : score >= 5 ? 'bg-amber-400/15 text-amber-400'
                                  : 'bg-red-400/15 text-red-400'
                                }`}>{score}</span>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </td>
                          ))}
                          <td className="text-center px-3 py-3 font-semibold text-foreground">
                            {avg !== null ? avg.toFixed(1) : '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-border">
              <h2 className="text-sm font-semibold text-foreground">Teamleden</h2>
            </div>
            <div className="divide-y divide-border/50">
              {members.map((m: any) => (
                <div key={m.profiles?.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-semibold shrink-0">
                    {(m.profiles?.full_name ?? '?').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{m.profiles?.full_name ?? 'Onbekend'}</p>
                    <p className="text-xs text-muted-foreground">{m.profiles?.email}</p>
                  </div>
                </div>
              ))}
              {members.length === 0 && (
                <p className="px-5 py-6 text-xs text-muted-foreground text-center">Geen teamleden gevonden</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
