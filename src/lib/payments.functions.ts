import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const CreateInput = z.object({
  plan: z.enum(["starter", "pro", "premium"]),
  cycle: z.enum(["monthly", "yearly"]),
  amount_brl: z.number().positive().max(100000),
});

export const createPaymentRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => CreateInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId, claims } = context;
    const { data: row, error } = await supabase
      .from("payment_requests")
      .insert({
        user_id: userId,
        user_email: (claims as { email?: string })?.email ?? null,
        plan: data.plan,
        cycle: data.cycle,
        amount_brl: data.amount_brl,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const listMyPaymentRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("payment_requests")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listAllPaymentRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");
    const { data, error } = await context.supabase
      .from("payment_requests")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const ReviewInput = z.object({
  request_id: z.string().uuid(),
  notes: z.string().max(1000).optional().nullable(),
});

export const confirmPaymentRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ReviewInput.parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase.rpc("confirm_payment_request", {
      _request_id: data.request_id,
      _notes: data.notes ?? undefined,
    });
    if (error) throw new Error(error.message);
    return row;
  });

export const rejectPaymentRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ReviewInput.parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase.rpc("reject_payment_request", {
      _request_id: data.request_id,
      _notes: data.notes ?? undefined,
    });
    if (error) throw new Error(error.message);
    return row;
  });

export const amIAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    return { isAdmin: !!data };
  });
