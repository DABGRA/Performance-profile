'use client'

import { useState } from 'react'
import type { QuestionnaireQuestion, QuestionnaireSubscale } from '@/lib/types/evaluations'

interface Props {
  subscales: QuestionnaireSubscale[]
  questions: QuestionnaireQuestion[]
  questionnaireId: string
  onUpdate: () => void
  supabase: ReturnType<typeof import('@/lib/supabase/client').createClient>
}

const emptyForm = { name: '', subscale_key: '', color: '#3B82F6', scoring_method: 'average', description: '' }

export default function SubscalesList({ subscales, questions, questionnaireId, onUpdate, supabase }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)

  async function createSubscale(e: React.FormEvent) {
    e.preventDefault()
    await supabase.from('questionnaire_subscales').insert({
      questionnaire_id: questionnaireId,
      ...form,
      display_order: subscales.length,
    })
    setShowForm(false)
    setForm(emptyForm)
    onUpdate()
  }

  async function deleteSubscale(subId: string) {
    await supabase.from('questionnaire_subscales').delete().eq('id', subId)
    onUpdate()
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90">
          Subscale toevoegen
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-lg font-semibold text-foreground mb-4">Subscale toevoegen</h2>
            <form onSubmit={createSubscale} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Naam *</label>
                <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:border-primary" placeholder="bijv. Intrinsieke motivatie" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Sleutel *</label>
                <input required value={form.subscale_key} onChange={e => setForm(f => ({ ...f, subscale_key: e.target.value.toLowerCase().replace(/\s/g, '_') }))}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:border-primary" placeholder="bijv. intrinsic" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Beschrijving</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:border-primary" rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Kleur</label>
                  <input type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                    className="w-full h-10 border border-border rounded-lg bg-background cursor-pointer" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Berekening</label>
                  <select value={form.scoring_method} onChange={e => setForm(f => ({ ...f, scoring_method: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:border-primary">
                    <option value="average">Gemiddelde</option>
                    <option value="sum">Sommatie</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90">Toevoegen</button>
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2 border border-border text-foreground rounded-lg text-sm hover:bg-accent">Annuleren</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {subscales.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border rounded-xl">
          <p className="text-muted-foreground text-sm">Nog geen subscales gedefinieerd.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {subscales.map(s => (
            <div key={s.id} className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
              <div className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: s.color ?? '#6B7280' }} />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground">{s.name}</p>
                <p className="text-xs text-muted-foreground font-mono">{s.subscale_key} · {s.scoring_method}</p>
                {s.description && <p className="text-xs text-muted-foreground mt-0.5 truncate">{s.description}</p>}
              </div>
              <div className="text-xs text-muted-foreground">
                {questions.filter(q => q.subscale_id === s.id).length} vragen
              </div>
              <button onClick={() => deleteSubscale(s.id)} className="text-xs text-destructive hover:underline">Verwijderen</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
