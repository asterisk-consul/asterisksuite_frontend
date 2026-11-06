// types/ui.d.ts
import type { AvatarProps } from '@nuxt/ui'

declare global {
  type UserStatus = 'subscribed' | 'unsubscribed' | 'bounced'

  interface User {
    id: number
    name: string
    email: string
    avatar?: AvatarProps
    status: UserStatus
    location: string
  }

  interface Mail {
    id: number
    unread?: boolean
    from: User
    subject: string
    body: string
    date: string
  }

  interface UserNotification {
    id: string
    type: string
    title: string
    message: string
    target_path: string | null
    target_type: string | null
    target_id: string | null
    created_at: string
    read_at: string | null
    actor: { id: string; name: string } | null
  }

  interface UserNotificationFeed {
    items: UserNotification[]
    unread_count: number
    total_count: number
  }

}

export {}
