
-- 1. Roles
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
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE POLICY "users see own roles" ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins manage roles" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2. Payment requests
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

CREATE POLICY "user sees own requests" ON public.payment_requests FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "user creates own request" ON public.payment_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "admin updates any request" ON public.payment_requests FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER payment_requests_updated_at BEFORE UPDATE ON public.payment_requests
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- 3. Confirm function: applies subscription based on request
CREATE OR REPLACE FUNCTION public.confirm_payment_request(_request_id uuid, _notes text DEFAULT NULL)
RETURNS public.payment_requests LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
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
    SET plan = EXCLUDED.plan,
        status = 'active',
        vehicle_limit = EXCLUDED.vehicle_limit,
        current_period_end = EXCLUDED.current_period_end,
        updated_at = now();

  UPDATE public.payment_requests
    SET status = 'confirmed',
        reviewed_by = auth.uid(),
        reviewed_at = now(),
        admin_notes = COALESCE(_notes, admin_notes)
    WHERE id = _request_id
    RETURNING * INTO req;

  RETURN req;
END $$;

CREATE OR REPLACE FUNCTION public.reject_payment_request(_request_id uuid, _notes text DEFAULT NULL)
RETURNS public.payment_requests LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
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
