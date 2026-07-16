CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile read"   ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE TYPE public.plan_tier AS ENUM ('free', 'starter', 'pro', 'premium');

CREATE TABLE public.stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  plan public.plan_tier NOT NULL DEFAULT 'free',
  logo_url TEXT,
  primary_color TEXT, secondary_color TEXT, accent_color TEXT, neutral_color TEXT,
  style_tag TEXT,
  font_display TEXT DEFAULT 'Space Grotesk',
  font_body TEXT DEFAULT 'Inter',
  phone TEXT, whatsapp TEXT, address TEXT, city TEXT, state TEXT,
  onboarded BOOLEAN NOT NULL DEFAULT false,
  published BOOLEAN NOT NULL DEFAULT false,
  hero_headline TEXT, hero_subheadline TEXT, tagline TEXT, about_text TEXT, cta_text TEXT,
  custom_domain text,
  custom_domain_verified boolean NOT NULL DEFAULT false,
  custom_domain_token text,
  whatsapp_api_token text,
  whatsapp_phone_id text,
  whatsapp_api_enabled boolean NOT NULL DEFAULT false,
  feeds_enabled boolean NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX stores_owner_idx ON public.stores(owner_id);
CREATE UNIQUE INDEX stores_custom_domain_key ON public.stores (lower(custom_domain)) WHERE custom_domain IS NOT NULL;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stores TO authenticated;
GRANT SELECT ON public.stores TO anon;
GRANT ALL ON public.stores TO service_role;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read published stores" ON public.stores FOR SELECT TO anon USING (published = true);
CREATE POLICY "auth read own stores"  ON public.stores FOR SELECT TO authenticated USING (owner_id = auth.uid() OR published = true);
CREATE POLICY "auth insert own store"  ON public.stores FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "auth delete own store"  ON public.stores FOR DELETE TO authenticated USING (owner_id = auth.uid());

CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
CREATE TRIGGER stores_updated_at BEFORE UPDATE ON public.stores FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'), NEW.raw_user_meta_data->>'avatar_url')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_set_updated_at() FROM PUBLIC, anon, authenticated;

CREATE TABLE public.vehicles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  brand TEXT, model TEXT, year INTEGER, km INTEGER,
  price NUMERIC(12,2),
  fuel TEXT, transmission TEXT, color TEXT,
  description TEXT,
  photos JSONB NOT NULL DEFAULT '[]'::jsonb,
  featured BOOLEAN NOT NULL DEFAULT false,
  sold BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'available',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehicles TO authenticated;
GRANT SELECT ON public.vehicles TO anon;
GRANT ALL ON public.vehicles TO service_role;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read vehicles of published stores" ON public.vehicles FOR SELECT TO anon
  USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.published = true) AND sold = false);
CREATE POLICY "auth read vehicles of published stores" ON public.vehicles FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND (s.owner_id = auth.uid() OR s.published = true)));
CREATE TRIGGER set_vehicles_updated_at BEFORE UPDATE ON public.vehicles FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE INDEX vehicles_store_idx ON public.vehicles(store_id);

CREATE TABLE public.audit_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  entity text NOT NULL, entity_id uuid NOT NULL, action text NOT NULL,
  actor_id uuid, actor_name text, summary text,
  changes jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_logs_store_created_idx ON public.audit_logs(store_id, created_at DESC);
GRANT SELECT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner reads audit" ON public.audit_logs FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = audit_logs.store_id AND s.owner_id = auth.uid()));

