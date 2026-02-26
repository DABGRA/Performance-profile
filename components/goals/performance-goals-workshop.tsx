'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { PerformanceGoal, OutcomeGoal } from '@/lib/types/goals'

interface Props {
  teamId: string
  sessionId: string
  userId: string
  outcomeGoals: OutcomeGoal[]
}

const SUBGROUPS = ['Subgroep A', 'Subgroep B', 'Subgroep C', 'Subgroep D']
const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-muted/30 text-muted',
  presented: 'bg-accent/20 text-accent',
  selected: 'bg-primary/20 text-primary',
  approved: 'bg-success/20 text-success',
}
const STATUS_LABELS: Record<string, string> = {
  draft: 'Concept',
  presented: 'Gepresenteerd',
  selected: 'Geselecteerd',
  approved: 'Goedgekeurd',
}

export function PerformanceGoalsWorkshop({ teamId, sessionId, userId, outcomeGoals }: Props) {
  const [goals, setGoals] = useState<PerformanceGoal[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [subgroup, setSubgroup] = useState(SUBGROUPS[0])
  const [form, setForm] = useState({
    title: '',
    description: '',
    measurable_component: '',
    outcome_goal_id: outcomeGoals[0]?.id ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()

  useEffect(() => { loadGoals() }, [sessionId])

  async function loadGoals() {
    setLoading(true)
    const { data } = await supabase
      .from('performance_goals')
      .select('*')
      .eq('team_id', teamId)
      .order('presentation_order', { ascending: true })
    setGoals(data ?? [])
    setLoading(false)
  }

  async function addGoal() {
    if (!form.title.trim()) return setError('Vul een titel in')
    const selected = goals.filter(g => g.status === 'selected' || g.status === 'approved')
    if (selected.length >= 10) return setError('Maximaal 10 performance goals geselecteerd')
    setSaving(true)
    setError('')
    const { error: err } = await supabase.from('performance_goals').insert({
      team_id: teamId,
      outcome_goal_id: form.outcome_goal_id || null,
      title: form.title,
      description: form.description,
      measurable_component: form.measurable_component,
      subgroup_created_by: subgroup,
      status: 'draft',
      presentation_order: goals.length + 1,
    })
    if (err) setError(err.message)
    else {
      setForm({ title: '', description: '', measurable_component: '', outcome_goal_id: outcomeGoals[0]?.id ?? '' })
      setAdding(false)
      await loadGoals()
    }
    setSaving(false)
  }

  async function updateStatus(goalId: string, status: PerformanceGoal['status']) {
    const selected = goals.filter(g => (g.status === 'selected' || g.status === 'approved') && g.id !== goalId)
    if (status === 'selected' && selected.length >= 10) {
      return setError('Maximaal 10 performance goals kunnen geselecteerd worden')
    }
    await supabase.from('performance_goals').update({ status }).eq('id', goalId)
    await loadGoals()
    setError('')
  }

  const selectedGoals = goals.filter(g => g.status === 'selected' || g.status === 'approved')
  const outcomeMap = Object.fromEntries(outcomeGoals.map(g => [g.id, g.title]))

  return (
    <div className="space-y-8">
      {selectedGoals.length > 0 && (
        <div className="bg-primary/10 border border-primary/20 rounded-xl p-4">
          <p className="text-sm font-semibold text-primary mb-2">
            Geselecteerde Performance Goals ({selectedGoals.length}/10)
          </p>
          <div className="flex flex-wrap gap-2">
            {selectedGoals.map(g => (
              <span key={g.id} className="bg-primary/20 text-primary text-xs px-3 py-1 rounded-full font-medium">
                {g.title}
              </span>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-foreground">Nieuw Performance Goal invoeren</h3>
          <button onClick={() => setAdding(!adding)} className="text-sm text-primary hover:underline">
            {adding ? 'Annuleren' : '+ Toevoegen'}
          </button>
        </div>

        {adding && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-muted font-medium mb-1">Subgroep</label>
                <select
                  value={subgroup}
                  onChange={e => setSubgroup(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground"
                >
                  {SUBGROUPS.map(sg => <option key={sg} value={sg}>{sg}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-muted font-medium mb-1">Gekoppeld aan Outcome Goal</label>
                <select
                  value={form.outcome_goal_id}
                  onChange={e => setForm(f => ({ ...f, outcome_goal_id: e.target.value }))}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground"
                >
                  <option value="">Geen koppeling</option>
                  {outcomeGoals.filter(g => g.status === 'selected' || g.status === 'approved').map(g => (
                    <option key={g.id} value={g.id}>{g.title}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs text-muted font-medium mb-1">Wat moeten we KUNNEN? *</label>
              <input
                type="text"
                placeholder="Bijv. Beter samenwerken in de aanval"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted/50"
              />
            </div>
            <div>
              <label className="block text-xs text-muted font-medium mb-1">Meetbaar component</label>
              <input
                type="text"
                placeholder="Bijv. Minder dan 3 balverlies per helft"
                value={form.measurable_component}
                onChange={e => setForm(f => ({ ...f, measurable_component: e.target.value }))}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted/50"
              />
            </div>
            <div>
              <label className="block text-xs text-muted font-medium mb-1">Toelichting</label>
              <textarea
                rows={2}
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground resize-none"
              />
            </div>
            <button
              onClick={addGoal}
              disabled={saving}
              className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Opslaan...' : 'Doel opslaan'}
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-muted">Laden...</p>
      ) : (
        <div className="space-y-3">
          {goals.map(goal => (
            <div key={goal.id} className="bg-card border border-border rounded-xl p-4 flex items-start justify-between gap-4">
              <div className="flex-1">
                <p className="font-medium text-foreground text-sm">{goal.title}</p>
                {goal.measurable_component && (
                  <p className="text-xs text-accent mt-1">Meetbaar: {goal.measurable_component}</p>
                )}
                {goal.outcome_goal_id && outcomeMap[goal.outcome_goal_id] && (
                  <p className="text-xs text-muted mt-1">Koppeling: {outcomeMap[goal.outcome_goal_id]}</p>
                )}
                <p className="text-xs text-muted mt-1">{goal.subgroup_created_by}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-xs px-2 py-1 rounded-full ${STATUS_COLORS[goal.status]}`}>
                  {STATUS_LABELS[goal.status]}
                </span>
                <select
                  value={goal.status}
                  onChange={e => updateStatus(goal.id, e.target.value as PerformanceGoal['status'])}
                  className="text-xs bg-background border border-border rounded-lg px-2 py-1 text-foreground"
                >
                  <option value="draft">Concept</option>
                  <option value="presented">Gepresenteerd</option>
                  <option value="selected">Selecteer (max 10)</option>
                  <option value="approved">Goedgekeurd</option>
                </select>
              </div>
            </div>
          ))}
          {goals.length === 0 && (
            <p className="text-sm text-muted text-center py-8">
              Nog geen performance goals ingevoerd. Klik op "Toevoegen" om te beginnen.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
