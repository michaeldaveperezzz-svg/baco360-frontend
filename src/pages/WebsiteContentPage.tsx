import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { Check, Image, Pencil, Plus, RefreshCw, Save, Trash2, X } from 'lucide-react'
import {
  websiteContentService,
  type WebsiteContentCollection,
  type WebsiteContentData,
  type WebsiteContentItem,
  type WebsiteContentItemInput,
  type WebsiteContentSection,
  type WebsiteContentSettings,
  websiteContentImageUrl,
} from '../services/websiteContent.service'

type SettingTextKey = Exclude<keyof WebsiteContentSettings, 'maintenance_enabled' | 'updated_at'>
type DraftValue = string | number | boolean | null

interface ContentField {
  key: keyof WebsiteContentItemInput
  label: string
  kind: 'text' | 'textarea' | 'number' | 'datetime' | 'checkbox'
  required?: boolean
  maxLength?: number
  placeholder?: string
}

const collectionInfo: Record<WebsiteContentCollection, { title: string; description: string; fields: ContentField[] }> = {
  competencies: {
    title: 'Competencies',
    description: 'Manage the municipal competencies displayed on the public landing page.',
    fields: [
      { key: 'name', label: 'Name', kind: 'text', required: true, maxLength: 150 },
      { key: 'description', label: 'Description', kind: 'textarea', maxLength: 65535 },
      { key: 'icon_name', label: 'Icon name', kind: 'text', maxLength: 80, placeholder: 'Optional icon identifier' },
      { key: 'sort_order', label: 'Display order', kind: 'number' },
      { key: 'is_active', label: 'Visible on the landing page', kind: 'checkbox' },
    ],
  },
  announcements: {
    title: 'Landing page announcements',
    description: 'These public notices are separate from in-app resident and staff announcements.',
    fields: [
      { key: 'title', label: 'Title', kind: 'text', required: true, maxLength: 255 },
      { key: 'message', label: 'Message', kind: 'textarea', required: true, maxLength: 65535 },
      { key: 'image_path', label: 'Image path', kind: 'text', maxLength: 500, placeholder: 'Optional uploaded image path' },
      { key: 'starts_at', label: 'Starts at', kind: 'datetime' },
      { key: 'ends_at', label: 'Ends at', kind: 'datetime' },
      { key: 'sort_order', label: 'Display order', kind: 'number' },
      { key: 'is_active', label: 'Visible on the landing page', kind: 'checkbox' },
    ],
  },
  gallery: {
    title: 'Gallery and images',
    description: 'Manage the photos and captions displayed in the landing page gallery.',
    fields: [
      { key: 'image_path', label: 'Image path', kind: 'text', required: true, maxLength: 500, placeholder: 'Enter the image path' },
      { key: 'alt_text', label: 'Alternative text', kind: 'text', maxLength: 255 },
      { key: 'caption', label: 'Caption', kind: 'textarea', maxLength: 65535 },
      { key: 'sort_order', label: 'Display order', kind: 'number' },
      { key: 'is_active', label: 'Visible on the landing page', kind: 'checkbox' },
    ],
  },
  faqs: {
    title: 'Frequently asked questions',
    description: 'Add, edit, order, and hide public questions and answers.',
    fields: [
      { key: 'question', label: 'Question', kind: 'text', required: true, maxLength: 500 },
      { key: 'answer', label: 'Answer', kind: 'textarea', required: true, maxLength: 65535 },
      { key: 'sort_order', label: 'Display order', kind: 'number' },
      { key: 'is_active', label: 'Visible on the landing page', kind: 'checkbox' },
    ],
  },
}