CREATE OR REPLACE FUNCTION public.audit_actor_name(_uid uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(p.full_name, u.email, _uid::text)
  FROM auth.users u LEFT JOIN public.profiles p ON p.id = u.id WHERE u.id = _uid;
$$;

CREATE OR REPLACE FUNCTION public.jsonb_diff(_old jsonb, _new jsonb)
RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT COALESCE(jsonb_object_agg(key, jsonb_build_object('from', _old -> key, 'to', _new -> key)), '{}'::jsonb)
  FROM (
    SELECT key FROM jsonb_each(_new) WHERE _old -> key IS DISTINCT FROM _new -> key
    UNION
    SELECT key FROM jsonb_each(_old) WHERE _old -> key IS DISTINCT FROM _new -> key
  ) k WHERE key NOT IN ('updated_at','created_at');
$$;

CREATE OR REPLACE FUNCTION public.tg_audit_stores()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); diff jsonb;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs(store_id, entity, entity_id, action, actor_id, actor_name, summary)
    VALUES (NEW.id, 'store', NEW.id, 'created', uid, public.audit_actor_name(uid), 'Loja criada'); RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    diff := public.jsonb_diff(to_jsonb(OLD), to_jsonb(NEW));
    IF diff <> '{}'::jsonb THEN
      INSERT INTO public.audit_logs(store_id, entity, entity_id, action, actor_id, actor_name, summary, changes)
      VALUES (NEW.id, 'store', NEW.id, 'updated', uid, public.audit_actor_name(uid), 'Loja atualizada', diff);
    END IF; RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs(store_id, entity, entity_id, action, actor_id, actor_name, summary)
    VALUES (OLD.id, 'store', OLD.id, 'deleted', uid, public.audit_actor_name(uid), 'Loja removida'); RETURN OLD;
  END IF; RETURN NULL;
END $$;
CREATE TRIGGER audit_stores AFTER INSERT OR UPDATE OR DELETE ON public.stores FOR EACH ROW EXECUTE FUNCTION public.tg_audit_stores();

CREATE OR REPLACE FUNCTION public.tg_audit_vehicles()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); diff jsonb;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs(store_id, entity, entity_id, action, actor_id, actor_name, summary)
    VALUES (NEW.store_id, 'vehicle', NEW.id, 'created', uid, public.audit_actor_name(uid), 'Veículo adicionado: ' || NEW.title); RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    diff := public.jsonb_diff(to_jsonb(OLD), to_jsonb(NEW));
    IF diff <> '{}'::jsonb THEN
      INSERT INTO public.audit_logs(store_id, entity, entity_id, action, actor_id, actor_name, summary, changes)
      VALUES (NEW.store_id, 'vehicle', NEW.id, 'updated', uid, public.audit_actor_name(uid), 'Veículo atualizado: ' || NEW.title, diff);
    END IF; RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs(store_id, entity, entity_id, action, actor_id, actor_name, summary)
    VALUES (OLD.store_id, 'vehicle', OLD.id, 'deleted', uid, public.audit_actor_name(uid), 'Veículo removido: ' || OLD.title); RETURN OLD;
  END IF; RETURN NULL;
END $$;
CREATE TRIGGER audit_vehicles AFTER INSERT OR UPDATE OR DELETE ON public.vehicles FOR EACH ROW EXECUTE FUNCTION public.tg_audit_vehicles();

REVOKE EXECUTE ON FUNCTION public.audit_actor_name(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.jsonb_diff(jsonb, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_audit_stores() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_audit_vehicles() FROM PUBLIC, anon, authenticated;

CREATE TYPE public.sub_status AS ENUM ('active', 'trialing', 'past_due', 'canceled', 'incomplete');

CREATE TABLE public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  vehicle_id uuid REFERENCES public.vehicles(id) ON DELETE SET NULL,
  name text NOT NULL, phone text, email text, message text,
  source text NOT NULL DEFAULT 'site',
  status text NOT NULL DEFAULT 'novo',
  notes text,
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  next_followup timestamptz,
  won_at timestamptz,
  lost_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leads TO authenticated;
GRANT INSERT ON public.leads TO anon;
GRANT ALL ON public.leads TO service_role;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can submit leads" ON public.leads FOR INSERT TO anon, authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = leads.store_id AND s.published = true));
CREATE TRIGGER leads_updated_at BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE INDEX idx_leads_store ON public.leads(store_id, created_at DESC);
CREATE INDEX idx_leads_vehicle ON public.leads(vehicle_id);

CREATE TABLE public.analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  vehicle_id uuid REFERENCES public.vehicles(id) ON DELETE SET NULL,
  event_type text NOT NULL, session_id text, referrer text, user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.analytics_events TO authenticated;
GRANT INSERT ON public.analytics_events TO anon, authenticated;
GRANT ALL ON public.analytics_events TO service_role;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Store owners view analytics" ON public.analytics_events FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = analytics_events.store_id AND s.owner_id = auth.uid()));
CREATE POLICY "Public can insert analytics" ON public.analytics_events FOR INSERT TO anon, authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = analytics_events.store_id));
CREATE INDEX idx_analytics_store_time ON public.analytics_events(store_id, created_at DESC);
CREATE INDEX idx_analytics_type ON public.analytics_events(store_id, event_type, created_at DESC);

CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  store_id uuid REFERENCES public.stores(id) ON DELETE SET NULL,
  plan public.plan_tier NOT NULL DEFAULT 'free',
  status public.sub_status NOT NULL DEFAULT 'active',
  stripe_customer_id text, stripe_subscription_id text,
  current_period_end timestamptz,
  vehicle_limit integer NOT NULL DEFAULT 5,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own subscription" ON public.subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER subs_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user_subscription()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.subscriptions (user_id, plan, status, vehicle_limit)
  VALUES (NEW.id, 'free', 'active', 5) ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_created_sub AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_subscription();
REVOKE EXECUTE ON FUNCTION public.handle_new_user_subscription() FROM PUBLIC, anon, authenticated;

CREATE TYPE public.app_role AS ENUM ('admin', 'user');
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role); $$;
CREATE POLICY "users see own roles" ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins manage roles" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TYPE public.payment_status AS ENUM ('pending', 'confirmed', 'rejected');
CREATE TYPE public.billing_cycle AS ENUM ('monthly', 'yearly');
CREATE TABLE public.payment_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email text, user_name text,
  plan public.plan_tier NOT NULL,
  cycle public.billing_cycle NOT NULL DEFAULT 'monthly',
  amount_brl numeric(10,2) NOT NULL,
  status public.payment_status NOT NULL DEFAULT 'pending',
  proof_url text, admin_notes text,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX payment_requests_status_idx ON public.payment_requests(status, created_at DESC);
