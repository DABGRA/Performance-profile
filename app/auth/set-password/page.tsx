'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function SetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    // Supabase puts the access_token in the URL hash after invite redirect
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        setReady(true)
      }
    })
  }, [supabase])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('Wachtwoord moet minimaal 8 tekens zijn')
      return
    }
    if (password !== confirm) {
      setError('Wachtwoorden komen niet overeen')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (error) {
      setError(error.message)
      return
    }

    // Redirect to correct dashboard based on role
    const { data: { user } } = await supabase.auth.getUser()
    const role = user?.user_metadata?.role ?? 'teamlid'
    router.push(`/dashboard/${role}`)
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <p className="text-xs font-semibold tracking-widest uppercase text-primary mb-2">Performance Profile</p>
          <h1 className="text-2xl font-semibold text-foreground">Stel je wachtwoord in</h1>
          <p className="text-sm text-muted-foreground mt-1">Kies een veilig wachtwoord om je account te activeren.</p>
        </div>

        {!ready ? (
          <p className="text-sm text-muted-foreground">Bezig met verifiëren van je uitnodiging…</p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-foreground" htmlFor="password">Wachtwoord</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Minimaal 8 tekens"
                required
                className="h-10 px-3 rounded-lg bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-foreground" htmlFor="confirm">Bevestig wachtwoord</label>
              <input
                id="confirm"
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="Herhaal wachtwoord"
                required
                className="h-10 px-3 rounded-lg bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            {error && (
              <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="h-10 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition disabled:opacity-50"
            >
              {loading ? 'Opslaan…' : 'Account activeren'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
