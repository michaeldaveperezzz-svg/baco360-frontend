import { useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle, Check, Pencil, Plus, Tag, Trash2, X } from 'lucide-react'
import type { Category, Report } from '../data/types'
import { PageIntro } from '../components/Common'

interface Props {
  categories: Category[]
  reports: Report[]
  onAdd: (name: string, description: string) => Promise<void>
  onUpdate: (id: number, name: string, description: string) => Promise<void>
  onToggle: (id: number) => Promise<void>
  onDelete: (id: number) => Promise<void>
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return 'The category could not be saved. Please try again.'
}

function getCategoryIcon(name: string): string | null {
  const normalizedName = name.toLowerCase().replace(/[^a-z0-9]+/g, ' ')
  if (/\b(flood|flooding)\b/.test(normalizedName)) return '/flood.png'
  if (/\b(garbage|waste|trash|sanitation)\b/.test(normalizedName)) return '/garbage-truck.png'
  if (/\b(public safety|safety|security)\b/.test(normalizedName)) return '/public-safety.png'
  if (/\b(road|pothole)\b/.test(normalizedName)) return '/road%20damage.png'
  if (/\b(street light|lighting)\b/.test(normalizedName)) return '/street-light.png'
  return null
}

function getCategoryColor(name: string): string {
  const normalizedName = name.toLowerCase().replace(/[^a-z0-9]+/g, ' ')
  if (/\b(flood|flooding)\b/.test(normalizedName)) return 'flood'
  if (/\b(garbage|waste|trash|sanitation)\b/.test(normalizedName)) return 'waste'
  if (/\b(public safety|safety|security)\b/.test(normalizedName)) return 'safety'
  if (/\b(road|pothole)\b/.test(normalizedName)) return 'road'
  if (/\b(street light|lighting)\b/.test(normalizedName)) return 'lighting'
  return 'default'
}

