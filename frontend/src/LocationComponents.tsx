import { useLanguage } from './language'
import { useState } from 'react'
import { Icon, Logo, Mark, Modal } from './shared-ui'
import { SiteLink } from './site-routing'
import './location.css'

export function ContactAction({ kind, className = 'button secondary' }: { kind: 'call' | 'directions'; className?: string }) {
  if (kind === 'call') {
    return (
      <a
        href="tel:0909511588"
        className={className}
        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', textDecoration: 'none' }}
        aria-label="Call Ilillii Hotel Manager at 0909511588"
      >
        <Icon name="phone" size={17} />
        Call Manager (0909511588)
      </a>
    )
  }
  return (
    <a
      href="https://www.google.com/maps/search/?api=1&query=General+Wako+Gutu+Square+Bale+Robe+Ethiopia"
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', textDecoration: 'none' }}
      aria-label="Get directions to General Wako Gutu Square, Bale Robe"
    >
      <Icon name="pin" size={17} />
      Get Directions
    </a>
  )
}
export function MapPreview() {
  const [state, setState] = useState('placeholder')
  return <div className="location-map-component"><div className={`location-map-stage map-state-${state}`} aria-live="polite"><div className="location-map-lines" aria-hidden="true" /><div className="location-map-content">{state === 'loading' ? <><span className="map-state-symbol"><Icon name="globe" size={30} /></span><h3>Loading map preview…</h3></> : state === 'error' ? <><span className="map-state-symbol"><Icon name="info" size={30} /></span><h3>Around Awraris, near General Wako Gutu Square</h3><p>Bale Robe, Oromia, Ethiopia.<br />Manager: 0909511588</p><button className="map-retry" onClick={() => setState('placeholder')}>Retry map preview<Icon name="arrow" size={15} /></button></> : state === 'external' ? <><span className="map-state-symbol"><Icon name="arrow" size={28} /></span><h3>Continue in your maps app.</h3><button className="map-retry" onClick={() => setState('placeholder')}>Return to location preview</button></> : <><span className="reserved-location-mark"><Mark /></span><h3>See you in Bale Robe</h3><p style={{ margin: '6px 0 0', fontSize: '13px', color: 'var(--color-muted)' }}>Around Awraris, near General Wako Gutu Square</p><span className="location-town-tag"><Icon name="pin" size={13} />BALE ROBE · OROMIA</span></>}</div></div></div>
}
export function FindUsSection() {
  return <section className="find-ilillii" id="find-us"><div className="container"><div className="find-section-heading"><span className="eyebrow">GOOD FOOD IS JUST THE BEGINNING</span><h2>Find Ilillii Hotel</h2></div><div className="location-composition"><MapPreview /><div className="visit-information"><span className="eyebrow">YOUR PLACE IN BALE ROBE</span><h3>There’s a place<br />for you here.</h3><div className="visit-detail"><Icon name="pin" size={21} /><div><strong>Around Awraris, near General Wako Gutu Square</strong><span>Bale Robe, Oromia, Ethiopia</span></div></div><div className="visit-detail"><Icon name="phone" size={21} /><div><strong>Manager: 0909511588</strong><a href="tel:0909511588" style={{ color: 'var(--color-brand)', fontWeight: 600, display: 'inline-block', marginTop: '2px' }}>Tap to call manager</a></div></div><div className="visit-detail"><Icon name="clock" size={21} /><div><strong>Opening hours</strong><span>Daily: 6:30 AM – 11:00 PM</span></div></div><div className="visit-actions"><ContactAction kind="directions" className="button primary" /><ContactAction kind="call" /></div><SiteLink href="/#menu" className="visit-order-link">Explore our menu & order food<Icon name="arrow" size={17} /></SiteLink></div></div></div></section>
}
export function GlobalFooter() {
  const [languageOpen, setLanguageOpen] = useState(false)
  const { language, setLanguage } = useLanguage()
  return <footer className="global-footer"><div className="container"><div className="global-footer-top"><div><Logo light /><span className="footer-hospitality-line">A table for everyone.</span></div><div><span className="footer-title">COME ON IN</span><SiteLink href="/#home">Home</SiteLink><SiteLink href="/#menu">Menu</SiteLink><SiteLink href="/contact">Contact</SiteLink><SiteLink href="/#login">Sign In / Register</SiteLink><SiteLink href="/#menu">Order Food<Icon name="arrow" size={13} /></SiteLink></div><div><span className="footer-title">FIND YOUR WAY</span><span>Around Awraris, near General Wako Gutu Square</span><span>Bale Robe, Oromia, Ethiopia</span><span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', margin: '4px 0' }}><Icon name="phone" size={13} /><a href="tel:0909511588" style={{ color: 'inherit', textDecoration: 'underline' }}>0909511588</a></span><ContactAction kind="directions" className="footer-action" /><ContactAction kind="call" className="footer-action" /></div><div><span className="footer-title">FEEL AT HOME</span><button className="footer-action" onClick={() => setLanguageOpen(true)}><Icon name="globe" size={15} />{language === 'am' ? 'አማርኛ / Afaan Oromo' : 'Afaan Oromo / አማርኛ'}</button><small>Local-language copy.</small><span className="footer-mini-mark"><Mark /></span></div></div><div className="global-footer-bottom"><span>© {new Date().getFullYear()} Ilillii Hotel. All rights reserved.</span><span>Food. People. A sense of belonging.</span><SiteLink href="/#login">Staff & Customer Portal<Icon name="arrow" size={13} /></SiteLink><SiteLink href="/design-system">Design system<Icon name="arrow" size={13} /></SiteLink></div></div>{languageOpen && <Modal title="Feel at home." close={() => setLanguageOpen(false)}><div className="language-options">{[{ id: 'om', label: 'Afaan Oromo' }, { id: 'am', label: 'አማርኛ — Amharic' }].map(option => <button key={option.id} className={`language-option ${language === option.id ? 'selected' : ''}`} onClick={() => setLanguage(option.id)}><span>{option.label}</span><Icon name={language === option.id ? 'check' : 'globe'} /></button>)}</div></Modal>}</footer>
}
