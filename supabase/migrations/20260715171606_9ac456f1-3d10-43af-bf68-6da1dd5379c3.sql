
-- ============================================================
-- FASE 1: Feature gating por plano
-- ============================================================
CREATE OR REPLACE FUNCTION public.plan_has_feature(_user_id uuid, _feature text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH p AS (
    SELECT COALESCE(
      (SELECT plan::text FROM public.subscriptions WHERE user_id = _user_id AND status = 'active' LIMIT 1),
      'free'
    ) AS plan
  )
  SELECT CASE _feature
    WHEN 'custom_domain'    THEN (SELECT plan IN ('starter','pro','premium') FROM p)
    WHEN 'multiple_users'   THEN (SELECT plan IN ('pro','premium') FROM p)
    WHEN 'blog'             THEN (SELECT plan IN ('pro','premium') FROM p)
    WHEN 'chatbot'          THEN (SELECT plan IN ('pro','premium') FROM p)
    WHEN 'banners'          THEN (SELECT plan IN ('pro','premium') FROM p)
    WHEN 'advanced_stats'   THEN (SELECT plan IN ('pro','premium') FROM p)
    WHEN 'priority_support' THEN (SELECT plan IN ('pro','premium') FROM p)
    WHEN 'crm'              THEN (SELECT plan = 'premium' FROM p)
    WHEN 'account_manager'  THEN (SELECT plan = 'premium' FROM p)
    ELSE false
  END;
$$;
GRANT EXECUTE ON FUNCTION public.plan_has_feature(uuid, text) TO authenticated;

-- ============================================================
-- FASE 2.1: Domínio personalizado
-- ============================================================
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS custom_domain text,
  ADD COLUMN IF NOT EXISTS custom_domain_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS custom_domain_token text;
CREATE UNIQUE INDEX IF NOT EXISTS stores_custom_domain_key ON public.stores (lower(custom_domain)) WHERE custom_domain IS NOT NULL;

-- ============================================================
-- FASE 2.2: Membros de loja
-- ============================================================
DO $$ BEGIN
  CREATE TYPE public.store_role AS ENUM ('owner','admin','editor','viewer');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.store_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.store_role NOT NULL DEFAULT 'editor',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_members TO authenticated;
GRANT ALL ON public.store_members TO service_role;
ALTER TABLE public.store_members ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.store_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  email text NOT NULL,
  role public.store_role NOT NULL DEFAULT 'editor',
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24),'hex'),
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_invites TO authenticated;
GRANT SELECT ON public.store_invites TO anon; -- para aceite via token público
GRANT ALL ON public.store_invites TO service_role;
ALTER TABLE public.store_invites ENABLE ROW LEVEL SECURITY;

-- Função central: usuário tem acesso à loja? (dono ou membro)
CREATE OR REPLACE FUNCTION public.has_store_access(_store_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.stores s WHERE s.id = _store_id AND s.owner_id = _user_id)
      OR EXISTS (SELECT 1 FROM public.store_members m WHERE m.store_id = _store_id AND m.user_id = _user_id);
$$;
GRANT EXECUTE ON FUNCTION public.has_store_access(uuid, uuid) TO authenticated;

-- Policies store_members
DROP POLICY IF EXISTS "members read own store members" ON public.store_members;
CREATE POLICY "members read own store members" ON public.store_members FOR SELECT TO authenticated
  USING (public.has_store_access(store_id, auth.uid()));
DROP POLICY IF EXISTS "owners manage members" ON public.store_members;
CREATE POLICY "owners manage members" ON public.store_members FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.owner_id = auth.uid()));

-- Policies store_invites
DROP POLICY IF EXISTS "owners manage invites" ON public.store_invites;
CREATE POLICY "owners manage invites" ON public.store_invites FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.owner_id = auth.uid()));

-- RPC para aceitar convite (rodando como o usuário autenticado)
CREATE OR REPLACE FUNCTION public.accept_store_invite(_token text)
RETURNS public.store_members LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE inv public.store_invites; mem public.store_members; uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Precisa estar logado'; END IF;
  SELECT * INTO inv FROM public.store_invites WHERE token = _token FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Convite inválido'; END IF;
  IF inv.accepted_at IS NOT NULL THEN RAISE EXCEPTION 'Convite já usado'; END IF;
  IF inv.expires_at < now() THEN RAISE EXCEPTION 'Convite expirado'; END IF;
  INSERT INTO public.store_members (store_id, user_id, role)
    VALUES (inv.store_id, uid, inv.role)
    ON CONFLICT (store_id, user_id) DO UPDATE SET role = EXCLUDED.role
    RETURNING * INTO mem;
  UPDATE public.store_invites SET accepted_at = now() WHERE id = inv.id;
  RETURN mem;
END $$;
GRANT EXECUTE ON FUNCTION public.accept_store_invite(text) TO authenticated;

-- Atualizar RLS de veículos e leads para incluir membros
DROP POLICY IF EXISTS "owner manage vehicles" ON public.vehicles;
CREATE POLICY "members manage vehicles" ON public.vehicles FOR ALL TO authenticated
  USING (public.has_store_access(store_id, auth.uid()))
  WITH CHECK (public.has_store_access(store_id, auth.uid()));

