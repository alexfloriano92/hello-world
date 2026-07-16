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
  primary_color TEXT,
  secondary_color TEXT,
  accent_color TEXT,
  neutral_color TEXT,
  style_tag TEXT,
  font_display TEXT DEFAULT 'Space Grotesk',
  font_body TEXT DEFAULT 'Inter',
  phone TEXT,
  whatsapp TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  onboarded BOOLEAN NOT NULL DEFAULT false,
  published BOOLEAN NOT NULL DEFAULT false,
  hero_headline TEXT,
  hero_subheadline TEXT,
  tagline TEXT,
  about_text TEXT,
  cta_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX stores_owner_idx ON public.stores(owner_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stores TO authenticated;
GRANT SELECT ON public.stores TO anon;
GRANT ALL ON public.stores TO service_role;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read published stores" ON public.stores FOR SELECT TO anon USING (published = true);
CREATE POLICY "auth read own stores"  ON public.stores FOR SELECT TO authenticated USING (owner_id = auth.uid() OR published = true);
CREATE POLICY "auth insert own store"  ON public.stores FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "auth update own store"  ON public.stores FOR UPDATE TO authenticated USING (owner_id = auth.uid());
CREATE POLICY "auth delete own store"  ON public.stores FOR DELETE TO authenticated USING (owner_id = auth.uid());

CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
CREATE TRIGGER stores_updated_at BEFORE UPDATE ON public.stores
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

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
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehicles TO authenticated;
GRANT SELECT ON public.vehicles TO anon;
GRANT ALL ON public.vehicles TO service_role;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner manage vehicles" ON public.vehicles FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.owner_id = auth.uid()));
CREATE POLICY "public read vehicles of published stores" ON public.vehicles FOR SELECT TO anon
  USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.published = true) AND sold = false);
CREATE POLICY "auth read vehicles of published stores" ON public.vehicles FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND (s.owner_id = auth.uid() OR s.published = true)));
CREATE TRIGGER set_vehicles_updated_at BEFORE UPDATE ON public.vehicles
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
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
    VALUES (NEW.id, 'store', NEW.id, 'created', uid, public.audit_actor_name(uid), 'Loja criada');
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    diff := public.jsonb_diff(to_jsonb(OLD), to_jsonb(NEW));
    IF diff <> '{}'::jsonb THEN
      INSERT INTO public.audit_logs(store_id, entity, entity_id, action, actor_id, actor_name, summary, changes)
      VALUES (NEW.id, 'store', NEW.id, 'updated', uid, public.audit_actor_name(uid), 'Informações da loja atualizadas', diff);
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs(store_id, entity, entity_id, action, actor_id, actor_name, summary)
    VALUES (OLD.id, 'store', OLD.id, 'deleted', uid, public.audit_actor_name(uid), 'Loja removida');
    RETURN OLD;
  END IF;
  RETURN NULL;
END $$;
CREATE TRIGGER audit_stores AFTER INSERT OR UPDATE OR DELETE ON public.stores
  FOR EACH ROW EXECUTE FUNCTION public.tg_audit_stores();

CREATE OR REPLACE FUNCTION public.tg_audit_vehicles()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); diff jsonb;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs(store_id, entity, entity_id, action, actor_id, actor_name, summary)
    VALUES (NEW.store_id, 'vehicle', NEW.id, 'created', uid, public.audit_actor_name(uid), 'Veículo adicionado: ' || NEW.title);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    diff := public.jsonb_diff(to_jsonb(OLD), to_jsonb(NEW));
    IF diff <> '{}'::jsonb THEN
      INSERT INTO public.audit_logs(store_id, entity, entity_id, action, actor_id, actor_name, summary, changes)
      VALUES (NEW.store_id, 'vehicle', NEW.id, 'updated', uid, public.audit_actor_name(uid), 'Veículo atualizado: ' || NEW.title, diff);
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs(store_id, entity, entity_id, action, actor_id, actor_name, summary)
    VALUES (OLD.store_id, 'vehicle', OLD.id, 'deleted', uid, public.audit_actor_name(uid), 'Veículo removido: ' || OLD.title);
    RETURN OLD;
  END IF;
  RETURN NULL;
END $$;
CREATE TRIGGER audit_vehicles AFTER INSERT OR UPDATE OR DELETE ON public.vehicles
  FOR EACH ROW EXECUTE FUNCTION public.tg_audit_vehicles();

REVOKE EXECUTE ON FUNCTION public.audit_actor_name(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.jsonb_diff(jsonb, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_audit_stores() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_audit_vehicles() FROM PUBLIC, anon, authenticated;

CREATE TYPE public.sub_status AS ENUM ('active', 'trialing', 'past_due', 'canceled', 'incomplete');

CREATE TABLE public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  vehicle_id uuid REFERENCES public.vehicles(id) ON DELETE SET NULL,
  name text NOT NULL,
  phone text,
  email text,
  message text,
  source text NOT NULL DEFAULT 'site',
  status text NOT NULL DEFAULT 'novo',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leads TO authenticated;
GRANT INSERT ON public.leads TO anon;
GRANT ALL ON public.leads TO service_role;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Store owners manage leads" ON public.leads FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = leads.store_id AND s.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = leads.store_id AND s.owner_id = auth.uid()));
CREATE POLICY "Public can submit leads" ON public.leads FOR INSERT TO anon, authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = leads.store_id AND s.published = true));
CREATE TRIGGER leads_updated_at BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE INDEX idx_leads_store ON public.leads(store_id, created_at DESC);
CREATE INDEX idx_leads_vehicle ON public.leads(vehicle_id);

