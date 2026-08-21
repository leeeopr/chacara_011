-- ==============================================================================
-- MIGRAÇÃO E CONFIGURAÇÃO DA FONTE DE RESPONSÁVEIS (SUPABASE AUTH / PROFILES)
-- Arquivo: setup_auth_responsibles.sql
-- ==============================================================================

-- 1. Tabela public.profiles espelhada do Supabase Auth (auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    role TEXT DEFAULT 'SECRETARIA',
    cargo TEXT,
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Suporte a colunas adicionais caso profiles já existisse
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'SECRETARIA';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cargo TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Habilita RLS na tabela profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Política RLS: Todos os usuários autenticados e anônimos podem visualizar os perfis para seleção de responsável
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING ( true );

-- Política RLS: Usuário insere seu próprio perfil
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK ( auth.uid() = id );

-- Política RLS: Usuário atualiza seu próprio perfil
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING ( auth.uid() = id );

-- 2. Trigger de sincronização automática entre auth.users e public.profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', NEW.email), 
    COALESCE(NEW.raw_user_meta_data->>'role', 'SECRETARIA')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Sincroniza usuários do Supabase Auth que ainda não possuíam registro na profiles
INSERT INTO public.profiles (id, email, full_name, role)
SELECT 
  id, 
  email, 
  COALESCE(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', email), 
  'SECRETARIA'
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;

-- 3. Atualização da tabela de pendências com a chave estrangeira para profiles
ALTER TABLE public.pendencias ADD COLUMN IF NOT EXISTS responsavel_atual UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.pendencias ADD COLUMN IF NOT EXISTS criado_por UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.pendencias ADD COLUMN IF NOT EXISTS responsavel_atual_nome VARCHAR(150);
ALTER TABLE public.pendencias ADD COLUMN IF NOT EXISTS responsavel_atual_email VARCHAR(150);
ALTER TABLE public.pendencias ADD COLUMN IF NOT EXISTS criado_por_nome VARCHAR(150);
ALTER TABLE public.pendencias ADD COLUMN IF NOT EXISTS criado_por_email VARCHAR(150);

-- 4. Migração segura dos dados legados de responsáveis para IDs reais do Supabase Auth
UPDATE public.pendencias p
SET 
  responsavel_atual = u.id,
  responsavel_atual_nome = COALESCE(pr.full_name, u.email),
  responsavel_atual_email = u.email
FROM auth.users u
LEFT JOIN public.profiles pr ON pr.id = u.id
WHERE p.responsavel_atual_email IS NOT NULL 
  AND LOWER(p.responsavel_atual_email) = LOWER(u.email)
  AND (p.responsavel_atual IS NULL OR p.responsavel_atual != u.id);
