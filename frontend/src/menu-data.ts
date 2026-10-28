export type CategoryId = 'main' | 'additional' | 'drinks'
export type MenuItem = {
  id: string
  name: string
  price: number
  category: CategoryId
  availability: 'available' | 'unconfirmed' | 'unavailable'
  verifiedDescription?: string
  confirmedImage?: string
  translations?: { am?: string; om?: string }
  houseSpecial?: boolean
}

export const categories: { id: CategoryId; label: string; draftLabel: string; icon: string }[] = [
  { id: 'main', label: 'Main dishes', draftLabel: 'Gosa Nyataa', icon: 'meal' },
  { id: 'additional', label: 'Additional dishes', draftLabel: 'Nyataa Sooma(a)', icon: 'meal' },
  { id: 'drinks', label: 'Drinks', draftLabel: 'Gosa Dhugaatii', icon: 'coffee' },
]

type ItemDef = {
  name: string
  price: number
  image?: string
  description?: string
  amharic?: string
  houseSpecial?: boolean
}

const main: ItemDef[] = [
  {
    name: 'Ispeeshaal Goodinii',
    price: 1400,
    image: '/images/menu/ispeeshaal-goodinii.jpg',
    amharic: 'ስፔሻል ጎደኒ',
    description: 'Special roasted beef ribs seasoned with traditional Bale spices, served sizzling hot.',
    houseSpecial: true,
  },
  {
    name: 'Foon Waddii, 1 kg',
    price: 2600,
    image: '/images/menu/foon-waddii.jpg',
    amharic: 'የተጠበሰ ሥጋ 1 ኪ.ግ',
    description: 'Full kilogram of prime roasted beef tibs sautéed with onions, rosemary, and awaze.',
    houseSpecial: true,
  },
  {
    name: 'Foon Waddii, 1/2 kg',
    price: 1300,
    image: '/images/menu/foon-waddii.jpg',
    amharic: 'የተጠበሰ ሥጋ 1/2 ኪ.ግ',
    description: 'Half kilogram of succulent roasted beef tibs served with mitmita and fresh injera.',
  },
  {
    name: 'Foon Waddii, 1/4 kg',
    price: 650,
    image: '/images/menu/foon-waddii.jpg',
    amharic: 'የተጠበሰ ሥጋ 1/4 ኪ.ግ',
    description: 'Quarter kilogram portion of freshly sautéed beef tibs.',
  },
  {
    name: 'Dulat',
    price: 500,
    image: '/images/menu/dulat.jpg',
    amharic: 'ዱለት',
    description: 'Finely minced tripe, liver, and lean beef cooked with spiced butter, garlic, and hot green peppers.',
  },
  {
    name: 'Tibit',
    price: 1500,
    image: '/images/menu/tibit.jpg',
    amharic: 'ጥብስ',
    description: 'Classic Ethiopian beef tibs tossed with sliced onions, jalapeños, and spiced butter.',
  },
  {
    name: 'Kitfoo',
    price: 1500,
    image: '/images/menu/kitfoo.jpg',
    amharic: 'ክትፎ',
    description: 'Finely minced prime beef seasoned with aromatic niter kibbeh (clarified spiced butter) and mitmita.',
    houseSpecial: true,
  },
  {
    name: 'Gon Lagoonnii',
    price: 2500,
    image: '/images/menu/gon-lagoonnii.jpg',
    amharic: 'ጎን ለጎን',
    description: 'Generous signature sharing meat platter served with traditional condiments.',
    houseSpecial: true,
  },
  {
    name: 'Ispeeshaal Qurxii',
    price: 1300,
    image: '/images/menu/ispeeshaal-qurxii.jpg',
    amharic: 'ስፔሻል ዓሣ',
    description: 'Special spiced fish prepared with Ethiopian herbs and served with tangy sauce.',
    houseSpecial: true,
  },
  {
    name: 'Gored Gored',
    price: 1500,
    image: '/images/menu/gored-gored.jpg',
    amharic: 'ጎረድ ጎረድ',
    description: 'Prime cubed raw or very lightly seared beef served with awaze dipping paste and spiced butter.',
    houseSpecial: true,
  },
  {
    name: 'Shekla Tibs',
    price: 1500,
    image: '/images/menu/shekla-tibs.jpg',
    amharic: 'ሸክላ ጥብስ',
    description: 'Sizzling tender beef tibs served over a traditional clay pot with hot charcoal embers.',
    houseSpecial: true,
  },
  {
    name: 'Gaze Sayt',
    price: 1400,
    image: '/images/menu/gaze-sayt.jpg',
    amharic: 'ጋዜ ሳይት',
    description: 'Local specialty pan-roasted beef prepared with Bale mountain herbs.',
  },
  {
    name: 'Gaze Sayt Shekla',
    price: 1500,
    image: '/images/menu/gaze-sayt-shekla.jpg',
    amharic: 'ጋዜ ሳይት በሸክላ',
    description: 'Local specialty sizzling meat served in a traditional clay dish.',
  },
  {
    name: 'Liwit',
    price: 700,
    image: '/images/menu/liwit.jpg',
    amharic: 'ልውጥ',
    description: 'Traditional slow-cooked seasoned beef specialty prepared with rich spices.',
  },
  {
    name: 'Senber',
    price: 700,
    image: '/images/menu/senber.jpg',
    amharic: 'ሰንበር',
    description: 'Savory sliced seasoned beef spleen and cut meat sautéed with caramelized onions.',
  },
  {
    name: 'Wolande',
    price: 1200,
    image: '/images/menu/wolande.jpg',
    amharic: 'ወላንዴ',
    description: 'Tender, flavorful traditional meat stew simmered with fragrant Ethiopian spices.',
  },
]

