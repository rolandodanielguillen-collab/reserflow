export interface ScheduledPost {
  id: string
  carouselId: string
  title: string
  scheduledAt: Date
  status: 'scheduled' | 'published' | 'failed'
  instagramPermalink?: string
}

export interface CalendarDay {
  date: Date
  isCurrentMonth: boolean
  isToday: boolean
  posts: ScheduledPost[]
}
