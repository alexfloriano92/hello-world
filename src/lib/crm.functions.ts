import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { requireStoreFeature } from "@/lib/plan-guard.server";

const Statuses = z.enum(["novo", "contato", "negociacao", "ganho", "perdido"]);

async function storeIdFromLead(ctx: { supabase: any }, leadId: string): Promise<string> {
  const { data, error } = await ctx.supabase.from("leads").select("store_id").eq("id", leadId).maybeSingle();
  if (error || !data) throw new Error("Lead não encontrado");
  return data.store_id as string;
}

export const listLeadsWithDetails = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ store_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireStoreFeature(context, data.store_id, "crm");
    const { data: rows, error } = await context.supabase
      .from("leads")
      .select("id,name,phone,email,message,status,notes,assigned_to,next_followup,won_at,lost_reason,created_at,vehicle_id")
      .eq("store_id", data.store_id).order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const updateLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid(),
    status: Statuses.optional(),
    notes: z.string().max(4000).nullable().optional(),
    assigned_to: z.string().uuid().nullable().optional(),
    next_followup: z.string().nullable().optional(),
    lost_reason: z.string().max(500).nullable().optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const storeId = await storeIdFromLead(context, data.id);
    await requireStoreFeature(context, storeId, "crm");
    const patch: Record<string, string | null> = {};
    if (data.status !== undefined) {
      patch.status = data.status;
      if (data.status === "ganho") patch.won_at = new Date().toISOString();
      if (data.status !== "ganho") patch.won_at = null;
    }
    if (data.notes !== undefined) patch.notes = data.notes;
    if (data.assigned_to !== undefined) patch.assigned_to = data.assigned_to;
    if (data.next_followup !== undefined) patch.next_followup = data.next_followup;
    if (data.lost_reason !== undefined) patch.lost_reason = data.lost_reason;
    const { data: row, error } = await context.supabase.from("leads").update(patch as never).eq("id", data.id).select().single();
    if (error) throw new Error(error.message);
    return row;
  });

export const addLeadActivity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    lead_id: z.string().uuid(),
    kind: z.enum(["note", "call", "whatsapp", "email", "visit"]).default("note"),
    content: z.string().min(1).max(4000),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const storeId = await storeIdFromLead(context, data.lead_id);
    await requireStoreFeature(context, storeId, "crm");
    const { data: row, error } = await context.supabase.from("lead_activities").insert({
      lead_id: data.lead_id, kind: data.kind, content: data.content, user_id: context.userId,
    }).select().single();
    if (error) throw new Error(error.message);
    return row;
  });

export const listLeadActivities = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ lead_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const storeId = await storeIdFromLead(context, data.lead_id);
    await requireStoreFeature(context, storeId, "crm");
    const { data: rows, error } = await context.supabase.from("lead_activities")
      .select("id,kind,content,created_at,user_id").eq("lead_id", data.lead_id).order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });
