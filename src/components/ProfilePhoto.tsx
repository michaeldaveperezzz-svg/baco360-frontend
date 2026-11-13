import { useEffect, useState } from 'react'
import { API_ENDPOINTS } from '../config/api.config'
import type { User } from '../data/types'
import { apiClient, handleApiError } from '../lib/api.client'

interface ProfilePhotoProps {
  user: Pick<User, 'id' | 'profile_photo'>
  name: string
  className: string
  previewUrl?: string | null
}

export default function ProfilePhoto({ user, name, className, previewUrl }: ProfilePhotoProps) {
  const [loadedPhoto, setLoadedPhoto] = useState<{ key: string; url: string } | null>(null)
  const photoKey = user.profile_photo ? `${user.id}:${user.profile_photo}` : ''
  const photoUrl = previewUrl ?? (loadedPhoto?.key === photoKey ? loadedPhoto.url : null)
  const initials = name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0].toLocaleUpperCase()).join('')

  useEffect(() => {
    if (previewUrl || !photoKey) {
      setLoadedPhoto(null)
      return
    }

    const controller = new AbortController()
    let objectUrl: string | null = null
    apiClient.get(API_ENDPOINTS.PROFILE_PHOTO(Number(user.id)), {
      responseType: 'blob',
      params: { version: user.profile_photo },
      signal: controller.signal,
    }).then((response) => {
      if (controller.signal.aborted) return
      objectUrl = URL.createObjectURL(response.data)
      setLoadedPhoto({ key: photoKey, url: objectUrl })
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) {
        setLoadedPhoto(null)
        console.error('Failed to load profile photo:', handleApiError(error).message)
      }
    })

    return () => {
      controller.abort()
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [photoKey, previewUrl, user.id, user.profile_photo])

  return photoUrl
    ? <img className={className} src={photoUrl} alt={`${name} profile photo`} onError={() => setLoadedPhoto(null)} />
    : <span className={className} aria-label={name}>{initials}</span>
}
