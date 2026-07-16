import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const listAllSubscriptions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("admin_list_subscriptions");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const UpdateInput = z.object({
  user_id: z.string().uuid(),
  plan: z.enum(["free", "starter", "pro", "premium"]),
  status: z.enum(["active", "past_due", "canceled", "trialing"]),
  vehicle_limit: z.number().int().min(0).max(100000),
  current_period_end: z.string().nullable().optional(),
});

export const updateSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => UpdateInput.parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase.rpc("admin_update_subscription", {
      _user_id: data.user_id,
      _plan: data.plan,
      _status: data.status,
      _vehicle_limit: data.vehicle_limit,
      _current_period_end: (data.current_period_end ?? null) as unknown as string,
    });
    if (error) throw new Error(error.message);
    return row;
  });
