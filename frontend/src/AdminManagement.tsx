import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { Icon, Modal } from './shared-ui'
import { categories as initialCategories, menuItems, formatBirr } from './menu-data'
import { roles } from './admin-model'
import type { Role } from './admin-model'
import { demoTables } from './order-prototype'
import { SiteLink } from './site-routing'
import { Pagination } from './ui-patterns'
import { api, getImageUrl, type ApiMenuItem, type ApiStaff } from './api/client'
import { useLanguage } from './language'

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

export type ConfirmDialogState = {
  title: string
  message: string
  confirmText?: string
  danger?: boolean
  onConfirm: () => void
}

export function ConfirmModal({ dialog, close }: { dialog: ConfirmDialogState; close: () => void }) {
  return (
    <Modal title={dialog.title} close={close}>
      <div style={{ padding: '8px 0 14px', textAlign: 'center' }}>
        <div
          style={{
            width: '54px',
            height: '54px',
            borderRadius: '50%',
            background: dialog.danger !== false ? '#fee2e2' : '#fef3c7',
            color: dialog.danger !== false ? '#dc2626' : '#d97706',
            display: 'grid',
            placeItems: 'center',
            margin: '0 auto 16px',
            boxShadow: '0 4px 12px rgba(220, 38, 38, 0.15)',
          }}
        >
          <Icon name={dialog.danger !== false ? 'close' : 'info'} size={24} />
        </div>
        <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: 750, color: 'var(--color-ink)' }}>
          {dialog.title}
        </h3>
        <p style={{ margin: '0 auto 24px', fontSize: '14px', color: 'var(--color-muted)', lineHeight: 1.6, maxWidth: '380px' }}>
          {dialog.message}
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button
            type="button"
            className="button secondary"
            style={{ minWidth: '110px', height: '42px', fontWeight: 600 }}
            onClick={close}
          >
            Cancel
          </button>
          <button
            type="button"
            className="button primary"
            style={{
              background: dialog.danger !== false ? '#b82032' : 'var(--color-brand)',
              borderColor: dialog.danger !== false ? '#991b1b' : undefined,
              color: '#ffffff',
              minWidth: '130px',
              height: '42px',
              fontWeight: 750,
            }}
            onClick={() => {
              dialog.onConfirm()
              close()
            }}
          >
            {dialog.confirmText || 'Confirm'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

async function compressImageFile(file: File, maxWidth = 1000, maxHeight = 1000, quality = 0.82): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        let { width, height } = img
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height)
          width = Math.round(width * ratio)
          height = Math.round(height * ratio)
        }
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          resolve(e.target?.result as string)
          return
        }
        ctx.drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.onerror = () => resolve(e.target?.result as string)
      img.src = e.target?.result as string
    }
    reader.onerror = () => resolve('')
    reader.readAsDataURL(file)
  })
}

