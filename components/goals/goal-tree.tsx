'use client'

import { useState } from 'react'
import type { OutcomeGoal, PerformanceGoal, ProcessGoal } from '@/lib/types/goals'

interface Props {
  outcomeGoals: OutcomeGoal[]
  performanceGoals: PerformanceGoal[]
  processGoals: ProcessGoal[]
}

const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-muted/30 text-muted border-border',
  presented: 'bg-accent/20 text-accent border-accent/30',
  selected: 'bg-primary/20 text-primary border-primary/30',
  approved: 'bg-green-500/20 text-green-400 border-green-500/30',
}
const STATUS_LABEL: Record<string, string> = {
  draft: 'Concept',
  presented: 'Gepresenteerd',
  selected: 'Geselecteerd',
  approved: 'Goedgekeurd',
}

export function GoalTree({ outcomeGoals, performanceGoals, processGoals }: Props) {
  const [expandedOutcome, setExpandedOutcome] = useState<Set<string>>(
    new Set(outcomeGoals.filter(g => g.status !== 'draft').map(g => g.id))
  )
  const [expandedPerf, setExpandedPerf] = useState<Set<string>>(new Set())

  function toggleOutcome(id: string) {
    setExpandedOutcome(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  function togglePerf(id: string) {
    setExpandedPerf(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  if (outcomeGoals.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-12 text-center">
        <p className="text-muted text-sm">Nog geen doelstellingen aangemaakt. Start met de Outcome Goals workshop.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {outcomeGoals.map(og => {
        const linkedPerfGoals = performanceGoals.filter(pg => pg.outcome_goal_id === og.id)
        const isExpanded = expandedOutcome.has(og.id)

        return (
          <div key={og.id} className="bg-card border border-border rounded-xl overflow-hidden">
            {/* Outcome Goal Header */}
            <button
              onClick={() => toggleOutcome(og.id)}
              className="w-full flex items-center justify-between p-5 text-left hover:bg-muted/10 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-8 rounded-full bg-primary" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-muted uppercase tracking-wide">Outcome Goal</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_BADGE[og.status]}`}>
                      {STATUS_LABEL[og.status]}
                    </span>
                  </div>
                  <p className="font-semibold text-foreground mt-0.5">{og.title}</p>
                  {og.timeline && <p className="text-xs text-muted mt-0.5">Tijdlijn: {og.timeline}</p>}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted">{linkedPerfGoals.length} performance goals</span>
                <svg
                  className={`w-4 h-4 text-muted transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>

            {/* Performance Goals */}
            {isExpanded && (
              <div className="border-t border-border">
                {linkedPerfGoals.length === 0 ? (
                  <p className="text-xs text-muted italic px-8 py-4">
                    Geen performance goals gekoppeld aan dit outcome goal.
                  </p>
                ) : (
                  <div className="divide-y divide-border/50">
                    {linkedPerfGoals.map(pg => {
                      const linkedProcess = processGoals.filter(p => p.performance_goal_id === pg.id)
                      const isPerfExpanded = expandedPerf.has(pg.id)

                      return (
                        <div key={pg.id}>
                          <button
                            onClick={() => togglePerf(pg.id)}
                            className="w-full flex items-center justify-between px-8 py-4 text-left hover:bg-muted/10 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-1 h-6 rounded-full bg-accent" />
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-medium text-muted uppercase tracking-wide">Performance Goal</span>
                                  <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_BADGE[pg.status]}`}>
                                    {STATUS_LABEL[pg.status]}
                                  </span>
                                </div>
                                <p className="text-sm font-medium text-foreground mt-0.5">{pg.title}</p>
                                {pg.measurable_component && (
                                  <p className="text-xs text-accent mt-0.5">Meetbaar: {pg.measurable_component}</p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-muted">{linkedProcess.length} process goals</span>
                              <svg
                                className={`w-3.5 h-3.5 text-muted transition-transform ${isPerfExpanded ? 'rotate-180' : ''}`}
                                fill="none" viewBox="0 0 24 24" stroke="currentColor"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </div>
                          </button>

                          {/* Process Goals */}
                          {isPerfExpanded && (
                            <div className="px-12 pb-4 space-y-2">
                              {linkedProcess.length === 0 ? (
                                <p className="text-xs text-muted italic">Geen process goals gekoppeld.</p>
                              ) : (
                                linkedProcess.map(p => (
                                  <div
                                    key={p.id}
                                    className="flex items-start gap-3 bg-background rounded-lg p-3 border border-border/50"
                                  >
                                    <div className="w-0.5 h-5 rounded-full bg-muted/50 mt-0.5 shrink-0" />
                                    <div className="flex-1">
                                      <p className="text-xs font-medium text-foreground">{p.title}</p>
                                      <div className="flex flex-wrap gap-3 mt-1">
                                        {p.task && <span className="text-xs text-muted">Taak: {p.task}</span>}
                                        {p.assigned_role && (
                                          <span className="text-xs text-accent">Rol: {p.assigned_role}</span>
                                        )}
                                        {p.context_situation && (
                                          <span className="text-xs text-muted">Context: {p.context_situation}</span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}

      {/* Unlinked Performance Goals */}
      {performanceGoals.filter(pg => !pg.outcome_goal_id).length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center gap-3 p-5">
            <div className="w-1.5 h-8 rounded-full bg-muted/50" />
            <div>
              <span className="text-xs font-semibold text-muted uppercase tracking-wide">Niet-gekoppelde Performance Goals</span>
              <p className="text-sm text-muted mt-0.5">Performance goals zonder outcome goal koppeling</p>
            </div>
          </div>
          <div className="border-t border-border divide-y divide-border/50">
            {performanceGoals.filter(pg => !pg.outcome_goal_id).map(pg => (
              <div key={pg.id} className="px-8 py-3">
                <p className="text-sm font-medium text-foreground">{pg.title}</p>
                <p className="text-xs text-muted mt-0.5">{pg.subgroup_created_by}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