CREATE TABLE public.analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  vehicle_id uuid REFERENCES public.vehicles(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  session_id text,
  referrer text,
  user_agent text,
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
  stripe_customer_id text,
  stripe_subscription_id text,
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
  VALUES (NEW.id, 'free', 'active', 5)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_created_sub AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_subscription();
INSERT INTO public.subscriptions (user_id, plan, status, vehicle_limit)
SELECT id, 'free', 'active', 5 FROM auth.users
ON CONFLICT (user_id) DO NOTHING;
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
  user_email text,
  user_name text,
  plan public.plan_tier NOT NULL,
  cycle public.billing_cycle NOT NULL DEFAULT 'monthly',
  amount_brl numeric(10,2) NOT NULL,
  status public.payment_status NOT NULL DEFAULT 'pending',
  proof_url text,
  admin_notes text,
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
DECLARE
  req public.payment_requests;
  v_limit int;
  v_period_end timestamptz;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Somente admins podem confirmar pagamentos';
  END IF;
  SELECT * INTO req FROM public.payment_requests WHERE id = _request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pedido não encontrado'; END IF;
  IF req.status = 'confirmed' THEN RAISE EXCEPTION 'Pedido já confirmado'; END IF;
  v_limit := CASE req.plan
    WHEN 'starter' THEN 30
    WHEN 'pro'     THEN 150
    WHEN 'premium' THEN 100000
    ELSE 5 END;
  v_period_end := now() + CASE req.cycle WHEN 'yearly' THEN interval '365 days' ELSE interval '30 days' END;
  INSERT INTO public.subscriptions (user_id, plan, status, vehicle_limit, current_period_end)
  VALUES (req.user_id, req.plan, 'active', v_limit, v_period_end)
  ON CONFLICT (user_id) DO UPDATE
    SET plan = EXCLUDED.plan, status = 'active',
        vehicle_limit = EXCLUDED.vehicle_limit,
        current_period_end = EXCLUDED.current_period_end, updated_at = now();
  UPDATE public.payment_requests
    SET status = 'confirmed', reviewed_by = auth.uid(), reviewed_at = now(),
        admin_notes = COALESCE(_notes, admin_notes)
    WHERE id = _request_id RETURNING * INTO req;
  RETURN req;
END $$;

CREATE OR REPLACE FUNCTION public.reject_payment_request(_request_id uuid, _notes text DEFAULT NULL)
RETURNS public.payment_requests LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE req public.payment_requests;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Somente admins podem recusar pagamentos';
  END IF;
  UPDATE public.payment_requests
    SET status = 'rejected', reviewed_by = auth.uid(), reviewed_at = now(),
        admin_notes = COALESCE(_notes, admin_notes)
    WHERE id = _request_id RETURNING * INTO req;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pedido não encontrado'; END IF;
  RETURN req;
END $$;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.confirm_payment_request(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.confirm_payment_request(uuid, text) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.reject_payment_request(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reject_payment_request(uuid, text) TO authenticated, service_role;

CREATE POLICY "Admins view all subscriptions" ON public.subscriptions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.admin_list_subscriptions()
RETURNS TABLE (id uuid, user_id uuid, user_email text, plan public.plan_tier, status public.sub_status,
  vehicle_limit int, current_period_end timestamptz, created_at timestamptz, updated_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Somente admins'; END IF;
  RETURN QUERY
    SELECT s.id, s.user_id, u.email::text, s.plan, s.status,
           s.vehicle_limit, s.current_period_end, s.created_at, s.updated_at
    FROM public.subscriptions s
    LEFT JOIN auth.users u ON u.id = s.user_id
    ORDER BY s.updated_at DESC NULLS LAST, s.created_at DESC;
END $$;

CREATE OR REPLACE FUNCTION public.admin_update_subscription(
  _user_id uuid, _plan public.plan_tier, _status public.sub_status,
  _vehicle_limit int, _current_period_end timestamptz
) RETURNS public.subscriptions LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE row public.subscriptions;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Somente admins'; END IF;
  INSERT INTO public.subscriptions (user_id, plan, status, vehicle_limit, current_period_end)
  VALUES (_user_id, _plan, _status, _vehicle_limit, _current_period_end)
  ON CONFLICT (user_id) DO UPDATE
    SET plan = EXCLUDED.plan, status = EXCLUDED.status,
        vehicle_limit = EXCLUDED.vehicle_limit,
        current_period_end = EXCLUDED.current_period_end, updated_at = now()
  RETURNING * INTO row;
  RETURN row;
END $$;
REVOKE EXECUTE ON FUNCTION public.admin_list_subscriptions() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_subscriptions() TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.admin_update_subscription(uuid, public.plan_tier, public.sub_status, int, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_subscription(uuid, public.plan_tier, public.sub_status, int, timestamptz) TO authenticated, service_role;