CREATE INDEX payment_requests_user_idx ON public.payment_requests(user_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE ON public.payment_requests TO authenticated;
GRANT ALL ON public.payment_requests TO service_role;
ALTER TABLE public.payment_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users see own payment requests" ON public.payment_requests FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "users insert own payment requests" ON public.payment_requests FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "admins update payment requests" ON public.payment_requests FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER pr_updated_at BEFORE UPDATE ON public.payment_requests FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE OR REPLACE FUNCTION public.confirm_payment_request(_request_id uuid, _notes text DEFAULT NULL)
RETURNS public.payment_requests LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE req public.payment_requests; v_limit int; v_period_end timestamptz;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Somente admins'; END IF;
  SELECT * INTO req FROM public.payment_requests WHERE id = _request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pedido não encontrado'; END IF;
  IF req.status = 'confirmed' THEN RAISE EXCEPTION 'Pedido já confirmado'; END IF;
  v_limit := CASE req.plan WHEN 'starter' THEN 30 WHEN 'pro' THEN 150 WHEN 'premium' THEN 100000 ELSE 5 END;
  v_period_end := now() + CASE req.cycle WHEN 'yearly' THEN interval '365 days' ELSE interval '30 days' END;
  INSERT INTO public.subscriptions (user_id, plan, status, vehicle_limit, current_period_end)
  VALUES (req.user_id, req.plan, 'active', v_limit, v_period_end)
  ON CONFLICT (user_id) DO UPDATE SET plan = EXCLUDED.plan, status = 'active',
    vehicle_limit = EXCLUDED.vehicle_limit, current_period_end = EXCLUDED.current_period_end, updated_at = now();
  UPDATE public.payment_requests SET status = 'confirmed', reviewed_by = auth.uid(), reviewed_at = now(),
    admin_notes = COALESCE(_notes, admin_notes) WHERE id = _request_id RETURNING * INTO req;
  RETURN req;
END $$;

CREATE OR REPLACE FUNCTION public.reject_payment_request(_request_id uuid, _notes text DEFAULT NULL)
RETURNS public.payment_requests LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE req public.payment_requests;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Somente admins'; END IF;
  UPDATE public.payment_requests SET status = 'rejected', reviewed_by = auth.uid(), reviewed_at = now(),
    admin_notes = COALESCE(_notes, admin_notes) WHERE id = _request_id RETURNING * INTO req;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pedido não encontrado'; END IF;
  RETURN req;
END $$;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.confirm_payment_request(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reject_payment_request(uuid, text) TO authenticated, service_role;

CREATE POLICY "Admins view all subscriptions" ON public.subscriptions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Storage policies
CREATE POLICY "logos owner write"  ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'logos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "logos owner update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'logos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "logos owner delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'logos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "logos public read" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'logos');
CREATE POLICY "vehicle-photos owners upload" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'vehicle-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "vehicle-photos owners update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'vehicle-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "vehicle-photos owners delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'vehicle-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "vehicle-photos public read" ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'vehicle-photos');

CREATE TYPE public.store_role AS ENUM ('owner','admin','editor','viewer');

CREATE TABLE public.store_members (
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

CREATE TABLE public.store_invites (
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
GRANT SELECT ON public.store_invites TO anon;
GRANT ALL ON public.store_invites TO service_role;
ALTER TABLE public.store_invites ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_store_access(_store_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.stores s WHERE s.id = _store_id AND s.owner_id = _user_id)
      OR EXISTS (SELECT 1 FROM public.store_members m WHERE m.store_id = _store_id AND m.user_id = _user_id);
$$;
GRANT EXECUTE ON FUNCTION public.has_store_access(uuid, uuid) TO authenticated;

CREATE POLICY "members read own store members" ON public.store_members FOR SELECT TO authenticated
  USING (public.has_store_access(store_id, auth.uid()));
CREATE POLICY "owners manage members" ON public.store_members FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.owner_id = auth.uid()));
CREATE POLICY "owners manage invites" ON public.store_invites FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.owner_id = auth.uid()));

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

CREATE POLICY "members manage vehicles" ON public.vehicles FOR ALL TO authenticated
  USING (public.has_store_access(store_id, auth.uid()))
  WITH CHECK (public.has_store_access(store_id, auth.uid()));
CREATE POLICY "Store members manage leads" ON public.leads FOR ALL TO authenticated
  USING (public.has_store_access(store_id, auth.uid()))
  WITH CHECK (public.has_store_access(store_id, auth.uid()));
CREATE POLICY "members update store" ON public.stores FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() OR EXISTS (SELECT 1 FROM public.store_members m WHERE m.store_id = id AND m.user_id = auth.uid() AND m.role IN ('admin','editor')))
  WITH CHECK (owner_id = auth.uid() OR EXISTS (SELECT 1 FROM public.store_members m WHERE m.store_id = id AND m.user_id = auth.uid() AND m.role IN ('admin','editor')));

CREATE TABLE public.posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  slug text NOT NULL, title text NOT NULL, excerpt text,
  content text NOT NULL DEFAULT '', cover_url text,
  author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, slug)
);
CREATE INDEX posts_store_pub_idx ON public.posts (store_id, published_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.posts TO authenticated;
GRANT SELECT ON public.posts TO anon;
GRANT ALL ON public.posts TO service_role;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read published posts" ON public.posts FOR SELECT TO anon, authenticated
  USING (published_at IS NOT NULL AND published_at <= now()
         AND EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.published = true));
