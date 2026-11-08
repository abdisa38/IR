import { Icon, Logo, Mark, Modal } from './shared-ui'
import { useLanguage, languageOptions } from './language'
import { useEffect, useState } from 'react'
import { FindUsSection, GlobalFooter, GlobalHeader } from './LocationComponents'
import { SiteLink } from './site-routing'
import { api, getImageUrl, type ApiMenuItem } from './api/client'

const heroPhoto = '/images/ethiopian-sharing-platter.jpg'

export default function App() {
  const [modal, setModal] = useState<string | null>(null)
  const { language, setLanguage, t } = useLanguage()
  const [featuredDishes, setFeaturedDishes] = useState<ApiMenuItem[]>([])
  const [scannedTable, setScannedTable] = useState<string | null>(null)

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      const table = params.get('table')
      const source = params.get('source')
      if (table) {
        localStorage.setItem('ilillii_table', table)
        sessionStorage.setItem('ilillii_table', table)
        if (source === 'qr') {
          localStorage.setItem('ilillii_table_source', 'qr')
          sessionStorage.setItem('ilillii_table_source', 'qr')
          setScannedTable(table)
        }
      } else {
        const stored = localStorage.getItem('ilillii_table')
        const storedSource = localStorage.getItem('ilillii_table_source')
        if (stored && storedSource === 'qr') setScannedTable(stored)
      }
    } catch (e) {}
  }, [])

  useEffect(() => {
    let mounted = true
    const fetchFeatured = () => {
      api.getMenu().then(res => {
        if (mounted && res.success && res.items?.length) {
          // Pick top 3 special items or first 3 available items
          const specials = res.items.filter(i => i.houseSpecial && i.available)
          const selected = specials.length >= 3 ? specials.slice(0, 3) : res.items.slice(0, 3)
          setFeaturedDishes(selected)
        }
      }).catch(err => {
        console.warn('Could not load featured dishes from backend:', err)
      })
    }

    fetchFeatured()
    window.addEventListener('ilillii-menu-updated', fetchFeatured)
    return () => {
      mounted = false
      window.removeEventListener('ilillii-menu-updated', fetchFeatured)
    }
  }, [])

  const showMenu = () => { window.location.hash = 'menu' }
  return <>
    <GlobalHeader active="home" />
    <main>
      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow"><span /> {t('hero.welcome')}</div>
          <h1>{t('hero.titleLine1')}<br />{t('hero.titleLine2')} <span>{t('hero.titleSpan')}</span></h1>
          <div className="hero-buttons">
            <button className="button primary" onClick={showMenu}>{t('hero.exploreMenu')}<Icon name="arrow" size={18} /></button>
            <a className="button secondary" href="#find-us"><Icon name="pin" size={18} />{t('hero.findUs')}</a>
          </div>
          <div className="hero-footnote">
            <span className="mini-mark"><Mark /></span>
            <span>{t('hero.community')}<br /><strong>{t('hero.moments')}</strong></span>
          </div>
        </div>
        <div className="hero-image">
          <img src={heroPhoto} alt="A generous Ethiopian sharing platter served on injera" fetchPriority="high" />
          <div className="image-shade" />
          <span className="image-label">{t('hero.imageLabel')}</span>
          <div className="round-seal">
            <span>{t('hero.sealTop')}</span>
            <Mark />
            <span>{t('hero.sealBottom')}</span>
          </div>
          <div className="photo-caption">
            <span className="photo-caption-line" />{t('hero.photoCaption')}
          </div>
        </div>
      </section>

      <section className="ways container" aria-labelledby="ways-heading">
        <div className="ways-intro">
          <span className="eyebrow">{t('ways.eyebrow')}</span>
          <h2 id="ways-heading" style={{ whiteSpace: 'pre-line' }}>{t('ways.title')}</h2>
        </div>
        {[
          { icon: 'meal', name: t('ways.dineIn'), description: t('ways.dineInDesc') },
          { icon: 'bag', name: t('ways.pickup'), description: t('ways.pickupDesc') },
        ].map(method => (
          <button className="method-card" key={method.name} onClick={() => setModal(method.name)}>
            <span className="method-icon"><Icon name={method.icon} size={25} /></span>
            <span className="method-content"><strong>{method.name}</strong></span>
            <Icon name="arrow" size={18} />
          </button>
        ))}
      </section>

      <section className="featured" id="menu">
        <div className="container">
          <div className="section-heading">
            <div>
              <span className="eyebrow">{t('featured.eyebrow')}</span>
              <h2>{t('featured.title')}</h2>
            </div>
            <button className="text-button" onClick={showMenu}>{t('featured.explore')}<Icon name="arrow" size={19} /></button>
          </div>
          <div className="food-grid">
            {featuredDishes.length > 0 ? featuredDishes.map((food, index) => (
              <button className="food-card" key={food.id} onClick={showMenu}>
                <div className="food-photo">
                  <img
                    src={getImageUrl(food.image || heroPhoto)}
                    alt={food.name}
                    loading="lazy"
                    onError={(e) => {
                      const target = e.currentTarget
                      if (!target.src.endsWith(heroPhoto)) {
                        target.src = heroPhoto
                      }
                    }}
                  />
                  <span className="food-badge">
                    {food.houseSpecial ? t('featured.badgeSpecial') : index === 0 ? t('featured.badgeSignature') : t('featured.badgeChef')}
                  </span>
                  <span className="food-arrow"><Icon name="arrow" /></span>
                </div>
                <div className="food-info">
                  <div>
                    <h3>
                      {language === 'am' && food.amharicName
                        ? food.amharicName
                        : (language === 'om' && (food.translations?.or || (food.translations as any)?.om) ? (food.translations?.or || (food.translations as any)?.om) : food.name)}
                    </h3>
                  </div>
                  <span className="price">{food.price}<small>ETB</small></span>
                </div>
              </button>
            )) : [
              { name: 'Kitfoo / ክትፎ', price: '1500', image: '/images/menu/kitfoo.jpg' },
              { name: 'Foon Waddii / የተጠበሰ ሥጋ', price: '1300', image: '/images/menu/foon-waddii.jpg' },
              { name: 'Ispeeshaal Goodinii / ስፔሻል ጎደኒ', price: '1400', image: '/images/menu/ispeeshaal-goodinii.jpg' }
            ].map((food) => (
              <button className="food-card" key={food.name} onClick={showMenu}>
                <div className="food-photo">
                  <img
                    src={food.image}
                    alt={food.name}
                    loading="lazy"
                    onError={(e) => {
                      const target = e.currentTarget
                      if (!target.src.endsWith(heroPhoto)) {
                        target.src = heroPhoto
                      }
                    }}
                  />
                  <span className="food-badge">{t('featured.badgeSpecial')}</span>
                  <span className="food-arrow"><Icon name="arrow" /></span>
                </div>
                <div className="food-info">
                  <div>
                    <h3>{food.name}</h3>
                  </div>
                  <span className="price">{food.price}<small>ETB</small></span>
                </div>
              </button>
            ))}
          </div>
          <p className="sample-note"><span className="note-dot" />{t('featured.freshNote')}</p>
        </div>
      </section>

      <section className="hospitality container" id="about">
        <div className="hospitality-image">
          <img src={'/images/1517248135467-4c7edcad34c4.jpg'} alt="Warm restaurant interior with tables set for gathering" loading="lazy" />
          <span className="hospitality-stamp">
            <Mark />
            <span>{t('hospitality.stampTop')}<br />{t('hospitality.stampBottom')}</span>
          </span>
        </div>
        <div className="hospitality-copy">
          <span className="eyebrow">{t('hospitality.eyebrow')}</span>
          <h2>{t('hospitality.titleLine1')}<br />{t('hospitality.titleLine2')}</h2>
          <div className="hospitality-signoff">
            <Icon name="heart" size={21} />
            <span>{t('hospitality.signoff')}</span>
          </div>
        </div>
      </section>

      <FindUsSection />
      <section className="closing">
        <Mark />
        <button className="text-button" onClick={showMenu}>{t('featured.explore')}<Icon name="arrow" size={18} /></button>
      </section>
    </main>
    <GlobalFooter />
    {modal && <Modal title={modal === 'language' ? 'Choose your language' : modal === 'brand' ? 'The Ilillii brand' : modal === 'directions' ? 'Find Ilillii Hotel' : modal === 'contact' ? 'Let’s get in touch' : `${modal} at Ilillii`} close={() => setModal(null)}>
      {modal === 'language' ? (
        <div className="language-options">
          {languageOptions.map(item => (
            <button
              className={`language-option ${language === item.id ? 'selected' : ''}`}
              key={item.id}
              onClick={() => {
                setLanguage(item.id)
                setModal(null)
              }}
            >
              <span>{item.native} — {item.label}</span>
              {language === item.id ? <Icon name="check" /> : <Icon name="globe" />}
            </button>
          ))}
        </div>
      ) :
      modal === 'brand' ? <><div className="brand-preview"><Logo /><div className="dark-brand"><Logo light /></div><div className="symbol-preview"><Mark /><span>Shared moments. One meeting point.</span></div></div><div className="swatches">{['Brand red', 'Deep red', 'Warm ivory', 'Warm gold'].map((name, i) => <div key={name}><span className={`swatch swatch-${i}`} />{name}</div>)}</div><p className="modal-description">An editable SVG meeting-point symbol paired with a custom-spaced wordmark. Manrope supports Latin and Afaan Oromo; Noto Sans Ethiopic provides Ethiopic script coverage. Status colors are paired with labels and icons.</p></> :
      modal === 'directions' ? <><p className="modal-description">Ilillii Hotel is located around Awraris, Bale Robe, Oromia, Ethiopia (Coordinates: 7.121960, 40.002844).</p><a href="https://maps.app.goo.gl/c5xWhAaUGHdzynk77" target="_blank" rel="noopener noreferrer" className="button primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', textDecoration: 'none' }}><Icon name="pin" size={17} />Open in Google Maps</a></> :
      modal === 'contact' ? <><p className="modal-description">Ilillii Hotel Phone: 09511588. We are happy to assist you with table bookings, orders, and inquiries in Bale Robe.</p><a href="tel:09511588" className="button primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', textDecoration: 'none' }}><Icon name="phone" size={17} />Call 09511588</a></> :
      <><div className="method-modal-icon"><Icon name={modal === 'Dine In' ? 'meal' : 'bag'} size={32} /></div><p className="modal-description">{modal === 'Dine In' ? 'Join us for delicious food and drinks at Ilillii Hotel in Bale Robe. Enjoy table ordering and warm hospitality.' : 'Order ahead and pick up your meal fresh from Ilillii Hotel around Awraris.'}</p><button className="button primary" onClick={showMenu}>Browse food & drinks menu<Icon name="arrow" /></button></>}
    </Modal>}
  </>
}
