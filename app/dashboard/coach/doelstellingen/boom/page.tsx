import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { GoalTree } from '@/components/goals/goal-tree'
import Link from 'next/link'

export default async function GoalBoomPage({
  searchParams,
}: {
  searchParams: Promise<{ team?: string }>
}) {
  const { team: teamId } = await searchParams
  if (!teamId) redirect('/dashboard/coach/doelstellingen')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: team } = await supabase
    .from('teams')
    .select('id, name')
    .eq('id', teamId)
    .single()

  if (!team) redirect('/dashboard/coach/doelstellingen')

  const [{ data: outcomeGoals }, { data: performanceGoals }, { data: processGoals }] = await Promise.all([
    supabase.from('outcome_goals').select('*').eq('team_id', teamId).order('presentation_order'),
    supabase.from('performance_goals').select('*').eq('team_id', teamId).order('presentation_order'),
    supabase.from('process_goals').select('*').order('created_at'),
  ])

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center gap-2 text-sm text-muted mb-6">
        <Link href="/dashboard/coach/doelstellingen" className="hover:text-foreground transition-colors">
          Doelstellingen
        </Link>
        <span>/</span>
        <span className="text-foreground">{team.name}</span>
        <span>/</span>
        <span className="text-foreground">Doelenboom</span>
      </div>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Doelenboom</h1>
          <p className="text-muted text-sm mt-1">{team.name} — Volledige goal hierarchie</p>
        </div>
        <div className="flex gap-3">
          <Link
            href={`/dashboard/coach/doelstellingen/outcome?team=${teamId}`}
            className="text-sm text-muted border border-border px-3 py-1.5 rounded-lg hover:text-foreground hover:border-foreground/30 transition-colors"
          >
            Outcome Goals
          </Link>
          <Link
            href={`/dashboard/coach/doelstellingen/performance?team=${teamId}`}
            className="text-sm text-muted border border-border px-3 py-1.5 rounded-lg hover:text-foreground hover:border-foreground/30 transition-colors"
          >
            Performance Goals
          </Link>
          <Link
            href={`/dashboard/coach/doelstellingen/process?team=${teamId}`}
            className="text-sm text-muted border border-border px-3 py-1.5 rounded-lg hover:text-foreground hover:border-foreground/30 transition-colors"
          >
            Process Goals
          </Link>
        </div>
      </div>

      <GoalTree
        outcomeGoals={outcomeGoals ?? []}
        performanceGoals={performanceGoals ?? []}
        processGoals={processGoals ?? []}
      />
    </div>
  )
}