CREATE POLICY "members manage posts" ON public.posts FOR ALL TO authenticated
  USING (public.has_store_access(store_id, auth.uid()))
  WITH CHECK (public.has_store_access(store_id, auth.uid()));
CREATE TRIGGER posts_updated_at BEFORE UPDATE ON public.posts FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE public.banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  vehicle_id uuid REFERENCES public.vehicles(id) ON DELETE SET NULL,
  title text NOT NULL,
  template text NOT NULL DEFAULT 'oferta',
  prompt text, image_url text NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX banners_store_idx ON public.banners (store_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.banners TO authenticated;
GRANT ALL ON public.banners TO service_role;
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members manage banners" ON public.banners FOR ALL TO authenticated
  USING (public.has_store_access(store_id, auth.uid()))
  WITH CHECK (public.has_store_access(store_id, auth.uid()));

CREATE TABLE public.lead_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  kind text NOT NULL DEFAULT 'note',
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX lead_activities_lead_idx ON public.lead_activities (lead_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_activities TO authenticated;
GRANT ALL ON public.lead_activities TO service_role;
ALTER TABLE public.lead_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members manage lead activities" ON public.lead_activities FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.leads l WHERE l.id = lead_id AND public.has_store_access(l.store_id, auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.leads l WHERE l.id = lead_id AND public.has_store_access(l.store_id, auth.uid())));

CREATE TABLE public.support_tickets (
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
CREATE INDEX support_tickets_user_idx ON public.support_tickets (user_id, updated_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_tickets TO authenticated;
GRANT ALL ON public.support_tickets TO service_role;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user manage own tickets" ON public.support_tickets FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER support_tickets_updated_at BEFORE UPDATE ON public.support_tickets FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE public.ticket_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  from_admin boolean NOT NULL DEFAULT false,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ticket_messages_ticket_idx ON public.ticket_messages (ticket_id, created_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ticket_messages TO authenticated;
GRANT ALL ON public.ticket_messages TO service_role;
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ticket messages access" ON public.ticket_messages FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.support_tickets t WHERE t.id = ticket_id AND (t.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.support_tickets t WHERE t.id = ticket_id AND (t.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))));

CREATE OR REPLACE FUNCTION public.resolve_store_by_host(_host text)
RETURNS TABLE(id uuid, slug text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT s.id, s.slug FROM public.stores s
  WHERE s.published = true AND s.custom_domain_verified = true
    AND lower(s.custom_domain) = lower(_host) LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.resolve_store_by_host(text) TO anon, authenticated;

CREATE TABLE public.whatsapp_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  to_phone text NOT NULL,
  body text NOT NULL,
  status text NOT NULL DEFAULT 'sent',
  provider_message_id text, error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.whatsapp_messages TO authenticated;
GRANT ALL ON public.whatsapp_messages TO service_role;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Store members view whatsapp" ON public.whatsapp_messages FOR SELECT TO authenticated
  USING (public.has_store_access(store_id, auth.uid()));
CREATE POLICY "Store members insert whatsapp" ON public.whatsapp_messages FOR INSERT TO authenticated
  WITH CHECK (public.has_store_access(store_id, auth.uid()));
CREATE INDEX idx_whatsapp_messages_store ON public.whatsapp_messages(store_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.plan_has_feature(_user_id uuid, _feature text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH p AS (
    SELECT COALESCE((SELECT plan::text FROM public.subscriptions WHERE user_id = _user_id AND status = 'active' LIMIT 1),'free') AS plan
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
    WHEN 'whatsapp_api'     THEN (SELECT plan = 'premium' FROM p)
    WHEN 'feeds'            THEN (SELECT plan = 'premium' FROM p)
    WHEN 'account_manager'  THEN (SELECT plan = 'premium' FROM p)
    ELSE false
  END;
$$;
GRANT EXECUTE ON FUNCTION public.plan_has_feature(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.store_owner_has_feature(_store_id uuid, _feature text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.plan_has_feature(s.owner_id, _feature) FROM public.stores s WHERE s.id = _store_id;
$$;
GRANT EXECUTE ON FUNCTION public.store_owner_has_feature(uuid, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.set_subscription_plan(_user_id uuid, _plan text, _period_end timestamptz DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _limit int;
BEGIN
  _limit := CASE _plan WHEN 'free' THEN 5 WHEN 'starter' THEN 25 WHEN 'pro' THEN 50 WHEN 'premium' THEN 100000 ELSE 5 END;
  INSERT INTO public.subscriptions (user_id, plan, status, vehicle_limit, current_period_end)
  VALUES (_user_id, _plan::plan_tier, 'active', _limit, _period_end)
  ON CONFLICT (user_id) DO UPDATE SET plan = EXCLUDED.plan, status = 'active',
    vehicle_limit = EXCLUDED.vehicle_limit, current_period_end = EXCLUDED.current_period_end, updated_at = now();
END $$;

CREATE OR REPLACE FUNCTION public.admin_overview()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Somente admins'; END IF;
  SELECT jsonb_build_object(
    'total_users',(SELECT count(*) FROM auth.users),
    'users_last_30d',(SELECT count(*) FROM auth.users WHERE created_at > now() - interval '30 days'),
    'total_stores',(SELECT count(*) FROM public.stores),
    'published_stores',(SELECT count(*) FROM public.stores WHERE published = true),
    'total_vehicles',(SELECT count(*) FROM public.vehicles),
    'available_vehicles',(SELECT count(*) FROM public.vehicles WHERE COALESCE(status,'available')='available'),
    'total_leads',(SELECT count(*) FROM public.leads),
    'leads_last_30d',(SELECT count(*) FROM public.leads WHERE created_at > now() - interval '30 days'),
    'pending_payments',(SELECT count(*) FROM public.payment_requests WHERE status='pending'),
    'confirmed_revenue_brl',(SELECT COALESCE(sum(amount_brl),0) FROM public.payment_requests WHERE status='confirmed'),
    'active_subs',(SELECT count(*) FROM public.subscriptions WHERE status='active'),
    'plan_breakdown',(SELECT COALESCE(jsonb_object_agg(plan, c),'{}'::jsonb) FROM (SELECT plan, count(*) c FROM public.subscriptions GROUP BY plan) x),
    'recent_signups',(SELECT COALESCE(jsonb_agg(jsonb_build_object('id',u.id,'email',u.email,'created_at',u.created_at) ORDER BY u.created_at DESC),'[]'::jsonb) FROM (SELECT id, email, created_at FROM auth.users ORDER BY created_at DESC LIMIT 10) u),
    'recent_leads',(SELECT COALESCE(jsonb_agg(to_jsonb(l) ORDER BY l.created_at DESC),'[]'::jsonb) FROM (SELECT id, name, phone, email, store_id, vehicle_id, created_at FROM public.leads ORDER BY created_at DESC LIMIT 10) l),
    'recent_audit',(SELECT COALESCE(jsonb_agg(to_jsonb(a) ORDER BY a.created_at DESC),'[]'::jsonb) FROM (SELECT id, entity, action, actor_name, summary, created_at FROM public.audit_logs ORDER BY created_at DESC LIMIT 15) a)
  ) INTO result; RETURN result;
END $$;

CREATE OR REPLACE FUNCTION public.admin_list_users()
RETURNS TABLE(id uuid, email text, full_name text, created_at timestamptz, last_sign_in_at timestamptz, is_admin boolean, plan plan_tier, sub_status sub_status, stores_count bigint, vehicles_count bigint, leads_count bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Somente admins'; END IF;
  RETURN QUERY SELECT u.id, u.email::text, p.full_name, u.created_at, u.last_sign_in_at,
    EXISTS(SELECT 1 FROM public.user_roles r WHERE r.user_id = u.id AND r.role='admin'),
    s.plan, s.status,
    (SELECT count(*) FROM public.stores st WHERE st.owner_id = u.id),
    (SELECT count(*) FROM public.vehicles v JOIN public.stores st ON st.id = v.store_id WHERE st.owner_id = u.id),
    (SELECT count(*) FROM public.leads l JOIN public.stores st ON st.id = l.store_id WHERE st.owner_id = u.id)
  FROM auth.users u LEFT JOIN public.profiles p ON p.id = u.id LEFT JOIN public.subscriptions s ON s.user_id = u.id
  ORDER BY u.created_at DESC;
END $$;

CREATE OR REPLACE FUNCTION public.admin_list_stores()
RETURNS TABLE(id uuid, name text, slug text, published boolean, owner_id uuid, owner_email text, vehicles_count bigint, leads_count bigint, created_at timestamptz, updated_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Somente admins'; END IF;
  RETURN QUERY SELECT st.id, st.name, st.slug, st.published, st.owner_id, u.email::text,
    (SELECT count(*) FROM public.vehicles v WHERE v.store_id = st.id),
    (SELECT count(*) FROM public.leads l WHERE l.store_id = st.id),
    st.created_at, st.updated_at
  FROM public.stores st LEFT JOIN auth.users u ON u.id = st.owner_id ORDER BY st.created_at DESC;
END $$;

CREATE OR REPLACE FUNCTION public.admin_list_audit(_entity text DEFAULT NULL, _action text DEFAULT NULL, _actor_id uuid DEFAULT NULL, _from timestamptz DEFAULT NULL, _to timestamptz DEFAULT NULL, _search text DEFAULT NULL, _limit int DEFAULT 25, _offset int DEFAULT 0)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _total bigint; _items jsonb; _lim int := LEAST(GREATEST(COALESCE(_limit, 25), 1), 200); _off int := GREATEST(COALESCE(_offset, 0), 0);
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  SELECT COUNT(*) INTO _total FROM public.audit_logs a
  WHERE (_entity IS NULL OR a.entity = _entity) AND (_action IS NULL OR a.action = _action)
    AND (_actor_id IS NULL OR a.actor_id = _actor_id)
    AND (_from IS NULL OR a.created_at >= _from) AND (_to IS NULL OR a.created_at <= _to)
    AND (_search IS NULL OR a.summary ILIKE '%'||_search||'%' OR a.actor_name ILIKE '%'||_search||'%');
  SELECT COALESCE(jsonb_agg(to_jsonb(x) ORDER BY x.created_at DESC),'[]'::jsonb) INTO _items FROM (
    SELECT a.id, a.entity, a.action, a.actor_id, a.actor_name, a.summary, a.store_id, a.entity_id, a.changes, a.created_at
    FROM public.audit_logs a
    WHERE (_entity IS NULL OR a.entity = _entity) AND (_action IS NULL OR a.action = _action)
      AND (_actor_id IS NULL OR a.actor_id = _actor_id)
      AND (_from IS NULL OR a.created_at >= _from) AND (_to IS NULL OR a.created_at <= _to)
      AND (_search IS NULL OR a.summary ILIKE '%'||_search||'%' OR a.actor_name ILIKE '%'||_search||'%')
    ORDER BY a.created_at DESC LIMIT _lim OFFSET _off
  ) x;
  RETURN jsonb_build_object('total', _total, 'items', _items, 'limit', _lim, 'offset', _off);
END $$;

CREATE OR REPLACE FUNCTION public.admin_audit_filters()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  RETURN jsonb_build_object(
    'entities',(SELECT COALESCE(jsonb_agg(e ORDER BY e),'[]'::jsonb) FROM (SELECT DISTINCT entity AS e FROM public.audit_logs) t),
    'actions',(SELECT COALESCE(jsonb_agg(ac ORDER BY ac),'[]'::jsonb) FROM (SELECT DISTINCT action AS ac FROM public.audit_logs) t),
    'actors',(SELECT COALESCE(jsonb_agg(row_to_json(a) ORDER BY a.actor_name),'[]'::jsonb) FROM (SELECT DISTINCT actor_id, COALESCE(actor_name, actor_id::text) AS actor_name FROM public.audit_logs WHERE actor_id IS NOT NULL) a)
  );
END $$;

CREATE OR REPLACE FUNCTION public.admin_list_subscriptions()
RETURNS TABLE (id uuid, user_id uuid, user_email text, plan public.plan_tier, status public.sub_status, vehicle_limit int, current_period_end timestamptz, created_at timestamptz, updated_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Somente admins'; END IF;
  RETURN QUERY SELECT s.id, s.user_id, u.email::text, s.plan, s.status, s.vehicle_limit, s.current_period_end, s.created_at, s.updated_at
  FROM public.subscriptions s LEFT JOIN auth.users u ON u.id = s.user_id
  ORDER BY s.updated_at DESC NULLS LAST, s.created_at DESC;
END $$;

CREATE OR REPLACE FUNCTION public.admin_update_subscription(_user_id uuid, _plan public.plan_tier, _status public.sub_status, _vehicle_limit int, _current_period_end timestamptz)
RETURNS public.subscriptions LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE row public.subscriptions;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Somente admins'; END IF;
  INSERT INTO public.subscriptions (user_id, plan, status, vehicle_limit, current_period_end)
  VALUES (_user_id, _plan, _status, _vehicle_limit, _current_period_end)
  ON CONFLICT (user_id) DO UPDATE SET plan = EXCLUDED.plan, status = EXCLUDED.status,
    vehicle_limit = EXCLUDED.vehicle_limit, current_period_end = EXCLUDED.current_period_end, updated_at = now()
  RETURNING * INTO row;
  RETURN row;
END $$;

GRANT EXECUTE ON FUNCTION public.admin_overview() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_users() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_stores() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_audit(text, text, uuid, timestamptz, timestamptz, text, int, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_audit_filters() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_subscriptions() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_subscription(uuid, public.plan_tier, public.sub_status, int, timestamptz) TO authenticated;

DO $$
DECLARE v_user_id uuid; v_existing uuid;
BEGIN
  SELECT id INTO v_existing FROM auth.users WHERE email = 'tiijrc@gmail.com';
  IF v_existing IS NOT NULL THEN
    v_user_id := v_existing;
  ELSE
    v_user_id := gen_random_uuid();
    INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
    VALUES ('00000000-0000-0000-0000-000000000000', v_user_id, 'authenticated', 'authenticated', 'tiijrc@gmail.com', crypt('Vodin4s4', gen_salt('bf')), now(),
      jsonb_build_object('provider','email','providers', jsonb_build_array('email')),
      jsonb_build_object('full_name','Administrador'),
      now(), now(), '', '', '', '');
    INSERT INTO auth.identities (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), v_user_id, v_user_id,
      jsonb_build_object('sub', v_user_id::text, 'email', 'tiijrc@gmail.com', 'email_verified', true),
      'email', now(), now(), now());
  END IF;
  INSERT INTO public.profiles (id, full_name) VALUES (v_user_id, 'Administrador') ON CONFLICT (id) DO NOTHING;
  DELETE FROM public.user_roles WHERE role = 'admin' AND user_id <> v_user_id;
  INSERT INTO public.user_roles (user_id, role) VALUES (v_user_id, 'admin') ON CONFLICT (user_id, role) DO NOTHING;
  INSERT INTO public.subscriptions (user_id, plan, status, vehicle_limit) VALUES (v_user_id, 'premium', 'active', 100000)
  ON CONFLICT (user_id) DO UPDATE SET plan='premium', status='active', vehicle_limit=100000, updated_at=now();
END $$;