const settingGroups: { section: WebsiteContentSection; title: string; fields: { key: SettingTextKey; label: string; kind: 'text' | 'textarea' | 'datetime'; maxLength?: number }[] }[] = [
  {
    section: 'branding',
    title: 'Logo and branding',
    fields: [
      { key: 'site_name', label: 'Website name', kind: 'text', maxLength: 120 },
      { key: 'logo_path', label: 'Logo image path', kind: 'text', maxLength: 500 },
      { key: 'primary_color', label: 'Primary brand color', kind: 'text', maxLength: 7 },
    ],
  },
  {
    section: 'hero',
    title: 'Landing page hero',
    fields: [
      { key: 'hero_title', label: 'Hero title', kind: 'text', maxLength: 255 },
      { key: 'hero_description', label: 'Hero description', kind: 'textarea', maxLength: 65535 },
      { key: 'hero_image_path', label: 'Hero image path', kind: 'text', maxLength: 500 },
    ],
  },
  {
    section: 'about',
    title: 'About section',
    fields: [
      { key: 'about_title', label: 'About title', kind: 'text', maxLength: 255 },
      { key: 'about_content', label: 'About content', kind: 'textarea', maxLength: 65535 },
    ],
  },
  {
    section: 'contact',
    title: 'Contact information',
    fields: [
      { key: 'contact_email', label: 'Contact email', kind: 'text', maxLength: 254 },
      { key: 'contact_phone', label: 'Contact phone', kind: 'text', maxLength: 50 },
      { key: 'contact_address', label: 'Contact address', kind: 'textarea', maxLength: 65535 },
    ],
  },
  {
    section: 'footer',
    title: 'Footer',
    fields: [
      { key: 'footer_text', label: 'Footer text', kind: 'textarea', maxLength: 65535 },
      { key: 'copyright_text', label: 'Copyright text', kind: 'text', maxLength: 255 },
    ],
  },
]

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) return error.message
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') return error.message
  return fallback
}

function asDateTimeInput(value: string | null | undefined): string {
  return value ? value.replace(' ', 'T').slice(0, 16) : ''
}

function displayDateTime(value: string | null | undefined): string {
  return value ? value.replace('T', ' ').slice(0, 16) : ''
}

const websiteSections: { section: WebsiteContentSection; title: string; description: string }[] = [
  { section: 'hero', title: 'Hero Section', description: 'The landing page headline, introduction, and banner image.' },
  { section: 'competencies', title: 'Competencies', description: collectionInfo.competencies.description },
  { section: 'announcements', title: 'Announcements', description: collectionInfo.announcements.description },
  { section: 'maintenance', title: 'Maintenance Banner', description: 'The public banner message and maintenance schedule.' },
  { section: 'gallery', title: 'Gallery & Images', description: collectionInfo.gallery.description },
  { section: 'faqs', title: 'FAQs', description: collectionInfo.faqs.description },
  { section: 'branding', title: 'Logo & Branding', description: 'The site name, logo, and primary brand color.' },
  { section: 'about', title: 'About BACO 360', description: 'The public About section title and content.' },
  { section: 'contact', title: 'Contact Information', description: 'Public email, phone number, and address.' },
  { section: 'footer', title: 'Footer Management', description: 'The footer and copyright text shown on the landing page.' },
]

function collectionForSection(section: WebsiteContentSection): WebsiteContentCollection | null {
  switch (section) {
    case 'competencies':
    case 'announcements':
    case 'gallery':
    case 'faqs':
      return section
    default:
      return null
  }
}

function itemHeading(item: WebsiteContentItem): string {
  return item.name || item.title || item.question || item.image_path || 'Untitled item'
}

function itemSummary(item: WebsiteContentItem): string {
  return item.description || item.message || item.caption || item.answer || item.alt_text || ''
}

function newItemDraft(collection: WebsiteContentCollection): WebsiteContentItemInput {
  switch (collection) {
    case 'competencies': return { name: '', description: '', icon_name: '', sort_order: 0, is_active: true }
    case 'announcements': return { title: '', message: '', image_path: '', starts_at: '', ends_at: '', sort_order: 0, is_active: true }
    case 'gallery': return { image_path: '', alt_text: '', caption: '', sort_order: 0, is_active: true }
    case 'faqs': return { question: '', answer: '', sort_order: 0, is_active: true }
  }
}

function ImagePathField({
  label,
  value,
  disabled,
  onChange,
  onUploadingChange,
}: {
  label: string
  value: string
  disabled: boolean
  onChange: (path: string) => void
  onUploadingChange: (uploading: boolean) => void
}) {
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setError(null)
    setNotice(null)
    if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
      setError('Choose a JPG, PNG, GIF, or WebP image.')
      return
    }
    if (file.size < 1 || file.size > 5 * 1024 * 1024) {
      setError('Image files must be no larger than 5 MB.')
      return
    }

    setIsUploading(true)
    onUploadingChange(true)
    try {
      const response = await websiteContentService.uploadImage(file)
      if (!response.success || !response.data?.path) {
        throw new Error(response.message || 'Image upload failed.')
      }
      onChange(response.data.path)
      setNotice('Image uploaded. Save the content section to publish this path.')
    } catch (uploadError) {
      setError(getErrorMessage(uploadError, 'Image upload failed.'))
    } finally {
      setIsUploading(false)
      onUploadingChange(false)
    }
  }

  return <div className="website-image-field">
    <label className="field-label">{label}<input type="text" value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled || isUploading} maxLength={500} /></label>
    <label className={`website-image-picker ${disabled || isUploading ? 'is-disabled' : ''}`}>
      <Image size={14} />{isUploading ? 'Uploading image…' : 'Choose image'}
      <input type="file" accept="image/jpeg,image/png,image/gif,image/webp" onChange={(event) => void upload(event)} disabled={disabled || isUploading} />
    </label>
    {value && <img className="website-image-preview" src={websiteContentImageUrl(value)} alt={`${label} preview`} />}
    {notice && <p className="website-image-feedback" role="status">{notice}</p>}
    {error && <p className="website-image-error" role="alert">{error}</p>}
  </div>
}

