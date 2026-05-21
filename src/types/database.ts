export type ContentStatus =
  | "draft"
  | "generating"
  | "review"
  | "approved"
  | "scheduled"
  | "publishing"
  | "published"
  | "failed"

export type ContentType = "carousel" | "video" | "reel" | "story"

export interface Profile {
  id: string
  email: string
  name: string | null
  avatarUrl: string | null
  createdAt: string
  updatedAt: string
}

export interface BrandSettings {
  id: string
  userId: string
  brandName: string | null
  brandTagline: string | null
  primaryColor: string
  secondaryColor: string
  accentColor: string
  fontPrimary: string
  fontSecondary: string
  logoUrl: string | null
  logoDarkUrl: string | null
  brandVoice: string | null
  targetAudience: string | null
  contentPillars: string | null
  ycloudApiKey: string | null
  whatsappPhone: string | null
  metaAccessToken: string | null
  instagramAccountId: string | null
  pendingApprovalCarouselId: string | null
  createdAt: string
  updatedAt: string
}

export interface ContentIdea {
  id: string
  userId: string
  title: string
  topic: string | null
  contentType: ContentType
  targetPillar: string | null
  status: ContentStatus
  scheduledAt: string | null
  publishedAt: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

export interface SlideItem {
  index: number
  type: "cover" | "content" | "cta"
  headline: string
  body: string
  visual_suggestion: string
  emoji: string
}

export interface Carousel {
  id: string
  userId: string
  contentIdeaId: string | null
  title: string
  slidesCount: number | null
  slidesJson: SlideItem[] | null
  generationPrompt: string | null
  aiModel: string | null
  status: ContentStatus
  caption: string | null
  hashtags: string | null
  coverImageUrl: string | null
  slideImageUrls: string | null
  videoUrl: string | null
  instagramPostId: string | null
  instagramPermalink: string | null
  scheduledAt: string | null
  publishedAt: string | null
  templatePieceId: number | null
  failReason: string | null
  retryCount: number
  createdAt: string
  updatedAt: string
}