export default function CategoryManagementPage({ categories, reports, onAdd, onUpdate, onToggle, onDelete }: Props) {
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [deleteCandidate, setDeleteCandidate] = useState<Category | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  function startEdit(category: Category) {
    setEditing(category)
    setName(category.name)
    setDescription(category.description ?? '')
    setAdding(false)
    setError(null)
  }

  function cancelForm() {
    setAdding(false)
    setEditing(null)
    setName('')
    setDescription('')
    setError(null)
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmedName = name.trim()
    if (!trimmedName) {
      setError('Enter a category name.')
      return
    }

    setError(null)
    setIsSaving(true)
    try {
      if (editing) await onUpdate(editing.id, trimmedName, description.trim())
      else await onAdd(trimmedName, description.trim())
      cancelForm()
    } catch (submitError) {
      setError(getErrorMessage(submitError))
    } finally {
      setIsSaving(false)
    }
  }

  async function toggle(category: Category) {
    setError(null)
    try {
      await onToggle(category.id)
    } catch (toggleError) {
      setError(getErrorMessage(toggleError))
    }
  }

  async function remove(category: Category) {
    setDeleteCandidate(category)
  }

  async function confirmDelete() {
    if (!deleteCandidate || isDeleting) return
    setError(null)
    setIsDeleting(true)
    try {
      await onDelete(deleteCandidate.id)
      setDeleteCandidate(null)
    } catch (deleteError) {
      setError(getErrorMessage(deleteError))
      setDeleteCandidate(null)
    } finally {
      setIsDeleting(false)
    }
  }

  const formOpen = adding || editing !== null

  return <div className="page-content">
    <PageIntro
      eyebrow="ADMINISTRATION / CONFIGURATION"
      title="Issue categories"
      description="Keep reports organized with clear, resident-friendly issue types."
      action={<button className="button button-primary" type="button" disabled={isSaving} onClick={() => { setAdding(true); setEditing(null); setName(''); setDescription(''); setError(null) }}><Plus size={16} /> Add category</button>}
    />
    {formOpen && createPortal(<div className="modal-backdrop category-form-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !isSaving) cancelForm()
    }}>
      <section className="category-form-modal" role="dialog" aria-modal="true" aria-labelledby="category-form-title">
        <div className="user-form-header">
          <div><span className="eyebrow">ADMINISTRATION / CONFIGURATION</span><h2 id="category-form-title">{editing ? 'Edit issue category' : 'Add issue category'}</h2></div>
          <button className="icon-button" type="button" aria-label="Close category form" onClick={cancelForm} disabled={isSaving}><X size={19} /></button>
        </div>
        <form className="category-edit-form" onSubmit={submit}>
          <label className="field-label">Category name<input autoFocus required maxLength={100} value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Tree maintenance" disabled={isSaving} /></label>
          <label className="field-label">Description<input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Help residents choose the right category" disabled={isSaving} /></label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="user-form-actions">
            <button className="button button-quiet" type="button" disabled={isSaving} onClick={cancelForm}>Cancel</button>
            <button className="button button-primary" type="submit" disabled={isSaving}><Check size={15} /> {isSaving ? 'Saving...' : editing ? 'Save changes' : 'Save category'}</button>
          </div>
        </form>
      </section>
    </div>, document.body)}
    {error && !formOpen && <p className="form-error" role="alert">{error}</p>}
    <div className="category-summary">
      <span><Tag size={16} /> <strong>{categories.length}</strong> categories</span>
      <span><i className="account-status is-active" /> {categories.filter((category) => category.is_active).length} active</span>
      <span><i className="account-status" /> {categories.filter((category) => !category.is_active).length} paused</span>
    </div>
    <section className="category-list">
      {categories.map((category, index) => {
        const count = reports.filter((report) => Number(report.category_id) === Number(category.id)).length
        const categoryIcon = getCategoryIcon(category.name)
        return <article className={`category-card ${!category.is_active ? 'category-inactive' : ''}`} key={category.id}>
          <span className={`category-glyph glyph-${index + 1} category-color-${getCategoryColor(category.name)}`} aria-hidden="true">{categoryIcon ? <img src={categoryIcon} alt="" /> : ['↗', '♲', '⌁', '✳', '◈', '＋'][index % 6]}</span>
          <div className="category-info">
            <div><h2>{category.name}</h2>{!category.is_active && <span className="paused-chip">Paused</span>}</div>
            <p>{category.description || 'No description provided.'}</p>
            <small>{count} {count === 1 ? 'report' : 'reports'} filed</small>
          </div>
          <div className="category-controls">
            <button className="icon-button" type="button" aria-label={`Edit ${category.name}`} onClick={() => startEdit(category)}><Pencil size={15} /></button>
            <button className={`switch-control ${category.is_active ? 'switch-on' : ''}`} type="button" role="switch" aria-checked={category.is_active} aria-label={`${category.is_active ? 'Pause' : 'Activate'} ${category.name}`} onClick={() => void toggle(category)}><i /></button>
            <button className="icon-button" type="button" aria-label={count > 0 ? `Cannot delete ${category.name}; used by ${count} reports` : `Delete ${category.name}`} title={count > 0 ? 'Categories used by reports cannot be deleted. Pause this category instead.' : `Delete ${category.name}`} disabled={count > 0} onClick={() => void remove(category)}><Trash2 size={15} /></button>
          </div>
        </article>
      })}
      {categories.length === 0 && <p className="empty-state">No categories have been created yet.</p>}
    </section>
    <p className="category-footnote">Categories used by existing reports cannot be deleted. Pause them to hide them from new reports.</p>
    {deleteCandidate && createPortal(<div className="modal-backdrop delete-confirm-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !isDeleting) setDeleteCandidate(null)
    }}>
      <section className="delete-confirm-modal" role="alertdialog" aria-modal="true" aria-labelledby="delete-category-title" aria-describedby="delete-category-description">
        <span className="delete-confirm-icon"><AlertTriangle size={22} /></span>
        <h2 id="delete-category-title">Delete this category?</h2>
        <p id="delete-category-description">“{deleteCandidate.name}” will be permanently deleted. This action cannot be undone.</p>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="delete-confirm-actions">
          <button type="button" className="button button-quiet" onClick={() => setDeleteCandidate(null)} disabled={isDeleting}>Cancel</button>
          <button type="button" className="button button-delete" onClick={() => void confirmDelete()} disabled={isDeleting}>{isDeleting ? 'Deleting...' : 'Delete category'}</button>
        </div>
      </section>
    </div>, document.body)}
  </div>
}
