import { createContext, useContext, useState } from 'react'
import type { Dispatch, ReactNode, SetStateAction } from 'react'

const LanguageContext = createContext<{ language: string; setLanguage: Dispatch<SetStateAction<string>> } | null>(null)
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState('om')
  return <LanguageContext.Provider value={{ language, setLanguage }}>{children}</LanguageContext.Provider>
}
export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) throw new Error('LanguageProvider is required')
  return context
}
