import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Zap, Eye, EyeOff, CheckCircle } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { Spinner } from '../components/ui/Spinner'

export function Register() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '', passwordConfirm: '', inviteCode: '' })
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  function update(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [field]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (form.password !== form.passwordConfirm) {
      setError('Die Passwörter stimmen nicht überein.')
      return
    }
    if (form.password.length < 8) {
      setError('Das Passwort muss mindestens 8 Zeichen lang sein.')
      return
    }
    setLoading(true)
    const { error } = await signUp(form.email, form.password, form.name, form.inviteCode)
    setLoading(false)
    if (error) {
      setError(error.message)
    } else {
      setSuccess(true)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center card">
          <CheckCircle size={48} className="text-success mx-auto mb-4" />
          <h2 className="text-xl font-bold text-text-primary mb-2">Registrierung erfolgreich!</h2>
          <p className="text-text-secondary text-sm mb-6">
            Bitte bestätige deine E-Mail-Adresse. Danach kannst du dich anmelden.
          </p>
          <Link to="/login" className="btn-primary inline-block">Zur Anmeldung</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-accent/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/20 border border-primary/30 shadow-glow mb-4">
            <Zap size={28} className="text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-text-primary">Account erstellen</h1>
          <p className="text-text-secondary mt-1 text-sm">Du brauchst einen Einladungscode von deinem Coach</p>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Einladungscode</label>
              <input
                type="text"
                className="input uppercase tracking-widest font-mono"
                placeholder="Z.B. ABC12345"
                value={form.inviteCode}
                onChange={update('inviteCode')}
                required
                maxLength={10}
              />
              <p className="text-xs text-text-muted mt-1">Den Code erhältst du von deinem Coach</p>
            </div>

            <div className="border-t border-border pt-4">
              <div>
                <label className="label">Dein Name</label>
                <input type="text" className="input" placeholder="Max Mustermann" value={form.name} onChange={update('name')} required />
              </div>
            </div>

            <div>
              <label className="label">E-Mail</label>
              <input type="email" className="input" placeholder="deine@email.de" value={form.email} onChange={update('email')} required autoComplete="email" />
            </div>

            <div>
              <label className="label">Passwort</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  className="input pr-10"
                  placeholder="Min. 8 Zeichen"
                  value={form.password}
                  onChange={update('password')}
                  required
                  minLength={8}
                />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label className="label">Passwort bestätigen</label>
              <input
                type="password"
                className="input"
                placeholder="••••••••"
                value={form.passwordConfirm}
                onChange={update('passwordConfirm')}
                required
              />
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-danger/10 border border-danger/30 text-danger text-sm">
                {error}
              </div>
            )}

            <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2" disabled={loading}>
              {loading && <Spinner size={18} />}
              {loading ? 'Registrieren...' : 'Account erstellen'}
            </button>
          </form>

          <p className="text-center text-sm text-text-secondary mt-4">
            Bereits registriert?{' '}
            <Link to="/login" className="text-primary hover:text-primary-light font-medium">Anmelden</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
