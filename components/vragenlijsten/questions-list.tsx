'use client'

import type { QuestionnaireQuestion, QuestionnaireSubscale, QuestionnaireDefinition } from '@/lib/types/evaluations'

interface Props {
  questions: QuestionnaireQuestion[]
  subscales: QuestionnaireSubscale[]
  questionnaire: QuestionnaireDefinition
  onUpdate: () => void
  onGenerate: () => void
  bulkLoading: boolean
  supabase: ReturnType<typeof import('@/lib/supabase/client').createClient>
}

export default function QuestionsList({ questions, subscales, questionnaire, onUpdate, onGenerate, bulkLoading, supabase }: Props) {
  const { useState } = require('react')
  const [editingQuestion, setEditingQuestion] = useState<QuestionnaireQuestion | null>(null)

  async function updateQuestion(q: QuestionnaireQuestion) {
    await supabase.from('questionnaire_questions').update({
      question_text: q.question_text,
      is_reversed: q.is_reversed,
      subscale_id: q.subscale_id,
      help_text: q.help_text,
      is_active: q.is_active,
    }).eq('id', q.id)
    setEditingQuestion(null)
    onUpdate()
  }

  return (
    <div>
      {questions.length < questionnaire.total_questions && (
        <div className="mb-4 p-4 bg-accent rounded-lg flex items-center justify-between">
          <p className="text-sm text-foreground">
            {questionnaire.total_questions - questions.length} vragen nog niet aangemaakt.
          </p>
          <button onClick={onGenerate} disabled={bulkLoading}
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
                  <span className="text-xs text-muted-foreground">Bewerken</span>
                </div>
                <textarea
                  value={editingQuestion.question_text}
                  onChange={e => setEditingQuestion((eq: QuestionnaireQuestion | null) => eq ? { ...eq, question_text: e.target.value } : null)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:border-primary resize-none"
                  rows={2}
                />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">Subscale</label>
                    <select
                      value={editingQuestion.subscale_id ?? ''}
                      onChange={e => setEditingQuestion((eq: QuestionnaireQuestion | null) => eq ? { ...eq, subscale_id: e.target.value || null } : null)}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:border-primary"
                    >
                      <option value="">Geen subscale</option>
                      {subscales.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">Help tekst</label>
                    <input
                      value={editingQuestion.help_text ?? ''}
                      onChange={e => setEditingQuestion((eq: QuestionnaireQuestion | null) => eq ? { ...eq, help_text: e.target.value || null } : null)}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:border-primary"
                      placeholder="Toelichting bij vraag..."
                    />
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={editingQuestion.is_reversed}
                      onChange={e => setEditingQuestion((eq: QuestionnaireQuestion | null) => eq ? { ...eq, is_reversed: e.target.checked } : null)}
                      className="w-4 h-4 accent-primary" />
                    <span className="text-sm text-foreground">Omgekeerd scoren (recode)</span>
                    <span className="text-xs text-muted-foreground">({questionnaire.likert_max + questionnaire.likert_min} - score)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={editingQuestion.is_active}
                      onChange={e => setEditingQuestion((eq: QuestionnaireQuestion | null) => eq ? { ...eq, is_active: e.target.checked } : null)}
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
                <span className="text-sm font-bold text-primary w-8 shrink-0">#{q.question_number}</span>
                <p className="text-sm text-foreground flex-1 min-w-0 truncate">{q.question_text}</p>
                <div className="flex items-center gap-2 shrink-0">
                  {q.subscale_id && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-accent text-muted-foreground">
                      {subscales.find(s => s.id === q.subscale_id)?.name ?? 'Subscale'}
                    </span>
                  )}
                  {q.is_reversed && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400 font-medium">recode</span>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
