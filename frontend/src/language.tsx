import { createContext, useContext, useState, useEffect } from 'react'
import type { Dispatch, ReactNode, SetStateAction } from 'react'

export type Language = 'om' | 'am' | 'en'

export const languageOptions: { id: Language; label: string; native: string }[] = [
  { id: 'om', label: 'Afaan Oromoo', native: 'Afaan Oromoo' },
  { id: 'am', label: 'አማርኛ (Amharic)', native: 'አማርኛ' },
  { id: 'en', label: 'English', native: 'English' },
]

export const translations: Record<Language, Record<string, string>> = {
  om: {
    'nav.home': 'Mana',
    'nav.menu': 'Baafata Nyaataa',
    'nav.contact': 'Nu Quunnamaa',
    'nav.login': 'Seeni',
    'nav.cart': 'Gaarii Keessan',
    'nav.order': 'Nyaata Ajajaa',
    'nav.profile': 'Piroofayilii',
    'nav.signOut': 'Bahi',
    'hero.title': 'Nyaata Mi’aawaa. Hoteela Filatamaa.',
    'hero.sub': 'Hawaasa keenya keessatti kan hundeeffame. Yeroo waliinii bareedaaf.',
    'hero.explore': 'Baafata Nyaataa Ilaalaa',
    'hero.findUs': 'Bakka Keenya',
    'hero.dineIn': 'Asuma Nyaachuu',
    'hero.dineInDesc': 'Taa’aa, nyaata qooddadhaa, hoteela keenya keessatti akka mana keessaniitti boqodhaa.',
    'hero.pickup': 'Qabattanii Deemuu',
    'hero.pickupDesc': 'Nyaata jaallattan haaraa qophaa’ee isiniif kennama.',
    'hero.featured': 'Nyaata filatamaa keessan filadhaa.',
    'hero.signature': 'NYAATA ADDAA',
    'hero.chef': 'GORSITUU SHEEFA',
    'menu.title': 'Baafata Nyaataa fi Dhugaatii',
    'menu.subtitle': 'Bale Robee keessatti qulqullina olaanaadhaan kan qophaa’e.',
    'menu.all': 'Hunda',
    'menu.main': 'Nyaata Ijoo',
    'menu.additional': 'Nyaata Dabalataa',
    'menu.hotDrinks': 'Dhugaatii Hoo’aa',
    'menu.coldDrinks': 'Dhugaatii Qabbanaawaa',
    'menu.beerWine': 'Biiraa fi Wayinii',
    'menu.spirits': 'Alkoolii Cimaa',
    'menu.addToCart': 'Gara Gaariitti Dabali',
    'menu.added': 'Dabalameera',
    'menu.viewCart': 'Gaarii Ilaalaa',
    'menu.search': 'Nyaata ykn dhugaatii barbaadi…',
    'cart.title': 'Ajaja Keessan',
    'cart.empty': 'Gaariin keessan duwwaadha',
    'cart.subtotal': 'Ida’ama Xiqqaa',
    'cart.total': 'Ida’ama Guutuu',
    'cart.checkout': 'Gara Kaffaltiitti',
    'cart.continue': 'Nyaata dabaladhaa',
    'cart.orderMore': 'Nyaata Dabalataa Ajajaa',
    'cart.tableVerified': 'Gabatee QR Mirkanaa’e',
    'order.details': 'Oodeeffannoo Keessan',
    'order.name': 'Maqaa Guutuu',
    'order.nameReq': 'Dirqama',
    'order.phone': 'Lakkoofsa Bilbilaa',
    'order.note': 'Yaada Kushiinaaf',
    'order.place': 'Ajaja Ergi',
    'order.success': 'Ajajni Keessan Ergameera!',
    'order.received': 'Kushiinaan keenya qopheessuu eegaleera.',
    'order.status': 'Haala Ajajaa',
    'status.new': 'Ergameera',
    'status.accepted': 'Fudhatameera',
    'status.preparing': 'Qophaa’aa Jira',
    'status.ready': 'Qophii Dha',
    'status.completed': 'Xumurameera',
    'status.cancelled': 'Haqameera',
    'qr.scanned': 'Gabatee irraa kan scanned ta’e',
    'qr.webDirect': 'Weebsaayitii irraa kallattiin',
    'footer.rights': 'Mirgi hunduu eegamaadha.',
    'footer.location': 'Bale Robee, Oromiyaa, Itoophiyaa',
    'footer.hours': 'Guyyaa hunda: 7:00 AM – 11:30 PM',
  },
  am: {
    'nav.home': 'ዋና ገጽ',
    'nav.menu': 'የምግብ ዝርዝር',
    'nav.contact': 'አግኙን',
    'nav.login': 'ግባ',
    'nav.cart': 'ቅርጫት',
    'nav.order': 'ምግብ ይዘዙ',
    'nav.profile': 'መገለጫ',
    'nav.signOut': 'ውጣ',
    'hero.title': 'ጥሩ ምግብ። ድንቅ ሬስቶራንት።',
    'hero.sub': 'ከማህበረሰባችን የበቀለ። ለአብሮነት ጊዜ የተዘጋጀ።',
    'hero.explore': 'ሜኑ ይመልከቱ',
    'hero.findUs': 'አድራሻችን',
    'hero.dineIn': 'እዚሁ መመገብ',
    'hero.dineInDesc': 'ዘና ብለው ይመገቡ። በኢሊሊ ሆቴል እንደ ቤትዎ ይሰማዎታል።',
    'hero.pickup': 'ይዘው ለመሄድ',
    'hero.pickupDesc': 'ተወዳጅ ምግቦችዎን ትኩስ ሆኖ በፍጥነት ያግኙ።',
    'hero.featured': 'ተወዳጅ ምግብዎን ይምረጡ።',
    'hero.signature': 'ልዩ ምግብ',
    'hero.chef': 'የሼፍ ምርጫ',
    'menu.title': 'የምግብ እና መጠጥ ዝርዝር',
    'menu.subtitle': 'በባሌ ሮቤ በጥራትና ትኩስ ቅመሞች የተዘጋጀ።',
    'menu.all': 'ሁሉም',
    'menu.main': 'ዋና ምግቦች',
    'menu.additional': 'ተጨማሪ ምግቦች',
    'menu.hotDrinks': 'ትኩስ መጠጦች',
    'menu.coldDrinks': 'ቀዝቃዛ መጠጦች',
    'menu.beerWine': 'ቢራ እና ወይን',
    'menu.spirits': 'አረቄና ውስኪ',
    'menu.addToCart': 'ወደ ቅርጫት ጨምር',
    'menu.added': 'ተጨምሯል',
    'menu.viewCart': 'ቅርጫቱን ይመልከቱ',
    'menu.search': 'ምግብ ወይም መጠጥ ይፈልጉ…',
    'cart.title': 'የትዕዛዝ ቅርጫት',
    'cart.empty': 'ቅርጫትዎ ባዶ ነው',
    'cart.subtotal': 'ንዑስ ድምር',
    'cart.total': 'ጠቅላላ ድምር',
    'cart.checkout': 'ትዕዛዝ ያጠናቁ',
    'cart.continue': 'ተጨማሪ ምግብ ይምረጡ',
    'cart.orderMore': 'ተጨማሪ ምግብ ይዘዙ',
    'cart.tableVerified': 'የጠረጴዛ QR የተረጋገጠ',
    'order.details': 'የእርስዎ መረጃ',
    'order.name': 'ሙሉ ስም',
    'order.nameReq': 'አስፈላጊ',
    'order.phone': 'ስልክ ቁጥር',
    'order.note': 'ለማብሰያው ልዩ ማስታወሻ',
    'order.place': 'ትዕዛዝ ላክ',
    'order.success': 'ትዕዛዝዎ በተሳካ ሁኔታ ደርሷል!',
    'order.received': 'የማብሰያ ቡድናችን ማዘጋጀት ጀምሯል።',
    'order.status': 'የትዕዛዝ ሁኔታ',
    'status.new': 'ትዕዛዝ ገብቷል',
    'status.accepted': 'ተቀባይነት አግኝቷል',
    'status.preparing': 'እየተዘጋጀ ነው',
    'status.ready': 'ደርሷል',
    'status.completed': 'ተጠናቋል',
    'status.cancelled': 'ተሰርዟል',
    'qr.scanned': 'በጠረጴዛ QR የተረጋገጠ',
    'qr.webDirect': 'በድረገጽ በቀጥታ የታዘዘ',
    'footer.rights': 'መብቱ በህግ የተጠበቀ ነው።',
    'footer.location': 'ባሌ ሮቤ፣ ኦሮሚያ፣ ኢትዮጵያ',
    'footer.hours': 'በየቀኑ፡ 7:00 AM – 11:30 PM',
  },
  en: {
    'nav.home': 'Home',
    'nav.menu': 'Menu',
    'nav.contact': 'Contact',
    'nav.login': 'Sign In',
    'nav.cart': 'Your Cart',
    'nav.order': 'Order Food',
    'nav.profile': 'Profile',
    'nav.signOut': 'Sign Out',
    'hero.title': 'Good food. Great Restaurant.',
    'hero.sub': 'Rooted in our community. Made for moments together.',
    'hero.explore': 'Explore Our Menu',
    'hero.findUs': 'Find Us',
    'hero.dineIn': 'Dine In',
    'hero.dineInDesc': 'Settle in. Share a meal. Feel at home at our hotel restaurant.',
    'hero.pickup': 'Pickup / Takeaway',
    'hero.pickupDesc': 'Your favourites, freshly prepared to take with you.',
    'hero.featured': 'Find your next favourite.',
    'hero.signature': 'HOUSE SPECIAL',
    'hero.chef': 'CHEF RECOMMENDATION',
    'menu.title': 'Food & Drinks Menu',
    'menu.subtitle': 'Freshly prepared with authentic Bale Robe spices and prime ingredients.',
    'menu.all': 'All',
    'menu.main': 'Main dishes',
    'menu.additional': 'Additional dishes',
    'menu.hotDrinks': 'Hot drinks',
    'menu.coldDrinks': 'Cold drinks',
    'menu.beerWine': 'Beer & Wine',
    'menu.spirits': 'Spirits',
    'menu.addToCart': 'Add to Cart',
    'menu.added': 'Added to Cart',
    'menu.viewCart': 'View Cart',
    'menu.search': 'Search food or drinks…',
    'cart.title': 'Your Order',
    'cart.empty': 'Your cart is empty',
    'cart.subtotal': 'Subtotal',
    'cart.total': 'Total',
    'cart.checkout': 'Proceed to Checkout',
    'cart.continue': 'Add More Items',
    'cart.orderMore': 'Order More Food / Add Dishes',
    'cart.tableVerified': 'Table QR Verified',
    'order.details': 'Your Details',
    'order.name': 'Full name',
    'order.nameReq': 'Required',
    'order.phone': 'Phone number',
    'order.note': 'Kitchen note / preferences',
    'order.place': 'Place Order',
    'order.success': 'Order Received!',
    'order.received': 'Your meal order has been sent directly to the kitchen.',
    'order.status': 'Order Status',
    'status.new': 'Submitted',
    'status.accepted': 'Accepted',
    'status.preparing': 'Preparing in Kitchen',
    'status.ready': 'Ready to Serve',
    'status.completed': 'Completed',
    'status.cancelled': 'Cancelled',
    'qr.scanned': 'Table QR Verified (Seated)',
    'qr.webDirect': 'Web / Online Direct',
    'footer.rights': 'All rights reserved.',
    'footer.location': 'Bale Robe, Oromia, Ethiopia',
    'footer.hours': 'Daily: 7:00 AM – 11:30 PM',
  },
}

interface LanguageContextType {
  language: Language
  setLanguage: Dispatch<SetStateAction<Language>>
  t: (key: string, fallback?: string) => string
}

const LanguageContext = createContext<LanguageContextType | null>(null)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem('ilillii_lang')
      if (saved === 'am' || saved === 'en' || saved === 'om') return saved
    } catch {}
    return 'om'
  })

  const setLanguage: Dispatch<SetStateAction<Language>> = (val) => {
    setLanguageState((prev) => {
      const next = typeof val === 'function' ? val(prev) : val
      try {
        localStorage.setItem('ilillii_lang', next)
      } catch {}
      return next
    })
  }

  const t = (key: string, fallback?: string): string => {
    const langDict = translations[language] || translations.om
    if (langDict && langDict[key]) return langDict[key]
    const enDict = translations.en
    if (enDict && enDict[key]) return enDict[key]
    return fallback || key
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) throw new Error('LanguageProvider is required')
  return context
}
