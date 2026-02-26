import { createClient } from '@/lib/supabase/server'
import { IndividualDashboard } from '@/components/dashboards/individual-dashboard'
import { redirect } from 'next/navigation'

export default async function AnalyticsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  return <IndividualDashboard userId={user.id} />
}
