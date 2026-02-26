import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export default function LogoutPage() {
  async function logout() {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    revalidatePath('/', 'layout')
    redirect('/auth/login')
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-background">
      <div className="bg-card border border-border rounded-xl p-8 shadow-sm text-center max-w-sm w-full">
        <h2 className="text-lg font-semibold text-foreground mb-2">Uitloggen</h2>
        <p className="text-sm text-muted-foreground mb-6">Weet je zeker dat je wilt uitloggen?</p>
        <form action={logout}>
          <button
            type="submit"
            className="w-full py-2.5 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium hover:bg-destructive/90 transition"
          >
            Uitloggen
          </button>
        </form>
      </div>
    </main>
  )
}
