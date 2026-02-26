'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Plus, Trash2, BarChart2, Save, Share2, CheckCircle } from 'lucide-react'
import type { ButlerHardyEntry } from '@/lib/types/profiler'

interface Props {
  onBack: () => void
}

const PERIOD_OPTIONS = ['t0', 't1', 't2', 't3', 't4', 't5', 't6', 't7', 't8', 't9', 't10']

export function ButlerHardyProfiler({ onBack }: Props) {
  const [period, setPeriod] = useState('t0')
  const [entries, setEntries] = useState<ButlerHardyEntry[]>(
    Array.from({ length: 8 }, () => ({ name: '', score: 5 }))
  )
  const [showChart, setShowChart] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [shared, setShared] = useState(false)
  const [numQualities, setNumQualities] = useState(8)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const chartRef = useRef<any>(null)

  const updateEntry = (index: number, field: keyof ButlerHardyEntry, value: string | number) => {
    setEntries(prev => prev.map((e, i) => i === index ? { ...e, [field]: value } : e))
  }

  const updateCount = (n: number) => {
    const clamped = Math.min(12, Math.max(1, n))
    setNumQualities(clamped)
    setEntries(prev => {
      if (clamped > prev.length) {
        return [...prev, ...Array.from({ length: clamped - prev.length }, () => ({ name: '', score: 5 }))]
      }
      return prev.slice(0, clamped)
    })
  }

  const validEntries = entries.filter(e => e.name.trim())

  useEffect(() => {
    if (!showChart || !canvasRef.current || validEntries.length === 0) return

    const loadChart = async () => {
      const { Chart, registerables } = await import('chart.js')
      Chart.register(...registerables)

      if (chartRef.current) chartRef.current.destroy()

      chartRef.current = new Chart(canvasRef.current!, {
        type: 'radar',
        data: {
          labels: validEntries.map(e => e.name),
          datasets: [{
            label: 'Huidig Niveau',
            data: validEntries.map(e => e.score),
            backgroundColor: 'rgba(37, 99, 235, 0.15)',
            borderColor: 'rgba(37, 99, 235, 1)',
            borderWidth: 2,
            pointBackgroundColor: 'rgba(37, 99, 235, 1)',
            pointBorderColor: '#fff',
            pointRadius: 5,
            pointHoverRadius: 7,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            r: {
              beginAtZero: true,
              max: 10,
              ticks: { stepSize: 2, backdropColor: 'transparent', font: { size: 11 } },
              grid: { color: 'rgba(0,0,0,0.1)' },
              pointLabels: { font: { size: 12, weight: '500' } },
            },
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

    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single()

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
          .select('id')
          .single()
        charId = newChar?.id
      }

      if (charId) {
        await supabase.from('performance_profile_butler_hardy').upsert({
          teamlid_id: user.id,
          team_id: membership.team_id,
          period,
          characteristic_id: charId,
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
        <span className="inline-block text-xs font-semibold uppercase tracking-wider text-primary bg-primary/10 px-2 py-1 rounded mb-2">Origineel</span>
        <h1 className="text-2xl font-semibold text-foreground">Butler & Hardy (1992)</h1>
        <p className="text-muted text-sm mt-1">Radar profiel op basis van 8-12 kwaliteiten, gescoord op een 1-10 schaal</p>
      </div>

      <div className="bg-card border border-border rounded-xl p-6 mb-6 space-y-4">
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
              type="number"
              min={1} max={12}
              value={numQualities}
              onChange={e => updateCount(parseInt(e.target.value) || 1)}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>
      </div>

      <div className="space-y-3 mb-6">
        {entries.map((entry, i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <span className="w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center flex-shrink-0">
                {i + 1}
              </span>
              <input
                type="text"
                placeholder={`Kwaliteit ${i + 1} (bijv. Techniek, Motivatie, Conditie)`}
                value={entry.name}
                onChange={e => updateEntry(i, 'name', e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div className="flex items-center gap-4">
              <span className="text-xs text-muted w-24">Huidig niveau</span>
              <input
                type="range"
                min={1} max={10}
                value={entry.score}
                onChange={e => updateEntry(i, 'score', parseInt(e.target.value))}
                className="flex-1 accent-primary"
              />
              <span className="text-sm font-semibold text-primary w-6 text-right">{entry.score}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 mb-8">
        <button
          onClick={() => setShowChart(v => !v)}
          disabled={validEntries.length < 3}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <BarChart2 size={16} />
          {showChart ? 'Verberg grafiek' : 'Genereer profiel'}
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
          {shared ? 'Gedeeld met coach!' : 'Delen met coach'}
        </button>
      </div>

      {showChart && validEntries.length >= 3 && (
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-base font-semibold text-foreground mb-4">Radar Profiel — {period}</h2>
          <div className="relative h-80">
            <canvas ref={canvasRef} />
          </div>
        </div>
      )}
    </main>
  )
}
