'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { ProcessGoal, PerformanceGoal } from '@/lib/types/goals'

interface Props {
  teamId: string
  userId: string
  performanceGoals: PerformanceGoal[]
}

export function ProcessGoalsWorkshop({ teamId, userId, performanceGoals }: Props) {
  const [processGoals, setProcessGoals] = useState<ProcessGoal[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPerfGoal, setSelectedPerfGoal] = useState(performanceGoals[0]?.id ?? '')
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({
    title: '',
    description: '',
    task: '',
    assigned_role: '',
    context_situation: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()

  useEffect(() => { loadProcessGoals() }, [teamId])

  async function loadProcessGoals() {
    setLoading(true)
    const perfIds = performanceGoals.map(g => g.id)
    if (perfIds.length === 0) { setLoading(false); return }
    const { data } = await supabase
      .from('process_goals')
      .select('*')
      .in('performance_goal_id', perfIds)
      .order('created_at', { ascending: true })
    setProcessGoals(data ?? [])
    setLoading(false)
  }

  async function addProcessGoal() {
    if (!form.title.trim()) return setError('Vul een titel in')
    if (!selectedPerfGoal) return setError('Selecteer een performance goal')
    setSaving(true)
    setError('')
    const { error: err } = await supabase.from('process_goals').insert({
      performance_goal_id: selectedPerfGoal,
      title: form.title,
      description: form.description,
      task: form.task,
      assigned_role: form.assigned_role,
      context_situation: form.context_situation,
      created_by: userId,
    })
    if (err) setError(err.message)
    else {
      setForm({ title: '', description: '', task: '', assigned_role: '', context_situation: '' })
      setAdding(false)
      await loadProcessGoals()
    }
    setSaving(false)
  }

  async function deleteProcessGoal(id: string) {
    await supabase.from('process_goals').delete().eq('id', id)
    await loadProcessGoals()
  }

  const activePerformanceGoals = performanceGoals.filter(
    g => g.status === 'selected' || g.status === 'approved'
  )

  return (
    <div className="space-y-8">
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {activePerformanceGoals.length === 0 && (
        <div className="bg-card border border-border rounded-xl p-6 text-center">
          <p className="text-sm text-muted">
            Geen goedgekeurde performance goals gevonden. Selecteer eerst performance goals in fase 2.
          </p>
        </div>
      )}

      {/* Add Process Goal */}
      {activePerformanceGoals.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">Nieuw Process Goal invoeren</h3>
            <button onClick={() => setAdding(!adding)} className="text-sm text-primary hover:underline">
              {adding ? 'Annuleren' : '+ Toevoegen'}
            </button>
          </div>

          {adding && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-muted font-medium mb-1">Gekoppeld aan Performance Goal *</label>
                <select
                  value={selectedPerfGoal}
                  onChange={e => setSelectedPerfGoal(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground"
                >
                  {activePerformanceGoals.map(g => (
                    <option key={g.id} value={g.id}>{g.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-muted font-medium mb-1">Process Goal *</label>
                <input
                  type="text"
                  placeholder="Bijv. Drukzetten na balverlies"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted/50"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-muted font-medium mb-1">Taak</label>
                  <input
                    type="text"
                    placeholder="Wat moet er concreet gedaan worden?"
                    value={form.task}
                    onChange={e => setForm(f => ({ ...f, task: e.target.value }))}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted/50"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted font-medium mb-1">Rol / Verantwoordelijke</label>
                  <input
                    type="text"
                    placeholder="Bijv. Aanvallers, Hele team"
                    value={form.assigned_role}
                    onChange={e => setForm(f => ({ ...f, assigned_role: e.target.value }))}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted/50"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-muted font-medium mb-1">Context / Situatie</label>
                <input
                  type="text"
                  placeholder="In welke situatie? Bijv. Na eigen balverlies in de opbouw"
                  value={form.context_situation}
                  onChange={e => setForm(f => ({ ...f, context_situation: e.target.value }))}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted/50"
                />
              </div>
              <button
                onClick={addProcessGoal}
                disabled={saving}
                className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {saving ? 'Opslaan...' : 'Process goal opslaan'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Process Goals per Performance Goal */}
      {loading ? (
        <p className="text-sm text-muted">Laden...</p>
      ) : (
        <div className="space-y-6">
          {activePerformanceGoals.map(pg => {
            const pgProcessGoals = processGoals.filter(p => p.performance_goal_id === pg.id)
            return (
              <div key={pg.id} className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="bg-primary/10 border-b border-border px-5 py-3">
                  <p className="font-semibold text-foreground text-sm">{pg.title}</p>
                  {pg.measurable_component && (
                    <p className="text-xs text-muted mt-0.5">Meetbaar: {pg.measurable_component}</p>
                  )}
                </div>
                <div className="p-4 space-y-2">
                  {pgProcessGoals.length === 0 && (
                    <p className="text-xs text-muted italic">Nog geen process goals voor dit doel.</p>
                  )}
                  {pgProcessGoals.map(pg_process => (
                    <div key={pg_process.id} className="flex items-start justify-between gap-3 py-2 border-b border-border/50 last:border-0">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">{pg_process.title}</p>
                        <div className="flex flex-wrap gap-3 mt-1">
                          {pg_process.task && (
                            <span className="text-xs text-muted">Taak: {pg_process.task}</span>
                          )}
                          {pg_process.assigned_role && (
                            <span className="text-xs text-accent">Rol: {pg_process.assigned_role}</span>
                          )}
                          {pg_process.context_situation && (
                            <span className="text-xs text-muted">Context: {pg_process.context_situation}</span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => deleteProcessGoal(pg_process.id)}
                        className="text-xs text-muted hover:text-destructive transition-colors shrink-0"
                      >
                        Verwijder
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
