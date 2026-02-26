'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, BarChart2, Save, Share2, CheckCircle } from 'lucide-react'

interface JonesEntry {
  name: string
  importance: number   // 1-10
  ideal: number        // 1-10
  current: number      // 1-10
  discrepancy: number  // auto: (ideal - current) * importance
}

interface Props {
  onBack: () => void
}

const PERIOD_OPTIONS = ['t0', 't1', 't2', 't3', 't4', 't5', 't6', 't7', 't8', 't9', 't10']

function calcDiscrepancy(entry: JonesEntry) {
  return (entry.ideal - entry.current) * entry.importance
}

function getPriorityColor(discrepancy: number) {
  if (discrepancy > 30) return { bg: 'bg-red-50', border: 'border-red-200', badge: 'bg-red-100 text-red-700', label: 'Hoge prioriteit' }
  if (discrepancy > 15) return { bg: 'bg-amber-50', border: 'border-amber-200', badge: 'bg-amber-100 text-amber-700', label: 'Middelhoge prioriteit' }
  return { bg: 'bg-green-50', border: 'border-green-200', badge: 'bg-green-100 text-green-700', label: 'Lage prioriteit' }
}

export function JonesProfiler({ onBack }: Props) {
  const [period, setPeriod] = useState('t0')
  const [numQualities, setNumQualities] = useState(8)
  const [entries, setEntries] = useState<JonesEntry[]>(
    Array.from({ length: 8 }, () => ({ name: '', importance: 5, ideal: 10, current: 5, discrepancy: 25 }))
  )
  const [showChart, setShowChart] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [shared, setShared] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const chartRef = useRef<any>(null)

  const updateEntry = (index: number, field: keyof JonesEntry, value: number | string) => {
    setEntries(prev => prev.map((e, i) => {
      if (i !== index) return e
      const updated = { ...e, [field]: value }
      updated.discrepancy = calcDiscrepancy(updated)
      return updated
    }))
  }

  const updateCount = (n: number) => {
    const clamped = Math.min(12, Math.max(1, n))
    setNumQualities(clamped)
    setEntries(prev => {
      if (clamped > prev.length) {
        return [...prev, ...Array.from({ length: clamped - prev.length }, () => ({ name: '', importance: 5, ideal: 10, current: 5, discrepancy: 25 }))]
      }
      return prev.slice(0, clamped)
    })
  }

  const validEntries = entries.filter(e => e.name.trim())
  const sortedByPriority = [...validEntries].sort((a, b) => b.discrepancy - a.discrepancy)

  useEffect(() => {
    if (!showChart || !canvasRef.current || validEntries.length === 0) return

    const loadChart = async () => {
      const { Chart, registerables } = await import('chart.js')
      Chart.register(...registerables)
      if (chartRef.current) chartRef.current.destroy()

      chartRef.current = new Chart(canvasRef.current!, {
        type: 'bar',
        data: {
          labels: sortedByPriority.map(e => e.name),
          datasets: [{
            label: 'Discrepancy Score',
            data: sortedByPriority.map(e => e.discrepancy),
            backgroundColor: sortedByPriority.map(e =>
              e.discrepancy > 30 ? 'rgba(239,68,68,0.35)' :
              e.discrepancy > 15 ? 'rgba(245,158,11,0.35)' :
              'rgba(16,185,129,0.35)'
            ),
            borderColor: sortedByPriority.map(e =>
              e.discrepancy > 30 ? 'rgba(239,68,68,0.7)' :
              e.discrepancy > 15 ? 'rgba(245,158,11,0.7)' :
              'rgba(16,185,129,0.7)'
            ),
            borderWidth: 1,
            borderRadius: 4,
            barThickness: 28,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          indexAxis: 'y',
          scales: {
            x: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } },
            y: { grid: { display: false } },
          },
          plugins: { legend: { display: false } },
        },
      })
    }

    loadChart()
    return () => { if (chartRef.current) chartRef.current.destroy() }
  }, [showChart, validEntries])

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

    for (let rank = 0; rank < sortedByPriority.length; rank++) {
      const entry = sortedByPriority[rank]

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
          .insert({ team_id: membership.team_id, characteristic_name: entry.name, characteristic_order: rank + 1, created_by: user.id })
          .select('id').single()
        charId = newChar?.id
      }

      if (charId) {
        await supabase.from('performance_profile_jones').upsert({
          teamlid_id: user.id,
          team_id: membership.team_id,
          period,
          characteristic_id: charId,
          importance_rating: entry.importance,
          ideal_level: entry.ideal,
          current_level: entry.current,
          discrepancy_score: entry.discrepancy,
          priority_rank: rank + 1,
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
        <span className="inline-block text-xs font-semibold uppercase tracking-wider text-primary bg-primary/10 px-2 py-1 rounded mb-2">Geavanceerd</span>
        <h1 className="text-2xl font-semibold text-foreground">Jones (1993)</h1>
        <p className="text-muted text-sm mt-1">Prioritering van ontwikkelpunten via discrepancy scores (belang × gap)</p>
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

      <div className="space-y-3 mb-6">
        {entries.map((entry, i) => {
          const priority = getPriorityColor(entry.discrepancy)
          return (
            <div key={i} className={`border rounded-xl p-4 ${entry.name ? priority.border + ' ' + priority.bg : 'border-border bg-card'}`}>
              <div className="flex items-center gap-3 mb-4">
                <span className="w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center flex-shrink-0">
                  {i + 1}
                </span>
                <input
                  type="text"
                  placeholder={`Kwaliteit ${i + 1}`}
                  value={entry.name}
                  onChange={e => updateEntry(i, 'name', e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg border border-border bg-white text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                {entry.name && (
                  <span className={`text-xs font-medium px-2 py-1 rounded ${priority.badge}`}>
                    {priority.label}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-3 gap-3">
                {(['importance', 'ideal', 'current'] as const).map(field => (
                  <div key={field}>
                    <label className="block text-xs text-muted mb-1 capitalize">
                      {field === 'importance' ? 'Belang (1-10)' : field === 'ideal' ? 'Ideaal (1-10)' : 'Huidig (1-10)'}
                    </label>
                    <input
                      type="number" min={1} max={10}
                      value={entry[field]}
                      onChange={e => updateEntry(i, field, parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-white text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                ))}
              </div>
              {entry.name && (
                <div className="mt-3 text-xs text-muted">
                  Discrepancy score: <span className="font-semibold text-foreground">{entry.discrepancy}</span>
                  <span className="ml-1 text-muted">= ({entry.ideal} - {entry.current}) × {entry.importance}</span>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="flex flex-wrap gap-3 mb-8">
        <button
          onClick={() => setShowChart(v => !v)}
          disabled={validEntries.length < 2}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-40 transition-colors"
        >
          <BarChart2 size={16} />
          {showChart ? 'Verberg grafiek' : 'Toon prioriteitsgrafiek'}
        </button>
        <button
          onClick={() => handleSave(false)}
          disabled={saving || validEntries.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-card border border-border text-foreground rounded-lg text-sm font-medium hover:bg-border/30 disabled:opacity-40 transition-colors"
        >
          {saved ? <CheckCircle size={16} className="text-green-500" /> : <Save size={16} />}
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

      {showChart && validEntries.length >= 2 && (
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-base font-semibold text-foreground mb-1">Prioriteitsgrafiek — {period}</h2>
          <p className="text-xs text-muted mb-4">Gesorteerd op discrepancy score (hoog = hoogste prioriteit)</p>
          <div className="relative h-72">
            <canvas ref={canvasRef} />
          </div>
        </div>
      )}
    </main>
  )
}
