'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { OutcomeGoal } from '@/lib/types/goals'

interface Props {
  teamId: string
  sessionId: string
  userId: string
}

const SUBGROUPS = ['Subgroep A', 'Subgroep B', 'Subgroep C', 'Subgroep D']
const STATUS_LABELS: Record<string, string> = {
  draft: 'Concept',
  presented: 'Gepresenteerd',
  selected: 'Geselecteerd',
  approved: 'Goedgekeurd',
}
const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-muted/30 text-muted',
  presented: 'bg-accent/20 text-accent',
  selected: 'bg-primary/20 text-primary',
  approved: 'bg-success/20 text-success',
}

export function OutcomeGoalsWorkshop({ teamId, sessionId, userId }: Props) {
  const [goals, setGoals] = useState<OutcomeGoal[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [subgroup, setSubgroup] = useState(SUBGROUPS[0])
  const [form, setForm] = useState({ title: '', description: '', timeline: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()

  useEffect(() => {
    loadGoals()
  }, [sessionId])

  async function loadGoals() {
    setLoading(true)
    const { data } = await supabase
      .from('outcome_goals')
      .select('*')
      .eq('goal_session_id', sessionId)
      .order('presentation_order', { ascending: true })
    setGoals(data ?? [])
    setLoading(false)
  }

  async function addGoal() {
    if (!form.title.trim()) return setError('Vul een titel in')
    const subgroupGoals = goals.filter(g => g.subgroup_created_by === subgroup)
    if (subgroupGoals.length >= 5) return setError(`${subgroup} heeft al 5 doelen ingevoerd (maximum)`)
    setSaving(true)
    setError('')
    const { error: err } = await supabase.from('outcome_goals').insert({
      team_id: teamId,
      goal_session_id: sessionId,
      title: form.title,
      description: form.description,
      timeline: form.timeline,
      subgroup_created_by: subgroup,
      status: 'draft',
      presentation_order: goals.length + 1,
    })
    if (err) setError(err.message)
    else {
      setForm({ title: '', description: '', timeline: '' })
      setAdding(false)
      await loadGoals()
    }
    setSaving(false)
  }

  async function updateStatus(goalId: string, status: OutcomeGoal['status']) {
    const selected = goals.filter(g => g.status === 'selected')
    if (status === 'selected' && selected.length >= 3) {
      return setError('Maximaal 3 outcome goals kunnen geselecteerd worden')
    }
    await supabase.from('outcome_goals').update({ status }).eq('id', goalId)
    await loadGoals()
    setError('')
  }

  const selectedGoals = goals.filter(g => g.status === 'selected' || g.status === 'approved')
  const bySubgroup = SUBGROUPS.reduce<Record<string, OutcomeGoal[]>>((acc, sg) => {
    acc[sg] = goals.filter(g => g.subgroup_created_by === sg)
    return acc
  }, {})

  return (
    <div className="space-y-8">
      {/* Selected Goals Banner */}
      {selectedGoals.length > 0 && (
        <div className="bg-primary/10 border border-primary/20 rounded-xl p-4">
          <p className="text-sm font-semibold text-primary mb-2">
            Geselecteerde Outcome Goals ({selectedGoals.length}/3)
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

      {/* Add Goal Form */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-foreground">Nieuw Outcome Goal invoeren</h3>
          <button
            onClick={() => setAdding(!adding)}
            className="text-sm text-primary hover:underline"
          >
            {adding ? 'Annuleren' : '+ Toevoegen'}
          </button>
        </div>

        {adding && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-muted font-medium mb-1">Subgroep</label>
              <select
                value={subgroup}
                onChange={e => setSubgroup(e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground"
              >
                {SUBGROUPS.map(sg => (
                  <option key={sg} value={sg}>{sg}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-muted font-medium mb-1">Doel *</label>
              <input
                type="text"
                placeholder="Bijv. Kampioen worden in de competitie"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted/50"
              />
            </div>
            <div>
              <label className="block text-xs text-muted font-medium mb-1">Toelichting</label>
              <textarea
                rows={2}
                placeholder="Omschrijf het doel nader..."
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted/50 resize-none"
              />
            </div>
            <div>
              <label className="block text-xs text-muted font-medium mb-1">Tijdlijn</label>
              <input
                type="text"
                placeholder="Bijv. Eind seizoen, Winterstop"
                value={form.timeline}
                onChange={e => setForm(f => ({ ...f, timeline: e.target.value }))}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted/50"
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

      {/* Goals per subgroup */}
      {loading ? (
        <p className="text-sm text-muted">Laden...</p>
      ) : (
        <div className="space-y-6">
          {SUBGROUPS.map(sg => (
            (bySubgroup[sg]?.length ?? 0) > 0 && (
              <div key={sg}>
                <h4 className="text-sm font-semibold text-muted uppercase tracking-wide mb-3">{sg}</h4>
                <div className="space-y-2">
                  {bySubgroup[sg]!.map(goal => (
                    <div
                      key={goal.id}
                      className="bg-card border border-border rounded-xl p-4 flex items-start justify-between gap-4"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-foreground text-sm">{goal.title}</p>
                        {goal.description && (
                          <p className="text-xs text-muted mt-1">{goal.description}</p>
                        )}
                        {goal.timeline && (
                          <p className="text-xs text-accent mt-1">Tijdlijn: {goal.timeline}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-xs px-2 py-1 rounded-full ${STATUS_COLORS[goal.status]}`}>
                          {STATUS_LABELS[goal.status]}
                        </span>
                        <select
                          value={goal.status}
                          onChange={e => updateStatus(goal.id, e.target.value as OutcomeGoal['status'])}
                          className="text-xs bg-background border border-border rounded-lg px-2 py-1 text-foreground"
                        >
                          <option value="draft">Concept</option>
                          <option value="presented">Gepresenteerd</option>
                          <option value="selected">Selecteer (max 3)</option>
                          <option value="approved">Goedgekeurd</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          ))}
          {goals.length === 0 && (
            <p className="text-sm text-muted text-center py-8">
              Nog geen doelen ingevoerd. Klik op "Toevoegen" om te beginnen.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
