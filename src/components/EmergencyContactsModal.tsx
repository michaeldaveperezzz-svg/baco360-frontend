import { useEffect, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { Plus, Trash2, X } from 'lucide-react'
import type { UserRole } from '../data/types'
import type { Language } from '../i18n'
import { emergencyContactsService, type EmergencyContact, type EmergencyContactInput } from '../services/emergencyContacts.service'

type ContactField = keyof EmergencyContactInput
type ContactDraft = { name: string; description: string; phone_number: string }

const emptyContact: ContactDraft = { name: '', description: '', phone_number: '' }

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message
  }
  return 'Emergency contacts could not be updated.'
}

export default function EmergencyContactsModal({ role, language, onClose }: {
  role: UserRole
  language: Language
  onClose: () => void
}) {
  const isAdmin = role === 'admin'
  const [contacts, setContacts] = useState<EmergencyContact[]>([])
  const [savedContacts, setSavedContacts] = useState<EmergencyContact[]>([])
  const [newContact, setNewContact] = useState<ContactDraft>(emptyContact)
  const [isLoading, setIsLoading] = useState(true)
  const [savingContactId, setSavingContactId] = useState<number | null>(null)
  const [deletingContactId, setDeletingContactId] = useState<number | null>(null)
  const [confirmingDeleteContactId, setConfirmingDeleteContactId] = useState<number | null>(null)
  const [isAddingContact, setIsAddingContact] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const isSaving = savingContactId !== null || deletingContactId !== null || isAddingContact

  useEffect(() => {
    let active = true
    emergencyContactsService.getContacts().then((response) => {
      if (!response.success || !response.data) {
        throw new Error(response.message || 'Emergency contacts could not be loaded.')
      }
      if (!active) return
      setContacts(response.data.contacts)
      setSavedContacts(response.data.contacts)
    }).catch((loadError: unknown) => {
      if (active) setError(getErrorMessage(loadError))
    }).finally(() => {
      if (active) setIsLoading(false)
    })
    return () => { active = false }
  }, [])

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previousOverflow }
  }, [])

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSaving) onClose()
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [isSaving, onClose])

  function showError(saveError: unknown) {
    setError(getErrorMessage(saveError))
    setNotice(null)
  }

  function updateContactField(id: number, field: ContactField, value: string) {
    setContacts((current) => current.map((contact) => contact.id === id
      ? { ...contact, [field]: value }
      : contact))
    setError(null)
    setNotice(null)
  }

  function hasContactChanges(contact: EmergencyContact) {
    const saved = savedContacts.find((item) => item.id === contact.id)
    return Boolean(saved && (
      contact.name !== saved.name
      || (contact.description ?? '') !== (saved.description ?? '')
      || contact.phone_number !== saved.phone_number
    ))
  }

  async function saveContact(event: FormEvent<HTMLFormElement>, contact: EmergencyContact) {
    event.preventDefault()
    if (!isAdmin || savingContactId !== null || isAddingContact) return
    setSavingContactId(contact.id)
    setError(null)
    setNotice(null)
    try {
      const input: EmergencyContactInput = {
        name: contact.name.trim(),
        description: contact.description?.trim() || null,
        phone_number: contact.phone_number.trim(),
      }
      const response = await emergencyContactsService.updateContact(contact.id, input)
      if (!response.success || !response.data) {
        throw new Error(response.message || 'Emergency contact could not be saved.')
      }
      const updatedContact = response.data.contact
      setContacts((current) => current.map((item) => item.id === updatedContact.id ? updatedContact : item))
      setSavedContacts((current) => current.map((item) => item.id === updatedContact.id ? updatedContact : item))
      setNotice(response.message || (language === 'tl' ? 'Na-save ang contact.' : 'Contact saved.'))
    } catch (saveError) {
      showError(saveError)
    } finally {
      setSavingContactId(null)
    }
  }

  function cancelContactChanges(contactId: number) {
    const saved = savedContacts.find((item) => item.id === contactId)
    if (saved) setContacts((current) => current.map((item) => item.id === contactId ? saved : item))
    setError(null)
    setNotice(null)
  }

  async function addContact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!isAdmin || isAddingContact || savingContactId !== null) return
    setIsAddingContact(true)
    setError(null)
    setNotice(null)
    try {
      const input: EmergencyContactInput = {
        name: newContact.name.trim(),
        description: newContact.description.trim() || null,
        phone_number: newContact.phone_number.trim(),
      }
      const response = await emergencyContactsService.createContact(input)
      if (!response.success || !response.data) {
        throw new Error(response.message || 'Emergency contact could not be added.')
      }
      setContacts((current) => [...current, response.data.contact])
      setSavedContacts((current) => [...current, response.data.contact])
      setNewContact(emptyContact)
      setNotice(response.message || (language === 'tl' ? 'Naidagdag ang contact.' : 'Contact added.'))
    } catch (addError) {
      showError(addError)
    } finally {
      setIsAddingContact(false)
    }
  }

  async function deleteContact(contactId: number) {
    if (!isAdmin || deletingContactId !== null) return
    setDeletingContactId(contactId)
    setError(null)
    setNotice(null)
    try {
      const response = await emergencyContactsService.deleteContact(contactId)
      if (!response.success) {
        throw new Error(response.message || 'Emergency contact could not be deleted.')
      }
      setContacts((current) => current.filter((contact) => contact.id !== contactId))
      setSavedContacts((current) => current.filter((contact) => contact.id !== contactId))
      setConfirmingDeleteContactId(null)
      setNotice(response.message || (language === 'tl' ? 'Nabura ang contact.' : 'Contact deleted.'))
    } catch (deleteError) {
      showError(deleteError)
    } finally {
      setDeletingContactId(null)
    }
  }

  return createPortal(<div className="emergency-contacts-backdrop" role="presentation" onMouseDown={(event) => {
    if (event.target === event.currentTarget && !isSaving) onClose()
  }}>
    <section className="emergency-contacts-modal" role="dialog" aria-modal="true" aria-labelledby="emergency-contacts-title">
      <header>
        <div><span className="eyebrow">{language === 'tl' ? 'TULONG PARA SA BACO' : 'BACO EMERGENCY HELP'}</span><h2 id="emergency-contacts-title">{isAdmin ? (language === 'tl' ? 'Pamahalaan ang mga hotline' : 'Manage emergency contacts') : (language === 'tl' ? 'Mga emergency contact sa Baco' : 'Baco emergency contacts')}</h2></div>
        <button className="icon-button" type="button" aria-label={language === 'tl' ? 'Isara ang emergency contacts' : 'Close emergency contacts'} onClick={onClose} disabled={isSaving}><X size={19} /></button>
      </header>
      <div className="emergency-contacts-modal-body">
      <p>{language === 'tl' ? 'Kung may emergency sa Baco, tawagan ang naaangkop na hotline o ang Munisipyo at ibigay ang barangay at eksaktong lokasyon.' : 'For emergencies in Baco, call the appropriate hotline or municipal office and provide your barangay and exact location.'}</p>
      {isLoading && <p role="status">{language === 'tl' ? 'Kinukuha ang mga numero…' : 'Loading phone numbers…'}</p>}
      {error && <p className="emergency-contacts-error" role="alert">{error}</p>}
      {notice && <p className="emergency-contacts-notice" role="status">{notice}</p>}
      {!isLoading && <>
        {isAdmin ? contacts.map((contact) => <form className="emergency-contact-editor" key={contact.id} onSubmit={(event) => void saveContact(event, contact)}>
          <label><span>{language === 'tl' ? 'Pangalan' : 'Contact name'}</span><input type="text" maxLength={120} required value={contact.name} onChange={(event) => updateContactField(contact.id, 'name', event.target.value)} disabled={isSaving} /></label>
          <label><span>{language === 'tl' ? 'Paglalarawan (opsyonal)' : 'Description (optional)'}</span><input type="text" maxLength={255} value={contact.description ?? ''} onChange={(event) => updateContactField(contact.id, 'description', event.target.value)} disabled={isSaving} /></label>
          <label><span>{language === 'tl' ? 'Numero ng telepono' : 'Phone number'}</span><input type="tel" inputMode="tel" autoComplete="tel" maxLength={50} required value={contact.phone_number} onChange={(event) => updateContactField(contact.id, 'phone_number', event.target.value)} disabled={isSaving} /></label>
          <div className="emergency-contact-editor-actions">
            {confirmingDeleteContactId === contact.id
              ? <div className="emergency-contact-delete-confirm"><span>{language === 'tl' ? 'Burahin ang contact na ito?' : 'Delete this contact?'}</span><button className="button button-quiet button-small" type="button" onClick={() => setConfirmingDeleteContactId(null)} disabled={isSaving}>{language === 'tl' ? 'Kanselahin' : 'Cancel'}</button><button className="button button-delete button-small" type="button" onClick={() => void deleteContact(contact.id)} disabled={isSaving}>{deletingContactId === contact.id ? (language === 'tl' ? 'Binubura…' : 'Deleting…') : (language === 'tl' ? 'Burahin' : 'Delete')}</button></div>
              : <button className="button button-quiet button-small" type="button" onClick={() => setConfirmingDeleteContactId(contact.id)} disabled={isSaving}><Trash2 size={13} />{language === 'tl' ? 'Burahin' : 'Delete'}</button>}
            {hasContactChanges(contact) && <button className="button button-quiet button-small" type="button" onClick={() => cancelContactChanges(contact.id)} disabled={isSaving}>{language === 'tl' ? 'Kanselahin' : 'Cancel'}</button>}
            <button className="button button-primary button-small" type="submit" disabled={!hasContactChanges(contact) || isSaving}>{savingContactId === contact.id ? (language === 'tl' ? 'Sine-save…' : 'Saving…') : (language === 'tl' ? 'I-save' : 'Save')}</button>
          </div>
        </form>) : contacts.map((contact) => <a className="emergency-contact-link" href={`tel:${contact.phone_number.replace(/[^\d+]/g, '')}`} key={contact.id}>
          <span><strong>{contact.name}</strong>{contact.description && <small>{contact.description}</small>}</span><b>{contact.phone_number}</b>
        </a>)}
        {contacts.length === 0 && <p className="emergency-contacts-empty">{language === 'tl' ? 'Wala pang nailalagay na emergency contact.' : 'No emergency contacts have been added.'}</p>}
        {isAdmin && <form className="emergency-contact-editor emergency-contact-add-form" onSubmit={(event) => void addContact(event)}>
          <h3>{language === 'tl' ? 'Magdagdag ng contact' : 'Add a contact'}</h3>
          <label><span>{language === 'tl' ? 'Pangalan' : 'Contact name'}</span><input type="text" maxLength={120} required value={newContact.name} onChange={(event) => setNewContact((current) => ({ ...current, name: event.target.value }))} disabled={isSaving} /></label>
          <label><span>{language === 'tl' ? 'Paglalarawan (opsyonal)' : 'Description (optional)'}</span><input type="text" maxLength={255} value={newContact.description} onChange={(event) => setNewContact((current) => ({ ...current, description: event.target.value }))} disabled={isSaving} /></label>
          <label><span>{language === 'tl' ? 'Numero ng telepono' : 'Phone number'}</span><input type="tel" inputMode="tel" autoComplete="tel" maxLength={50} required value={newContact.phone_number} onChange={(event) => setNewContact((current) => ({ ...current, phone_number: event.target.value }))} disabled={isSaving} /></label>
          <div className="emergency-contact-editor-actions"><button className="button button-primary button-small" type="submit" disabled={isSaving}><Plus size={14} />{isAddingContact ? (language === 'tl' ? 'Idinadagdag…' : 'Adding…') : (language === 'tl' ? 'Idagdag ang contact' : 'Add contact')}</button></div>
        </form>}
      </>}
      {!isAdmin && <small className="emergency-contacts-note">{language === 'tl' ? 'Maaaring mag-iba ang availability depende sa lugar at network.' : 'Availability may vary by location and network.'}</small>}
      </div>
    </section>
  </div>, document.body)
}
