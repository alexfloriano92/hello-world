
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS whatsapp_api_token text,
  ADD COLUMN IF NOT EXISTS whatsapp_phone_id text,
  ADD COLUMN IF NOT EXISTS whatsapp_api_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS feeds_enabled boolean NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  to_phone text NOT NULL,
  body text NOT NULL,
  status text NOT NULL DEFAULT 'sent',
  provider_message_id text,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.whatsapp_messages TO authenticated;
GRANT ALL ON public.whatsapp_messages TO service_role;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Store members can view whatsapp messages"
  ON public.whatsapp_messages FOR SELECT TO authenticated
  USING (public.has_store_access(store_id, auth.uid()));

CREATE POLICY "Store members can insert whatsapp messages"
  ON public.whatsapp_messages FOR INSERT TO authenticated
  WITH CHECK (public.has_store_access(store_id, auth.uid()));

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_store ON public.whatsapp_messages(store_id, created_at DESC);
