import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Get user role from profiles table
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile) {
    redirect('/auth/login')
  }

  // Role-based redirect
  if (profile.role === 'superuser') {
    redirect('/dashboard/superuser')
  } else if (profile.role === 'coach') {
    redirect('/dashboard/coach')
  } else {
    redirect('/dashboard/teamlid')
  }
}
