import { useEffect, useId, useRef } from 'react'
import type { ReactNode, RefObject } from 'react'
import { SiteLink } from './site-routing'

export function Icon({ name, size = 20 }: { name: string; size?: number }) {
  const paths: Record<string, ReactNode> = {
    arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
    pin: <><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
    globe: <><circle cx="12" cy="12" r="9" /><ellipse cx="12" cy="12" rx="4" ry="9" /><path d="M3 12h18" /></>,
    down: <path d="m7 10 5 5 5-5" />,
    meal: <><path d="M4 3v6a3 3 0 0 0 6 0V3M7 3v18M20 21V3c-5 1-5 11 0 11" /></>,
    bag: <><path d="M5 7h14l1 14H4L5 7Z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></>,
    delivery: <><path d="M3 6h11v11H3ZM14 10h4l3 4v3h-7" /><circle cx="7" cy="18" r="2" /><circle cx="18" cy="18" r="2" /></>,
    coffee: <><path d="M4 8h13v7a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5ZM17 9h1a3 3 0 1 1 0 6h-1M7 2v2M12 2v2" /></>,
    close: <path d="m6 6 12 12M6 18 18 6" />,
    menu: <path d="M4 6h16M4 12h16M4 18h16" />,
    search: <><circle cx="10" cy="10" r="6" /><path d="m15 15 6 6" /></>,
    phone: <path d="m8 3 3 5-3 3c1 3 2 4 5 5l3-3 5 3c0 4-2 6-6 4C9 18 6 15 3 9 1 5 4 3 8 3Z" />,
    heart: <path d="M20 5c-3-3-7-1-8 1-1-2-5-4-8-1-5 5 8 15 8 15S25 10 20 5Z" />,
    check: <path d="m5 12 4 4L19 6" />,
    plus: <path d="M5 12h14M12 5v14" />,
    minus: <path d="M5 12h14" />,
    info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7h.01" /></>,
    bank: <><path d="m3 9 9-6 9 6H3ZM3 21h18M5 9v9M10 9v9M14 9v9M19 9v9M3 18h18" /></>,
    cash: <><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="12" cy="12" r="3" /><path d="M6 9h.01M18 15h.01" /></>,
    shield: <><path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z" /><path d="m8 12 3 3 5-6" /></>,
    copy: <><rect x="8" y="8" width="12" height="13" rx="2" /><path d="M15 8V3H3v13h5" /></>,
    print: <><path d="M7 8V3h10v5M7 17H3V8h18v9h-4" /><path d="M7 13h10v8H7ZM17 10h.01" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    overview: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    layers: <><path d="m12 3 10 5-10 5L2 8l10-5ZM2 12l10 5 10-5M2 16l10 5 10-5" /></>,
    users: <><circle cx="9" cy="7" r="3" /><path d="M3 21v-4a6 6 0 0 1 12 0v4M16 4a3 3 0 0 1 0 6M17 13a5 5 0 0 1 4 5v3" /></>,
    bell: <><path d="M5 17h14l-2-3V8a5 5 0 0 0-10 0v6l-2 3ZM10 21h4" /></>,
    chart: <><path d="M3 3v18h18M7 16v-5M12 16V6M17 16v-8" /></>,
    settings: <><path d="m9 3-1 3-3 1-2 4 2 3v4l4 3 3-1 3 1 4-3v-4l2-3-2-4-3-1-1-3H9Z" /><circle cx="12" cy="12" r="3" /></>,
    qr: <><rect x="3" y="3" width="6" height="6" /><rect x="15" y="3" width="6" height="6" /><rect x="3" y="15" width="6" height="6" /><path d="M15 15h6v6h-3v-3h-3ZM12 3v6M3 12h6M12 15v6" /></>,
    logout: <><path d="M10 3H3v18h7M9 12h12M17 8l4 4-4 4" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 3v4M17 3v4M3 10h18M7 14h3M14 14h3" /></>,
    'chevron-right': <path d="m9 5 7 7-7 7" />,
    'chevron-left': <path d="m15 5-7 7 7 7" />,
    up: <path d="m7 14 5-5 5 5" />,
    download: <><path d="M12 3v12M7 10l5 5 5-5M3 16v5h18v-5" /></>,
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] || paths.arrow}</svg>
}

export function useDialog(ref: RefObject<HTMLDialogElement | null>, open: boolean) {
  useEffect(() => {
    if (!open) return
    const element = ref.current
    if (!element) return
    const previousFocus = document.activeElement as HTMLElement | null
    const previousOverflow = document.body.style.overflow
    element.showModal()
    document.body.style.overflow = 'hidden'
    return () => {
      element.close()
      document.body.style.overflow = document.querySelector('dialog[open]') ? 'hidden' : previousOverflow === 'hidden' ? '' : previousOverflow
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true })
    }
  }, [open, ref])
}

export function Modal({ title, children, close }: { title: string; children: ReactNode; close: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  useDialog(ref, true)
  return <dialog ref={ref} className="modal" aria-labelledby={titleId} onCancel={event => { event.preventDefault(); close() }} onClick={event => { if (event.target === event.currentTarget) close() }}><div className="modal-head"><h2 id={titleId}>{title}</h2><button className="icon-button" onClick={close} aria-label="Close dialog"><Icon name="close" /></button></div>{children}<button className="button secondary modal-done" onClick={close}>Done<Icon name="check" /></button></dialog>
}

export function Mark() {
  return <svg className="brand-mark" viewBox="0 0 48 48" fill="none" aria-hidden="true"><g stroke="currentColor" strokeWidth="2.5"><path d="M24 24C7 24 5 15 9 10c5-5 15-2 15 14ZM24 24c0-17 9-19 14-15 5 5 2 15-14 15ZM24 24c17 0 19 9 15 14-5 5-15 2-15-14ZM24 24c0 17-9 19-14 15-5-5-2-15 14-15Z" /><circle cx="24" cy="24" r="4" /></g></svg>
}
export function Logo({ light = false }: { light?: boolean }) {
  return <SiteLink href="/#home" className={`logo ${light ? 'logo-light' : ''}`} aria-label="Ilillii Hotel home"><Mark /><span className="wordmark">ilillii<span className="logo-caption">HOTEL · BALE ROBE</span></span></SiteLink>
}
