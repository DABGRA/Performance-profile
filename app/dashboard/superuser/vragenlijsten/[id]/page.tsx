'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { QuestionnaireDefinition, QuestionnaireSubscale, QuestionnaireQuestion } from '@/lib/types/evaluations'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import QuestionsList from '@/components/vragenlijsten/questions-list'
import SubscalesList from '@/components/vragenlijsten/subscales-list'

export default function VragenlijstDetailPage() {
  const { id } = useParams<{ id: string }>()
  const supabase = createClient()

  const [questionnaire, setQuestionnaire] = useState<QuestionnaireDefinition | null>(null)
  const [subscales, setSubscales] = useState<QuestionnaireSubscale[]>([])
  const [questions, setQuestions] = useState<QuestionnaireQuestion[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'questions' | 'subscales'>('questions')
  const [bulkLoading, setBulkLoading] = useState(false)

  const loadAll = useCallback(async () => {
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
  }, [id])

  useEffect(() => { loadAll() }, [loadAll])

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
    if (toCreate.length > 0) await supabase.from('questionnaire_questions').insert(toCreate)
    setBulkLoading(false)
    loadAll()
  }

  if (loading) return <div className="p-8 text-muted-foreground">Laden...</div>
  if (!questionnaire) return <div className="p-8 text-muted-foreground">Vragenlijst niet gevonden.</div>

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <Link href="/dashboard/superuser/vragenlijsten" className="text-sm text-muted-foreground hover:text-foreground transition-colors mb-2 inline-block">
          &larr; Terug naar vragenlijsten
        </Link>
        <h1 className="text-2xl font-bold text-foreground">{questionnaire.name}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {questionnaire.total_questions} vragen · Schaal {questionnaire.likert_min}–{questionnaire.likert_max} · {questionnaire.scoring_method}
          {questionnaire.has_special_chart && <span className="ml-2 text-primary">· Speciale grafiek</span>}
        </p>
      </div>

      <div className="flex gap-1 mb-6 border-b border-border">
        {(['questions', 'subscales'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${activeTab === tab ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
            {tab === 'questions' ? `Vragen (${questions.length}/${questionnaire.total_questions})` : `Subscales (${subscales.length})`}
          </button>
        ))}
      </div>

      {activeTab === 'questions' && (
        <QuestionsList
          questions={questions}
          subscales={subscales}
          questionnaire={questionnaire}
          onUpdate={loadAll}
          onGenerate={generateQuestions}
          bulkLoading={bulkLoading}
          supabase={supabase}
        />
      )}

      {activeTab === 'subscales' && (
        <SubscalesList
          subscales={subscales}
          questions={questions}
          questionnaireId={id}
          onUpdate={loadAll}
          supabase={supabase}
        />
      )}
    </div>
  )
}
