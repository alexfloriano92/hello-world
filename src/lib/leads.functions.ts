import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

function publicClient() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

const LeadInput = z.object({
  store_id: z.string().uuid(),
  vehicle_id: z.string().uuid().nullable().optional(),
  name: z.string().min(2).max(120),
  phone: z.string().max(40).optional().nullable(),
  email: z.string().email().max(200).optional().nullable(),
  message: z.string().max(2000).optional().nullable(),
  source: z.string().max(40).optional(),
});

export const submitLead = createServerFn({ method: "POST" })
  .validator((data: unknown) => LeadInput.parse(data))
  .handler(async ({ data }) => {
    const supa = publicClient();
    const { error } = await supa.from("leads").insert({
      store_id: data.store_id,
      vehicle_id: data.vehicle_id ?? null,
      name: data.name,
      phone: data.phone ?? null,
      email: data.email ?? null,
      message: data.message ?? null,
      source: data.source ?? "site",
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const EventInput = z.object({
  store_id: z.string().uuid(),
  vehicle_id: z.string().uuid().nullable().optional(),
  event_type: z.enum(["view_store", "view_vehicle", "click_whatsapp", "submit_lead"]),
  session_id: z.string().max(64).optional().nullable(),
  referrer: z.string().max(500).optional().nullable(),
  user_agent: z.string().max(500).optional().nullable(),
});

export const trackEvent = createServerFn({ method: "POST" })
  .validator((data: unknown) => EventInput.parse(data))
  .handler(async ({ data }) => {
    const supa = publicClient();
    await supa.from("analytics_events").insert({
      store_id: data.store_id,
      vehicle_id: data.vehicle_id ?? null,
      event_type: data.event_type,
      session_id: data.session_id ?? null,
      referrer: data.referrer ?? null,
      user_agent: data.user_agent ?? null,
    });
    return { ok: true };
  });
