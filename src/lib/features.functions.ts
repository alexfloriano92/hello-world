import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const FEATURES = [
  "custom_domain", "multiple_users", "blog", "chatbot",
  "banners", "advanced_stats", "priority_support", "crm", "account_manager",
] as const;
export type Feature = (typeof FEATURES)[number];

export const checkFeatures = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ features: z.array(z.string()).min(1).max(20) }).parse(d))
  .handler(async ({ data, context }) => {
    const out: Record<string, boolean> = {};
    for (const f of data.features) {
      const { data: has } = await context.supabase.rpc("plan_has_feature", {
        _user_id: context.userId, _feature: f,
      });
      out[f] = !!has;
    }
    return out;
  });

export const myPlan = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.from("subscriptions").select("plan,status,vehicle_limit,current_period_end").eq("user_id", context.userId).maybeSingle();
    return data ?? { plan: "free", status: "active", vehicle_limit: 5, current_period_end: null };
  });
