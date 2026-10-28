import { useEffect, useRef, useState } from 'react'
import { Icon, Logo } from './shared-ui'
import { SiteLink } from './site-routing'
import { useLanguage } from './language'
import { GlobalFooter } from './LocationComponents'
import { api, type ApiUser } from './api/client'
import './auth.css'

export type AuthMode = 'login' | 'register'

declare global {
  interface Window {
    google?: any
  }
}

export function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  )
}

export function AuthCard({
  initialMode = 'login',
  standalone = false,
  onSuccess,
}: {
  initialMode?: AuthMode
  standalone?: boolean
  onSuccess?: (user: ApiUser) => void
}) {
  const [mode, setMode] = useState<AuthMode>(initialMode)
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

  // State management
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const googleBtnRef = useRef<HTMLDivElement>(null)
  const googleRegBtnRef = useRef<HTMLDivElement>(null)

  const GOOGLE_CLIENT_ID_DEFAULT = '719507365901-7ge7qlu3uvj36evr8kpnviceej33q89d.apps.googleusercontent.com'
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID_DEFAULT

  // Initialize Google Identity Services
  useEffect(() => {
    let scriptLoaded = false

    const handleGoogleResponse = async (response: any) => {
      if (!response.credential) return
      setBusy(true)
      setError('')
      setSuccess('')
      try {
        const res = await api.googleAuth(response.credential, googleClientId)
        if (res.success && res.user) {
          localStorage.setItem(
            'ilillii_customer',
            JSON.stringify({
              name: res.user.name,
              phone: res.user.phone || '',
              email: res.user.email || '',
              avatar: res.user.avatar || '',
            })
          )
          window.dispatchEvent(new CustomEvent('ilillii-auth-changed'))
          setSuccess(`Welcome, ${res.user.name}! Signed in with Google.`)
          setTimeout(() => {
            if (onSuccess) onSuccess(res.user)
            if (standalone) {
              window.location.hash = 'menu'
              window.dispatchEvent(new HashChangeEvent('hashchange'))
            }
          }, 600)
        }
      } catch (err: any) {
        setError(err.message || 'Google sign-in failed. Please try again.')
      } finally {
        setBusy(false)
      }
    }

    const initGoogle = () => {
      if (window.google?.accounts?.id && googleClientId) {
        try {
          window.google.accounts.id.initialize({
            client_id: googleClientId,
            callback: handleGoogleResponse,
            auto_select: false,
          })
          const btnEl = mode === 'login' ? googleBtnRef.current : googleRegBtnRef.current
          if (btnEl) {
            window.google.accounts.id.renderButton(btnEl, {
              theme: 'outline',
              size: 'large',
              width: 380,
              text: mode === 'login' ? 'signin_with' : 'signup_with',
              shape: 'rectangular',
            })
          }
        } catch (e) {
          console.warn('Google accounts initialization note:', e)
        }
      }
    }

    if (!document.getElementById('google-client-script')) {
      const script = document.createElement('script')
      script.id = 'google-client-script'
      script.src = 'https://accounts.google.com/gsi/client'
      script.async = true
      script.defer = true
      script.onload = () => {
        scriptLoaded = true
        initGoogle()
      }
      document.body.appendChild(script)
    } else {
      initGoogle()
    }
  }, [mode, googleClientId])

  const handleGoogleClick = () => {
    if (!googleClientId) {
      // Guide the user that client ID is ready to be entered
      setError(
        'Google Client ID is not configured yet. Add VITE_GOOGLE_CLIENT_ID to your environment variables to enable one-click Google login.'
      )
      return
    }

    if (window.google?.accounts?.id) {
      window.google.accounts.id.prompt()
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
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

    setBusy(true)
    try {
      const res = await api.login(cleanId, loginPassword)
      setBusy(false)
      if (res.success && res.user) {
        localStorage.setItem(
          'ilillii_customer',
          JSON.stringify({
            name: res.user.name,
            phone: res.user.phone || '',
            email: res.user.email || '',
            avatar: res.user.avatar || '',
          })
        )
        window.dispatchEvent(new CustomEvent('ilillii-auth-changed'))

        if (res.user.isStaff || ['admin', 'kitchen'].includes(res.user.role)) {
          setSuccess('Signing in to Ilillii Staff Workspace…')
          setTimeout(() => {
            window.location.hash = 'admin'
            window.dispatchEvent(new HashChangeEvent('hashchange'))
          }, 600)
          return
        }

        setSuccess(`Welcome back, ${res.user.name}!`)
        setTimeout(() => {
          if (onSuccess) onSuccess(res.user)
          if (standalone) {
            window.location.hash = 'menu'
            window.dispatchEvent(new HashChangeEvent('hashchange'))
          }
        }, 700)
      }
    } catch (err: any) {
      setBusy(false)
      setError(err.message || 'Incorrect login details. Please check your phone/email and password.')
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
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

    setBusy(true)
    try {
      const res = await api.register({
        name: regName.trim(),
        phone: regPhone.trim(),
        email: regEmail.trim() || undefined,
        password: regPassword,
      })
      setBusy(false)
      if (res.success && res.user) {
        localStorage.setItem(
          'ilillii_customer',
          JSON.stringify({
            name: res.user.name,
            phone: res.user.phone || '',
            email: res.user.email || '',
            avatar: res.user.avatar || '',
          })
        )
        window.dispatchEvent(new CustomEvent('ilillii-auth-changed'))
        setSuccess(`Account created for ${res.user.name}! Redirecting…`)
        setTimeout(() => {
          if (onSuccess) onSuccess(res.user)
          if (standalone) {
            window.location.hash = 'menu'
            window.dispatchEvent(new HashChangeEvent('hashchange'))
          }
        }, 700)
      }
    } catch (err: any) {
      setBusy(false)
      setError(err.message || 'Failed to create account. Please try again.')
    }
  }

  return (
    <div className="auth-card">
      <div className="auth-card-head">
        <Logo />
        <h1>{mode === 'login' ? 'Sign in to Ilillii' : 'Create an account'}</h1>
        <p>
          {mode === 'login'
            ? 'Manage your orders, table bookings and preferences.'
            : 'Join Ilillii Hotel for express ordering and saved details.'}
        </p>
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

      {mode === 'login' ? (
        <form className="auth-form" onSubmit={handleLogin} noValidate>
          <label className="auth-field">
            <div className="auth-field-header">
              <span>Phone number or email</span>
              <span className="field-badge">Required</span>
            </div>
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
            <div className="auth-field-header">
              <span>Password</span>
              <span className="field-badge">Required</span>
            </div>
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
                  fontWeight: 600,
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
              onClick={() => setError('Password reset instructions will be sent to your phone/email.')}
            >
              Forgot password?
            </button>
          </div>

          <button type="submit" className="button primary auth-submit-btn" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign In'}
            {!busy && <Icon name="arrow" size={16} />}
          </button>

          <div className="auth-divider">
            <span>or continue with</span>
          </div>

          <div ref={googleBtnRef} style={{ width: '100%', minHeight: '46px', display: 'flex', justifyContent: 'center' }}>
            <button type="button" className="google-auth-btn" onClick={handleGoogleClick}>
              <GoogleLogo />
              <span>Continue with Google</span>
            </button>
          </div>

          <div className="auth-bottom-switch">
            Don’t have an account?
            <button
              type="button"
              onClick={() => {
                setMode('register')
                setError('')
                setSuccess('')
              }}
            >
              Sign up
            </button>
          </div>

          <div className="auth-staff-link">
            <span>Hotel team?</span>
            <SiteLink href="/#admin">Open Staff Workspace →</SiteLink>
          </div>
        </form>
      ) : (
        <form className="auth-form" onSubmit={handleRegister} noValidate>
          <label className="auth-field">
            <div className="auth-field-header">
              <span>Full name</span>
              <span className="field-badge">Required</span>
            </div>
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
            <div className="auth-field-header">
              <span>Phone number</span>
              <span className="field-badge">Required</span>
            </div>
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
            <div className="auth-field-header">
              <span>Email address</span>
              <span className="field-badge">Optional</span>
            </div>
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
              <div className="auth-field-header">
                <span>Password</span>
                <span className="field-badge">Required</span>
              </div>
              <input
                type="password"
                placeholder="At least 4 chars"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                required
              />
            </label>
            <label className="auth-field">
              <div className="auth-field-header">
                <span>Confirm</span>
                <span className="field-badge">Required</span>
              </div>
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
            <span>Preferred language</span>
            <select value={language} onChange={(e) => setLanguage(e.target.value)}>
              <option value="om">Afaan Oromo</option>
              <option value="am">አማርኛ (Amharic)</option>
            </select>
          </label>

          <button type="submit" className="button primary auth-submit-btn" disabled={busy}>
            {busy ? 'Creating account…' : 'Create Account'}
            {!busy && <Icon name="arrow" size={16} />}
          </button>

          <div className="auth-divider">
            <span>or continue with</span>
          </div>

          <div ref={googleRegBtnRef} style={{ width: '100%', minHeight: '46px', display: 'flex', justifyContent: 'center' }}>
            <button type="button" className="google-auth-btn" onClick={handleGoogleClick}>
              <GoogleLogo />
              <span>Continue with Google</span>
            </button>
          </div>

          <div className="auth-bottom-switch">
            Already have an account?
            <button
              type="button"
              onClick={() => {
                setMode('login')
                setError('')
                setSuccess('')
              }}
            >
              Sign in
            </button>
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
        <AuthCard initialMode={isRegister ? 'register' : 'login'} standalone />
      </main>

      <GlobalFooter />
    </div>
  )
}
