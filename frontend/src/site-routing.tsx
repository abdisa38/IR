import type { AnchorHTMLAttributes, MouseEvent } from 'react'
export function SiteLink({ href = '/', onClick, ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a {...props} href={href} onClick={(event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event)
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    window.history.pushState({}, '', href)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }} />
}
export function sitePage() {
  if (window.location.pathname.replace(/\/$/, '') === '/design-system' && !window.location.hash) return 'design-system'
  if (window.location.hash === '#admin' || window.location.pathname.replace(/\/$/, '') === '/admin' && !window.location.hash) return 'admin'
  if (['#home', '#about', '#find-us'].includes(window.location.hash)) return 'home'
  if (['#menu', '#food-menu'].includes(window.location.hash)) return 'menu'
  return window.location.pathname.replace(/\/$/, '') === '/contact' || window.location.hash === '#contact' ? 'contact' : 'menu'
}
