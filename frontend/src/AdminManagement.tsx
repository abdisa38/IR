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

function QrPlaceholder({ table }: { table: string }) {
  return (
    <svg className="admin-qr" viewBox="0 0 100 100" role="img" aria-label={`QR code for table ${table}`}>
      <rect width="100" height="100" fill="white" />
      <g fill="none" stroke="currentColor" strokeWidth="6">
        <rect x="9" y="9" width="23" height="23" />
        <rect x="67" y="9" width="23" height="23" />
        <rect x="9" y="67" width="23" height="23" />
      </g>
      <g fill="currentColor">
        <path d="M17 17h7v7h-7ZM75 17h7v7h-7ZM17 75h7v7h-7ZM44 13h8v20h-8ZM42 44h15v15H42ZM67 45h8v10h-8ZM80 65h10v22H80ZM44 77h10v12H44ZM62 65h8v10h-8ZM10 44h20v8H10Z" />
      </g>
      <rect x="19" y="57" width="64" height="13" fill="white" />
      <text x="50" y="66" textAnchor="middle" fontSize="6" fontWeight="bold" fill="#7D1825">
        TABLE {table}
      </text>
    </svg>
  )
}

export function AdminTables({ notify }: { notify: (text: string) => void }) {
  const [tables, setTables] = useState(demoTables.map(id => ({ id: String(id), active: true })))
  const [editing, setEditing] = useState<{ id: string; active: boolean; original?: string } | null>(null)
  const [error, setError] = useState('')

  const download = (id: string) => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="400" height="400" fill="#FFF8F3"/><text x="200" y="160" text-anchor="middle" font-size="40" fill="#B82032">ILILLII · TABLE ${id}</text><text x="200" y="230" text-anchor="middle" font-size="18">SCAN FOR TABLE ORDERING</text></svg>`
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `ilillii-table-${id}.svg`
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    notify(`Downloaded QR printable for Table ${id}`)
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
        {tables.map(table => (
          <article className="admin-table-card" key={table.id}>
            <div>
              <h2>Table {table.id}</h2>
              <span className={`admin-badge ${table.active ? 'badge-green' : 'badge-neutral'}`}>
                {table.active ? 'Active' : 'Inactive'}
              </span>
            </div>
            <QrPlaceholder table={table.id} />
            <small>{`/?demoTable=${table.id}#menu`}</small>
            {demoTables.includes(table.id as typeof demoTables[number]) && table.active ? (
              <SiteLink
                href={`/?demoTable=${table.id}#menu`}
                onClick={() => window.dispatchEvent(new CustomEvent('ilillii-demo-table', { detail: table.id }))}
                className="button secondary"
              >
                Open table ordering link<Icon name="arrow" size={15} />
              </SiteLink>
            ) : (
              <span className="admin-inline-note">Table active in dining room.</span>
            )}
            <div className="table-card-actions">
              <button onClick={() => download(table.id)}>
                <Icon name="download" size={16} />Download printable
              </button>
              <button
                onClick={() => {
                  setEditing({ ...table, original: table.id })
                  setError('')
                }}
              >
                Edit
              </button>
            </div>
          </article>
        ))}
      </div>
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
              setTables(current =>
                editing.original
                  ? current.map(table =>
                      table.id === editing.original ? { id: editing.id, active: editing.active } : table
                    )
                  : [...current, { id: editing.id, active: editing.active }]
              )
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
