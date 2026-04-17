-- =====================================================
-- MIGRACIÓN: ReserFlow Core Tables
-- brand_settings, content_ideas, carousels
-- =====================================================

-- =====================================================
-- ENUMS
-- =====================================================
CREATE TYPE content_status AS ENUM ('draft', 'processing', 'review', 'scheduled', 'published', 'failed');
CREATE TYPE content_type AS ENUM ('carousel', 'single_post', 'reel', 'story');

-- =====================================================
-- TABLA: brand_settings
-- Brand Kit de RESER+ + configuracion de integraciones
-- =====================================================
CREATE TABLE IF NOT EXISTS brand_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Brand identity
  brand_name text NOT NULL DEFAULT 'RESER+',
  brand_tagline text,
  primary_color text NOT NULL DEFAULT '#1E40AF',
  secondary_color text NOT NULL DEFAULT '#F59E0B',
  accent_color text NOT NULL DEFAULT '#10B981',
  font_primary text NOT NULL DEFAULT 'Inter',
  font_secondary text NOT NULL DEFAULT 'Poppins',

  -- Assets
  logo_url text,
  logo_dark_url text,

  -- Voz y estilo de marca
  brand_voice text DEFAULT 'Profesional, cercano, motivador',
  target_audience text DEFAULT 'Deportistas y administradores de canchas',
  content_pillars text[] DEFAULT ARRAY['Reservas', 'Deporte', 'Comunidad', 'Tips'],

  -- Integraciones API
  ycloud_api_key text,
  whatsapp_phone text,
  meta_access_token text,
  instagram_account_id text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE(user_id)
);

ALTER TABLE brand_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own brand settings"
  ON brand_settings
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- TABLA: content_ideas
-- Ideas de contenido con su ciclo de vida
-- =====================================================
CREATE TABLE IF NOT EXISTS content_ideas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  title text NOT NULL,
  topic text NOT NULL,
  content_type content_type NOT NULL DEFAULT 'carousel',
  target_pillar text,

  status content_status NOT NULL DEFAULT 'draft',

  scheduled_at timestamptz,
  published_at timestamptz,

  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE content_ideas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own content ideas"
  ON content_ideas
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- TABLA: carousels
-- JSON estructurado de slides generado por IA
-- =====================================================
CREATE TABLE IF NOT EXISTS carousels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_idea_id uuid REFERENCES content_ideas(id) ON DELETE SET NULL,

  title text NOT NULL,
  slides_count int NOT NULL DEFAULT 0,

  -- JSON estructurado generado por IA
  -- Estructura por slide: { "index": 0, "type": "cover|content|cta", "headline": "", "body": "", "visual_suggestion": "", "emoji": "" }
  slides_json jsonb NOT NULL DEFAULT '[]'::jsonb,

  generation_prompt text,
  ai_model text DEFAULT 'openai/gpt-4o',

  status content_status NOT NULL DEFAULT 'draft',

  instagram_post_id text,
  instagram_permalink text,
  scheduled_at timestamptz,
  published_at timestamptz,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE carousels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own carousels"
  ON carousels
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- TRIGGER: updated_at automático
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER brand_settings_updated_at
  BEFORE UPDATE ON brand_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER content_ideas_updated_at
  BEFORE UPDATE ON content_ideas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER carousels_updated_at
  BEFORE UPDATE ON carousels
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX idx_content_ideas_user_status ON content_ideas(user_id, status);
CREATE INDEX idx_content_ideas_scheduled ON content_ideas(scheduled_at) WHERE scheduled_at IS NOT NULL;
CREATE INDEX idx_carousels_user_status ON carousels(user_id, status);
CREATE INDEX idx_carousels_scheduled ON carousels(scheduled_at) WHERE scheduled_at IS NOT NULL;
CREATE INDEX idx_carousels_idea ON carousels(content_idea_id);
