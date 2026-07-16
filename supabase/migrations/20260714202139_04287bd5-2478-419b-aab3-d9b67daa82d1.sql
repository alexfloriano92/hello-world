
DROP POLICY IF EXISTS "Admins view all subscriptions" ON public.subscriptions;
CREATE POLICY "Admins view all subscriptions" ON public.subscriptions
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.admin_list_subscriptions()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  user_email text,
  plan public.plan_tier,
  status public.sub_status,
  vehicle_limit int,
  current_period_end timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Somente admins';
  END IF;
  RETURN QUERY
    SELECT s.id, s.user_id, u.email::text, s.plan, s.status,
           s.vehicle_limit, s.current_period_end, s.created_at, s.updated_at
    FROM public.subscriptions s
    LEFT JOIN auth.users u ON u.id = s.user_id
    ORDER BY s.updated_at DESC NULLS LAST, s.created_at DESC;
END $$;

CREATE OR REPLACE FUNCTION public.admin_update_subscription(
  _user_id uuid,
  _plan public.plan_tier,
  _status public.sub_status,
  _vehicle_limit int,
  _current_period_end timestamptz
) RETURNS public.subscriptions
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE row public.subscriptions;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Somente admins podem alterar assinaturas';
  END IF;
  INSERT INTO public.subscriptions (user_id, plan, status, vehicle_limit, current_period_end)
  VALUES (_user_id, _plan, _status, _vehicle_limit, _current_period_end)
  ON CONFLICT (user_id) DO UPDATE
    SET plan = EXCLUDED.plan,
        status = EXCLUDED.status,
        vehicle_limit = EXCLUDED.vehicle_limit,
        current_period_end = EXCLUDED.current_period_end,
        updated_at = now()
  RETURNING * INTO row;
  RETURN row;
END $$;
