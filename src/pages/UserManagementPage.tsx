import { useMemo, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { Pencil, Plus, Search, ShieldCheck, Trash2, UserRound, X } from 'lucide-react'
import type { User, UserRole } from '../data/types'
import type { CreateUserData, UpdateUserData } from '../services/user.service'
import { PageIntro } from '../components/Common'
import ProfilePhoto from '../components/ProfilePhoto'

interface Props {
  users: User[]
  currentUserId: number
  initialQuery?: string
  onCreate: (data: CreateUserData) => Promise<void>
  onUpdate: (userId: number, data: UpdateUserData) => Promise<void>
  onDelete: (userId: number) => Promise<void>
  onToggleActive: (userId: number) => Promise<void>
  onRoleChange: (userId: number, role: UserRole) => Promise<void>
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return 'The user could not be saved. Please try again.'
}

export default function UserManagementPage({ users, currentUserId, initialQuery = '', onCreate, onUpdate, onDelete, onToggleActive, onRoleChange }: Props) {
  const [query, setQuery] = useState(initialQuery)
  const [roleFilter, setRoleFilter] = useState('all')
  const [editing, setEditing] = useState<User | null>(null)
  const [adding, setAdding] = useState(false)
  const [deleteCandidate, setDeleteCandidate] = useState<User | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<UserRole>('resident')
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const visibleUsers = useMemo(() => users.filter((user) => Number(user.id) !== Number(currentUserId)), [users, currentUserId])
  const filtered = useMemo(
    () => visibleUsers.filter((user) => (roleFilter === 'all' || user.role === roleFilter)
      && `${user.name} ${user.email}`.toLowerCase().includes(query.toLowerCase())),
    [visibleUsers, roleFilter, query],
  )

  function resetForm() {
    setAdding(false)
    setEditing(null)
    setName('')
    setEmail('')
    setPhone('')
    setPassword('')
    setRole('resident')
    setError(null)
  }

  function startEdit(user: User) {
    setEditing(user)
    setAdding(false)
    setName(user.name)
    setEmail(user.email)
    setPhone(user.phone ?? '')
    setPassword('')
    setRole(user.role)
    setError(null)
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setIsSaving(true)
    try {
      if (editing) {
        const changes: UpdateUserData = { name: name.trim(), email: email.trim(), phone: phone.trim(), role }
        if (password) changes.password = password
        await onUpdate(editing.id, changes)
      } else {
        await onCreate({ name: name.trim(), email: email.trim(), phone: phone.trim(), password, role })
      }
      resetForm()
    } catch (submitError) {
      setError(getErrorMessage(submitError))
    } finally {
      setIsSaving(false)
    }
  }

  async function remove(user: User) {
    setDeleteCandidate(user)
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

  async function toggleActive(user: User) {
    setError(null)
    try {
      await onToggleActive(user.id)
    } catch (toggleError) {
      setError(getErrorMessage(toggleError))
    }
  }

  async function changeRole(userId: number, nextRole: UserRole) {
    setError(null)
    try {
      await onRoleChange(userId, nextRole)
    } catch (roleError) {
      setError(getErrorMessage(roleError))
    }
  }

  const formOpen = adding || editing !== null

  return <div className="page-content">
    <PageIntro eyebrow="ADMINISTRATION / USERS" title="User management" description="Manage account access and the roles that shape each workspace." action={<button className="button button-primary" type="button" onClick={() => { resetForm(); setAdding(true) }}><Plus size={16} /> Add user</button>} />
    {formOpen && createPortal(<div className="modal-backdrop user-form-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !isSaving) resetForm()
    }}>
      <section className="user-form-modal" role="dialog" aria-modal="true" aria-labelledby="user-form-title">
        <div className="user-form-header">
          <div><span className="eyebrow">ADMINISTRATION / USERS</span><h2 id="user-form-title">{editing ? 'Edit user information' : 'Create user account'}</h2></div>
          <button className="icon-button" type="button" aria-label="Close user form" onClick={resetForm} disabled={isSaving}><X size={19} /></button>
        </div>
        <form className="user-edit-form" onSubmit={submit}>
          <label className="field-label">Full name<input required maxLength={150} value={name} onChange={(event) => setName(event.target.value)} disabled={isSaving} /></label>
          <label className="field-label">Email address<input required type="email" maxLength={150} value={email} onChange={(event) => setEmail(event.target.value)} disabled={isSaving} /></label>
          <label className="field-label">Phone<input maxLength={30} value={phone} onChange={(event) => setPhone(event.target.value)} disabled={isSaving} /></label>
          <label className="field-label">Role<select value={role} onChange={(event) => setRole(event.target.value as UserRole)} disabled={isSaving}><option value="resident">Resident</option><option value="staff">Staff</option><option value="admin">Admin</option></select></label>
          <label className="field-label">{editing ? 'New password (optional)' : 'Password'}<input required={!editing} type="password" minLength={8} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} disabled={isSaving} /></label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="user-form-actions">
            <button className="button button-quiet" type="button" disabled={isSaving} onClick={resetForm}>Cancel</button>
            <button className="button button-primary" type="submit" disabled={isSaving}>{isSaving ? 'Saving...' : editing ? 'Save changes' : 'Create user'}</button>
          </div>
        </form>
      </section>
    </div>, document.body)}
    {error && !formOpen && <p className="form-error" role="alert">{error}</p>}
    <section className="management-toolbar">
      <div className="workspace-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name or email" /></div>
      <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)} aria-label="Filter users by role"><option value="all">All roles</option><option value="resident">Residents</option><option value="staff">Staff</option><option value="admin">Administrators</option></select>
      <span className="button button-outline"><ShieldCheck size={15} /> Access policy</span>
    </section>
    <section className="management-table-wrap">
      <div className="management-table users-table">
        <div className="management-table-head"><span>USER</span><span>ROLE</span><span>STATUS</span><span>EMAIL VERIFIED</span><span>ACCOUNT</span></div>
        {filtered.map((user) => <div className="management-row" key={user.id}>
          <span className="user-cell"><ProfilePhoto user={user} name={user.name} className={`user-avatar avatar-${user.role}`} /><span><strong>{user.name}</strong><small>{user.email}</small></span></span>
          <span><select className="role-select" aria-label={`Role for ${user.name}`} value={user.role} onChange={(event) => void changeRole(user.id, event.target.value as UserRole)}><option value="resident">Resident</option><option value="staff">Staff</option><option value="admin">Admin</option></select></span>
          <span><i className={`account-status ${user.is_active ? 'is-active' : ''}`} />{user.is_active ? 'Active' : 'Inactive'}</span>
          <span>{user.email_verified_at ? <span className="verified-label"><ShieldCheck size={14} /> Verified</span> : <span className="not-verified">Pending</span>}</span>
          <span className="user-account-actions">
            <button className="icon-button" type="button" aria-label={`Edit ${user.name}`} onClick={() => startEdit(user)}><Pencil size={14} /></button>
            <button className={`text-button account-toggle ${user.is_active ? 'deactivate' : 'activate'}`} type="button" onClick={() => void toggleActive(user)}>{user.is_active ? 'Deactivate' : 'Reactivate'}</button>
            <button className="icon-button" type="button" aria-label={`Delete ${user.name}`} onClick={() => void remove(user)}><Trash2 size={14} /></button>
          </span>
        </div>)}
        {filtered.length === 0 && <div className="empty-state">No accounts match your search.</div>}
      </div>
      <div className="table-footer"><span>Showing <strong>{filtered.length}</strong> of {visibleUsers.length} accounts</span><span>Roles and access changes are written to the audit log.</span></div>
    </section>
    <div className="management-note"><UserRound size={17} /><p><strong>Role changes take effect immediately.</strong> Deactivated users cannot sign in, but existing reports and audit records remain available. Accounts linked to existing records must be deactivated rather than deleted.</p></div>
    {deleteCandidate && createPortal(<div className="modal-backdrop delete-confirm-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !isDeleting) setDeleteCandidate(null)
    }}>
      <section className="delete-confirm-modal" role="alertdialog" aria-modal="true" aria-labelledby="delete-user-title" aria-describedby="delete-user-description">
        <span className="delete-confirm-icon"><Trash2 size={22} /></span>
        <h2 id="delete-user-title">Delete this account?</h2>
        <p id="delete-user-description">Delete {deleteCandidate.name}'s account? Accounts with reports or comments must be deactivated instead.</p>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="delete-confirm-actions">
          <button type="button" className="button button-quiet" onClick={() => setDeleteCandidate(null)} disabled={isDeleting}>Cancel</button>
          <button type="button" className="button button-delete" onClick={() => void confirmDelete()} disabled={isDeleting}>{isDeleting ? 'Deleting...' : 'Delete account'}</button>
        </div>
      </section>
    </div>, document.body)}
  </div>
}