const additional: ItemDef[] = [
  {
    name: 'Ispeeshaal Illillii',
    price: 400,
    image: '/images/ethiopian-sharing-platter.jpg',
    amharic: 'ስፔሻል እሊሊ',
    description: 'The signature Ilillii combination platter loaded with vibrant lentils, shiro, and greens.',
    houseSpecial: true,
  },
  {
    name: 'Gommana Tibsii',
    price: 200,
    image: '/images/menu/gommana-tibsii.jpg',
    amharic: 'ጎመን ጥብስ',
    description: 'Fresh collard greens chopped and braised with garlic, onions, and Ethiopian peppers.',
  },
  {
    name: 'Shiroo Fasaasii',
    price: 200,
    image: '/images/menu/shiroo-fasaasii.jpg',
    amharic: 'ፈሳሽ ሽሮ',
    description: 'Smooth, warm chickpea and split pea puree slow-cooked with garlic, ginger, and berbere.',
  },
  {
    name: 'Bey-Aynat',
    price: 200,
    image: '/images/menu/bey-aynat.jpg',
    amharic: 'በያይነቱ',
    description: 'An authentic fasting feast of colorful vegetable and legume dishes served on freshly baked injera.',
    houseSpecial: true,
  },
  {
    name: 'Tagabinoo',
    price: 250,
    image: '/images/menu/tagabinoo.jpg',
    amharic: 'ተጋቢኖ',
    description: 'Thick, roasted chickpea flour stew served bubbling hot in a traditional clay bowl.',
  },
]

const drinks: ItemDef[] = [
  {
    name: 'Biiraa',
    price: 120,
    image: '/images/menu/biiraa.jpg',
    amharic: 'ቢራ',
    description: 'Chilled local Ethiopian bottled lager beer.',
  },
  {
    name: 'Baddallee',
    price: 150,
    image: '/images/menu/baddallee.jpg',
    amharic: 'በደሌ',
    description: 'Bedele Premium Beer, brewed from pure highland spring water.',
  },
  {
    name: 'Henikan',
    price: 150,
    image: '/images/menu/henikan.jpg',
    amharic: 'ሄኒከን',
    description: 'Heineken premium malt lager, cold and refreshing.',
  },
  {
    name: 'Aradaa',
    price: 150,
    image: '/images/menu/aradaa.jpg',
    amharic: 'አራዳ',
    description: 'Crisp and invigorating Arada beverage.',
  },
  {
    name: 'Lallaafaa',
    price: 80,
    image: '/images/menu/lallaafaa.png',
    amharic: 'ለስላሳ',
    description: 'Assorted chilled soft drinks and sodas.',
  },
  {
    name: 'Bishaan, 2 L',
    price: 70,
    image: '/images/menu/bishaan.jpg',
    amharic: 'ውኃ 2 ሊትር',
    description: 'Natural pure mineral bottled drinking water, 2 liters.',
  },
  {
    name: 'Wuskii',
    price: 8000,
    image: '/images/menu/wuskii.jpg',
    amharic: 'ውስኪ',
    description: 'Selected premium bottle whisky.',
  },
  {
    name: 'Kaamila(a)t',
    price: 1200,
    image: '/images/menu/kaamilaat.jpg',
    amharic: 'ካሚላት',
    description: 'Camellat rich sweet Ethiopian red wine.',
  },
  {
    name: 'Akeeshaa',
    price: 2000,
    image: '/images/menu/akeeshaa.jpg',
    amharic: 'አኬሻ',
    description: 'Acacia premium Ethiopian bottled wine.',
  },
  {
    name: 'Gabbataa',
    price: 2000,
    image: '/images/menu/gabbataa.jpg',
    amharic: 'ገበታ',
    description: 'Gebeta classic highland Ethiopian wine.',
  },
  {
    name: 'Awaash',
    price: 600,
    image: '/images/menu/awaash.jpg',
    amharic: 'አዋሽ',
    description: 'Awash Ethiopian heritage wine, full bottle.',
  },
  {
    name: 'Awaash Xiqaa',
    price: 300,
    image: '/images/menu/awaash.jpg',
    amharic: 'አዋሽ አነስተኛ',
    description: 'Awash Ethiopian wine, half / small bottle.',
  },
  {
    name: 'Minii Jin',
    price: 350,
    image: '/images/menu/minii-jin.png',
    amharic: 'ሚኒ ጂን',
    description: 'Mini bottle dry gin.',
  },
  {
    name: 'Jaanboo',
    price: 90,
    image: '/images/menu/jaanboo.jpg',
    amharic: 'ጃምቦ',
    description: 'Fresh Ethiopian draft beer in a large jumbo mug.',
  },
  {
    name: 'Single Jaanboo',
    price: 70,
    image: '/images/menu/jaanboo.jpg',
    amharic: 'ነጠላ ጃምቦ',
    description: 'Fresh draft beer served in a single glass.',
  },
]

export const menuItems: MenuItem[] = (
  Object.entries({ main, additional, drinks }) as [CategoryId, ItemDef[]][]
).flatMap(([category, items]) =>
  items.map((item, index) => ({
    id: `${category}-${index + 1}`,
    name: item.name,
    price: item.price,
    category,
    availability: 'available',
    confirmedImage: item.image,
    verifiedDescription: item.description,
    translations: item.amharic ? { am: item.amharic, om: item.name } : undefined,
    houseSpecial: Boolean(item.houseSpecial),
  }))
)

export const formatBirr = (amount: number) =>
  new Intl.NumberFormat('en-ET', { maximumFractionDigits: 0 }).format(amount)
