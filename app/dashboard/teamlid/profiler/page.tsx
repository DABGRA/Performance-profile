'use client'

import { useState } from 'react'
import { ButlerHardyProfiler } from '@/components/profiler/butler-hardy'
import { JonesProfiler } from '@/components/profiler/jones'
import { GucciardiProfiler } from '@/components/profiler/gucciardi'
import type { ProfilerMethod } from '@/lib/types/profiler'

const methods: { id: ProfilerMethod; label: string; tag: string; description: string; features: string[] }[] = [
  {
    id: 'butler_hardy',
    label: 'Butler & Hardy (1992)',
    tag: 'Origineel',
    description: 'De basis versie met visuele radar grafiek. Ideaal voor teams en beginners.',
    features: ['8-12 kwaliteiten', 'Simpele 1-10 schaal', 'Radar visualisatie', 'Snelste methode'],
  },
  {
    id: 'jones',
    label: 'Jones (1993)',
    tag: 'Geavanceerd',
    description: 'Met prioritering van ontwikkelpunten via discrepancy scores.',
    features: ['Belang rating', 'Ideaal niveau bepalen', 'Huidig niveau beoordelen', 'Automatische prioritering'],
  },
  {
    id: 'gucciardi',
    label: 'Gucciardi & Gordon (2009)',
    tag: 'Herzien',
    description: 'Diepgaande betekenisgeving met tegengestelden en contextuele situaties.',
    features: ['Definitie per kwaliteit', 'Tegengestelde bepalen', '7-punts bipolaire schaal', 'Situatie mapping'],
  },
]

export default function ProfilerPage() {
  const [selected, setSelected] = useState<ProfilerMethod | null>(null)

  if (selected === 'butler_hardy') return <ButlerHardyProfiler onBack={() => setSelected(null)} />
  if (selected === 'jones') return <JonesProfiler onBack={() => setSelected(null)} />
  if (selected === 'gucciardi') return <GucciardiProfiler onBack={() => setSelected(null)} />

  return (
    <main className="p-6 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-foreground">Performance Profiling</h1>
        <p className="text-muted mt-1">Kies een methode om je performance profiel te maken</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {methods.map((method) => (
          <button
            key={method.id}
            onClick={() => setSelected(method.id)}
            className="text-left bg-card border border-border rounded-xl p-6 hover:border-primary hover:shadow-md transition-all group"
          >
            <span className="inline-block text-xs font-semibold uppercase tracking-wider text-primary bg-primary/10 px-2 py-1 rounded mb-3">
              {method.tag}
            </span>
            <h3 className="text-base font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
              {method.label}
            </h3>
            <p className="text-sm text-muted mb-4 leading-relaxed">{method.description}</p>
            <ul className="space-y-1">
              {method.features.map((f) => (
                <li key={f} className="text-sm text-muted flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
          </button>
        ))}
      </div>
    </main>
  )
}
