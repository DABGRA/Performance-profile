import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ProcessGoalsWorkshop } from '@/components/goals/process-goals-workshop'
import Link from 'next/link'

export default async function ProcessGoalsPage({
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
    .eq('coach_id', user.id)
    .single()

  if (!team) redirect('/dashboard/coach/doelstellingen')

  // Load approved performance goals for this team
  const { data: performanceGoals } = await supabase
    .from('performance_goals')
    .select('*')
    .eq('team_id', teamId)
    .in('status', ['selected', 'approved'])
    .order('presentation_order', { ascending: true })

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-2 text-sm text-muted mb-6">
        <Link href="/dashboard/coach/doelstellingen" className="hover:text-foreground transition-colors">
          Doelstellingen
        </Link>
        <span>/</span>
        <span className="text-foreground">{team.name}</span>
        <span>/</span>
        <span className="text-foreground">Process Goals</span>
      </div>

      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Process Goals Workshop</h1>
          <p className="text-muted text-sm mt-1">Fase 3 — {team.name}</p>
        </div>
        <Link
          href={`/dashboard/coach/doelstellingen/boom?team=${teamId}`}
          className="text-sm text-primary border border-primary/30 px-3 py-1.5 rounded-lg hover:bg-primary/10 transition-colors"
        >
          Bekijk doelenboom
        </Link>
      </div>

      <div className="bg-card border border-border rounded-xl p-5 mb-8">
        <h3 className="font-semibold text-foreground text-sm mb-2">Werkwijze</h3>
        <ol className="space-y-1 text-sm text-muted list-decimal list-inside">
          <li>Neem elk geselecteerd performance goal als startpunt</li>
          <li>Bepaal per doel: welke concrete taken, rollen en situaties zijn nodig?</li>
          <li>Voer de process goals in gekoppeld aan het bijbehorende performance goal</li>
          <li>Na afronding: bekijk de volledige doelenboom</li>
        </ol>
      </div>

      <ProcessGoalsWorkshop
        teamId={teamId}
        userId={user.id}
        performanceGoals={performanceGoals ?? []}
      />
    </div>
  )
}
