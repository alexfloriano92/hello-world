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

CREATE TYPE public.plan_tier AS ENUM ('start','pro','premium');

CREATE TABLE public.stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  plan public.plan_tier NOT NULL DEFAULT 'start',
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