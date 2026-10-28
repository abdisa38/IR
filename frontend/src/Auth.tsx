import { useState } from 'react'
import { Icon, Logo } from './shared-ui'
import { SiteLink } from './site-routing'
import { useLanguage } from './language'
import { GlobalFooter } from './LocationComponents'
import './auth.css'

export type AuthTab = 'login' | 'register' | 'lookup'

export function AuthCard({
  initialTab = 'login',
  onLookup,
  standalone = false,
}: {
  initialTab?: AuthTab
  onLookup?: (ref: string, code: string) => void
  standalone?: boolean
}) {
  const [tab, setTab] = useState<AuthTab>(initialTab)
  const { language, setLanguage } = useLanguage()

  // Sign In state
  const [loginIdentifier, setLoginIdentifier] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)

  // Register state
  const [regName, setRegName] = useState('')
  const [regPhone, setRegPhone] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regConfirmPassword, setRegConfirmPassword] = useState('')

  // Order Lookup state
  const [lookupRef, setLookupRef] = useState('')
  const [lookupCode, setLookupCode] = useState('')

  // Feedback & alerts
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    const cleanId = loginIdentifier.trim()
    if (!cleanId) {
      setError('Please enter your phone number or email address.')
      return
    }
    if (!loginPassword) {
      setError('Please enter your password.')
      return
    }

    // Staff or admin bypass
    const lower = cleanId.toLowerCase()
    if (['admin', 'owner', 'manager', 'kitchen', 'staff'].includes(lower)) {
      setSuccess('Signing in to Ilillii Staff Workspace…')
      setTimeout(() => {
        window.location.hash = 'admin'
        window.dispatchEvent(new HashChangeEvent('hashchange'))
      }, 600)
      return
    }

    // Customer sign-in simulation
    setSuccess(`Welcome back! Signed in as ${cleanId}.`)
    setTimeout(() => {
      if (standalone) {
        window.location.hash = 'menu'
        window.dispatchEvent(new HashChangeEvent('hashchange'))
      }
    }, 800)
  }

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!regName.trim()) {
      setError('Please enter your full name.')
      return
    }
    if (!regPhone.trim()) {
      setError('Please enter your phone number (e.g. 0909511588).')
      return
    }
    if (regPassword.length < 4) {
      setError('Password should be at least 4 characters long.')
      return
    }
    if (regPassword !== regConfirmPassword) {
      setError('Passwords do not match. Please verify.')
      return
    }

    setSuccess(`Account created for ${regName.trim()}! Signing you in…`)
    setTimeout(() => {
      setTab('login')
      setLoginIdentifier(regPhone.trim())
    }, 1200)
  }

  const handleLookup = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!lookupRef.trim()) {
      setError('Please enter your order reference (e.g. DEMO-ILL-…).')
      return
    }
    if (onLookup) {
      onLookup(lookupRef.trim(), lookupCode.trim())
    } else {
      setSuccess(`Looking up order ${lookupRef.trim()}…`)
    }
  }

  return (
    <div className="auth-card">
      <div className="auth-card-head">
        <Logo />
        <h1>
          {tab === 'login'
            ? 'Sign in to Ilillii'
            : tab === 'register'
              ? 'Create an account'
              : 'Find your order'}
        </h1>
        <p>
          {tab === 'login'
            ? 'Manage your orders, table bookings and preferences.'
            : tab === 'register'
              ? 'Join Ilillii Hotel for express ordering and saved details.'
              : 'Enter your order reference code to track its status.'}
        </p>
      </div>

      <div className="auth-tabs" role="tablist">
        <button
          type="button"
          className={`auth-tab ${tab === 'login' ? 'active' : ''}`}
          onClick={() => {
            setTab('login')
            setError('')
            setSuccess('')
          }}
        >
          Sign In
        </button>
        <button
          type="button"
          className={`auth-tab ${tab === 'register' ? 'active' : ''}`}
          onClick={() => {
            setTab('register')
            setError('')
            setSuccess('')
          }}
        >
          Register
        </button>
        <button
          type="button"
          className={`auth-tab ${tab === 'lookup' ? 'active' : ''}`}
          onClick={() => {
            setTab('lookup')
            setError('')
            setSuccess('')
          }}
        >
          Track Order
        </button>
      </div>

      {error && (
        <div className="auth-alert-error" role="alert">
          <Icon name="info" size={18} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="auth-alert-success" role="status">
          <Icon name="check" size={18} />
          <span>{success}</span>
        </div>
      )}

      {tab === 'login' && (
        <form className="auth-form" onSubmit={handleLogin} noValidate>
          <label className="auth-field">
            Phone number or email
            <span>Required</span>
            <input
              type="text"
              autoComplete="username"
              placeholder="e.g. 0909511588 or name@example.com"
              value={loginIdentifier}
              onChange={(e) => setLoginIdentifier(e.target.value)}
              required
            />
          </label>

          <label className="auth-field">
            Password
            <span>Required</span>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="Enter your password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                required
                style={{ width: '100%' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 0,
                  color: 'var(--color-muted)',
                  cursor: 'pointer',
                  fontSize: '11px',
                }}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </label>

          <div className="auth-row-between">
            <label className="auth-checkbox">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              Remember me
            </label>
            <button
              type="button"
              className="auth-link"
              style={{ background: 'none', border: 0, cursor: 'pointer' }}
              onClick={() => setError('Password reset instructions will be sent to your phone/email.')}
            >
              Forgot password?
            </button>
          </div>

          <button type="submit" className="button primary auth-submit-btn">
            Sign In
            <Icon name="arrow" size={16} />
          </button>

          <div className="auth-switch-text">
            Don’t have an account?
            <button type="button" onClick={() => setTab('register')}>
              Create one now
            </button>
          </div>

          <div className="auth-staff-link">
            <span>Hotel team?</span>
            <SiteLink href="/#admin">Open Staff Workspace →</SiteLink>
          </div>
        </form>
      )}

      {tab === 'register' && (
        <form className="auth-form" onSubmit={handleRegister} noValidate>
          <label className="auth-field">
            Full name
            <span>Required</span>
            <input
              type="text"
              autoComplete="name"
              placeholder="e.g. Abdi Tolosa"
              value={regName}
              onChange={(e) => setRegName(e.target.value)}
              required
            />
          </label>

          <label className="auth-field">
            Phone number
            <span>Required</span>
            <input
              type="tel"
              autoComplete="tel"
              placeholder="e.g. 0909511588"
              value={regPhone}
              onChange={(e) => setRegPhone(e.target.value)}
              required
            />
          </label>

          <label className="auth-field">
            Email address
            <span>Optional</span>
            <input
              type="email"
              autoComplete="email"
              placeholder="name@example.com"
              value={regEmail}
              onChange={(e) => setRegEmail(e.target.value)}
            />
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <label className="auth-field">
              Password
              <span>Required</span>
              <input
                type="password"
                placeholder="At least 4 chars"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                required
              />
            </label>
            <label className="auth-field">
              Confirm
              <span>Required</span>
              <input
                type="password"
                placeholder="Repeat password"
                value={regConfirmPassword}
                onChange={(e) => setRegConfirmPassword(e.target.value)}
                required
              />
            </label>
          </div>

          <label className="auth-field">
            Preferred language
            <select value={language} onChange={(e) => setLanguage(e.target.value)}>
              <option value="om">Afaan Oromo</option>
              <option value="am">አማርኛ (Amharic)</option>
            </select>
          </label>

          <button type="submit" className="button primary auth-submit-btn">
            Create Account
            <Icon name="arrow" size={16} />
          </button>

          <div className="auth-switch-text">
            Already have an account?
            <button type="button" onClick={() => setTab('login')}>
              Sign In
            </button>
          </div>
        </form>
      )}

      {tab === 'lookup' && (
        <form className="auth-form" onSubmit={handleLookup} noValidate>
          <label className="auth-field">
            Order reference
            <span>Required</span>
            <input
              type="text"
              placeholder="e.g. DEMO-ILL-…"
              value={lookupRef}
              onChange={(e) => setLookupRef(e.target.value)}
              required
            />
          </label>

          <label className="auth-field">
            Private access code
            <span>Optional</span>
            <input
              type="password"
              placeholder="Access code from receipt"
              value={lookupCode}
              onChange={(e) => setLookupCode(e.target.value)}
            />
          </label>

          <button type="submit" className="button primary auth-submit-btn">
            Find My Order
            <Icon name="search" size={16} />
          </button>

          <div className="auth-switch-text">
            Need to place an order?
            <SiteLink href="/#menu">Browse Menu</SiteLink>
          </div>
        </form>
      )}
    </div>
  )
}

export default function AuthPage() {
  const isRegister = window.location.hash === '#register' || window.location.pathname.includes('/register')
  return (
    <div className="auth-page">
      <header className="auth-header">
        <div className="container">
          <Logo />
          <nav>
            <SiteLink href="/#home">Home</SiteLink>
            <SiteLink href="/#menu">Menu</SiteLink>
            <SiteLink href="/contact">Contact</SiteLink>
          </nav>
        </div>
      </header>

      <main className="auth-main">
        <AuthCard initialTab={isRegister ? 'register' : 'login'} standalone />
      </main>

      <GlobalFooter />
    </div>
  )
}
