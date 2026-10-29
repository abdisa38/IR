import { Icon, Logo, Mark, Modal } from './shared-ui'
import { useLanguage, languageOptions } from './language'
import { useEffect, useState } from 'react'
import { FindUsSection, GlobalFooter, GlobalHeader } from './LocationComponents'
import { SiteLink } from './site-routing'
import { api, getImageUrl, type ApiMenuItem } from './api/client'

const heroPhoto = '/images/ethiopian-sharing-platter.jpg'

export default function App() {
  const [modal, setModal] = useState<string | null>(null)
  const { language, setLanguage } = useLanguage()
  const [featuredDishes, setFeaturedDishes] = useState<ApiMenuItem[]>([])

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
      <section className="hero"><div className="hero-copy"><div className="eyebrow"><span /> A WARM WELCOME TO ILILLII</div><h1>Good food.<br />Great <span>Restaurant.</span></h1><div className="hero-buttons"><button className="button primary" onClick={showMenu}>Explore Our Menu<Icon name="arrow" size={18} /></button><a className="button secondary" href="#find-us"><Icon name="pin" size={18} />Find Us</a></div><div className="hero-footnote"><span className="mini-mark"><Mark /></span><span>Rooted in our community.<br /><strong>Made for moments together.</strong></span></div></div><div className="hero-image"><img src={heroPhoto} alt="A generous Ethiopian sharing platter served on injera" fetchPriority="high" /><div className="image-shade" /><span className="image-label">GOOD FOOD BRINGS US TOGETHER</span><div className="round-seal"><span>COME HUNGRY</span><Mark /><span>LEAVE HAPPY</span></div><div className="photo-caption"><span className="photo-caption-line" />A shared table. A shared moment.</div></div></section>
      <section className="ways container" aria-labelledby="ways-heading"><div className="ways-intro"><span className="eyebrow">YOUR TABLE, YOUR WAY</span><h2 id="ways-heading">How will you<br />join us?</h2></div>{[{ icon: 'meal', name: 'Dine In', description: 'Settle in. Share a meal. Feel at home at our hotel.' }, { icon: 'bag', name: 'Pickup / Takeaway', description: 'Your favourites, freshly prepared to take with you.' }].map(method => <button className="method-card" key={method.name} onClick={() => setModal(method.name)}><span className="method-icon"><Icon name={method.icon} size={25} /></span><span className="method-content"><strong>{method.name}</strong></span><Icon name="arrow" size={18} /></button>)}</section>
      <section className="featured" id="menu">
        <div className="container">
          <div className="section-heading">
            <div>
              <span className="eyebrow">A LITTLE SOMETHING TO LOOK FORWARD TO</span>
              <h2>Find your next favourite.</h2>
            </div>
            <button className="text-button" onClick={showMenu}>Explore the menu<Icon name="arrow" size={19} /></button>
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
                  <span className="food-badge">{food.houseSpecial ? 'SPECIAL HOUSE FOOD' : index === 0 ? 'SIGNATURE DISH' : 'CHEF RECOMMENDATION'}</span>
                  <span className="food-arrow"><Icon name="arrow" /></span>
                </div>
                <div className="food-info">
                  <div>
                    <h3>{food.amharicName ? `${food.name} / ${food.amharicName}` : food.name}</h3>
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
                  <span className="food-badge">SPECIAL HOUSE FOOD</span>
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
          <p className="sample-note"><span className="note-dot" />Freshly prepared daily with authentic Bale Robe spices and ingredients.</p>
        </div>
      </section>
      <section className="hospitality container" id="about"><div className="hospitality-image"><img src={'/images/1517248135467-4c7edcad34c4.jpg'} alt="Warm restaurant interior with tables set for gathering" loading="lazy" /><span className="hospitality-stamp"><Mark /><span>THERE’S ALWAYS<br />ROOM AT OUR TABLE</span></span></div><div className="hospitality-copy"><span className="eyebrow">MORE THAN A MEAL</span><h2>A familiar place.<br />A warm welcome.</h2><div className="hospitality-signoff"><Icon name="heart" size={21} /><span>Food. People. A sense of belonging.</span></div></div></section>
      <FindUsSection />
      <section className="closing"><Mark /><button className="text-button" onClick={showMenu}>Let’s find your favourite<Icon name="arrow" size={18} /></button></section>
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
      modal === 'directions' ? <><p className="modal-description">Ilillii Hotel is located around Awraris, near General Wako Gutu Square, Bale Robe, Oromia, Ethiopia.</p><a href="https://www.google.com/maps/search/?api=1&query=General+Wako+Gutu+Square+Bale+Robe+Ethiopia" target="_blank" rel="noopener noreferrer" className="button primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', textDecoration: 'none' }}><Icon name="pin" size={17} />Open in Google Maps</a></> :
      modal === 'contact' ? <><p className="modal-description">Ilillii Hotel Phone: 0909511588. We are happy to assist you with table bookings, orders, and inquiries in Bale Robe.</p><a href="tel:0909511588" className="button primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', textDecoration: 'none' }}><Icon name="phone" size={17} />Call 0909511588</a></> :
      <><div className="method-modal-icon"><Icon name={modal === 'Dine In' ? 'meal' : 'bag'} size={32} /></div><p className="modal-description">{modal === 'Dine In' ? 'Join us for delicious food and drinks at Ilillii Hotel in Bale Robe. Enjoy table ordering and warm hospitality.' : 'Order ahead and pick up your meal fresh from Ilillii Hotel around Awraris, near General Wako Gutu Square.'}</p><button className="button primary" onClick={showMenu}>Browse food & drinks menu<Icon name="arrow" /></button></>}
    </Modal>}
  </>
}
