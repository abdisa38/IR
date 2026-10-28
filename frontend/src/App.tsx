import { lazy, Suspense, useEffect, useState } from 'react'
import Home from './Home'
import Menu from './Menu'
import Contact from './Contact'
import { sitePage } from './site-routing'
const Admin = lazy(() => import('./Admin'))
const DesignSystem = lazy(() => import('./DesignSystem'))
const Auth = lazy(() => import('./Auth'))

export default function App() {
  const [page, setPage] = useState(sitePage)
  useEffect(() => {
    const navigate = () => {
      setPage(sitePage())
      if (['#home', '#menu', '#contact', '#login', '#register', ''].includes(window.location.hash)) window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', navigate)
    window.addEventListener('popstate', navigate)
    return () => { window.removeEventListener('hashchange', navigate); window.removeEventListener('popstate', navigate) }
  }, [])
  return <><div hidden={page !== 'menu'}><Menu /></div>{page === 'home' && <Home />}{page === 'contact' && <Contact />}{page === 'auth' && <Suspense fallback={<p role="status">Loading…</p>}><Auth /></Suspense>}{page === 'admin' && <Suspense fallback={<p role="status">Loading dashboard preview…</p>}><Admin /></Suspense>}{page === 'design-system' && <Suspense fallback={<p role="status">Loading component guide…</p>}><DesignSystem /></Suspense>}</>
}
