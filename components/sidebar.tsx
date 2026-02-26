'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ReactNode } from 'react'

interface NavItem {
  label: string
  href: string
  icon: ReactNode
}

interface SidebarProps {
  navItems: NavItem[]
  role: string
  userName: string
}

export function Sidebar({ navItems, role, userName }: SidebarProps) {
  const pathname = usePathname()

  const roleLabel: Record<string, string> = {
    superuser: 'Beheerder',
    coach: 'Coach',
    teamlid: 'Teamlid',
  }

  return (
    <aside className="fixed inset-y-0 left-0 w-56 flex flex-col bg-[hsl(var(--sidebar))] border-r border-white/5 z-30">
      {/* Brand */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-white/5">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary shrink-0">
          <svg className="w-4 h-4 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[hsl(var(--sidebar-foreground))] truncate leading-tight">Performance</p>
          <p className="text-xs text-[hsl(var(--sidebar-muted))] truncate leading-tight">Platform</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <p className="text-xs font-medium text-[hsl(var(--sidebar-muted))] uppercase tracking-wider px-2 mb-2">
          {roleLabel[role] ?? role}
        </p>
        <ul className="flex flex-col gap-0.5">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm transition ${
                    isActive
                      ? 'bg-[hsl(var(--sidebar-active))] text-[hsl(var(--sidebar-active-foreground))] font-medium'
                      : 'text-[hsl(var(--sidebar-foreground))] hover:bg-white/5'
                  }`}
                >
                  <span className="shrink-0 w-4 h-4">{item.icon}</span>
                  <span className="truncate">{item.label}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* User footer */}
      <div className="border-t border-white/5 px-4 py-4">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
            <span className="text-xs font-semibold text-primary">{userName.charAt(0).toUpperCase()}</span>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-[hsl(var(--sidebar-foreground))] truncate">{userName}</p>
            <p className="text-xs text-[hsl(var(--sidebar-muted))] truncate">{roleLabel[role] ?? role}</p>
          </div>
        </div>
        <Link
          href="/auth/logout"
          className="flex items-center gap-2 text-xs text-[hsl(var(--sidebar-muted))] hover:text-[hsl(var(--sidebar-foreground))] transition"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Uitloggen
        </Link>
      </div>
    </aside>
  )
}
