export type CategoryId = 'main' | 'additional' | 'drinks'
export type MenuItem = {
  id: string
  name: string
  price: number
  category: CategoryId
  availability: 'unconfirmed' | 'unavailable'
  verifiedDescription?: string
  confirmedImage?: string
  translations?: { am?: string; om?: string }
}
export const categories: { id: CategoryId; label: string; draftLabel: string; icon: string }[] = [
  { id: 'main', label: 'Main dishes', draftLabel: 'Gosa Nyataa', icon: 'meal' },
  { id: 'additional', label: 'Additional dishes', draftLabel: 'Nyataa Sooma(a)', icon: 'meal' },
  { id: 'drinks', label: 'Drinks', draftLabel: 'Gosa Dhugaatii', icon: 'coffee' },
]
const main: [string, number][] = [['Ispeeshaal Goodinii', 1400], ['Foon Waddii, 1 kg', 2600], ['Foon Waddii, 1/2 kg', 1300], ['Foon Waddii, 1/4 kg', 650], ['Dulat', 500], ['Tibit', 1500], ['Kitfoo', 1500], ['Gon Lagoonnii', 2500], ['Ispeeshaal Qurxii', 1300]]
const additional: [string, number][] = [['Ispeeshaal Illillii', 400], ['Gommana Tibsii', 200], ['Shiroo Fasaasii', 200], ['Bey-Aynat', 200], ['Tagabinoo', 250]]
const drinks: [string, number][] = [['Biiraa', 120], ['Baddallee', 150], ['Henikan', 150], ['Aradaa', 150], ['Lallaafaa', 80], ['Bishaan, 2 L', 70], ['Wuskii', 8000], ['Kaamila(a)t', 1200], ['Akeeshaa', 2000], ['Gabbataa', 2000], ['Awaash', 600], ['Awaash Xiqaa', 300], ['Minii Jin', 350], ['Jaanboo', 90], ['Single Jaanboo', 70]]
// Draft transcription supplied by the user; stable IDs keep cart references language-independent.
export const menuItems: MenuItem[] = (Object.entries({ main, additional, drinks }) as [CategoryId, [string, number][]][]).flatMap(([category, items]) => items.map(([name, price], index) => ({ id: `${category}-${index + 1}`, name, price, category, availability: 'unconfirmed' })))
export const formatBirr = (amount: number) => new Intl.NumberFormat('en-ET', { maximumFractionDigits: 0 }).format(amount)
