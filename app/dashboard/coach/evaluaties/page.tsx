'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { EvaluationCampaign, QuestionnaireDefinition } from '@/lib/types/evaluations'

type Team = { id: string; name: string }

export default function CoachEvaluatiesPage() {
  const supabase = createClient()
  const [teams, setTeams] = useState<Team[]>([])
  const [questionnaires, setQuestionnaires] = useState<QuestionnaireDefinition[]>([])
  const [campaigns, setCampaigns] = useState<(EvaluationCampaign & { questionnaire: QuestionnaireDefinition; team: Team })[]>([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [form, setForm] = useState({ team_id: '', questionnaire_id: '', period: 't0', label: '', deadline: '' })
  const [saving, setSaving] = useState(false)
  const [calculating, setCalculating] = useState<string | null>(null)
  const [summaries, setSummaries] = useState<Record<string, { team_avg: number; response_count: number; subscale_averages: Record<string, number> | null; u3_score: number | null }>>({})

  useEffect(() => {
    loadAll()
  }, [])

  async function loadAll() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    setUserId(user?.id ?? null)

    const [{ data: teamsData }, { data: qData }, { data: campsData }] = await Promise.all([
      supabase.from('teams').select('id, name').eq('coach_id', user?.id ?? ''),
      supabase.from('questionnaire_definitions').select('*').eq('is_active', true),
      supabase.from('evaluation_campaigns').select(`*, questionnaire:questionnaire_definitions(*), team:teams(id, name)`)
        .order('created_at', { ascending: false }),
    ])
    setTeams(teamsData ?? [])
    setQuestionnaires(qData ?? [])
    setCampaigns(campsData as any ?? [])
    setLoading(false)
  }

  async function createCampaign(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await supabase.from('evaluation_campaigns').insert({
      ...form,
      deadline: form.deadline || null,
      created_by: userId,
      status: 'draft',
    })
    setSaving(false)
    setShowNew(false)
    setForm({ team_id: '', questionnaire_id: '', period: 't0', label: '', deadline: '' })
    loadAll()
  }

  async function closeCampaignAndCalculate(id: string) {
    setCalculating(id)
    const update: Record<string, unknown> = { status: 'closed', closed_at: new Date().toISOString() }
    await supabase.from('evaluation_campaigns').update(update).eq('id', id)
    const res = await fetch('/api/evaluaties/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campaign_id: id }),
    })
    const data = await res.json()
    if (res.ok) {
      setSummaries(prev => ({ ...prev, [id]: data }))
    }
    setCalculating(null)
    loadAll()
  }


    const update: Record<string, unknown> = { status }
    if (status === 'sent') update.sent_at = new Date().toISOString()
    if (status === 'closed') update.closed_at = new Date().toISOString()
    await supabase.from('evaluation_campaigns').update(update).eq('id', id)
    loadAll()
  }

  const statusLabel = (s: string) => ({ draft: 'Concept', sent: 'Verzonden', in_progress: 'Bezig', closed: 'Gesloten' }[s] ?? s)
  const statusColor = (s: string) => ({
    draft: 'bg-accent text-muted',
    sent: 'bg-blue-100 text-blue-700',
    in_progress: 'bg-yellow-100 text-yellow-700',
    closed: 'bg-green-100 text-green-700',
  }[s] ?? 'bg-accent text-muted')

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Evaluaties</h1>
          <p className="text-muted mt-1 text-sm">Stuur vragenlijsten naar teams en volg de voortgang</p>
        </div>
        <button onClick={() => setShowNew(true)}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
          Nieuwe campagne
        </button>
      </div>

      {showNew && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl p-6 w-full max-w-lg shadow-xl">
            <h2 className="text-lg font-semibold text-foreground mb-4">Evaluatiecampagne aanmaken</h2>
            <form onSubmit={createCampaign} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Team *</label>
                <select required value={form.team_id} onChange={e => setForm(f => ({ ...f, team_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                  <option value="">Selecteer team...</option>
                  {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Vragenlijst *</label>
                <select required value={form.questionnaire_id} onChange={e => setForm(f => ({ ...f, questionnaire_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                  <option value="">Selecteer vragenlijst...</option>
                  {questionnaires.map(q => <option key={q.id} value={q.id}>{q.name} ({q.total_questions} vragen)</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Periode *</label>
                  <input required value={form.period} onChange={e => setForm(f => ({ ...f, period: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="bijv. t0, t1, t2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Deadline (optioneel)</label>
                  <input type="date" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Label (optioneel)</label>
                <input value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="bijv. Na wedstrijd 5, November 2024" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving}
                  className="flex-1 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50">
                  {saving ? 'Aanmaken...' : 'Aanmaken'}
                </button>
                <button type="button" onClick={() => setShowNew(false)}
                  className="flex-1 py-2 border border-border text-foreground rounded-lg text-sm hover:bg-accent">
                  Annuleren
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-16 text-muted">Laden...</div>
      ) : campaigns.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-xl">
          <p className="text-muted">Nog geen evaluatiecampagnes aangemaakt.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map(c => (
            <div key={c.id} className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="font-semibold text-foreground">{c.questionnaire?.name ?? 'Onbekend'}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(c.status)}`}>
                      {statusLabel(c.status)}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-accent text-muted font-mono">{c.period}</span>
                  </div>
                  <p className="text-sm text-muted">
                    {(c as any).team?.name ?? 'Onbekend team'}
                    {c.label && <span> · {c.label}</span>}
                    {c.deadline && <span> · Deadline: {new Date(c.deadline).toLocaleDateString('nl-NL')}</span>}
                  </p>
                  <p className="text-xs text-muted mt-1">
                    Aangemaakt: {new Date(c.created_at).toLocaleDateString('nl-NL')}
                    {c.sent_at && ` · Verzonden: ${new Date(c.sent_at).toLocaleDateString('nl-NL')}`}
                    {c.closed_at && ` · Gesloten: ${new Date(c.closed_at).toLocaleDateString('nl-NL')}`}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {c.status === 'draft' && (
                    <button onClick={() => updateStatus(c.id, 'sent')}
                      className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:opacity-90">
                      Verzenden
                    </button>
                  )}
                  {(c.status === 'sent' || c.status === 'in_progress') && (
                    <button onClick={() => closeCampaignAndCalculate(c.id)} disabled={calculating === c.id}
                      className="px-3 py-1.5 border border-border text-foreground rounded-lg text-xs hover:bg-accent disabled:opacity-50">
                      {calculating === c.id ? 'Berekenen...' : 'Sluiten & berekenen'}
                    </button>
                  )}
                  {c.status === 'closed' && summaries[c.id] && (
                    <div className="text-xs text-muted">
                      Gem: <strong className="text-foreground">{summaries[c.id].team_avg.toFixed(2)}</strong>
                      {summaries[c.id].u3_score !== null && <span> · U3: {summaries[c.id].u3_score}%</span>}
                      <span> · {summaries[c.id].response_count} resp.</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
