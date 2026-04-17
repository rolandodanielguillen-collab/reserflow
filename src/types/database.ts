// =====================================================
// Tipos base
// =====================================================

export type ContentStatus = 'draft' | 'processing' | 'review' | 'scheduled' | 'published' | 'failed'
export type ContentType = 'carousel' | 'single_post' | 'reel' | 'story'

// =====================================================
// Interfaces de dominio
// =====================================================

export interface Profile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface BrandSettings {
  id: string
  user_id: string
  brand_name: string
  brand_tagline: string | null
  primary_color: string
  secondary_color: string
  accent_color: string
  font_primary: string
  font_secondary: string
  logo_url: string | null
  logo_dark_url: string | null
  brand_voice: string | null
  target_audience: string | null
  content_pillars: string[]
  ycloud_api_key: string | null
  whatsapp_phone: string | null
  meta_access_token: string | null
  instagram_account_id: string | null
  created_at: string
  updated_at: string
}

export interface ContentIdea {
  id: string
  user_id: string
  title: string
  topic: string
  content_type: ContentType
  target_pillar: string | null
  status: ContentStatus
  scheduled_at: string | null
  published_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface SlideItem {
  index: number
  type: 'cover' | 'content' | 'cta'
  headline: string
  body: string
  visual_suggestion: string
  emoji: string
}

export interface Carousel {
  id: string
  user_id: string
  content_idea_id: string | null
  title: string
  slides_count: number
  slides_json: SlideItem[]
  generation_prompt: string | null
  ai_model: string
  status: ContentStatus
  instagram_post_id: string | null
  instagram_permalink: string | null
  scheduled_at: string | null
  published_at: string | null
  created_at: string
  updated_at: string
}

// =====================================================
// Database schema completo para Supabase client
// =====================================================

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Omit<Profile, 'created_at' | 'updated_at'>
        Update: Partial<Omit<Profile, 'id' | 'created_at'>>
      }
      brand_settings: {
        Row: BrandSettings
        Insert: Omit<BrandSettings, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<BrandSettings, 'id' | 'user_id' | 'created_at'>>
      }
      content_ideas: {
        Row: ContentIdea
        Insert: Omit<ContentIdea, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<ContentIdea, 'id' | 'user_id' | 'created_at'>>
      }
      carousels: {
        Row: Carousel
        Insert: Omit<Carousel, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Carousel, 'id' | 'user_id' | 'created_at'>>
      }
    }
    Enums: {
      content_status: ContentStatus
      content_type: ContentType
    }
  }
}
