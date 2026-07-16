
DROP TYPE IF EXISTS public.plan_tier CASCADE;
CREATE TYPE public.plan_tier AS ENUM ('free', 'starter', 'pro', 'premium');

DO $$ BEGIN
  CREATE TYPE public.sub_status AS ENUM ('active', 'trialing', 'past_due', 'canceled', 'incomplete');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.leads (
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

DROP POLICY IF EXISTS "Store owners manage leads" ON public.leads;
CREATE POLICY "Store owners manage leads" ON public.leads FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = leads.store_id AND s.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = leads.store_id AND s.owner_id = auth.uid()));

DROP POLICY IF EXISTS "Public can submit leads" ON public.leads;
CREATE POLICY "Public can submit leads" ON public.leads FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP TRIGGER IF EXISTS leads_updated_at ON public.leads;
CREATE TRIGGER leads_updated_at BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE INDEX IF NOT EXISTS idx_leads_store ON public.leads(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_vehicle ON public.leads(vehicle_id);

CREATE TABLE IF NOT EXISTS public.analytics_events (
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

DROP POLICY IF EXISTS "Store owners view analytics" ON public.analytics_events;
CREATE POLICY "Store owners view analytics" ON public.analytics_events FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = analytics_events.store_id AND s.owner_id = auth.uid()));

DROP POLICY IF EXISTS "Public can insert analytics" ON public.analytics_events;
CREATE POLICY "Public can insert analytics" ON public.analytics_events FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_analytics_store_time ON public.analytics_events(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_type ON public.analytics_events(store_id, event_type, created_at DESC);

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  store_id uuid REFERENCES public.stores(id) ON DELETE SET NULL,
  plan plan_tier NOT NULL DEFAULT 'free',
  status sub_status NOT NULL DEFAULT 'active',
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

DROP POLICY IF EXISTS "Users view own subscription" ON public.subscriptions;
CREATE POLICY "Users view own subscription" ON public.subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS subs_updated_at ON public.subscriptions;
CREATE TRIGGER subs_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user_subscription()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.subscriptions (user_id, plan, status, vehicle_limit)
  VALUES (NEW.id, 'free', 'active', 5)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS on_auth_user_created_sub ON auth.users;
CREATE TRIGGER on_auth_user_created_sub AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_subscription();

INSERT INTO public.subscriptions (user_id, plan, status, vehicle_limit)
SELECT id, 'free', 'active', 5 FROM auth.users
ON CONFLICT (user_id) DO NOTHING;
