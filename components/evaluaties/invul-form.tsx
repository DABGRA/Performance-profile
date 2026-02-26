'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { EvaluationCampaign, QuestionnaireDefinition, QuestionnaireQuestion, QuestionnaireSubscale } from '@/lib/types/evaluations'

type Props = {
  campaign: EvaluationCampaign & { questionnaire: QuestionnaireDefinition }
  userId: string
  onBack: () => void
}

export default function EvaluatieInvulForm({ campaign, userId, onBack }: Props) {
  const supabase = createClient()
  const [questions, setQuestions] = useState<QuestionnaireQuestion[]>([])
  const [subscales, setSubscales] = useState<QuestionnaireSubscale[]>([])
  const [responses, setResponses] = useState<Record<number, number>>({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [currentPage, setCurrentPage] = useState(0)
  const QUESTIONS_PER_PAGE = 5

  const q = campaign.questionnaire
  const likertMin = q.likert_min
  const likertMax = q.likert_max
  const range = Array.from({ length: likertMax - likertMin + 1 }, (_, i) => i + likertMin)
  const likertLabels: Record<number, string> = q.likert_labels ?? {}
  const minLabel = likertLabels[likertMin] ?? `${likertMin}`
  const maxLabel = likertLabels[likertMax] ?? `${likertMax}`

  useEffect(() => {
    loadQuestions()
  }, [])

  async function loadQuestions() {
    setLoading(true)
    const [{ data: qs }, { data: subs }] = await Promise.all([
      supabase.from('questionnaire_questions')
        .select('*')
        .eq('questionnaire_id', campaign.questionnaire_id)
        .eq('is_active', true)
        .order('question_number'),
      supabase.from('questionnaire_subscales')
        .select('*')
        .eq('questionnaire_id', campaign.questionnaire_id)
        .order('display_order'),
    ])
    setQuestions(qs ?? [])
    setSubscales(subs ?? [])
    setLoading(false)
  }

  function calculateScores() {
    const questionsData = questions.filter(q => responses[q.question_number] !== undefined)
    const scoredResponses: Record<string, number> = {}

    let total = 0
    const subscaleRaw: Record<string, number[]> = {}

    for (const question of questionsData) {
      const raw = responses[question.question_number]
      const score = question.is_reversed ? (likertMax + likertMin) - raw : raw
      scoredResponses[String(question.question_number)] = raw

      total += score

      if (question.subscale_id) {
        const sub = subscales.find(s => s.id === question.subscale_id)
        if (sub) {
          if (!subscaleRaw[sub.subscale_key]) subscaleRaw[sub.subscale_key] = []
          subscaleRaw[sub.subscale_key].push(score)
        }
      }
    }

    const calculated_avg = questionsData.length > 0 ? total / questionsData.length : 0
    const subscale_scores: Record<string, number> = {}
    for (const [key, scores] of Object.entries(subscaleRaw)) {
      const sub = subscales.find(s => s.subscale_key === key)
      if (sub?.scoring_method === 'sum') {
        subscale_scores[key] = scores.reduce((a, b) => a + b, 0)
      } else {
        subscale_scores[key] = scores.reduce((a, b) => a + b, 0) / scores.length
      }
    }

    return {
      responses: scoredResponses,
      raw_total_score: total,
      calculated_avg: Math.round(calculated_avg * 1000) / 1000,
      subscale_scores: Object.keys(subscale_scores).length > 0 ? subscale_scores : null,
    }
  }

  async function handleSubmit() {
    const unanswered = questions.filter(q => responses[q.question_number] === undefined)
    if (unanswered.length > 0) {
      alert(`Je hebt nog ${unanswered.length} vragen niet beantwoord.`)
      return
    }

    setSubmitting(true)
    const scores = calculateScores()

    await supabase.from('evaluation_responses').upsert({
      campaign_id: campaign.id,
      teamlid_id: userId,
      ...scores,
      submitted_at: new Date().toISOString(),
    }, { onConflict: 'campaign_id,teamlid_id' })

    // Update campaign status to in_progress if still 'sent'
    await supabase.from('evaluation_campaigns')
      .update({ status: 'in_progress' })
      .eq('id', campaign.id)
      .eq('status', 'sent')

    setSubmitting(false)
    setSubmitted(true)
  }

  const activeQuestions = questions.filter(q => q.is_active)
  const totalPages = Math.ceil(activeQuestions.length / QUESTIONS_PER_PAGE)
  const pageQuestions = activeQuestions.slice(currentPage * QUESTIONS_PER_PAGE, (currentPage + 1) * QUESTIONS_PER_PAGE)
  const answeredCount = activeQuestions.filter(q => responses[q.question_number] !== undefined).length
  const progress = activeQuestions.length > 0 ? (answeredCount / activeQuestions.length) * 100 : 0

  if (submitted) {
    return (
      <div className="p-8 max-w-2xl mx-auto text-center">
        <div className="py-16">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Ingevuld!</h2>
          <p className="text-muted mb-6">Je antwoorden zijn opgeslagen. Bedankt voor het invullen.</p>
          <button onClick={onBack}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90">
            Terug naar overzicht
          </button>
        </div>
      </div>
    )
  }

  if (loading) return <div className="p-8 text-center text-muted">Vragen laden...</div>

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-6">
        <button onClick={onBack} className="text-sm text-muted hover:text-foreground transition-colors mb-3 inline-block">
          &larr; Terug
        </button>
        <h1 className="text-2xl font-bold text-foreground">{q.name}</h1>
        <p className="text-sm text-muted mt-1">
          {campaign.label && <span>{campaign.label} · </span>}
          {activeQuestions.length} vragen · Schaal {likertMin}–{likertMax}
        </p>
      </div>

      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex justify-between text-xs text-muted mb-1.5">
          <span>{answeredCount} van {activeQuestions.length} beantwoord</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-2 bg-accent rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Questions */}
      <div className="space-y-6 mb-8">
        {pageQuestions.map(question => {
          const subscale = subscales.find(s => s.id === question.subscale_id)
          const answered = responses[question.question_number]

          return (
            <div key={question.id} className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-start gap-3 mb-4">
                <span className="text-sm font-bold text-primary flex-shrink-0 mt-0.5">{question.question_number}.</span>
                <div className="flex-1">
                  <p className="text-sm text-foreground leading-relaxed">{question.question_text}</p>
                  {question.help_text && (
                    <p className="text-xs text-muted mt-1">{question.help_text}</p>
                  )}
                  {subscale && (
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: subscale.color ?? '#6B7280' }} />
                      <span className="text-xs text-muted">{subscale.name}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-muted w-28 text-right leading-tight">{minLabel}</span>
                {range.map(val => (
                  <button
                    key={val}
                    onClick={() => setResponses(r => ({ ...r, [question.question_number]: val }))}
                    title={likertLabels[val] ?? String(val)}
                    className={`w-10 h-10 rounded-full text-sm font-medium transition-all ${answered === val
                      ? 'bg-primary text-primary-foreground scale-110 shadow-md'
                      : 'bg-accent text-foreground hover:bg-primary/20 border border-border'
                    }`}
                  >
                    {val}
                  </button>
                ))}
                <span className="text-xs text-muted w-28 leading-tight">{maxLabel}</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Pagination + submit */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
          disabled={currentPage === 0}
          className="px-4 py-2 border border-border text-foreground rounded-lg text-sm hover:bg-accent disabled:opacity-40"
        >
          Vorige
        </button>
        <span className="text-sm text-muted">Pagina {currentPage + 1} van {totalPages}</span>
        {currentPage < totalPages - 1 ? (
          <button
            onClick={() => setCurrentPage(p => p + 1)}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90"
          >
            Volgende
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={submitting || answeredCount < activeQuestions.length}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? 'Opslaan...' : `Versturen (${answeredCount}/${activeQuestions.length})`}
          </button>
        )}
      </div>
    </div>
  )
}
