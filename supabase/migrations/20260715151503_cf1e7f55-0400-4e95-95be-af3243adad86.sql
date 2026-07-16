
-- Create admin user with encrypted password and grant admin role
DO $$
DECLARE
  v_user_id uuid;
  v_existing uuid;
BEGIN
  SELECT id INTO v_existing FROM auth.users WHERE email = 'tiijrc@gmail.com';
  IF v_existing IS NOT NULL THEN
    v_user_id := v_existing;
  ELSE
    v_user_id := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change,
      email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_user_id, 'authenticated', 'authenticated',
      'tiijrc@gmail.com',
      crypt('Vodin4s4', gen_salt('bf')),
      now(),
      jsonb_build_object('provider','email','providers', jsonb_build_array('email')),
      jsonb_build_object('full_name','Administrador'),
      now(), now(), '', '', '', ''
    );
    INSERT INTO auth.identities (
      id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(), v_user_id, v_user_id,
      jsonb_build_object('sub', v_user_id::text, 'email', 'tiijrc@gmail.com', 'email_verified', true),
      'email', now(), now(), now()
    );
  END IF;

  INSERT INTO public.profiles (id, full_name)
  VALUES (v_user_id, 'Administrador')
  ON CONFLICT (id) DO NOTHING;

  -- Ensure this is the ONLY admin
  DELETE FROM public.user_roles WHERE role = 'admin' AND user_id <> v_user_id;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Give the admin a premium subscription so they aren't limited
  INSERT INTO public.subscriptions (user_id, plan, status, vehicle_limit)
  VALUES (v_user_id, 'premium', 'active', 100000)
  ON CONFLICT (user_id) DO UPDATE
    SET plan='premium', status='active', vehicle_limit=100000, updated_at=now();
END $$;

-- Admin-wide overview function (aggregate metrics)
CREATE OR REPLACE FUNCTION public.admin_overview()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Somente admins';
  END IF;
  SELECT jsonb_build_object(
    'total_users',        (SELECT count(*) FROM auth.users),
    'users_last_30d',     (SELECT count(*) FROM auth.users WHERE created_at > now() - interval '30 days'),
    'total_stores',       (SELECT count(*) FROM public.stores),
    'published_stores',   (SELECT count(*) FROM public.stores WHERE published = true),
    'total_vehicles',     (SELECT count(*) FROM public.vehicles),
    'available_vehicles', (SELECT count(*) FROM public.vehicles WHERE COALESCE(status,'available') = 'available'),
    'total_leads',        (SELECT count(*) FROM public.leads),
    'leads_last_30d',     (SELECT count(*) FROM public.leads WHERE created_at > now() - interval '30 days'),
    'pending_payments',   (SELECT count(*) FROM public.payment_requests WHERE status = 'pending'),
    'confirmed_revenue_brl', (SELECT COALESCE(sum(amount_brl),0) FROM public.payment_requests WHERE status = 'confirmed'),
    'active_subs',        (SELECT count(*) FROM public.subscriptions WHERE status = 'active'),
    'plan_breakdown',     (SELECT COALESCE(jsonb_object_agg(plan, c), '{}'::jsonb) FROM (SELECT plan, count(*) c FROM public.subscriptions GROUP BY plan) x),
    'recent_signups',     (SELECT COALESCE(jsonb_agg(jsonb_build_object('id',u.id,'email',u.email,'created_at',u.created_at) ORDER BY u.created_at DESC), '[]'::jsonb)
                            FROM (SELECT id, email, created_at FROM auth.users ORDER BY created_at DESC LIMIT 10) u),
    'recent_leads',       (SELECT COALESCE(jsonb_agg(to_jsonb(l) ORDER BY l.created_at DESC), '[]'::jsonb)
                            FROM (SELECT id, name, phone, email, store_id, vehicle_id, created_at FROM public.leads ORDER BY created_at DESC LIMIT 10) l),
    'recent_audit',       (SELECT COALESCE(jsonb_agg(to_jsonb(a) ORDER BY a.created_at DESC), '[]'::jsonb)
                            FROM (SELECT id, entity, action, actor_name, summary, created_at FROM public.audit_logs ORDER BY created_at DESC LIMIT 15) a)
  ) INTO result;
  RETURN result;
END $$;

-- Admin list of all users with aggregates
CREATE OR REPLACE FUNCTION public.admin_list_users()
RETURNS TABLE(
  id uuid, email text, full_name text, created_at timestamptz,
  last_sign_in_at timestamptz, is_admin boolean,
  plan plan_tier, sub_status sub_status,
  stores_count bigint, vehicles_count bigint, leads_count bigint
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Somente admins'; END IF;
  RETURN QUERY
    SELECT u.id, u.email::text, p.full_name, u.created_at, u.last_sign_in_at,
           EXISTS(SELECT 1 FROM public.user_roles r WHERE r.user_id = u.id AND r.role='admin'),
           s.plan, s.status,
           (SELECT count(*) FROM public.stores st WHERE st.owner_id = u.id),
           (SELECT count(*) FROM public.vehicles v JOIN public.stores st ON st.id = v.store_id WHERE st.owner_id = u.id),
           (SELECT count(*) FROM public.leads l JOIN public.stores st ON st.id = l.store_id WHERE st.owner_id = u.id)
    FROM auth.users u
    LEFT JOIN public.profiles p ON p.id = u.id
    LEFT JOIN public.subscriptions s ON s.user_id = u.id
    ORDER BY u.created_at DESC;
END $$;

-- Admin list of all stores with owner info
CREATE OR REPLACE FUNCTION public.admin_list_stores()
RETURNS TABLE(
  id uuid, name text, slug text, published boolean,
  owner_id uuid, owner_email text,
  vehicles_count bigint, leads_count bigint,
  created_at timestamptz, updated_at timestamptz
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Somente admins'; END IF;
  RETURN QUERY
    SELECT st.id, st.name, st.slug, st.published,
           st.owner_id, u.email::text,
           (SELECT count(*) FROM public.vehicles v WHERE v.store_id = st.id),
           (SELECT count(*) FROM public.leads l WHERE l.store_id = st.id),
           st.created_at, st.updated_at
    FROM public.stores st
    LEFT JOIN auth.users u ON u.id = st.owner_id
    ORDER BY st.created_at DESC;
END $$;
