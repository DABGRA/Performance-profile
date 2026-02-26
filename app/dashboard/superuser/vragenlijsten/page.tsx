'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { QuestionnaireDefinition } from '@/lib/types/evaluations'
import Link from 'next/link'

export default function VragenlijstenPage() {
  const [questionnaires, setQuestionnaires] = useState<QuestionnaireDefinition[]>([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [form, setForm] = useState({
    name: '', description: '', questionnaire_key: '', version: 'v1.0',
    total_questions: 20, likert_min: 1, likert_max: 5,
    scoring_method: 'average', has_special_chart: false, chart_type: '',
  })
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    loadQuestionnaires()
  }, [])

  async function loadQuestionnaires() {
    setLoading(true)
    const { data } = await supabase
      .from('questionnaire_definitions')
      .select('*')
      .order('created_at', { ascending: false })
    setQuestionnaires(data ?? [])
    setLoading(false)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await supabase.from('questionnaire_definitions').insert({
      ...form,
      chart_type: form.chart_type || null,
    })
    setSaving(false)
    setShowNew(false)
    setForm({ name: '', description: '', questionnaire_key: '', version: 'v1.0', total_questions: 20, likert_min: 1, likert_max: 5, scoring_method: 'average', has_special_chart: false, chart_type: '' })
    loadQuestionnaires()
  }

  async function toggleActive(q: QuestionnaireDefinition) {
    await supabase.from('questionnaire_definitions').update({ is_active: !q.is_active }).eq('id', q.id)
    loadQuestionnaires()
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Vragenlijsten</h1>
          <p className="text-muted mt-1 text-sm">Beheer vragenlijsten, vragen, subscales en berekeningslogica</p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Nieuwe vragenlijst
        </button>
      </div>

      {showNew && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl p-6 w-full max-w-lg shadow-xl">
            <h2 className="text-lg font-semibold text-foreground mb-4">Nieuwe vragenlijst aanmaken</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Naam *</label>
                <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary" placeholder="bijv. Motivatie Vragenlijst" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Sleutel (unieke code) *</label>
                <input required value={form.questionnaire_key} onChange={e => setForm(f => ({ ...f, questionnaire_key: e.target.value.toLowerCase().replace(/\s/g, '_') }))}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary" placeholder="bijv. motivatie" />
                <p className="text-xs text-muted mt-1">Kleine letters, geen spaties (gebruik _)</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Beschrijving</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary" rows={2} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Aantal vragen</label>
                  <input type="number" min={1} max={50} value={form.total_questions} onChange={e => setForm(f => ({ ...f, total_questions: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Schaal min</label>
                  <input type="number" min={1} max={3} value={form.likert_min} onChange={e => setForm(f => ({ ...f, likert_min: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Schaal max</label>
                  <input type="number" min={4} max={10} value={form.likert_max} onChange={e => setForm(f => ({ ...f, likert_max: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Berekeningswijze</label>
                <select value={form.scoring_method} onChange={e => setForm(f => ({ ...f, scoring_method: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                  <option value="average">Gemiddelde</option>
                  <option value="sum">Sommatie</option>
                  <option value="weighted">Gewogen</option>
                </select>
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" id="special_chart" checked={form.has_special_chart} onChange={e => setForm(f => ({ ...f, has_special_chart: e.target.checked }))}
                  className="w-4 h-4 accent-primary" />
                <label htmlFor="special_chart" className="text-sm text-foreground">Speciale grafiek (bijv. motivatie)</label>
              </div>
              {form.has_special_chart && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Grafiektype</label>
                  <input value={form.chart_type} onChange={e => setForm(f => ({ ...f, chart_type: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary" placeholder="bijv. custom_motivation" />
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving}
                  className="flex-1 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
                  {saving ? 'Opslaan...' : 'Aanmaken'}
                </button>
                <button type="button" onClick={() => setShowNew(false)}
                  className="flex-1 py-2 border border-border text-foreground rounded-lg text-sm hover:bg-accent transition-colors">
                  Annuleren
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-16 text-muted">Laden...</div>
      ) : questionnaires.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-xl">
          <p className="text-muted">Nog geen vragenlijsten aangemaakt.</p>
          <button onClick={() => setShowNew(true)} className="mt-3 text-sm text-primary hover:underline">
            Maak je eerste vragenlijst aan
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {questionnaires.map(q => (
            <div key={q.id} className="bg-card border border-border rounded-xl p-5 flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-foreground truncate">{q.name}</h3>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-accent text-muted font-mono">{q.questionnaire_key}</span>
                  <span className="text-xs text-muted">{q.version}</span>
                  {!q.is_active && <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/10 text-destructive">Inactief</span>}
                  {q.has_special_chart && <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">Speciale grafiek</span>}
                </div>
                <p className="text-sm text-muted">
                  {q.total_questions} vragen · Schaal {q.likert_min}–{q.likert_max} · {q.scoring_method}
                </p>
                {q.description && <p className="text-xs text-muted mt-1 truncate">{q.description}</p>}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Link href={`/dashboard/superuser/vragenlijsten/${q.id}`}
                  className="px-3 py-1.5 border border-border text-foreground rounded-lg text-xs hover:bg-accent transition-colors">
                  Vragen beheren
                </Link>
                <button onClick={() => toggleActive(q)}
                  className="px-3 py-1.5 border border-border text-foreground rounded-lg text-xs hover:bg-accent transition-colors">
                  {q.is_active ? 'Deactiveren' : 'Activeren'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
