CREATE OR REPLACE FUNCTION public.set_subscription_plan(_user_id uuid, _plan text, _period_end timestamptz DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _limit int;
BEGIN
  _limit := CASE _plan
    WHEN 'free'    THEN 5
    WHEN 'starter' THEN 25
    WHEN 'pro'     THEN 50
    WHEN 'premium' THEN 100000
    ELSE 5
  END;
  INSERT INTO public.subscriptions (user_id, plan, status, vehicle_limit, current_period_end)
  VALUES (_user_id, _plan, 'active', _limit, _period_end)
  ON CONFLICT (user_id) DO UPDATE
    SET plan = EXCLUDED.plan,
        status = 'active',
        vehicle_limit = EXCLUDED.vehicle_limit,
        current_period_end = EXCLUDED.current_period_end,
        updated_at = now();
END;
$$;