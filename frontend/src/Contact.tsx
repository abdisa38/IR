import { useLanguage, languageOptions } from './language'
import { useEffect, useRef, useState } from 'react'
import { Icon, Logo, Modal } from './shared-ui'
import { ContactAction, FindUsSection, GlobalFooter, GlobalHeader } from './LocationComponents'
import { validateContact } from './location-model'
import { SiteLink } from './site-routing'
import './location.css'

export default function Contact() {
  const [languageOpen, setLanguageOpen] = useState(false)
  const { language, setLanguage, t } = useLanguage()
  const [form, setForm] = useState({ name: '', contact: '', message: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [scenario, setScenario] = useState('unconfigured')
  const [submission, setSubmission] = useState('idle')
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const nameInput = useRef<HTMLInputElement>(null)
  const contactInput = useRef<HTMLInputElement>(null)
  const messageInput = useRef<HTMLTextAreaElement>(null)
  useEffect(() => () => clearTimeout(timer.current), [])
  const submit = () => {
    const invalid = validateContact(form.name, form.contact, form.message)
    setErrors(invalid)
    if (Object.keys(invalid).length) { setSubmission('invalid'); if (invalid.name) nameInput.current?.focus(); else if (invalid.contact) contactInput.current?.focus(); else messageInput.current?.focus(); return }
    setSubmission('loading')
    // Local state demonstration only. No message is sent or stored remotely.
    timer.current = setTimeout(() => setSubmission(scenario === 'success' ? 'success-demo' : scenario === 'failure' ? 'failure-demo' : 'unconfigured'), 650)
  }
  return <div className="contact-page">
    <GlobalHeader active="contact" />
    <main>
      <section className="contact-introduction container">
        <div>
          <span className="eyebrow"><span />{t('contact.eyebrow')}</span>
          <h1>{t('contact.headingLine1')}<br />{t('contact.headingLine2')}</h1>
        </div>
        <div className="contact-intro-note">
          <span className="contact-note-mark"><Icon name="heart" size={25} /></span>
          <span>{t('brand.hotel')} · {t('announcement.location')}</span>
        </div>
      </section>

      <section className="contact-cards container" aria-label="Contact options">
        <article>
          <span><Icon name="pin" size={24} /></span>
          <h2>{t('contact.comeOver')}</h2>
          <p>{t('location.address')}</p>
          <small>{t('location.town')}</small>
          <ContactAction kind="directions" className="contact-text-action" />
        </article>
        <article>
          <span><Icon name="phone" size={23} /></span>
          <h2>{t('contact.letsTalk')}</h2>
          <p>{t('location.phoneTitle')}: 0938890645</p>
          <small>{t('contact.phoneDirect')}</small>
          <ContactAction kind="call" className="contact-text-action" />
        </article>
        <article>
          <span><Icon name="clock" size={24} /></span>
          <h2>{t('contact.visitTime')}</h2>
          <p>{t('location.hoursValue')}</p>
          <small>{t('contact.mealsCovered')}</small>
          <a href="#message-us" className="contact-text-action">{t('contact.askQuestion')}<Icon name="arrow" size={16} /></a>
        </article>
      </section>

      <section id="message-us" className="contact-form-section container">
        <div className="contact-form-copy">
          <span className="eyebrow">{t('contact.helpEyebrow')}</span>
          <h2 style={{ whiteSpace: 'pre-line' }}>{t('contact.mindHeading')}</h2>
          <div className="contact-form-disclosure">
            <Icon name="heart" size={20} />
            <span>{t('contact.promptResponse')}</span>
          </div>
          <div className="contact-copy-signoff">
            <Icon name="heart" size={19} />
            <span>{t('hospitality.signoff')}</span>
          </div>
        </div>

        <div className="contact-form-card">
          <div className="form-heading">
            <h3>{t('contact.formTitle')}</h3>
            <span>{t('contact.quickResponseBadge')}</span>
          </div>
          <form onSubmit={event => { event.preventDefault(); if (submission !== 'loading') submit() }} noValidate>
            <label className="contact-field">
              {t('checkout.nameLabel')} <small>{t('checkout.nameReq')}</small>
              <input ref={nameInput} value={form.name} onChange={event => { setForm({ ...form, name: event.target.value }); setSubmission('idle') }} maxLength={80} autoComplete="name" placeholder={t('checkout.namePlaceholder')} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? 'contact-name-error' : undefined} required />
            </label>
            {errors.name && <p id="contact-name-error" className="location-field-error">{errors.name}</p>}

            <label className="contact-field">
              {t('checkout.phoneLabel')} / email <small>{t('checkout.nameReq')}</small>
              <input ref={contactInput} value={form.contact} onChange={event => { setForm({ ...form, contact: event.target.value }); setSubmission('idle') }} maxLength={150} placeholder="0938890645 / email" aria-invalid={Boolean(errors.contact)} aria-describedby={errors.contact ? 'contact-detail-error' : undefined} required />
            </label>
            {errors.contact && <p id="contact-detail-error" className="location-field-error">{errors.contact}</p>}

            <label className="contact-field">
              {t('contact.messageLabel')} <small>{t('checkout.nameReq')}</small>
              <textarea ref={messageInput} value={form.message} onChange={event => { setForm({ ...form, message: event.target.value }); setSubmission('idle') }} maxLength={2000} rows={5} placeholder={t('contact.messagePlaceholder')} aria-invalid={Boolean(errors.message)} aria-describedby={errors.message ? 'contact-message-error' : undefined} required />
            </label>
            {errors.message && <p id="contact-message-error" className="location-field-error">{errors.message}</p>}

            {submission !== 'idle' && submission !== 'invalid' && (
              <div className={`contact-form-result result-${submission}`} role="status">
                <Icon name="check" size={19} />
                <div>
                  <strong>{submission === 'loading' ? t('contact.sendingBtn') : t('contact.receivedTitle')}</strong>
                  <p>{submission === 'loading' ? t('contact.sendingBtn') : t('contact.receivedDesc')}</p>
                </div>
              </div>
            )}

            <button className="button primary contact-submit" type="submit" disabled={submission === 'loading'}>
              {submission === 'loading' ? t('contact.sendingBtn') : t('contact.sendBtn')}<Icon name="arrow" size={17} />
            </button>
            <span className="contact-privacy">
              <Icon name="shield" size={13} />{t('contact.privacyShield')}
            </span>
          </form>
        </div>
      </section>
      <div id="visit"><FindUsSection /></div>
    </main>
    <GlobalFooter />
    {languageOpen && (
      <Modal title="Choose Language / Qooqa Filadhaa" close={() => setLanguageOpen(false)}>
        <div className="language-options">
          {languageOptions.map(option => (
            <button
              className={`language-option ${language === option.id ? 'selected' : ''}`}
              key={option.id}
              onClick={() => {
                setLanguage(option.id)
                setLanguageOpen(false)
              }}
            >
              <span>{option.native} — {option.label}</span>
              <Icon name={language === option.id ? 'check' : 'globe'} />
            </button>
          ))}
        </div>
      </Modal>
    )}
  </div>
}
