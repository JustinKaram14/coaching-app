import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Scale, Dumbbell, Moon, Apple, Pill, Calendar,
  Settings, Users, LogOut, Menu, X, ChevronRight, Zap, ChefHat,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { cn } from '../lib/utils'

const clientNav = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/weight', icon: Scale, label: 'Gewicht' },
  { to: '/training', icon: Dumbbell, label: 'Training' },
  { to: '/sleep', icon: Moon, label: 'Schlaf' },
  { to: '/nutrition', icon: Apple, label: 'Ernährung' },
  { to: '/rezepte', icon: ChefHat, label: 'Rezepte' },
  { to: '/supplements', icon: Pill, label: 'Supplements' },
  { to: '/calendar', icon: Calendar, label: 'Kalender' },
  { to: '/settings', icon: Settings, label: 'Einstellungen' },
]

const coachNav = [
  { to: '/coach', icon: Users, label: 'Meine Klienten' },
  { to: '/calendar', icon: Calendar, label: 'Kalender' },
  { to: '/settings', icon: Settings, label: 'Einstellungen' },
]

export function Layout({ children }: { children: React.ReactNode }) {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  const nav = profile?.role === 'coach' ? coachNav : clientNav

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-6 border-b border-border">
        <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center shadow-glow-sm">
          <Zap size={18} className="text-primary" />
        </div>
        <div>
          <div className="text-sm font-bold text-text-primary">Coaching App</div>
          <div className="text-xs text-text-muted capitalize">{profile?.role === 'coach' ? 'Coach' : 'Athlet'}</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {nav.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) => cn('nav-link', isActive && 'active')}
          >
            <Icon size={18} />
            <span>{label}</span>
            <ChevronRight size={14} className="ml-auto opacity-30" />
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div className="border-t border-border p-3">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-sm font-semibold shrink-0">
            {profile?.name?.charAt(0)?.toUpperCase() ?? '?'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-text-primary truncate">{profile?.name ?? profile?.email}</div>
            <div className="text-xs text-text-muted truncate">{profile?.email}</div>
          </div>
          <button
            onClick={handleSignOut}
            className="p-1.5 rounded-lg hover:bg-bg-elevated text-text-muted hover:text-danger transition-colors"
            title="Abmelden"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-60 shrink-0 border-r border-border bg-bg-card">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-bg-card border-r border-border flex flex-col">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Topbar */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 border-b border-border bg-bg-card shrink-0">
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 rounded-lg hover:bg-bg-elevated text-text-secondary"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="flex items-center gap-2">
            <Zap size={16} className="text-primary" />
            <span className="text-sm font-bold text-text-primary">Coaching App</span>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          <div className="max-w-7xl mx-auto animate-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
