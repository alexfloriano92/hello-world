
DROP POLICY IF EXISTS "Public can submit leads" ON public.leads;
CREATE POLICY "Public can submit leads" ON public.leads FOR INSERT TO anon, authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = leads.store_id AND s.published = true));

DROP POLICY IF EXISTS "Public can insert analytics" ON public.analytics_events;
CREATE POLICY "Public can insert analytics" ON public.analytics_events FOR INSERT TO anon, authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = analytics_events.store_id));

REVOKE EXECUTE ON FUNCTION public.handle_new_user_subscription() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_audit_vehicles() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_audit_stores() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.audit_actor_name(uuid) FROM PUBLIC, anon, authenticated;
