'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { QuestionnaireDefinition, QuestionnaireSubscale, QuestionnaireQuestion } from '@/lib/types/evaluations'
import { useParams } from 'next/navigation'
import Link from 'next/link'

export default function VragenlijstDetailPage() {
  const { id } = useParams<{ id: string }>()
  const supabase = createClient()

  const [questionnaire, setQuestionnaire] = useState<QuestionnaireDefinition | null>(null)
  const [subscales, setSubscales] = useState<QuestionnaireSubscale[]>([])
  const [questions, setQuestions] = useState<QuestionnaireQuestion[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'questions' | 'subscales'>('questions')

  // Subscale form
  const [showSubscaleForm, setShowSubscaleForm] = useState(false)
  const [subscaleForm, setSubscaleForm] = useState({ name: '', subscale_key: '', color: '#3B82F6', scoring_method: 'average', description: '' })

  // Question batch edit
  const [editingQuestion, setEditingQuestion] = useState<QuestionnaireQuestion | null>(null)
  const [bulkLoading, setBulkLoading] = useState(false)

  useEffect(() => {
    loadAll()
  }, [id])

  async function loadAll() {
    setLoading(true)
    const [{ data: qDef }, { data: subs }, { data: qs }] = await Promise.all([
      supabase.from('questionnaire_definitions').select('*').eq('id', id).single(),
      supabase.from('questionnaire_subscales').select('*').eq('questionnaire_id', id).order('display_order'),
      supabase.from('questionnaire_questions').select('*').eq('questionnaire_id', id).order('question_number'),
    ])
    setQuestionnaire(qDef)
    setSubscales(subs ?? [])
    setQuestions(qs ?? [])
    setLoading(false)
  }

  async function generateQuestions() {
    if (!questionnaire) return
    setBulkLoading(true)
    const existing = questions.map(q => q.question_number)
    const toCreate = []
    for (let i = 1; i <= questionnaire.total_questions; i++) {
      if (!existing.includes(i)) {
        toCreate.push({ questionnaire_id: id, question_number: i, question_text: `Vraag ${i}`, is_reversed: false, is_active: true })
      }
    }
    if (toCreate.length > 0) {
      await supabase.from('questionnaire_questions').insert(toCreate)
    }
    setBulkLoading(false)
    loadAll()
  }

  async function updateQuestion(q: QuestionnaireQuestion) {
    await supabase.from('questionnaire_questions').update({
      question_text: q.question_text,
      is_reversed: q.is_reversed,
      subscale_id: q.subscale_id,
      help_text: q.help_text,
      is_active: q.is_active,
    }).eq('id', q.id)
    setEditingQuestion(null)
    loadAll()
  }

  async function createSubscale(e: React.FormEvent) {
    e.preventDefault()
    await supabase.from('questionnaire_subscales').insert({
      questionnaire_id: id,
      ...subscaleForm,
      display_order: subscales.length,
    })
    setShowSubscaleForm(false)
    setSubscaleForm({ name: '', subscale_key: '', color: '#3B82F6', scoring_method: 'average', description: '' })
    loadAll()
  }

  async function deleteSubscale(subId: string) {
    await supabase.from('questionnaire_subscales').delete().eq('id', subId)
    loadAll()
  }

  if (loading) return <div className="p-8 text-muted">Laden...</div>
  if (!questionnaire) return <div className="p-8 text-muted">Vragenlijst niet gevonden.</div>

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <Link href="/dashboard/superuser/vragenlijsten" className="text-sm text-muted hover:text-foreground transition-colors mb-2 inline-block">
          &larr; Terug naar vragenlijsten
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{questionnaire.name}</h1>
            <p className="text-sm text-muted mt-1">
              {questionnaire.total_questions} vragen · Schaal {questionnaire.likert_min}–{questionnaire.likert_max} · {questionnaire.scoring_method}
              {questionnaire.has_special_chart && <span className="ml-2 text-primary">· Speciale grafiek</span>}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-border">
        {(['questions', 'subscales'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${activeTab === tab ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-foreground'}`}>
            {tab === 'questions' ? `Vragen (${questions.length}/${questionnaire.total_questions})` : `Subscales (${subscales.length})`}
          </button>
        ))}
      </div>

      {activeTab === 'questions' && (
        <div>
          {questions.length < questionnaire.total_questions && (
            <div className="mb-4 p-4 bg-accent rounded-lg flex items-center justify-between">
              <p className="text-sm text-foreground">
                {questionnaire.total_questions - questions.length} vragen nog niet aangemaakt.
              </p>
              <button onClick={generateQuestions} disabled={bulkLoading}
                className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:opacity-90 disabled:opacity-50">
                {bulkLoading ? 'Aanmaken...' : 'Genereer alle vragen'}
              </button>
            </div>
          )}

          <div className="space-y-2">
            {questions.map(q => (
              <div key={q.id}>
                {editingQuestion?.id === q.id ? (
                  <div className="bg-card border-2 border-primary rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-bold text-primary w-8">#{q.question_number}</span>
                      <span className="text-xs text-muted">Bewerken</span>
                    </div>
                    <textarea
                      value={editingQuestion.question_text}
                      onChange={e => setEditingQuestion(eq => eq ? { ...eq, question_text: e.target.value } : null)}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      rows={2}
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-foreground mb-1">Subscale</label>
                        <select
                          value={editingQuestion.subscale_id ?? ''}
                          onChange={e => setEditingQuestion(eq => eq ? { ...eq, subscale_id: e.target.value || null } : null)}
                          className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                          <option value="">Geen subscale</option>
                          {subscales.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-foreground mb-1">Help tekst (optioneel)</label>
                        <input
                          value={editingQuestion.help_text ?? ''}
                          onChange={e => setEditingQuestion(eq => eq ? { ...eq, help_text: e.target.value || null } : null)}
                          className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                          placeholder="Toelichting bij vraag..."
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={editingQuestion.is_reversed}
                          onChange={e => setEditingQuestion(eq => eq ? { ...eq, is_reversed: e.target.checked } : null)}
                          className="w-4 h-4 accent-primary" />
                        <span className="text-sm text-foreground">Omgekeerd scoren (recode)</span>
                        <span className="text-xs text-muted">({questionnaire.likert_max + questionnaire.likert_min} - score)</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={editingQuestion.is_active}
                          onChange={e => setEditingQuestion(eq => eq ? { ...eq, is_active: e.target.checked } : null)}
                          className="w-4 h-4 accent-primary" />
                        <span className="text-sm text-foreground">Actief</span>
                      </label>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => updateQuestion(editingQuestion)}
                        className="px-4 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm hover:opacity-90">
                        Opslaan
                      </button>
                      <button onClick={() => setEditingQuestion(null)}
                        className="px-4 py-1.5 border border-border text-foreground rounded-lg text-sm hover:bg-accent">
                        Annuleren
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    className={`bg-card border border-border rounded-xl px-4 py-3 flex items-center gap-3 cursor-pointer hover:border-primary/50 transition-colors ${!q.is_active ? 'opacity-50' : ''}`}
                    onClick={() => setEditingQuestion({ ...q })}
                  >
                    <span className="text-sm font-bold text-primary w-8 flex-shrink-0">#{q.question_number}</span>
                    <p className="text-sm text-foreground flex-1 min-w-0 truncate">{q.question_text}</p>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {q.subscale_id && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-accent text-muted">
                          {subscales.find(s => s.id === q.subscale_id)?.name ?? 'Subscale'}
                        </span>
                      )}
                      {q.is_reversed && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 font-medium">recode</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'subscales' && (
        <div>
          <div className="flex justify-end mb-4">
            <button onClick={() => setShowSubscaleForm(true)}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90">
              Subscale toevoegen
            </button>
          </div>

          {showSubscaleForm && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-card rounded-xl p-6 w-full max-w-md shadow-xl">
                <h2 className="text-lg font-semibold text-foreground mb-4">Subscale toevoegen</h2>
                <form onSubmit={createSubscale} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Naam *</label>
                    <input required value={subscaleForm.name} onChange={e => setSubscaleForm(f => ({ ...f, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary" placeholder="bijv. Intrinsieke motivatie" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Sleutel *</label>
                    <input required value={subscaleForm.subscale_key} onChange={e => setSubscaleForm(f => ({ ...f, subscale_key: e.target.value.toLowerCase().replace(/\s/g, '_') }))}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary" placeholder="bijv. intrinsic" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Beschrijving</label>
                    <textarea value={subscaleForm.description} onChange={e => setSubscaleForm(f => ({ ...f, description: e.target.value }))}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary" rows={2} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Kleur (grafiek)</label>
                      <input type="color" value={subscaleForm.color} onChange={e => setSubscaleForm(f => ({ ...f, color: e.target.value }))}
                        className="w-full h-10 border border-border rounded-lg bg-background cursor-pointer" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Berekeningswijze</label>
                      <select value={subscaleForm.scoring_method} onChange={e => setSubscaleForm(f => ({ ...f, scoring_method: e.target.value }))}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                        <option value="average">Gemiddelde</option>
                        <option value="sum">Sommatie</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button type="submit" className="flex-1 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90">Toevoegen</button>
                    <button type="button" onClick={() => setShowSubscaleForm(false)} className="flex-1 py-2 border border-border text-foreground rounded-lg text-sm hover:bg-accent">Annuleren</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {subscales.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-border rounded-xl">
              <p className="text-muted text-sm">Nog geen subscales gedefinieerd.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {subscales.map(s => (
                <div key={s.id} className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
                  <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: s.color ?? '#6B7280' }} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground">{s.name}</p>
                    <p className="text-xs text-muted font-mono">{s.subscale_key} · {s.scoring_method}</p>
                    {s.description && <p className="text-xs text-muted mt-0.5 truncate">{s.description}</p>}
                  </div>
                  <div className="text-xs text-muted">
                    {questions.filter(q => q.subscale_id === s.id).length} vragen
                  </div>
                  <button onClick={() => deleteSubscale(s.id)} className="text-xs text-destructive hover:underline">Verwijderen</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