DROP POLICY IF EXISTS "Store owners manage leads" ON public.leads;
CREATE POLICY "Store members manage leads" ON public.leads FOR ALL TO authenticated
  USING (public.has_store_access(store_id, auth.uid()))
  WITH CHECK (public.has_store_access(store_id, auth.uid()));

DROP POLICY IF EXISTS "auth update own store" ON public.stores;
CREATE POLICY "members update store" ON public.stores FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() OR EXISTS (SELECT 1 FROM public.store_members m WHERE m.store_id = id AND m.user_id = auth.uid() AND m.role IN ('admin','editor')))
  WITH CHECK (owner_id = auth.uid() OR EXISTS (SELECT 1 FROM public.store_members m WHERE m.store_id = id AND m.user_id = auth.uid() AND m.role IN ('admin','editor')));

-- ============================================================
-- FASE 2.3: Blog
-- ============================================================
CREATE TABLE IF NOT EXISTS public.posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  slug text NOT NULL,
  title text NOT NULL,
  excerpt text,
  content text NOT NULL DEFAULT '',
  cover_url text,
  author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, slug)
);
CREATE INDEX IF NOT EXISTS posts_store_pub_idx ON public.posts (store_id, published_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.posts TO authenticated;
GRANT SELECT ON public.posts TO anon;
GRANT ALL ON public.posts TO service_role;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public read published posts" ON public.posts;
CREATE POLICY "public read published posts" ON public.posts FOR SELECT TO anon, authenticated
  USING (published_at IS NOT NULL AND published_at <= now()
         AND EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.published = true));
DROP POLICY IF EXISTS "members manage posts" ON public.posts;
CREATE POLICY "members manage posts" ON public.posts FOR ALL TO authenticated
  USING (public.has_store_access(store_id, auth.uid()))
  WITH CHECK (public.has_store_access(store_id, auth.uid()));

CREATE TRIGGER posts_updated_at BEFORE UPDATE ON public.posts FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ============================================================
-- FASE 2.4: Banners gerados
-- ============================================================
CREATE TABLE IF NOT EXISTS public.banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  vehicle_id uuid REFERENCES public.vehicles(id) ON DELETE SET NULL,
  title text NOT NULL,
  template text NOT NULL DEFAULT 'oferta',
  prompt text,
  image_url text NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS banners_store_idx ON public.banners (store_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.banners TO authenticated;
GRANT ALL ON public.banners TO service_role;
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "members manage banners" ON public.banners;
CREATE POLICY "members manage banners" ON public.banners FOR ALL TO authenticated
  USING (public.has_store_access(store_id, auth.uid()))
  WITH CHECK (public.has_store_access(store_id, auth.uid()));

-- ============================================================
-- FASE 2.5: CRM - leads estendido + atividades
-- ============================================================
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS next_followup timestamptz,
  ADD COLUMN IF NOT EXISTS won_at timestamptz,
  ADD COLUMN IF NOT EXISTS lost_reason text;

CREATE TABLE IF NOT EXISTS public.lead_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  kind text NOT NULL DEFAULT 'note',
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS lead_activities_lead_idx ON public.lead_activities (lead_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_activities TO authenticated;
GRANT ALL ON public.lead_activities TO service_role;
ALTER TABLE public.lead_activities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "members manage lead activities" ON public.lead_activities;
CREATE POLICY "members manage lead activities" ON public.lead_activities FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.leads l WHERE l.id = lead_id AND public.has_store_access(l.store_id, auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.leads l WHERE l.id = lead_id AND public.has_store_access(l.store_id, auth.uid())));

-- ============================================================
-- FASE 2.6: Suporte (tickets)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id uuid REFERENCES public.stores(id) ON DELETE SET NULL,
  subject text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  priority text NOT NULL DEFAULT 'normal',
  plan_snapshot text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS support_tickets_user_idx ON public.support_tickets (user_id, updated_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_tickets TO authenticated;
GRANT ALL ON public.support_tickets TO service_role;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user manage own tickets" ON public.support_tickets;
CREATE POLICY "user manage own tickets" ON public.support_tickets FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER support_tickets_updated_at BEFORE UPDATE ON public.support_tickets FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE IF NOT EXISTS public.ticket_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  from_admin boolean NOT NULL DEFAULT false,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ticket_messages_ticket_idx ON public.ticket_messages (ticket_id, created_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ticket_messages TO authenticated;
GRANT ALL ON public.ticket_messages TO service_role;
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ticket messages access" ON public.ticket_messages;
CREATE POLICY "ticket messages access" ON public.ticket_messages FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.support_tickets t WHERE t.id = ticket_id AND (t.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.support_tickets t WHERE t.id = ticket_id AND (t.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))));

-- ============================================================
-- Helper: resolver loja por host (domínio personalizado)
-- ============================================================
CREATE OR REPLACE FUNCTION public.resolve_store_by_host(_host text)
RETURNS TABLE(id uuid, slug text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT s.id, s.slug FROM public.stores s
  WHERE s.published = true
    AND s.custom_domain_verified = true
    AND lower(s.custom_domain) = lower(_host)
  LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.resolve_store_by_host(text) TO anon, authenticated;
