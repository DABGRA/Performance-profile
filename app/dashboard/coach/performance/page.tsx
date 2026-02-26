'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'

type Team = { id: string; name: string }
type TeamMember = { user_id: string; profile: { full_name: string | null; email: string } }
type PerformanceGoal = { id: string; title: string; outcome_goal: { title: string } | null }
type Evaluation = { performance_goal_id: string; evaluation_score: number; coach_notes: string | null }

export default function CoachPerformancePage() {
  const supabase = createClient()

  const [teams, setTeams] = useState<Team[]>([])
  const [selectedTeam, setSelectedTeam] = useState<string>('')
  const [period, setPeriod] = useState('')
  const [members, setMembers] = useState<TeamMember[]>([])
  const [goals, setGoals] = useState<PerformanceGoal[]>([])
  const [selectedMember, setSelectedMember] = useState<string>('')
  const [evaluations, setEvaluations] = useState<Record<string, { score: number; notes: string }>>({})
  const [existing, setExisting] = useState<Evaluation[]>([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

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
    if (!selectedTeam) return
    async function loadTeamData() {
      const { data: membersData } = await supabase
        .from('team_members')
        .select('user_id, profile:profiles(full_name, email)')
        .eq('team_id', selectedTeam)
        .eq('is_active', true)
      setMembers((membersData ?? []) as unknown as TeamMember[])

      const { data: goalsData } = await supabase
        .from('performance_goals')
        .select('id, title, outcome_goal:outcome_goals(title)')
        .eq('team_id', selectedTeam)
        .eq('status', 'approved')
      setGoals((goalsData ?? []) as unknown as PerformanceGoal[])
    }
    loadTeamData()
  }, [selectedTeam])

  useEffect(() => {
    if (!selectedMember || !selectedTeam || !period) return
    async function loadExisting() {
      const { data } = await supabase
        .from('coach_performance_evaluations')
        .select('performance_goal_id, evaluation_score, coach_notes')
        .eq('teamlid_id', selectedMember)
        .eq('team_id', selectedTeam)
        .eq('period', period)
      setExisting(data ?? [])
      const initial: Record<string, { score: number; notes: string }> = {}
      for (const e of data ?? []) {
        initial[e.performance_goal_id] = { score: e.evaluation_score, notes: e.coach_notes ?? '' }
      }
      setEvaluations(initial)
    }
    loadExisting()
  }, [selectedMember, selectedTeam, period])

  async function save() {
    if (!selectedMember || !selectedTeam || !period) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()

    for (const [goalId, val] of Object.entries(evaluations)) {
      if (!val.score) continue
      await supabase.from('coach_performance_evaluations').upsert({
        performance_goal_id: goalId,
        teamlid_id: selectedMember,
        team_id: selectedTeam,
        period,
        evaluation_score: val.score,
        coach_notes: val.notes || null,
        created_by: user!.id,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'performance_goal_id,teamlid_id,period' })
    }

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const selectedMemberName = members.find(m => m.user_id === selectedMember)?.profile.full_name
    ?? members.find(m => m.user_id === selectedMember)?.profile.email
    ?? ''

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-foreground text-balance">Performance Evaluaties</h1>
        <p className="text-sm text-muted-foreground mt-1">Beoordeel per teamlid hoe zij bijdragen aan de performance doelen</p>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 block">Team</label>
          <select
            value={selectedTeam}
            onChange={e => { setSelectedTeam(e.target.value); setSelectedMember(''); setEvaluations({}) }}
            className="w-full px-3 py-2 bg-card border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-primary"
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
            onChange={e => { setPeriod(e.target.value); setEvaluations({}) }}
            className="w-full px-3 py-2 bg-card border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 block">Teamlid</label>
          <select
            value={selectedMember}
            onChange={e => { setSelectedMember(e.target.value); setEvaluations({}) }}
            disabled={!selectedTeam}
            className="w-full px-3 py-2 bg-card border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-primary disabled:opacity-50"
          >
            <option value="">Selecteer teamlid</option>
            {members.map(m => (
              <option key={m.user_id} value={m.user_id}>
                {m.profile.full_name ?? m.profile.email}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Evaluation form */}
      {selectedMember && period && goals.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-semibold text-foreground">
              Beoordeling: {selectedMemberName}
            </h2>
            <button
              onClick={save}
              disabled={saving}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition"
            >
              {saving ? 'Opslaan...' : saved ? 'Opgeslagen' : 'Opslaan'}
            </button>
          </div>

          <div className="flex flex-col gap-4">
            {goals.map(goal => {
              const val = evaluations[goal.id] ?? { score: 0, notes: '' }
              return (
                <div key={goal.id} className="bg-card border border-border rounded-xl p-5">
                  {goal.outcome_goal && (
                    <p className="text-xs text-muted-foreground mb-1">{goal.outcome_goal.title}</p>
                  )}
                  <p className="text-sm font-medium text-foreground mb-4">{goal.title}</p>

                  {/* Score 1-10 */}
                  <div className="mb-4">
                    <p className="text-xs text-muted-foreground mb-2">Score (1-10)</p>
                    <div className="flex gap-2">
                      {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
                        <button
                          key={n}
                          onClick={() => setEvaluations(prev => ({ ...prev, [goal.id]: { ...val, score: n } }))}
                          className={`w-9 h-9 rounded-lg text-sm font-medium transition-all border ${
                            val.score === n
                              ? 'bg-primary text-primary-foreground border-primary shadow-sm scale-105'
                              : n <= 3 ? 'border-border text-foreground hover:border-red-400 hover:bg-red-50 dark:hover:bg-red-950/20'
                              : n <= 6 ? 'border-border text-foreground hover:border-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/20'
                              : 'border-border text-foreground hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20'
                          }`}
                        >
                          {n}
                        </button>
                      ))}
                      {val.score > 0 && (
                        <span className={`ml-2 self-center text-xs font-medium px-2 py-1 rounded-full ${
                          val.score <= 3 ? 'bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400'
                          : val.score <= 6 ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400'
                          : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400'
                        }`}>
                          {val.score <= 3 ? 'Aandachtspunt' : val.score <= 6 ? 'Ontwikkeling' : 'Sterk'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <p className="text-xs text-muted-foreground mb-1.5">Notities (optioneel)</p>
                    <textarea
                      rows={2}
                      value={val.notes}
                      onChange={e => setEvaluations(prev => ({ ...prev, [goal.id]: { ...val, notes: e.target.value } }))}
                      placeholder="Observaties, context, actiepunten..."
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary resize-none"
                    />
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={save}
              disabled={saving}
              className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition"
            >
              {saving ? 'Opslaan...' : saved ? 'Alles opgeslagen' : 'Evaluatie opslaan'}
            </button>
          </div>
        </div>
      )}

      {selectedMember && period && goals.length === 0 && selectedTeam && (
        <div className="bg-card border border-border rounded-xl p-10 text-center">
          <p className="text-sm text-muted-foreground">Geen goedgekeurde performance doelen gevonden voor dit team.</p>
          <a href="/dashboard/coach/doelstellingen/performance" className="text-sm text-primary hover:underline mt-2 inline-block">
            Naar doelstellingen
          </a>
        </div>
      )}

      {!selectedMember && selectedTeam && period && (
        <div className="bg-card border border-border rounded-xl p-10 text-center">
          <p className="text-sm text-muted-foreground">Selecteer een teamlid om te beginnen.</p>
        </div>
      )}

      {!period && selectedTeam && (
        <div className="bg-card border border-border rounded-xl p-10 text-center">
          <p className="text-sm text-muted-foreground">Vul een periode in om beoordelingen te laden of aan te maken.</p>
        </div>
      )}
    </div>
  )
}
