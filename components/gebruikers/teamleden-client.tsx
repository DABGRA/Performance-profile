'use client'

import { useState } from 'react'

interface Teamlid {
  id: string
  full_name: string | null
  email: string | null
  invited_at: string | null
  onboarded: boolean | null
}

interface Props {
  teamleden: Teamlid[]
  teamId: string | null
}

export function TeamledenClient({ teamleden: initialTeamleden, teamId }: Props) {
  const [teamleden, setTeamleden] = useState(initialTeamleden)
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [form, setForm] = useState({ full_name: '', email: '' })

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    const res = await fetch('/api/admin/invite-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, role: 'teamlid', team_id: teamId }),
    })
    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error ?? 'Er is iets misgegaan')
      return
    }

    setSuccess(`Uitnodiging verstuurd naar ${form.email}`)
    setTeamleden(prev => [...prev, {
      id: data.userId,
      full_name: form.full_name,
      email: form.email,
      invited_at: new Date().toISOString(),
      onboarded: false,
    }])
    setForm({ full_name: '', email: '' })
    setShowForm(false)
  }

  return (
    <div>
      <div className="flex justify-end mb-5">
        <button
          onClick={() => { setShowForm(true); setError(null); setSuccess(null) }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Teamlid uitnodigen
        </button>
      </div>

      {success && (
        <div className="mb-4 px-4 py-2.5 rounded-lg bg-emerald-400/10 border border-emerald-400/20 text-sm text-emerald-400">{success}</div>
      )}

      {showForm && (
        <div className="mb-6 bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-foreground">Teamlid uitnodigen</h2>
            <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <form onSubmit={handleInvite} className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-foreground">Volledige naam</label>
                <input
                  type="text"
                  value={form.full_name}
                  onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                  placeholder="Jan de Vries"
                  required
                  className="h-9 px-3 rounded-lg bg-background border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-foreground">E-mailadres</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="jan@ploeg.nl"
                  required
                  className="h-9 px-3 rounded-lg bg-background border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>
            {error && (
              <div className="px-3 py-2 rounded-lg bg-red-400/10 border border-red-400/20 text-xs text-red-400">{error}</div>
            )}
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground transition">
                Annuleren
              </button>
              <button type="submit" disabled={loading} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition disabled:opacity-50">
                {loading ? 'Versturen…' : 'Uitnodiging versturen'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground">Naam</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground">E-mail</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground">Status</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground">Uitgenodigd op</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {teamleden.map(lid => (
              <tr key={lid.id} className="hover:bg-accent/20 transition">
                <td className="px-5 py-3 font-medium text-foreground">{lid.full_name ?? '—'}</td>
                <td className="px-5 py-3 text-muted-foreground">{lid.email ?? '—'}</td>
                <td className="px-5 py-3">
                  {lid.onboarded
                    ? <span className="text-xs px-2 py-0.5 rounded-full text-emerald-400 bg-emerald-400/10 font-medium">Actief</span>
                    : <span className="text-xs px-2 py-0.5 rounded-full text-amber-400 bg-amber-400/10 font-medium">Uitgenodigd</span>
                  }
                </td>
                <td className="px-5 py-3 text-muted-foreground text-xs">
                  {lid.invited_at ? new Date(lid.invited_at).toLocaleDateString('nl-NL') : '—'}
                </td>
              </tr>
            ))}
            {teamleden.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-8 text-center text-muted-foreground text-sm">
                  Nog geen teamleden uitgenodigd
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
