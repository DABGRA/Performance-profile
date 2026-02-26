'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'

type Team = { id: string; name: string }
type PerformanceGoal = { id: string; title: string }
type MemberScore = {
  user_id: string
  name: string
  scores: Record<string, number | null>
  avg: number | null
}

export default function PerformanceOverviewPage() {
  const supabase = createClient()

  const [teams, setTeams] = useState<Team[]>([])
  const [selectedTeam, setSelectedTeam] = useState('')
  const [period, setPeriod] = useState('')
  const [goals, setGoals] = useState<PerformanceGoal[]>([])
  const [matrix, setMatrix] = useState<MemberScore[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function loadTeams() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('teams').select('id, name').eq('coach_id', user.id)
      setTeams(data ?? [])
      if (data && data.length === 1) setSelectedTeam(data[0].id)
    }
    loadTeams()
  }, [])

  useEffect(() => {
    if (!selectedTeam || !period) return
    setLoading(true)

    async function loadMatrix() {
      const [{ data: membersData }, { data: goalsData }, { data: evalsData }] = await Promise.all([
        supabase
          .from('team_members')
          .select('user_id, profile:profiles(full_name, email)')
          .eq('team_id', selectedTeam)
          .eq('is_active', true),
        supabase
          .from('performance_goals')
          .select('id, title')
          .eq('team_id', selectedTeam)
          .eq('status', 'approved'),
        supabase
          .from('coach_performance_evaluations')
          .select('teamlid_id, performance_goal_id, evaluation_score')
          .eq('team_id', selectedTeam)
          .eq('period', period),
      ])

      const fetchedGoals = (goalsData ?? []) as PerformanceGoal[]
      setGoals(fetchedGoals)

      const evalMap: Record<string, Record<string, number>> = {}
      for (const e of evalsData ?? []) {
        if (!evalMap[e.teamlid_id]) evalMap[e.teamlid_id] = {}
        evalMap[e.teamlid_id][e.performance_goal_id] = e.evaluation_score
      }

      const rows: MemberScore[] = ((membersData ?? []) as unknown as { user_id: string; profile: { full_name: string | null; email: string } }[])
        .map(m => {
          const scores: Record<string, number | null> = {}
          let total = 0, count = 0
          for (const g of fetchedGoals) {
            const s = evalMap[m.user_id]?.[g.id] ?? null
            scores[g.id] = s
            if (s !== null) { total += s; count++ }
          }
          return {
            user_id: m.user_id,
            name: m.profile.full_name ?? m.profile.email,
            scores,
            avg: count > 0 ? Math.round((total / count) * 10) / 10 : null,
          }
        })
        .sort((a, b) => (b.avg ?? 0) - (a.avg ?? 0))

      setMatrix(rows)
      setLoading(false)
    }
    loadMatrix()
  }, [selectedTeam, period])

  function scoreColor(score: number | null) {
    if (score === null) return 'text-muted-foreground bg-muted/30'
    if (score <= 3) return 'text-red-700 bg-red-100 dark:text-red-400 dark:bg-red-950/30'
    if (score <= 6) return 'text-amber-700 bg-amber-100 dark:text-amber-400 dark:bg-amber-950/30'
    return 'text-emerald-700 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-950/30'
  }

  const hasData = matrix.length > 0 && goals.length > 0

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-foreground text-balance">Performance Overzicht</h1>
        <p className="text-sm text-muted-foreground mt-1">Scorematrix per teamlid per performance doel</p>
      </div>

      <div className="flex gap-4 mb-8">
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 block">Team</label>
          <select
            value={selectedTeam}
            onChange={e => setSelectedTeam(e.target.value)}
            className="px-3 py-2 bg-card border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-primary"
          >
            <option value="">Selecteer team</option>
            {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 block">Periode</label>
          <input
            type="text"
            placeholder="bijv. 2025-T1"
            value={period}
            onChange={e => setPeriod(e.target.value)}
            className="px-3 py-2 bg-card border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
          />
        </div>
        {hasData && (
          <div className="self-end">
            <a
              href="/dashboard/coach/performance"
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition inline-block"
            >
              Evaluatie invullen
            </a>
          </div>
        )}
      </div>

      {loading && (
        <div className="text-center py-16 text-sm text-muted-foreground">Laden...</div>
      )}

      {!loading && hasData && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-separate border-spacing-0">
            <thead>
              <tr>
                <th className="text-left p-3 bg-card border border-border rounded-tl-lg text-xs font-medium text-muted-foreground uppercase tracking-wide w-40 sticky left-0 z-10">
                  Teamlid
                </th>
                {goals.map((g, i) => (
                  <th key={g.id} className={`p-3 bg-card border-t border-b border-r border-border text-xs font-medium text-foreground text-center max-w-32 ${i === goals.length - 1 ? 'rounded-tr-lg' : ''}`}>
                    <span className="block truncate max-w-28" title={g.title}>{g.title}</span>
                  </th>
                ))}
                <th className="p-3 bg-card border border-border rounded-tr-none text-xs font-medium text-muted-foreground uppercase tracking-wide text-center">
                  Gem.
                </th>
              </tr>
            </thead>
            <tbody>
              {matrix.map((row, ri) => (
                <tr key={row.user_id}>
                  <td className={`p-3 bg-card border-b border-l border-r border-border text-sm font-medium text-foreground sticky left-0 z-10 ${ri === matrix.length - 1 ? 'rounded-bl-lg' : ''}`}>
                    {row.name}
                  </td>
                  {goals.map(g => (
                    <td key={g.id} className="p-3 bg-card border-b border-r border-border text-center">
                      <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-sm font-semibold ${scoreColor(row.scores[g.id] ?? null)}`}>
                        {row.scores[g.id] ?? '—'}
                      </span>
                    </td>
                  ))}
                  <td className={`p-3 bg-card border-b border-r border-border text-center ${ri === matrix.length - 1 ? 'rounded-br-lg' : ''}`}>
                    <span className={`inline-flex items-center justify-center w-10 h-8 rounded-lg text-sm font-bold ${scoreColor(row.avg)}`}>
                      {row.avg ?? '—'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex gap-4 mt-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-red-100 dark:bg-red-950/30 inline-block" /> 1-3 Aandachtspunt
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-amber-100 dark:bg-amber-950/30 inline-block" /> 4-6 Ontwikkeling
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-emerald-100 dark:bg-emerald-950/30 inline-block" /> 7-10 Sterk
            </span>
          </div>
        </div>
      )}

      {!loading && selectedTeam && period && !hasData && (
        <div className="bg-card border border-border rounded-xl p-10 text-center">
          <p className="text-sm text-muted-foreground mb-3">
            Geen evaluatiedata gevonden voor periode <strong>{period}</strong>.
          </p>
          <a href="/dashboard/coach/performance" className="text-sm text-primary hover:underline">
            Begin met evalueren
          </a>
        </div>
      )}

      {!selectedTeam || !period ? (
        <div className="bg-card border border-border rounded-xl p-10 text-center">
          <p className="text-sm text-muted-foreground">Selecteer een team en periode om de scorematrix te zien.</p>
        </div>
      ) : null}
    </div>
  )
}
