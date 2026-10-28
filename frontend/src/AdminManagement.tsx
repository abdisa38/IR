import { useEffect, useRef, useState } from 'react'
import { Icon, Modal } from './shared-ui'
import { categories as initialCategories, menuItems, formatBirr } from './menu-data'
import { roles } from './admin-model'
import type { Role } from './admin-model'
import { demoTables } from './order-prototype'
import { SiteLink } from './site-routing'
import { Pagination } from './ui-patterns'
import { api, type ApiMenuItem, type ApiStaff } from './api/client'

type ManagedItem = {
  id: string
  name: string
  amharic: string
  category: string
  price: number
  description: string
  availability: string
  image?: string
  houseSpecial?: boolean
}

type ManagedCategory = { id: string; name: string; original: string; active: boolean }

export function AdminMenu({ notify }: { notify: (text: string) => void }) {
  const [items, setItems] = useState<ManagedItem[]>(() =>
    menuItems.map(item => ({
      ...item,
      amharic: item.translations?.am || '',
      description: item.verifiedDescription || '',
      availability: item.availability === 'available' ? 'Available' : 'Unavailable',
      image: item.confirmedImage,
      houseSpecial: Boolean(item.houseSpecial),
    }))
  )
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState<ManagedItem | null>(null)
  const [price, setPrice] = useState('')
  const [error, setError] = useState('')
  const [verified, setVerified] = useState(false)
  const [loading, setLoading] = useState(false)
  const images = useRef<string[]>([])

  const loadMenu = async () => {
    try {
      setLoading(true)
      const res = await api.getMenu()
      if (res.success && res.items?.length) {
        setItems(
          res.items.map((i: ApiMenuItem) => ({
            id: i.id,
            name: i.name,
            amharic: i.amharicName || i.translations?.am || '',
            category: i.category,
            price: i.price,
            description: i.description || '',
            availability: i.available ? 'Available' : 'Unavailable',
            image: i.image,
            houseSpecial: Boolean(i.houseSpecial),
          }))
        )
      }
    } catch (err: any) {
      console.warn('Could not refresh menu from server:', err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMenu()
    return () => images.current.forEach(image => URL.revokeObjectURL(image))
  }, [])

  useEffect(() => setPage(1), [query, filter])

  const filtered = items.filter(
    item =>
      item.name.toLowerCase().includes(query.toLowerCase()) &&
      (filter === 'all' || item.category === filter)
  )
  const pageItems = filtered.slice((page - 1) * 10, page * 10)

  const open = (item?: ManagedItem) => {
    setEditing(
      item
        ? { ...item }
        : {
            id: '',
            name: '',
            amharic: '',
            category: 'food',
            price: 0,
            description: '',
            availability: 'Available',
            houseSpecial: false,
          }
    )
    setPrice(item ? String(item.price) : '')
    setError('')
    setVerified(Boolean(item?.description))
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete '${name}' from the menu?`)) return
    try {
      await api.deleteMenuItem(id)
      setItems(current => current.filter(i => i.id !== id))
      notify(`Item '${name}' removed from menu.`)
    } catch (err: any) {
      notify(`Error deleting item: ${err.message}`)
    }
  }

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!editing) return

    if (!editing.name.trim() || !price.trim() || !Number.isFinite(Number(price)) || Number(price) < 0) {
      setError('Add a name and a valid non-negative price in ETB.')
      return
    }

    try {
      const payload = {
        name: editing.name.trim(),
        amharicName: editing.amharic.trim(),
        category: (editing.category as any) || 'food',
        price: Number(price),
        description: editing.description.trim(),
        available: editing.availability === 'Available',
        image: editing.image || '/images/ethiopian-sharing-platter.jpg',
        houseSpecial: Boolean(editing.houseSpecial),
      }

      if (editing.id && items.some(i => i.id === editing.id)) {
        await api.updateMenuItem(editing.id, payload)
        notify(`Menu item '${editing.name}' updated in database!`)
      } else {
        await api.createMenuItem(payload)
        notify(`New menu item '${editing.name}' added to database!`)
      }

      setEditing(null)
      await loadMenu()
    } catch (err: any) {
      setError(err.message || 'Failed to save menu item to database.')
    }
  }

  return (
    <>
      <div className="admin-section-toolbar">
        <label className="admin-search">
          <Icon name="search" size={17} />
          <input
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Search food and drinks"
            aria-label="Search managed menu"
          />
        </label>
        <select aria-label="Filter category" value={filter} onChange={event => setFilter(event.target.value)}>
          <option value="all">All categories</option>
          <option value="food">Main & Traditional Foods</option>
          <option value="beer-wine">Beer & Wines</option>
          <option value="cold-drinks">Cold Beverages</option>
          <option value="spirits">Spirits & Whiskeys</option>
          <option value="hot-drinks">Hot Drinks</option>
        </select>
        <button className="button primary" onClick={() => open()}>
          <Icon name="plus" size={16} />Add menu item
        </button>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Menu item</th>
              <th>Category</th>
              <th>Price</th>
              <th>Availability</th>
              <th>House Special</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map(item => (
              <tr key={item.id}>
                <td data-label="Menu item">
                  <strong>{item.name}</strong>
                  <small>{item.amharic || 'No Amharic translation'}</small>
                </td>
                <td data-label="Category">{item.category}</td>
                <td data-label="Price">
                  <strong>{formatBirr(item.price)} ETB</strong>
                </td>
                <td data-label="Availability">
                  <span className={`admin-badge ${item.availability === 'Available' ? 'badge-green' : 'badge-neutral'}`}>
                    {item.availability}
                  </span>
                </td>
                <td data-label="House Special">
                  {item.houseSpecial ? <span className="admin-badge badge-amber">House Special</span> : '—'}
                </td>
                <td data-label="Action" style={{ display: 'flex', gap: '8px' }}>
                  <button className="admin-table-action" onClick={() => open(item)}>
                    Edit<Icon name="arrow" size={14} />
                  </button>
                  <button
                    className="admin-table-action"
                    style={{ color: '#b82032' }}
                    onClick={() => handleDelete(item.id, item.name)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!filtered.length && !loading && (
          <div className="admin-empty">
            <Icon name="search" size={28} />
            <h3>No matching menu items.</h3>
            <p>Try another name or category.</p>
          </div>
        )}
      </div>

      <Pagination page={page} count={filtered.length} pageSize={10} onPage={setPage} />

      {editing && (
        <Modal title={editing.id ? 'Edit menu item' : 'Add new menu item'} close={() => setEditing(null)}>
          <form className="admin-form" noValidate onSubmit={handleSave}>
            {error && <div className="admin-form-error" role="alert">{error}</div>}

            <label>
              Item name (Afaan Oromo / English)
              <input
                value={editing.name}
                maxLength={150}
                onChange={event => setEditing({ ...editing, name: event.target.value })}
                required
              />
            </label>

            <label>
              Amharic name (አማርኛ ስም)
              <input
                value={editing.amharic}
                maxLength={150}
                onChange={event => setEditing({ ...editing, amharic: event.target.value })}
                placeholder="e.g. ስፔሻል ጎደኒ"
              />
            </label>

            <div className="admin-form-grid">
              <label>
                Category
                <select
                  value={editing.category}
                  onChange={event => setEditing({ ...editing, category: event.target.value })}
                >
                  <option value="food">Main Dishes & Platters</option>
                  <option value="beer-wine">Beer & Wine</option>
                  <option value="cold-drinks">Cold Beverages</option>
                  <option value="spirits">Spirits & Liquors</option>
                  <option value="hot-drinks">Hot Drinks & Coffee</option>
                </select>
              </label>

              <label>
                Price in ETB
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={price}
                  onChange={event => setPrice(event.target.value)}
                  required
                />
              </label>
            </div>

            <div className="admin-form-grid">
              <label>
                Availability
                <select
                  value={editing.availability}
                  onChange={event => setEditing({ ...editing, availability: event.target.value })}
                >
                  <option value="Available">Available</option>
                  <option value="Unavailable">Unavailable</option>
                </select>
              </label>

              <label className="admin-checkbox" style={{ marginTop: '28px' }}>
                <input
                  type="checkbox"
                  checked={Boolean(editing.houseSpecial)}
                  onChange={event => setEditing({ ...editing, houseSpecial: event.target.checked })}
                />
                Mark as House Special dish
              </label>
            </div>

            <label>
              Description & Preparation
              <textarea
                value={editing.description}
                maxLength={500}
                onChange={event => setEditing({ ...editing, description: event.target.value })}
                rows={3}
                placeholder="Traditional Bale recipe, ingredients, or serving details"
              />
            </label>

            <div className="admin-item-preview">
              {editing.image ? (
                <img src={editing.image} alt="Item preview" />
              ) : (
                <Icon name="meal" size={28} />
              )}
              <div>
                <small>LIVE MENU PREVIEW</small>
                <strong>{editing.name || 'Item name'}</strong>
                <span>{price || '—'} ETB</span>
              </div>
            </div>

            <div className="admin-form-actions">
              <button className="button primary" type="submit">
                Save to Database
              </button>
              <button type="button" className="button secondary" onClick={() => setEditing(null)}>
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  )
}

export function AdminCategories({ notify }: { notify: (text: string) => void }) {
  const [categories, setCategories] = useState<ManagedCategory[]>(
    initialCategories.map(item => ({ id: item.id, name: item.label, original: item.draftLabel, active: true }))
  )
  const [editing, setEditing] = useState<ManagedCategory | null>(null)
  const [error, setError] = useState('')

  const move = (index: number, delta: number) =>
    setCategories(current => {
      const next = [...current]
      ;[next[index], next[index + delta]] = [next[index + delta], next[index]]
      return next
    })

  return (
    <>
      <div className="admin-section-toolbar">
        <button
          className="button primary"
          onClick={() => {
            setEditing({ id: crypto.randomUUID(), name: '', original: '', active: true })
            setError('')
          }}
        >
          <Icon name="plus" size={16} />Add category
        </button>
      </div>
      <div className="admin-category-list">
        {categories.map((category, index) => (
          <div key={category.id}>
            <span className="category-number">{String(index + 1).padStart(2, '0')}</span>
            <div>
              <strong>{category.name}</strong>
              <small>{category.original || 'Original label'}</small>
            </div>
            <span className={`admin-badge ${category.active ? 'badge-green' : 'badge-neutral'}`}>
              {category.active ? 'Active' : 'Inactive'}
            </span>
            <button
              className="icon-button"
              disabled={index === 0}
              aria-label={`Move ${category.name} up`}
              onClick={() => move(index, -1)}
            >
              <Icon name="up" size={16} />
            </button>
            <button
              className="icon-button"
              disabled={index === categories.length - 1}
              aria-label={`Move ${category.name} down`}
              onClick={() => move(index, 1)}
            >
              <Icon name="down" size={16} />
            </button>
            <button
              className="admin-table-action"
              onClick={() => {
                setEditing({ ...category })
                setError('')
              }}
            >
              Edit
            </button>
          </div>
        ))}
      </div>
      {editing && (
        <Modal title="Category Settings" close={() => setEditing(null)}>
          <form
            className="admin-form"
            onSubmit={event => {
              event.preventDefault()
              if (!editing.name.trim()) {
                setError('Add a category label.')
                return
              }
              setCategories(current =>
                current.some(item => item.id === editing.id)
                  ? current.map(item => (item.id === editing.id ? editing : item))
                  : [...current, editing]
              )
              setEditing(null)
              notify('Category saved.')
            }}
          >
            {error && <p className="admin-form-error">{error}</p>}
            <label>
              Display label
              <input
                value={editing.name}
                onChange={event => setEditing({ ...editing, name: event.target.value })}
              />
            </label>
            <label>
              Original Oromo label
              <input
                value={editing.original}
                onChange={event => setEditing({ ...editing, original: event.target.value })}
              />
            </label>
            <label className="admin-checkbox">
              <input
                type="checkbox"
                checked={editing.active}
                onChange={event => setEditing({ ...editing, active: event.target.checked })}
              />
              Active on customer menu
            </label>
            <button className="button primary" type="submit">
              Save Category
            </button>
          </form>
        </Modal>
      )}
    </>
  )
}

function TableQrCode({ table }: { table: string }) {
  const qrTarget = typeof window !== 'undefined'
    ? `${window.location.origin}/?table=${table}&source=qr#menu`
    : `https://frontend-psi-ten-87.vercel.app/?table=${table}&source=qr#menu`
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=4&data=${encodeURIComponent(qrTarget)}`

  return (
    <div style={{ textAlign: 'center', background: '#ffffff', padding: '10px', borderRadius: '8px', border: '1px solid #e5e7eb', margin: '8px 0' }}>
      <img
        src={qrUrl}
        alt={`QR Code for Table ${table}`}
        width={140}
        height={140}
        loading="lazy"
        style={{ display: 'block', margin: '0 auto', maxWidth: '100%', height: 'auto' }}
      />
      <span style={{ fontSize: '11px', color: '#15803d', fontWeight: 600, display: 'inline-block', marginTop: '6px' }}>
        📲 Scans to Table {table} Order
      </span>
    </div>
  )
}

export function AdminTables({ notify }: { notify: (text: string) => void }) {
  const [tables, setTables] = useState<{ id: string; active: boolean }[]>(() => {
    try {
      const saved = localStorage.getItem('ilillii_tables')
      if (saved) return JSON.parse(saved)
    } catch {}
    return ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'].map(id => ({ id, active: true }))
  })
  const [editing, setEditing] = useState<{ id: string; active: boolean; original?: string } | null>(null)
  const [printableTable, setPrintableTable] = useState<string | null>(null)
  const [error, setError] = useState('')

  const saveTables = (newTables: { id: string; active: boolean }[]) => {
    setTables(newTables)
    try {
      localStorage.setItem('ilillii_tables', JSON.stringify(newTables))
    } catch {}
  }

  const download = (id: string) => {
    const qrTarget = `${window.location.origin}/?table=${id}&source=qr#menu`
    const qrImg = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=8&data=${encodeURIComponent(qrTarget)}`
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="480" viewBox="0 0 400 480">
      <rect width="400" height="480" fill="#FFF8F3" rx="16"/>
      <rect x="20" y="20" width="360" height="440" fill="#ffffff" stroke="#e5e7eb" stroke-width="2" rx="12"/>
      <text x="200" y="60" text-anchor="middle" font-size="20" font-weight="bold" fill="#B82032" font-family="sans-serif">ILILLII BAR &amp; RESTAURANT</text>
      <text x="200" y="85" text-anchor="middle" font-size="12" fill="#78350f" font-family="sans-serif">Bale Robe, Oromia · 0909511588</text>
      <line x1="40" y1="100" x2="360" y2="100" stroke="#f3f4f6" stroke-width="2"/>
      <text x="200" y="145" text-anchor="middle" font-size="32" font-weight="900" fill="#1c1917" font-family="sans-serif">TABLE ${id}</text>
      <text x="200" y="175" text-anchor="middle" font-size="13" fill="#15803d" font-weight="bold" font-family="sans-serif">SCAN WITH YOUR PHONE CAMERA</text>
      <image href="${qrImg}" x="100" y="195" width="200" height="200"/>
      <text x="200" y="420" text-anchor="middle" font-size="12" fill="#57534e" font-family="sans-serif">Browse Food &amp; Drink · Order to Table ${id}</text>
      <text x="200" y="440" text-anchor="middle" font-size="10" fill="#a8a29e" font-family="sans-serif">Around Awraris, near General Wako Gutu Square</text>
    </svg>`
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `ilillii-table-${id}-qr-card.svg`
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    notify(`Downloaded printable QR tent card for Table ${id}`)
  }

  const handleDelete = (id: string) => {
    if (!confirm(`Are you sure you want to remove Table ${id}?`)) return
    const updated = tables.filter(t => t.id !== id)
    saveTables(updated)
    notify(`Table ${id} removed.`)
  }

  return (
    <>
      <div className="admin-section-toolbar">
        <button
          className="button primary"
          onClick={() => {
            setEditing({ id: '', active: true })
            setError('')
          }}
        >
          <Icon name="plus" size={16} />Add Table
        </button>
      </div>

      <div className="admin-tables-grid">
        {tables.map(table => {
          const directUrl = `/?table=${table.id}&source=qr#menu`
          return (
            <article className="admin-table-card" key={table.id}>
              <div>
                <h2>Table {table.id}</h2>
                <span className={`admin-badge ${table.active ? 'badge-green' : 'badge-neutral'}`}>
                  {table.active ? 'Active' : 'Inactive'}
                </span>
              </div>

              <TableQrCode table={table.id} />

              <small style={{ wordBreak: 'break-all', fontSize: '11px', color: '#6b7280' }}>
                {directUrl}
              </small>

              {table.active ? (
                <SiteLink
                  href={directUrl}
                  onClick={() => {
                    localStorage.setItem('ilillii_table', table.id)
                    localStorage.setItem('ilillii_table_source', 'qr')
                    window.dispatchEvent(new CustomEvent('ilillii-table', { detail: table.id }))
                  }}
                  className="button secondary"
                >
                  Test Table Order Link<Icon name="arrow" size={15} />
                </SiteLink>
              ) : (
                <span className="admin-inline-note">Table inactive in dining room.</span>
              )}

              <div className="table-card-actions" style={{ flexWrap: 'wrap', gap: '6px' }}>
                <button onClick={() => setPrintableTable(table.id)} title="Preview printable card">
                  <Icon name="document" size={15} />Tent Card
                </button>
                <button onClick={() => download(table.id)} title="Download SVG card">
                  <Icon name="download" size={15} />Download
                </button>
                <button
                  onClick={() => {
                    setEditing({ ...table, original: table.id })
                    setError('')
                  }}
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(table.id)}
                  style={{ color: '#dc2626' }}
                  title="Remove this table"
                >
                  Delete
                </button>
              </div>
            </article>
          )
        })}
      </div>

      {printableTable && (
        <Modal title={`Print Table ${printableTable} Tent Card`} close={() => setPrintableTable(null)}>
          <div style={{ textAlign: 'center', padding: '16px', background: '#fdfbf7', borderRadius: '12px', border: '2px dashed #b82032', maxWidth: '340px', margin: '0 auto' }}>
            <h2 style={{ color: '#b82032', margin: '0 0 4px', fontSize: '18px', fontWeight: 900 }}>ILILLII BAR &amp; RESTAURANT</h2>
            <p style={{ margin: '0 0 12px', fontSize: '12px', color: '#78350f' }}>Bale Robe, Oromia · 0909511588</p>
            <div style={{ background: '#ffffff', padding: '14px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              <div style={{ fontSize: '28px', fontWeight: 900, color: '#1c1917', marginBottom: '4px' }}>
                TABLE {printableTable}
              </div>
              <p style={{ fontSize: '12px', fontWeight: 700, color: '#15803d', margin: '0 0 10px' }}>
                SCAN WITH PHONE CAMERA TO ORDER
              </p>
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&margin=6&data=${encodeURIComponent(`${window.location.origin}/?table=${printableTable}&source=qr#menu`)}`}
                alt={`Table ${printableTable} QR Code`}
                width={180}
                height={180}
                style={{ display: 'block', margin: '0 auto' }}
              />
              <p style={{ fontSize: '11px', color: '#57534e', marginTop: '10px', marginBottom: 0 }}>
                Browse Food &amp; Drink · Direct Table Service
              </p>
            </div>
            <p style={{ fontSize: '11px', color: '#9ca3af', marginTop: '12px' }}>
              Around Awraris, near General Wako Gutu Square
            </p>
            <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
              <button className="button primary" style={{ flex: 1 }} onClick={() => window.print()}>
                Print Card
              </button>
              <button className="button secondary" style={{ flex: 1 }} onClick={() => download(printableTable)}>
                Download SVG
              </button>
            </div>
          </div>
        </Modal>
      )}

      {editing && (
        <Modal title="Table configuration" close={() => setEditing(null)}>
          <form
            className="admin-form"
            onSubmit={event => {
              event.preventDefault()
              if (
                !/^\d{1,3}$/.test(editing.id) ||
                tables.some(table => table.id === editing.id && table.id !== editing.original)
              ) {
                setError('Use a unique table number with 1–3 digits.')
                return
              }
              const updated = editing.original
                ? tables.map(table =>
                    table.id === editing.original ? { id: editing.id, active: editing.active } : table
                  )
                : [...tables, { id: editing.id, active: editing.active }]
              saveTables(updated)
              setEditing(null)
              notify(`Table ${editing.id} saved!`)
            }}
          >
            {error && <p className="admin-form-error">{error}</p>}
            <label>
              Table number
              <input
                inputMode="numeric"
                value={editing.id}
                maxLength={3}
                onChange={event => setEditing({ ...editing, id: event.target.value })}
              />
            </label>
            <label className="admin-checkbox">
              <input
                type="checkbox"
                checked={editing.active}
                onChange={event => setEditing({ ...editing, active: event.target.checked })}
              />
              Active in dining room
            </label>
            <button className="button primary" type="submit">
              Confirm Table
            </button>
          </form>
        </Modal>
      )}
    </>
  )
}

export function AdminStaff({ notify }: { notify: (text: string) => void }) {
  const [staffList, setStaffList] = useState<ApiStaff[]>([])
  const [editing, setEditing] = useState<Partial<ApiStaff> | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const loadStaff = async () => {
    try {
      setLoading(true)
      const res = await api.getStaff()
      if (res.success && res.staff) {
        setStaffList(res.staff)
      }
    } catch (err: any) {
      console.warn('Error fetching staff:', err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStaff()
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editing || !editing.name?.trim() || !editing.phone?.trim()) {
      setError('Please provide staff name and phone number.')
      return
    }

    try {
      if (editing.id) {
        await api.updateStaff(editing.id, editing)
        notify(`Staff '${editing.name}' updated!`)
      } else {
        await api.createStaff(editing)
        notify(`New team member '${editing.name}' added to database!`)
      }
      setEditing(null)
      await loadStaff()
    } catch (err: any) {
      setError(err.message || 'Failed to save staff member.')
    }
  }

  const handleToggleStatus = async (member: ApiStaff) => {
    const nextStatus = member.status === 'Active' ? 'On Break' : 'Active'
    try {
      await api.toggleStaffStatus(member.id, nextStatus)
      setStaffList(current =>
        current.map(s => (s.id === member.id ? { ...s, status: nextStatus } : s))
      )
      notify(`${member.name} marked as ${nextStatus}`)
    } catch (err: any) {
      notify(`Error: ${err.message}`)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to remove ${name} from staff?`)) return
    try {
      await api.deleteStaff(id)
      setStaffList(current => current.filter(s => s.id !== id))
      notify(`Staff member ${name} removed.`)
    } catch (err: any) {
      notify(`Error: ${err.message}`)
    }
  }

  return (
    <>
      <div className="admin-section-toolbar">
        <button
          className="button primary"
          onClick={() => {
            setEditing({ name: '', phone: '', role: 'Waiter', status: 'Active', shift: 'Day Shift' })
            setError('')
          }}
        >
          <Icon name="plus" size={16} />Add staff member
        </button>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Team member</th>
              <th>Role</th>
              <th>Phone</th>
              <th>Shift</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {staffList.map(member => (
              <tr key={member.id}>
                <td data-label="Team member">
                  <strong>{member.name}</strong>
                  <small>{member.email || 'No email registered'}</small>
                </td>
                <td data-label="Role">{member.role}</td>
                <td data-label="Phone">{member.phone}</td>
                <td data-label="Shift">{member.shift || 'Day Shift'}</td>
                <td data-label="Status">
                  <span
                    className={`admin-badge ${member.status === 'Active' ? 'badge-green' : member.status === 'On Break' ? 'badge-amber' : 'badge-neutral'}`}
                  >
                    {member.status}
                  </span>
                </td>
                <td data-label="Action" style={{ display: 'flex', gap: '8px' }}>
                  <button className="admin-table-action" onClick={() => handleToggleStatus(member)}>
                    {member.status === 'Active' ? 'Set Break' : 'Set Active'}
                  </button>
                  <button
                    className="admin-table-action"
                    onClick={() => {
                      setEditing({ ...member })
                      setError('')
                    }}
                  >
                    Edit
                  </button>
                  <button
                    className="admin-table-action"
                    style={{ color: '#b82032' }}
                    onClick={() => handleDelete(member.id, member.name)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!staffList.length && !loading && (
          <div className="admin-empty">
            <Icon name="users" size={28} />
            <h3>No staff members found.</h3>
            <p>Click "Add staff member" to register staff in the database.</p>
          </div>
        )}
      </div>

      {editing && (
        <Modal title={editing.id ? 'Edit Staff Member' : 'Register New Staff'} close={() => setEditing(null)}>
          <form className="admin-form" onSubmit={handleSave}>
            {error && <p className="admin-form-error">{error}</p>}
            <label>
              Full name
              <input
                value={editing.name || ''}
                maxLength={100}
                required
                onChange={event => setEditing({ ...editing, name: event.target.value })}
              />
            </label>
            <label>
              Phone number
              <input
                value={editing.phone || ''}
                maxLength={25}
                required
                placeholder="0909511588"
                onChange={event => setEditing({ ...editing, phone: event.target.value })}
              />
            </label>
            <label>
              Email (optional)
              <input
                type="email"
                value={editing.email || ''}
                maxLength={100}
                onChange={event => setEditing({ ...editing, email: event.target.value })}
              />
            </label>
            <div className="admin-form-grid">
              <label>
                Role
                <select
                  value={editing.role || 'Waiter'}
                  onChange={event => setEditing({ ...editing, role: event.target.value as any })}
                >
                  <option value="Manager">Manager</option>
                  <option value="Waiter">Waiter / Server</option>
                  <option value="Kitchen">Kitchen Staff</option>
                  <option value="Cashier">Cashier</option>
                  <option value="Host">Host</option>
                </select>
              </label>
              <label>
                Shift
                <select
                  value={editing.shift || 'Day Shift'}
                  onChange={event => setEditing({ ...editing, shift: event.target.value })}
                >
                  <option value="Day Shift">Day Shift</option>
                  <option value="Evening Shift">Evening Shift</option>
                  <option value="All Day">All Day</option>
                </select>
              </label>
            </div>
            <label>
              Status
              <select
                value={editing.status || 'Active'}
                onChange={event => setEditing({ ...editing, status: event.target.value as any })}
              >
                <option value="Active">Active</option>
                <option value="On Break">On Break</option>
                <option value="Off Duty">Off Duty</option>
                <option value="Inactive">Inactive</option>
              </select>
            </label>
            <div className="admin-form-actions">
              <button type="submit" className="button primary">
                Save Staff Member
              </button>
              <button type="button" className="button secondary" onClick={() => setEditing(null)}>
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  )
}

export function AdminSettings({ notify }: { notify: (text: string) => void }) {
  const [values, setValues] = useState({
    restaurantName: 'Ilillii Bar & Restaurant',
    phone: '0909511588',
    address: 'Around Awraris, near General Wako Gutu Square, Bale Robe',
    announcement: 'Welcome to Ilillii Bar & Restaurant · Open Daily 7:00 AM – 11:30 PM',
    hours: 'Daily: 7:00 AM – 11:30 PM',
  })

  useEffect(() => {
    api.getSettings().then(res => {
      if (res.success && res.settings) {
        setValues({
          restaurantName: res.settings.restaurantName || 'Ilillii Bar & Restaurant',
          phone: res.settings.managerPhone || '0909511588',
          address: res.settings.location || 'Around Awraris, near General Wako Gutu Square, Bale Robe',
          announcement: res.settings.announcement || 'Welcome to Ilillii Bar & Restaurant',
          hours: res.settings.openingHours || 'Daily: 7:00 AM – 11:30 PM',
        })
      }
    }).catch(err => {
      console.warn('Could not load settings from server:', err.message)
    })
  }, [])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    try {
      await api.updateSettings({
        restaurantName: values.restaurantName,
        managerPhone: values.phone,
        location: values.address,
        announcement: values.announcement,
        openingHours: values.hours,
      })
      notify('Hotel & restaurant settings saved to MongoDB Atlas!')
    } catch (err: any) {
      notify(`Error saving settings: ${err.message}`)
    }
  }

  return (
    <form className="admin-form admin-settings-form" onSubmit={handleSubmit}>
      <div className="admin-settings-section">
        <h2>Restaurant Information</h2>
        <div className="admin-form-grid">
          <label>
            Restaurant name
            <input
              value={values.restaurantName}
              onChange={event => setValues({ ...values, restaurantName: event.target.value })}
            />
          </label>
          <label>
            Manager direct line
            <input
              value={values.phone}
              onChange={event => setValues({ ...values, phone: event.target.value })}
              placeholder="0909511588"
            />
          </label>
        </div>
        <label>
          Location & Street address
          <input
            value={values.address}
            onChange={event => setValues({ ...values, address: event.target.value })}
            placeholder="Around Awraris, near General Wako Gutu Square, Bale Robe"
          />
        </label>
        <label>
          Announcement Banner
          <input
            value={values.announcement}
            onChange={event => setValues({ ...values, announcement: event.target.value })}
          />
        </label>
        <label>
          Opening hours
          <textarea
            value={values.hours}
            onChange={event => setValues({ ...values, hours: event.target.value })}
            rows={2}
          />
        </label>
      </div>

      <div className="admin-settings-section">
        <h2>Currency & Language</h2>
        <div className="admin-form-grid">
          <label>
            Currency
            <input value="ETB · Ethiopian birr" readOnly />
          </label>
          <label>
            Supported languages
            <input value="Afaan Oromo / አማርኛ" readOnly />
          </label>
        </div>
      </div>

      <button className="button primary" type="submit">
        Save Settings to Database
      </button>
    </form>
  )
}