export function AdminMenu({ notify }: { notify: (text: string) => void }) {
  const { t } = useLanguage()
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
  const [uploadingImage, setUploadingImage] = useState(false)
  const [imageInputMode, setImageInputMode] = useState<'upload' | 'url'>('upload')
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null)
  const images = useRef<string[]>([])

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (JPEG, PNG, or WebP).')
      return
    }

    setUploadingImage(true)
    setError('')

    try {
      // 1. Client-side canvas compression for instant responsiveness & sharp resolution
      const compressedBase64 = await compressImageFile(file)
      if (!compressedBase64) {
        throw new Error('Could not read image file.')
      }

      // 2. Show live preview immediately
      setEditing(prev => (prev ? { ...prev, image: compressedBase64 } : null))

      // 3. Upload to backend server
      try {
        const res = await api.uploadImage(compressedBase64, file.name)
        if (res.success && (res.fullUrl || res.url)) {
          const targetUrl = res.fullUrl || res.url
          setEditing(prev => (prev ? { ...prev, image: targetUrl } : null))
          notify(`Image uploaded and linked!`)
        } else {
          notify(`Image compressed and linked!`)
        }
      } catch (uploadErr: any) {
        console.warn('Backend upload notice; using optimized data URL:', uploadErr.message)
        notify('Image loaded into item.')
      }
    } catch (err: any) {
      setError(err.message || 'Error processing local image file.')
    } finally {
      setUploadingImage(false)
    }
  }

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

  const handleToggleAvailability = async (item: ManagedItem) => {
    const nextAvailability = item.availability === 'Available' ? 'Unavailable' : 'Available'
    const isAvail = nextAvailability === 'Available'
    setItems(prev => prev.map(i => (i.id === item.id ? { ...i, availability: nextAvailability } : i)))
    notify(`${item.name}: ${isAvail ? 'In Stock (Available)' : 'Out of Stock (Unavailable)'}`)
    try {
      await api.updateMenuItem(item.id, { available: isAvail })
      window.dispatchEvent(new CustomEvent('ilillii-menu-updated'))
    } catch (e: any) {
      console.warn('Backend update failed:', e.message)
    }
  }

  const handleDelete = (id: string, name: string) => {
    setConfirmDialog({
      title: 'Delete Menu Item',
      message: `Are you sure you want to delete '${name}' from the menu? This dish will no longer appear for ordering.`,
      confirmText: 'Delete Dish',
      danger: true,
      onConfirm: async () => {
        try {
          await api.deleteMenuItem(id)
          setItems(current => current.filter(i => i.id !== id))
          window.dispatchEvent(new CustomEvent('ilillii-menu-updated'))
          notify(`Item '${name}' removed from menu.`)
        } catch (err: any) {
          notify(`Error deleting item: ${err.message}`)
        }
      },
    })
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
      window.dispatchEvent(new CustomEvent('ilillii-menu-updated'))
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
            placeholder={t('admin.searchFoodDrinks')}
            aria-label="Search managed menu"
          />
        </label>
        <select aria-label="Filter category" value={filter} onChange={event => setFilter(event.target.value)}>
          <option value="all">{t('admin.allCategories')}</option>
          <option value="main">Main Dishes (Gosa Nyataa)</option>
          <option value="additional">Additional Dishes (Nyataa Sooma(a))</option>
          <option value="drinks">Drinks & Beverages (Gosa Dhugaatii)</option>
        </select>
        <button className="button primary" onClick={() => open()}>
          <Icon name="plus" size={16} />{t('admin.addMenuItem')}
        </button>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>{t('admin.menuItem')}</th>
              <th>{t('admin.category')}</th>
              <th>{t('admin.price')}</th>
              <th>{t('admin.availability')}</th>
              <th>{t('admin.houseSpecial')}</th>
              <th>{t('admin.action')}</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map(item => (
              <tr key={item.id}>
                <td data-label="Menu item">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '42px', height: '42px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0, background: '#f5ebe1', border: '1px solid #e7dfd5' }}>
                      <img
                        src={getImageUrl(item.image)}
                        alt={item.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = '/images/ethiopian-sharing-platter.jpg'
                        }}
                      />
                    </div>
                    <div>
                      <strong style={{ display: 'block' }}>{item.name}</strong>
                      <small style={{ color: '#78716c' }}>{item.amharic || 'No Amharic translation'}</small>
                    </div>
                  </div>
                </td>
                <td data-label="Category">{item.category}</td>
                <td data-label="Price">
                  <strong>{formatBirr(item.price)} ETB</strong>
                </td>
                <td data-label="Availability">
                  <button
                    type="button"
                    onClick={() => handleToggleAvailability(item)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 0,
                    }}
                    title={item.availability === 'Available' ? 'Click to mark Out of Stock' : 'Click to mark In Stock'}
                  >
                    <span
                      style={{
                        position: 'relative',
                        display: 'inline-block',
                        width: '38px',
                        height: '22px',
                        background: item.availability === 'Available' ? '#16a34a' : '#cbd5e1',
                        borderRadius: '12px',
                        transition: 'background 0.2s',
                      }}
                    >
                      <span
                        style={{
                          position: 'absolute',
                          top: '2px',
                          left: item.availability === 'Available' ? '18px' : '2px',
                          width: '18px',
                          height: '18px',
                          background: '#ffffff',
                          borderRadius: '50%',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
                          transition: 'left 0.2s',
                        }}
                      />
                    </span>
                    <span
                      style={{
                        fontSize: '12px',
                        fontWeight: 700,
                        color: item.availability === 'Available' ? '#15803d' : '#64748b',
                      }}
                    >
                      {item.availability === 'Available' ? 'In Stock' : 'Unavailable'}
                    </span>
                  </button>
                </td>
                <td data-label="House Special">
                  {item.houseSpecial ? <span className="admin-badge badge-amber">{t('admin.houseSpecial')}</span> : '—'}
                </td>
                <td data-label="Action" style={{ display: 'flex', gap: '8px' }}>
                  <button className="admin-table-action" onClick={() => open(item)}>
                    {t('admin.edit')}<Icon name="arrow" size={14} />
                  </button>
                  <button
                    className="admin-table-action"
                    style={{ color: '#b82032' }}
                    onClick={() => handleDelete(item.id, item.name)}
                  >
                    {t('admin.delete')}
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
                  <option value="main">Main Dishes (Gosa Nyataa)</option>
                  <option value="additional">Additional Dishes (Nyataa Sooma(a))</option>
                  <option value="drinks">Drinks & Beverages (Gosa Dhugaatii)</option>
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

            <div style={{ margin: '14px 0' }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px' }}>
                Food / Beverage Image
              </label>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                <button
                  type="button"
                  className={`button ${imageInputMode === 'upload' ? 'primary' : 'secondary'}`}
                  style={{ padding: '6px 14px', fontSize: '13px' }}
                  onClick={() => setImageInputMode('upload')}
                >
                  <Icon name="meal" size={15} />Upload from Computer / Phone
                </button>
                <button
                  type="button"
                  className={`button ${imageInputMode === 'url' ? 'primary' : 'secondary'}`}
                  style={{ padding: '6px 14px', fontSize: '13px' }}
                  onClick={() => setImageInputMode('url')}
                >
                  <Icon name="globe" size={15} />Enter Image URL
                </button>
              </div>

              {imageInputMode === 'upload' ? (
                <div style={{ border: '2px dashed #d1d5db', borderRadius: '8px', padding: '16px', textAlign: 'center', background: '#fafaf9' }}>
                  <input
                    type="file"
                    id="admin-dish-image-file"
                    accept="image/png,image/jpeg,image/webp,image/jpg"
                    style={{ display: 'none' }}
                    onChange={handleImageFileChange}
                    disabled={uploadingImage}
                  />
                  <label
                    htmlFor="admin-dish-image-file"
                    className="button primary"
                    style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Icon name="plus" size={16} />
                    {uploadingImage ? 'Uploading Image to Server…' : 'Choose Image File'}
                  </label>
                  <p style={{ fontSize: '12px', color: '#78716c', marginTop: '8px', marginBottom: 0 }}>
                    Supports PNG, JPG, JPEG, WebP up to 10MB
                  </p>
                </div>
              ) : (
                <div>
                  <input
                    type="url"
                    placeholder="https://images.unsplash.com/... or /images/menu/dish.jpg"
                    value={editing.image || ''}
                    onChange={e => setEditing({ ...editing, image: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '14px' }}
                  />
                  <small style={{ color: '#78716c', display: 'block', marginTop: '4px' }}>
                    Paste any public image URL or website asset link
                  </small>
                </div>
              )}

              {editing.image && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px', padding: '6px 10px', background: '#f3f4f6', borderRadius: '6px' }}>
                  <span style={{ fontSize: '12px', color: '#15803d', fontWeight: 600 }}>✓ Image assigned</span>
                  <button
                    type="button"
                    style={{ color: '#dc2626', fontSize: '12px', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                    onClick={() => setEditing({ ...editing, image: '' })}
                  >
                    Remove Image
                  </button>
                </div>
              )}
            </div>

            <div className="admin-item-preview">
              {editing.image ? (
                <img src={getImageUrl(editing.image)} alt="Item preview" style={{ objectFit: 'cover' }} />
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
      {confirmDialog && <ConfirmModal dialog={confirmDialog} close={() => setConfirmDialog(null)} />}
    </>
  )
}

export function AdminCategories({ notify }: { notify: (text: string) => void }) {
  const [categories, setCategories] = useState<ManagedCategory[]>(
    initialCategories.map(item => ({ id: item.id, name: item.label, original: item.draftLabel, active: true }))
  )
  const [editing, setEditing] = useState<ManagedCategory | null>(null)
  const [error, setError] = useState('')
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null)

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
      {confirmDialog && <ConfirmModal dialog={confirmDialog} close={() => setConfirmDialog(null)} />}
    </>
  )
}

export function getProductionQrUrl(tableId: string): string {
  if (typeof window !== 'undefined') {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || !window.location.hostname
    const origin = isLocal ? 'https://ilillii-restaurant.pro.et' : window.location.origin
    return `${origin}/?table=${encodeURIComponent(tableId)}&source=qr#menu`
  }
  return `https://ilillii-restaurant.pro.et/?table=${encodeURIComponent(tableId)}&source=qr#menu`
}

function TableQrCode({ table }: { table: string }) {
  const [dataUrl, setDataUrl] = useState<string>('')
  const qrTarget = getProductionQrUrl(table)

  useEffect(() => {
    let active = true
    QRCode.toDataURL(qrTarget, {
      width: 280,
      margin: 2,
      color: {
        dark: '#1c1917',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'H',
    })
      .then(url => {
        if (active) setDataUrl(url)
      })
      .catch(err => console.error('QR code generation error:', err))
    return () => {
      active = false
    }
  }, [qrTarget])

  return (
    <div style={{ textAlign: 'center', background: '#ffffff', padding: '10px', borderRadius: '8px', border: '1px solid #e5e7eb', margin: '8px 0' }}>
      {dataUrl ? (
        <img
          src={dataUrl}
          alt={`QR Code for Table ${table}`}
          width={140}
          height={140}
          style={{ display: 'block', margin: '0 auto', maxWidth: '100%', height: 'auto' }}
        />
      ) : (
        <div style={{ width: 140, height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', background: '#f5f5f4', borderRadius: '6px' }}>
          <span style={{ fontSize: '11px', color: '#78716c' }}>Generating QR…</span>
        </div>
      )}
      <span style={{ fontSize: '11px', color: '#15803d', fontWeight: 600, display: 'inline-block', marginTop: '6px' }}>
        Scans to Table {table} Order
      </span>
      <small style={{ display: 'block', fontSize: '9px', color: '#78716c', marginTop: '2px', wordBreak: 'break-all' }}>
        {qrTarget}
      </small>
    </div>
  )
}

export function AdminTables({ notify }: { notify: (text: string) => void }) {
  const [tables, setTables] = useState<{ id: string; active: boolean }[]>(() => {
    try {
      const saved = localStorage.getItem('ilillii_tables')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length >= 30) return parsed
        const existingIds = new Set(parsed.map((t: any) => String(t.id)))
        const all30 = [...parsed]
        for (let i = 1; i <= 30; i++) {
          if (!existingIds.has(String(i))) {
            all30.push({ id: String(i), active: true })
          }
        }
        all30.sort((a, b) => parseInt(a.id, 10) - parseInt(b.id, 10))
        localStorage.setItem('ilillii_tables', JSON.stringify(all30))
        return all30
      }
    } catch {}
    const default30 = Array.from({ length: 30 }, (_, i) => ({ id: String(i + 1), active: true }))
    try { localStorage.setItem('ilillii_tables', JSON.stringify(default30)) } catch {}
    return default30
  })
  const [editing, setEditing] = useState<{ id: string; active: boolean; original?: string } | null>(null)
  const [printableTable, setPrintableTable] = useState<string | null>(null)
  const [printableQrUrl, setPrintableQrUrl] = useState<string>('')
  const [error, setError] = useState('')
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null)

  useEffect(() => {
    if (printableTable) {
      const target = getProductionQrUrl(printableTable)
      QRCode.toDataURL(target, {
        width: 400,
        margin: 2,
        errorCorrectionLevel: 'H',
      })
        .then(setPrintableQrUrl)
        .catch(console.error)
    } else {
      setPrintableQrUrl('')
    }
  }, [printableTable])

  const saveTables = (newTables: { id: string; active: boolean }[]) => {
    setTables(newTables)
    try {
      localStorage.setItem('ilillii_tables', JSON.stringify(newTables))
    } catch {}
  }

  const download = async (id: string) => {
    const qrTarget = getProductionQrUrl(id)
    try {
      const qrDataUrl = await QRCode.toDataURL(qrTarget, {
        width: 600,
        margin: 2,
        errorCorrectionLevel: 'H',
      })
      const link = document.createElement('a')
      link.href = qrDataUrl
      link.download = `ilillii-table-${id}-qr.png`
      link.click()
      notify(`Downloaded live QR code for Table ${id} (scans to live site)`)
    } catch (err: any) {
      notify(`QR Download note: ${err.message}`)
    }
  }

  const handleDelete = (id: string) => {
    setConfirmDialog({
      title: 'Remove Table',
      message: `Are you sure you want to remove Table ${id}? Its table order URL and QR code will be unassigned.`,
      confirmText: 'Remove Table',
      danger: true,
      onConfirm: () => {
        const updated = tables.filter(t => t.id !== id)
        saveTables(updated)
        notify(`Table ${id} removed.`)
      },
    })
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
            <p style={{ margin: '0 0 12px', fontSize: '12px', color: '#78350f' }}>Bale Robe, Oromia · 09511588</p>
            <div style={{ background: '#ffffff', padding: '14px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              <div style={{ fontSize: '28px', fontWeight: 900, color: '#1c1917', marginBottom: '4px' }}>
                TABLE {printableTable}
              </div>
              <p style={{ fontSize: '12px', fontWeight: 700, color: '#15803d', margin: '0 0 10px' }}>
                SCAN WITH PHONE CAMERA TO ORDER
              </p>
              {printableQrUrl ? (
                <img
                  src={printableQrUrl}
                  alt={`Table ${printableTable} QR Code`}
                  width={200}
                  height={200}
                  style={{ display: 'block', margin: '0 auto', maxWidth: '100%', height: 'auto' }}
                />
              ) : (
                <div style={{ width: 180, height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', background: '#f5f5f4', borderRadius: '6px' }}>
                  <span>Generating QR…</span>
                </div>
              )}
              <p style={{ fontSize: '11px', color: '#57534e', marginTop: '10px', marginBottom: '4px' }}>
                Browse Food &amp; Drink · Direct Table Service
              </p>
              <code style={{ fontSize: '10px', color: '#78716c', background: '#f5f5f4', padding: '2px 6px', borderRadius: '4px', wordBreak: 'break-all' }}>
                {getProductionQrUrl(printableTable)}
              </code>
            </div>
            <p style={{ fontSize: '11px', color: '#9ca3af', marginTop: '10px' }}>
              Around Awraris· Bale Robe
            </p>
            <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
              <button className="button primary" style={{ flex: 1 }} onClick={() => window.print()}>
                Print Card
              </button>
              <button className="button secondary" style={{ flex: 1 }} onClick={() => download(printableTable)}>
                Download High-Res QR
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
      {confirmDialog && <ConfirmModal dialog={confirmDialog} close={() => setConfirmDialog(null)} />}
    </>
  )
}

export function AdminStaff({ notify }: { notify: (text: string) => void }) {
  const [staffList, setStaffList] = useState<ApiStaff[]>([])
  const [editing, setEditing] = useState<Partial<ApiStaff> | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null)

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

  const handleDelete = (id: string, name: string) => {
    setConfirmDialog({
      title: 'Remove Staff Member',
      message: `Are you sure you want to remove ${name} from staff? This will revoke their workspace login access.`,
      confirmText: 'Remove Staff',
      danger: true,
      onConfirm: async () => {
        try {
          await api.deleteStaff(id)
          setStaffList(current => current.filter(s => s.id !== id))
          notify(`Staff member ${name} removed.`)
        } catch (err: any) {
          notify(`Error: ${err.message}`)
        }
      },
    })
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
                  <div style={{ fontSize: '11px', color: '#78716c', marginTop: '4px', background: '#f5ebe1', padding: '2px 8px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <span>Login: <strong>{member.username || member.phone}</strong></span>
                    <span>· PIN: <code>{member.password || '1234'}</code></span>
                  </div>
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
                placeholder="09511588"
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
                Login Username
                <input
                  value={editing.username || ''}
                  maxLength={50}
                  placeholder="e.g. waiter1 or staff name"
                  onChange={event => setEditing({ ...editing, username: event.target.value.toLowerCase().replace(/\s+/g, '') })}
                />
                <small style={{ fontSize: '11px', color: 'var(--color-muted)', display: 'block', marginTop: '3px' }}>Staff uses this to sign in</small>
              </label>
              <label>
                Login PIN / Password
                <input
                  type="text"
                  value={editing.password || ''}
                  maxLength={50}
                  placeholder="e.g. 1234"
                  onChange={event => setEditing({ ...editing, password: event.target.value })}
                />
                <small style={{ fontSize: '11px', color: 'var(--color-muted)', display: 'block', marginTop: '3px' }}>Default PIN is 1234</small>
              </label>
            </div>
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
      {confirmDialog && <ConfirmModal dialog={confirmDialog} close={() => setConfirmDialog(null)} />}
    </>
  )
}

export function AdminSettings({ notify }: { notify: (text: string) => void }) {
  const [values, setValues] = useState({
    restaurantName: 'Ilillii Bar & Restaurant',
    phone: '09511588',
    address: 'Around Awraris,Bale Robe',
    announcement: 'Welcome to Ilillii Bar & Restaurant · Open Daily 7:00 AM – 11:30 PM',
    hours: 'Daily: 7:00 AM – 11:30 PM',
  })

  useEffect(() => {
    api.getSettings().then(res => {
      if (res.success && res.settings) {
        setValues({
          restaurantName: res.settings.restaurantName || 'Ilillii Bar & Restaurant',
          phone: res.settings.managerPhone || '09511588',
          address: res.settings.location || 'Around Awraris,Bale Robe',
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
            Hotel phone line
            <input
              value={values.phone}
              onChange={event => setValues({ ...values, phone: event.target.value })}
              placeholder="09511588"
            />
          </label>
        </div>
        <label>
          Location & Street address
          <input
            value={values.address}
            onChange={event => setValues({ ...values, address: event.target.value })}
            placeholder="Around Awraris,Bale Robe"
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
