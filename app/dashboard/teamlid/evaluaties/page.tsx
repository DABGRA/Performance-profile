'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { EvaluationCampaign, QuestionnaireDefinition, QuestionnaireQuestion, QuestionnaireSubscale } from '@/lib/types/evaluations'
import EvaluatieInvulForm from '@/components/evaluaties/invul-form'

type CampaignWithDetails = EvaluationCampaign & {
  questionnaire: QuestionnaireDefinition
  team: { id: string; name: string }
  already_submitted?: boolean
}

export default function TeamlidEvaluatiesPage() {
  const supabase = createClient()
  const [campaigns, setCampaigns] = useState<CampaignWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCampaign, setActiveCampaign] = useState<CampaignWithDetails | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    loadCampaigns()
  }, [])

  async function loadCampaigns() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    setUserId(user?.id ?? null)

    // Get teams this user is member of
    const { data: memberships } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', user?.id ?? '')

    const teamIds = memberships?.map(m => m.team_id) ?? []
    if (teamIds.length === 0) { setLoading(false); return }

    const { data: campsData } = await supabase
      .from('evaluation_campaigns')
      .select(`*, questionnaire:questionnaire_definitions(*), team:teams(id, name)`)
      .in('team_id', teamIds)
      .in('status', ['sent', 'in_progress'])
      .order('created_at', { ascending: false })

    // Check which ones this user already submitted
    if (campsData && campsData.length > 0) {
      const { data: responses } = await supabase
        .from('evaluation_responses')
        .select('campaign_id')
        .eq('teamlid_id', user?.id ?? '')
        .in('campaign_id', campsData.map(c => c.id))

      const submittedIds = new Set(responses?.map(r => r.campaign_id) ?? [])
      const enriched = campsData.map(c => ({
        ...c,
        already_submitted: submittedIds.has(c.id),
      })) as CampaignWithDetails[]
      setCampaigns(enriched)
    } else {
      setCampaigns([])
    }
    setLoading(false)
  }

  const statusLabel = (c: CampaignWithDetails) => {
    if (c.already_submitted) return { label: 'Ingevuld', color: 'bg-green-100 text-green-700' }
    return { label: 'Open', color: 'bg-blue-100 text-blue-700' }
  }

  if (activeCampaign) {
    return (
      <EvaluatieInvulForm
        campaign={activeCampaign}
        userId={userId!}
        onBack={() => { setActiveCampaign(null); loadCampaigns() }}
      />
    )
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Evaluaties</h1>
        <p className="text-muted mt-1 text-sm">Jouw openstaande vragenlijsten</p>
      </div>

      {loading ? (
        <div className="text-center py-16 text-muted">Laden...</div>
      ) : campaigns.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-xl">
          <p className="text-muted">Er zijn momenteel geen open vragenlijsten voor jou.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map(c => {
            const status = statusLabel(c)
            return (
              <div key={c.id} className="bg-card border border-border rounded-xl p-5 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="font-semibold text-foreground">{c.questionnaire?.name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${status.color}`}>{status.label}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-accent text-muted font-mono">{c.period}</span>
                  </div>
                  <p className="text-sm text-muted">
                    {(c as any).team?.name}
                    {c.label && <span> · {c.label}</span>}
                    {c.deadline && <span> · Deadline: {new Date(c.deadline).toLocaleDateString('nl-NL')}</span>}
                  </p>
                  <p className="text-xs text-muted mt-1">{c.questionnaire?.total_questions} vragen · Schaal {c.questionnaire?.likert_min}–{c.questionnaire?.likert_max}</p>
                </div>
                <div>
                  {c.already_submitted ? (
                    <span className="text-xs text-muted">Bedankt voor je inzending</span>
                  ) : (
                    <button onClick={() => setActiveCampaign(c)}
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
                      Invullen
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