function itemDraft(item: WebsiteContentItem): WebsiteContentItemInput {
  const { id: _id, created_at: _createdAt, updated_at: _updatedAt, ...draft } = item
  return {
    ...draft,
    starts_at: asDateTimeInput(item.starts_at),
    ends_at: asDateTimeInput(item.ends_at),
  }
}

export default function WebsiteContentPage({ onClose }: { onClose: () => void }) {
  const [content, setContent] = useState<WebsiteContentData | null>(null)
  const [modalSection, setModalSection] = useState<WebsiteContentSection | null>(null)
  const [settings, setSettings] = useState<WebsiteContentSettings | null>(null)
  const [editingItem, setEditingItem] = useState<WebsiteContentItem | null>(null)
  const [isAddingItem, setIsAddingItem] = useState(false)
  const [draft, setDraft] = useState<WebsiteContentItemInput>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [uploadCount, setUploadCount] = useState(0)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    void loadContent()
  }, [])

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previousOverflow }
  }, [])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape' || isSaving || uploadCount > 0) return
      if (modalSection) {
        setModalSection(null)
        setEditingItem(null)
        setIsAddingItem(false)
        setDraft({})
        setError(null)
        setNotice(null)
        return
      }
      onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [modalSection, isSaving, uploadCount, onClose])

  async function loadContent(showLoading = true) {
    if (showLoading) setIsLoading(true)
    setError(null)
    try {
      const response = await websiteContentService.getAdminContent()
      if (!response.success || !response.data) {
        throw new Error(response.message || 'Website content could not be loaded.')
      }
      setContent(response.data)
      setSettings(response.data.settings)
    } catch (loadError) {
      setError(getErrorMessage(loadError, 'Website content could not be loaded.'))
    } finally {
      if (showLoading) setIsLoading(false)
    }
  }

  function setSetting<K extends SettingTextKey>(key: K, value: WebsiteContentSettings[K]) {
    setSettings((current) => current ? { ...current, [key]: value } : current)
  }

  function startAddingItem() {
    if (!modalSection) return
    const collection = collectionForSection(modalSection)
    if (!collection) return
    setEditingItem(null)
    setDraft(newItemDraft(collection))
    setIsAddingItem(true)
    setError(null)
    setNotice(null)
  }

  function startEditingItem(item: WebsiteContentItem) {
    setEditingItem(item)
    setDraft(itemDraft(item))
    setIsAddingItem(false)
    setError(null)
    setNotice(null)
  }

  function cancelItemEdit() {
    setEditingItem(null)
    setIsAddingItem(false)
    setDraft({})
  }

  function closeContentModal() {
    if (isSaving || uploadCount > 0) return
    setModalSection(null)
    cancelItemEdit()
    setError(null)
    setNotice(null)
  }

  function closeWebsiteSettings() {
    if (modalSection || isSaving || uploadCount > 0) return
    onClose()
  }

  async function saveSettings(event: FormEvent<HTMLFormElement>, section: WebsiteContentSection) {
    event.preventDefault()
    if (!settings || isSaving) return
    setIsSaving(true)
    setError(null)
    setNotice(null)
    const settingsToSave: Partial<WebsiteContentSettings> = {}
    if (section === 'maintenance') settingsToSave.maintenance_enabled = settings.maintenance_enabled
    const settingGroup = settingGroups.find((group) => group.section === section)
    if (settingGroup) {
      Object.assign(settingsToSave, Object.fromEntries(settingGroup.fields.map(({ key }) => [key, settings[key]])))
    }
    try {
      const response = await websiteContentService.updateSettings(settingsToSave)
      if (!response.success || !response.data) throw new Error(response.message || 'Website settings could not be saved.')
      setSettings(response.data.settings)
      setNotice(response.message || 'Website settings saved.')
    } catch (saveError) {
      setError(getErrorMessage(saveError, 'Website settings could not be saved.'))
    } finally {
      setIsSaving(false)
    }
  }

  function setDraftField(key: keyof WebsiteContentItemInput, value: DraftValue) {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  function changeUploadCount(uploading: boolean) {
    setUploadCount((count) => Math.max(0, count + (uploading ? 1 : -1)))
  }

  async function saveItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const collection = modalSection ? collectionForSection(modalSection) : null
    if (!collection || isSaving) return
    setIsSaving(true)
    setError(null)
    setNotice(null)
    const itemToSave = { ...draft }
    if ('starts_at' in itemToSave) itemToSave.starts_at = itemToSave.starts_at ? displayDateTime(String(itemToSave.starts_at)) : null
    if ('ends_at' in itemToSave) itemToSave.ends_at = itemToSave.ends_at ? displayDateTime(String(itemToSave.ends_at)) : null
    try {
      const response = editingItem
        ? await websiteContentService.updateItem(collection, editingItem.id, itemToSave)
        : await websiteContentService.createItem(collection, itemToSave)
      if (!response.success || !response.data) throw new Error(response.message || 'Website content item could not be saved.')
      setNotice(response.message || 'Website content item saved.')
      cancelItemEdit()
      await loadContent(false)
    } catch (saveError) {
      setError(getErrorMessage(saveError, 'Website content item could not be saved.'))
    } finally {
      setIsSaving(false)
    }
  }

  async function deleteItem(item: WebsiteContentItem) {
    const collection = modalSection ? collectionForSection(modalSection) : null
    if (!collection || deletingId !== null) return
    if (!window.confirm(`Delete "${itemHeading(item)}" from the website content?`)) return
    setDeletingId(item.id)
    setError(null)
    setNotice(null)
    try {
      const response = await websiteContentService.deleteItem(collection, item.id)
      if (!response.success) throw new Error(response.message || 'Website content item could not be deleted.')
      setNotice(response.message || 'Website content item deleted.')
      await loadContent(false)
    } catch (deleteError) {
      setError(getErrorMessage(deleteError, 'Website content item could not be deleted.'))
    } finally {
      setDeletingId(null)
    }
  }

  const activeCollection = modalSection ? collectionForSection(modalSection) : null
  const activeItems = activeCollection && content ? content[activeCollection] : []
  const activeSectionInfo = modalSection ? websiteSections.find((section) => section.section === modalSection) : null
  const activeSettingGroup = modalSection ? settingGroups.find((group) => group.section === modalSection) : null

  return createPortal(<div className="modal-backdrop website-settings-overview-backdrop" role="presentation" onMouseDown={(event) => {
    if (event.target === event.currentTarget) closeWebsiteSettings()
  }}>
    <section className="website-settings-overview" role="dialog" aria-modal="true" aria-labelledby="website-settings-overview-title">
      <header className="website-settings-overview-header">
        <div><span className="eyebrow">ADMINISTRATION / PUBLIC WEBSITE</span><h2 id="website-settings-overview-title">Website Settings</h2><p>Choose a section to manage the content shown on the public Baco360 landing page.</p></div>
        <div className="website-settings-overview-actions">
          <button className="button button-outline" type="button" onClick={() => void loadContent()} disabled={isLoading || isSaving || uploadCount > 0}><RefreshCw size={15} /> Refresh</button>
          <button className="icon-button" type="button" aria-label="Close Website Settings" onClick={closeWebsiteSettings} disabled={isSaving || uploadCount > 0}><X size={19} /></button>
        </div>
      </header>
      <div className="website-settings-overview-body">
        {isLoading && <p className="empty-state" role="status">Loading website content…</p>}
        {!isLoading && (!content || !settings) && <div className="website-settings-load-error">
          <p className="form-error" role="alert">{error || 'Website content is unavailable.'}</p>
          <button className="button button-outline" type="button" onClick={() => void loadContent()}>Try again</button>
        </div>}
        {content && settings && <>
          {notice && <p className="website-content-notice" role="status">{notice}</p>}
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="website-content-section-grid">
            {websiteSections.map(({ section, title, description }) => {
              const collection = collectionForSection(section)
              const count = collection ? content[collection].length : null
              return <button className="website-content-section-card" type="button" key={section} onClick={() => {
                cancelItemEdit()
                setError(null)
                setNotice(null)
                setModalSection(section)
              }}>
                <span>{collection ? 'CONTENT COLLECTION' : 'PAGE SETTINGS'}</span>
                <h2>{title}</h2>
                <p>{description}</p>
                <strong>{count === null ? 'Manage section' : `${count} ${count === 1 ? 'item' : 'items'}`} <span aria-hidden="true">→</span></strong>
              </button>
            })}
          </div>
        </>}
      </div>
    </section>

    {modalSection && activeSectionInfo && content && settings && createPortal(<div className="modal-backdrop website-content-modal-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) closeContentModal()
    }}>
      <section className="website-content-modal" role="dialog" aria-modal="true" aria-labelledby="website-content-modal-title">
        <header className="website-content-modal-header">
          <div><span className="eyebrow">WEBSITE SETTINGS</span><h2 id="website-content-modal-title">{activeSectionInfo.title}</h2><p>{activeSectionInfo.description}</p></div>
          <button className="icon-button" type="button" aria-label={`Close ${activeSectionInfo.title}`} onClick={closeContentModal} disabled={isSaving || uploadCount > 0}><X size={19} /></button>
        </header>
        <div className="website-content-modal-body">
          {notice && <p className="website-content-notice" role="status">{notice}</p>}
          {error && <p className="form-error" role="alert">{error}</p>}

          {!activeCollection && <form className="website-content-settings" onSubmit={(event) => void saveSettings(event, modalSection)}>
            {modalSection === 'maintenance' && <label className="website-maintenance-switch">
              <input type="checkbox" checked={settings.maintenance_enabled} onChange={(event) => setSettings((current) => current ? { ...current, maintenance_enabled: event.target.checked } : current)} disabled={isSaving} />
              <span><strong>Show maintenance banner</strong><small>Visitors will see this banner while it is enabled and within its schedule.</small></span>
            </label>}
            {activeSettingGroup && <fieldset className="website-content-fieldset">
              <legend>{activeSettingGroup.title}</legend>
              <div className="website-content-fields">
                {activeSettingGroup.fields.map(({ key, label, kind, maxLength }) => {
                  const value = settings[key]
                  const inputValue = kind === 'datetime' ? asDateTimeInput(value) : value ?? ''
                  if (key === 'logo_path' || key === 'hero_image_path') {
                    return <ImagePathField
                      key={key}
                      label={label}
                      value={inputValue}
                      disabled={isSaving}
                      onChange={(path) => setSetting(key, path)}
                      onUploadingChange={changeUploadCount}
                    />
                  }
                  return <label className={`field-label ${kind === 'textarea' ? 'website-content-wide' : ''}`} key={key}>
                    {label}
                    {kind === 'textarea'
                      ? <textarea maxLength={maxLength} value={inputValue} onChange={(event) => setSetting(key, event.target.value)} disabled={isSaving} />
                      : <input type={kind === 'datetime' ? 'datetime-local' : 'text'} maxLength={maxLength} value={inputValue} onChange={(event) => setSetting(key, event.target.value)} disabled={isSaving} />}
                  </label>
                })}
              </div>
            </fieldset>}
            {modalSection === 'maintenance' && <fieldset className="website-content-fieldset">
              <legend>Maintenance banner</legend>
              <div className="website-content-fields">
                <label className="field-label website-content-wide">Banner message<textarea maxLength={500} value={settings.maintenance_message ?? ''} onChange={(event) => setSetting('maintenance_message', event.target.value)} disabled={isSaving} /></label>
                <label className="field-label">Starts at<input type="datetime-local" value={asDateTimeInput(settings.maintenance_starts_at)} onChange={(event) => setSetting('maintenance_starts_at', event.target.value)} disabled={isSaving} /></label>
                <label className="field-label">Ends at<input type="datetime-local" value={asDateTimeInput(settings.maintenance_ends_at)} onChange={(event) => setSetting('maintenance_ends_at', event.target.value)} disabled={isSaving} /></label>
              </div>
            </fieldset>}
            <div className="website-content-form-actions">
              <span>Changes appear on the public page after saving.</span>
              <button className="button button-primary" type="submit" disabled={isSaving || uploadCount > 0}><Save size={15} />{isSaving ? 'Saving…' : 'Save changes'}</button>
            </div>
          </form>}

          {activeCollection && <section className="website-content-collection">
            <div className="website-content-collection-heading">
              <div><h2>{collectionInfo[activeCollection].title}</h2><p>{collectionInfo[activeCollection].description}</p></div>
              <button className="button button-primary" type="button" onClick={startAddingItem} disabled={isSaving || uploadCount > 0}><Plus size={15} /> Add item</button>
            </div>

            {(isAddingItem || editingItem) && <form className="website-content-item-form" onSubmit={(event) => void saveItem(event)}>
              <div className="website-content-item-form-heading">
                <h3>{editingItem ? 'Edit content item' : 'Add content item'}</h3>
                <button className="icon-button" type="button" aria-label="Cancel item edit" onClick={cancelItemEdit} disabled={isSaving || uploadCount > 0}><X size={17} /></button>
              </div>
              <div className="website-content-fields">
                {collectionInfo[activeCollection].fields.map((field) => {
                  if (field.kind === 'checkbox') {
                    return <label className="website-content-checkbox" key={field.key}>
                      <input type="checkbox" checked={Boolean(draft[field.key])} onChange={(event) => setDraftField(field.key, event.target.checked)} disabled={isSaving} />
                      {field.label}
                    </label>
                  }
                  if (field.key === 'image_path') {
                    const imagePath = typeof draft.image_path === 'string' ? draft.image_path : ''
                    return <ImagePathField
                      key={field.key}
                      label={field.label}
                      value={imagePath}
                      disabled={isSaving}
                      onChange={(path) => setDraftField(field.key, path)}
                      onUploadingChange={changeUploadCount}
                    />
                  }
                  const rawValue = draft[field.key]
                  const value = rawValue === null || rawValue === undefined ? '' : String(rawValue)
                  const inputValue = field.kind === 'datetime' ? asDateTimeInput(value) : value
                  return <label className={`field-label ${field.kind === 'textarea' ? 'website-content-wide' : ''}`} key={field.key}>
                    {field.label}
                    {field.kind === 'textarea'
                      ? <textarea required={field.required} maxLength={field.maxLength} value={inputValue} onChange={(event) => setDraftField(field.key, event.target.value)} disabled={isSaving} />
                      : <input
                          type={field.kind === 'number' ? 'number' : field.kind === 'datetime' ? 'datetime-local' : 'text'}
                          required={field.required}
                          maxLength={field.maxLength}
                          min={field.kind === 'number' ? 0 : undefined}
                          value={inputValue}
                          placeholder={field.placeholder}
                          onChange={(event) => setDraftField(field.key, field.kind === 'number' ? Number(event.target.value) : event.target.value)}
                          disabled={isSaving}
                        />}
                  </label>
                })}
              </div>
              <div className="website-content-form-actions">
                <span>{editingItem ? 'Uploaded images are published when you save these changes.' : 'New content is hidden from the public page until saved and active.'}</span>
                <button className="button button-quiet" type="button" onClick={cancelItemEdit} disabled={isSaving || uploadCount > 0}>Cancel</button>
                <button className="button button-primary" type="submit" disabled={isSaving || uploadCount > 0}><Check size={15} />{isSaving ? 'Saving…' : 'Save item'}</button>
              </div>
            </form>}

            <div className="website-content-item-list">
              {activeItems.map((item) => <article className={`website-content-item ${item.is_active ? '' : 'is-inactive'}`} key={item.id}>
                <div className="website-content-item-copy">
                  <div className="website-content-item-title"><h3>{itemHeading(item)}</h3><span>{item.is_active ? 'Active' : 'Hidden'}</span></div>
                  {itemSummary(item) && <p>{itemSummary(item)}</p>}
                  <small>Order {item.sort_order}{item.starts_at || item.ends_at ? ` · ${item.starts_at || 'Any time'} – ${item.ends_at || 'No end date'}` : ''}</small>
                </div>
                <div className="website-content-item-actions">
                  <button className="icon-button" type="button" aria-label={`Edit ${itemHeading(item)}`} onClick={() => startEditingItem(item)} disabled={isSaving || deletingId !== null}><Pencil size={15} /></button>
                  <button className="icon-button" type="button" aria-label={`Delete ${itemHeading(item)}`} onClick={() => void deleteItem(item)} disabled={isSaving || deletingId !== null}><Trash2 size={15} /></button>
                </div>
              </article>)}
              {activeItems.length === 0 && <p className="empty-state">No items in this section yet.</p>}
            </div>
          </section>}
        </div>
      </section>
    </div>, document.body)}
  </div>, document.body)
}
