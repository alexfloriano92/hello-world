
CREATE OR REPLACE FUNCTION public.plan_has_feature(_user_id uuid, _feature text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    WHEN 'whatsapp_api'     THEN (SELECT plan = 'premium' FROM p)
    WHEN 'feeds'            THEN (SELECT plan = 'premium' FROM p)
    WHEN 'account_manager'  THEN (SELECT plan = 'premium' FROM p)
    ELSE false
  END;
$function$;

-- Helper: verifica se o dono da loja tem determinado recurso
CREATE OR REPLACE FUNCTION public.store_owner_has_feature(_store_id uuid, _feature text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT public.plan_has_feature(s.owner_id, _feature)
  FROM public.stores s WHERE s.id = _store_id;
$function$;
