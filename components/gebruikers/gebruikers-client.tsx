'use client'

import { useState } from 'react'

interface Team { id: string; name: string }
interface Gebruiker {
  id: string
  full_name: string | null
  email: string | null
  role: string
  team_id: string | null
  invited_at: string | null
  onboarded: boolean | null
  teams?: { name: string } | null
}

interface Props {
  gebruikers: Gebruiker[]
  teams: Team[]
}

const roleLabels: Record<string, string> = {
  superuser: 'Beheerder',
  coach: 'Coach',
  teamlid: 'Teamlid',
}

const roleColors: Record<string, string> = {
  superuser: 'text-violet-400 bg-violet-400/10',
  coach: 'text-amber-400 bg-amber-400/10',
  teamlid: 'text-emerald-400 bg-emerald-400/10',
}

export function GebruikersClient({ gebruikers: initialGebruikers, teams }: Props) {
  const [gebruikers, setGebruikers] = useState(initialGebruikers)
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [form, setForm] = useState({ full_name: '', email: '', role: 'teamlid', team_id: '' })
  const [filter, setFilter] = useState<'all' | 'superuser' | 'coach' | 'teamlid'>('all')

  const filtered = filter === 'all' ? gebruikers : gebruikers.filter(g => g.role === filter)

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    const res = await fetch('/api/admin/invite-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error ?? 'Er is iets misgegaan')
      return
    }

    setSuccess(`Uitnodiging verstuurd naar ${form.email}`)
    setForm({ full_name: '', email: '', role: 'teamlid', team_id: '' })
    setShowForm(false)

    // Refresh list
    const refreshRes = await fetch('/api/admin/invite-user', { method: 'GET' })
    if (refreshRes.ok) {
      const { gebruikers: refreshed } = await refreshRes.json()
      if (refreshed) setGebruikers(refreshed)
    }
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex gap-1">
          {(['all', 'superuser', 'coach', 'teamlid'] as const).map(r => (
            <button
              key={r}
              onClick={() => setFilter(r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                filter === r
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card border border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              {r === 'all' ? 'Alle' : roleLabels[r]}
            </button>
          ))}
        </div>
        <button
          onClick={() => { setShowForm(true); setError(null); setSuccess(null) }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Uitnodigen
        </button>
      </div>

      {/* Success/Error */}
      {success && (
        <div className="mb-4 px-4 py-2.5 rounded-lg bg-emerald-400/10 border border-emerald-400/20 text-sm text-emerald-400">{success}</div>
      )}

      {/* Invite form */}
      {showForm && (
        <div className="mb-6 bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-foreground">Nieuwe gebruiker uitnodigen</h2>
            <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <form onSubmit={handleInvite} className="grid grid-cols-2 gap-4">
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
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-foreground">Rol</label>
              <select
                value={form.role}
                onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                className="h-9 px-3 rounded-lg bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="teamlid">Teamlid</option>
                <option value="coach">Coach</option>
                <option value="superuser">Beheerder</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-foreground">Team</label>
              <select
                value={form.team_id}
                onChange={e => setForm(f => ({ ...f, team_id: e.target.value }))}
                className="h-9 px-3 rounded-lg bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="">Geen team</option>
                {teams.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            {error && (
              <div className="col-span-2 px-3 py-2 rounded-lg bg-red-400/10 border border-red-400/20 text-xs text-red-400">{error}</div>
            )}
            <div className="col-span-2 flex justify-end gap-3">
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

      {/* User table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground">Naam</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground">E-mail</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground">Rol</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground">Team</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground">Status</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground">Uitgenodigd</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {filtered.map(g => (
              <tr key={g.id} className="hover:bg-accent/20 transition">
                <td className="px-5 py-3 font-medium text-foreground">{g.full_name ?? '—'}</td>
                <td className="px-5 py-3 text-muted-foreground">{g.email ?? '—'}</td>
                <td className="px-5 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleColors[g.role] ?? 'text-muted-foreground bg-muted/30'}`}>
                    {roleLabels[g.role] ?? g.role}
                  </span>
                </td>
                <td className="px-5 py-3 text-muted-foreground">
                  {(g.teams as any)?.name ?? '—'}
                </td>
                <td className="px-5 py-3">
                  {g.onboarded
                    ? <span className="text-xs px-2 py-0.5 rounded-full text-emerald-400 bg-emerald-400/10 font-medium">Actief</span>
                    : <span className="text-xs px-2 py-0.5 rounded-full text-amber-400 bg-amber-400/10 font-medium">Uitgenodigd</span>
                  }
                </td>
                <td className="px-5 py-3 text-muted-foreground text-xs">
                  {g.invited_at ? new Date(g.invited_at).toLocaleDateString('nl-NL') : '—'}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-muted-foreground text-sm">Geen gebruikers gevonden</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        {filtered.length} gebruiker{filtered.length !== 1 ? 's' : ''}
      </p>
    </div>
  )
}
