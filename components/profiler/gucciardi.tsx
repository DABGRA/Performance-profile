'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Save, Share2, CheckCircle } from 'lucide-react'

interface GucciardiEntry {
  name: string
  definition_positive: string
  definition_negative: string
  opposite: string
  context_situation: string
  score: number // 1-7 (bipolar scale, 4 = neutral)
}

interface Props {
  onBack: () => void
}

const PERIOD_OPTIONS = ['t0', 't1', 't2', 't3', 't4', 't5', 't6', 't7', 't8', 't9', 't10']

const BIPOLAR_LABELS: Record<number, string> = {
  1: 'Volledig tegengestelde',
  2: 'Grotendeels tegengestelde',
  3: 'Licht tegengestelde',
  4: 'Neutraal',
  5: 'Licht kwaliteit',
  6: 'Grotendeels kwaliteit',
  7: 'Volledig kwaliteit',
}

function getBipolarColor(score: number) {
  if (score <= 2) return 'text-red-600'
  if (score === 3) return 'text-amber-500'
  if (score === 4) return 'text-muted'
  if (score === 5) return 'text-blue-500'
  return 'text-green-600'
}

export function GucciardiProfiler({ onBack }: Props) {
  const [period, setPeriod] = useState('t0')
  const [numQualities, setNumQualities] = useState(6)
  const [situations, setSituations] = useState('')
  const [entries, setEntries] = useState<GucciardiEntry[]>(
    Array.from({ length: 6 }, () => ({
      name: '', definition_positive: '', definition_negative: '',
      opposite: '', context_situation: '', score: 4,
    }))
  )
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [shared, setShared] = useState(false)

  const updateEntry = (index: number, field: keyof GucciardiEntry, value: string | number) => {
    setEntries(prev => prev.map((e, i) => i === index ? { ...e, [field]: value } : e))
  }

  const updateCount = (n: number) => {
    const clamped = Math.min(12, Math.max(1, n))
    setNumQualities(clamped)
    setEntries(prev => {
      if (clamped > prev.length) {
        return [...prev, ...Array.from({ length: clamped - prev.length }, () => ({
          name: '', definition_positive: '', definition_negative: '',
          opposite: '', context_situation: '', score: 4,
        }))]
      }
      return prev.slice(0, clamped)
    })
  }

  const validEntries = entries.filter(e => e.name.trim())

  const handleSave = async (shareWithCoach = false) => {
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }

    const { data: membership } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', user.id)
      .limit(1)
      .single()

    if (!membership) { setSaving(false); return }

    for (const entry of validEntries) {
      const { data: char } = await supabase
        .from('performance_profile_characteristics')
        .select('id')
        .eq('team_id', membership.team_id)
        .eq('characteristic_name', entry.name)
        .single()

      let charId = char?.id
      if (!charId) {
        const { data: newChar } = await supabase
          .from('performance_profile_characteristics')
          .insert({ team_id: membership.team_id, characteristic_name: entry.name, characteristic_order: 1, created_by: user.id })
          .select('id').single()
        charId = newChar?.id
      }

      if (charId) {
        await supabase.from('performance_profile_gucciardi').upsert({
          teamlid_id: user.id,
          team_id: membership.team_id,
          period,
          characteristic_id: charId,
          characteristic_name: entry.name,
          definition_positive: entry.definition_positive,
          definition_negative: entry.definition_negative,
          context_situation: situations,
          score: entry.score,
          shared_with_coach: shareWithCoach,
        }, { onConflict: 'teamlid_id,team_id,period,characteristic_id' })
      }
    }

    setSaving(false)
    if (shareWithCoach) setShared(true)
    else setSaved(true)
    setTimeout(() => { setSaved(false); setShared(false) }, 3000)
  }

  return (
    <main className="p-6 max-w-4xl mx-auto">
      <button onClick={onBack} className="flex items-center gap-2 text-muted hover:text-foreground mb-6 transition-colors text-sm">
        <ArrowLeft size={16} /> Terug naar methodekeuze
      </button>

      <div className="mb-6">
        <span className="inline-block text-xs font-semibold uppercase tracking-wider text-primary bg-primary/10 px-2 py-1 rounded mb-2">Herzien</span>
        <h1 className="text-2xl font-semibold text-foreground">Gucciardi & Gordon (2009)</h1>
        <p className="text-muted text-sm mt-1">Diepgaande betekenisgeving met tegengestelden, definities en contextuele situaties</p>
      </div>

      <div className="bg-card border border-border rounded-xl p-6 mb-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Periode</label>
            <select
              value={period}
              onChange={e => setPeriod(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {PERIOD_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Aantal kwaliteiten (1-12)</label>
            <input
              type="number" min={1} max={12} value={numQualities}
              onChange={e => updateCount(parseInt(e.target.value) || 1)}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>
      </div>

      <div className="space-y-4 mb-6">
        {entries.map((entry, i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <span className="w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center flex-shrink-0">
                {i + 1}
              </span>
              <input
                type="text"
                placeholder={`Kwaliteit ${i + 1} (bijv. Veerkracht, Focus, Doorzettingsvermogen)`}
                value={entry.name}
                onChange={e => updateEntry(i, 'name', e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-xs text-muted mb-1">Definitie van deze kwaliteit</label>
                <textarea
                  placeholder="Wat betekent deze kwaliteit voor jou?"
                  value={entry.definition_positive}
                  onChange={e => updateEntry(i, 'definition_positive', e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                />
              </div>
              <div>
                <label className="block text-xs text-muted mb-1">Tegengestelde kwaliteit & definitie</label>
                <input
                  type="text"
                  placeholder="Wat is het tegenovergestelde?"
                  value={entry.opposite}
                  onChange={e => updateEntry(i, 'opposite', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 mb-1"
                />
                <textarea
                  placeholder="Definitie van tegengestelde"
                  value={entry.definition_negative}
                  onChange={e => updateEntry(i, 'definition_negative', e.target.value)}
                  rows={1}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                />
              </div>
            </div>

            {/* Bipolar scale */}
            <div className="bg-background border border-border rounded-lg p-3">
              <div className="flex items-center justify-between text-xs text-muted mb-2">
                <span className="font-medium text-red-500 truncate max-w-[35%]">
                  {entry.opposite || 'Tegengestelde'}
                </span>
                <span className={`font-semibold text-sm ${getBipolarColor(entry.score)}`}>
                  {entry.score} — {BIPOLAR_LABELS[entry.score]}
                </span>
                <span className="font-medium text-green-600 truncate max-w-[35%] text-right">
                  {entry.name || 'Kwaliteit'}
                </span>
              </div>
              <input
                type="range" min={1} max={7} step={1}
                value={entry.score}
                onChange={e => updateEntry(i, 'score', parseInt(e.target.value))}
                className="w-full accent-primary"
              />
              <div className="flex justify-between text-xs text-muted mt-1">
                {[1, 2, 3, 4, 5, 6, 7].map(n => (
                  <span key={n} className={entry.score === n ? 'text-primary font-bold' : ''}>{n}</span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Situations section */}
      <div className="bg-card border border-border rounded-xl p-5 mb-6">
        <h3 className="text-sm font-semibold text-foreground mb-1">Belangrijke Situaties</h3>
        <p className="text-xs text-muted mb-3">Beschrijf situaties waarin deze kwaliteiten cruciaal zijn (bijv. onder druk, bij uitdagingen, tegenslag)</p>
        <textarea
          placeholder="Bijv: 'Bij een achterstand in de laatste minuten van de wedstrijd...'"
          value={situations}
          onChange={e => setSituations(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => handleSave(false)}
          disabled={saving || validEntries.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-40 transition-colors"
        >
          {saved ? <CheckCircle size={16} /> : <Save size={16} />}
          {saved ? 'Opgeslagen!' : 'Opslaan'}
        </button>
        <button
          onClick={() => handleSave(true)}
          disabled={saving || validEntries.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-card border border-border text-foreground rounded-lg text-sm font-medium hover:bg-border/30 disabled:opacity-40 transition-colors"
        >
          {shared ? <CheckCircle size={16} className="text-green-500" /> : <Share2 size={16} />}
          {shared ? 'Gedeeld!' : 'Delen met coach'}
        </button>
      </div>
    </main>
  )
}
