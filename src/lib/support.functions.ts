import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function priorityFor(supabase: any, userId: string): Promise<string> {
  const { data } = await supabase.from("subscriptions").select("plan").eq("user_id", userId).maybeSingle();
  if (data?.plan === "premium") return "urgent";
  if (data?.plan === "pro") return "high";
  return "normal";
}

export const listMyTickets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    const q = context.supabase.from("support_tickets").select("id,subject,status,priority,plan_snapshot,created_at,updated_at,user_id");
    const { data, error } = isAdmin ? await q.order("updated_at", { ascending: false }) : await q.eq("user_id", context.userId).order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { items: data ?? [], isAdmin: !!isAdmin };
  });

export const createTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    subject: z.string().min(3).max(200),
    message: z.string().min(3).max(4000),
    store_id: z.string().uuid().nullable().optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: sub } = await context.supabase.from("subscriptions").select("plan").eq("user_id", context.userId).maybeSingle();
    const priority = await priorityFor(context.supabase, context.userId);
    const { data: ticket, error } = await context.supabase.from("support_tickets").insert({
      user_id: context.userId, subject: data.subject, priority,
      plan_snapshot: sub?.plan ?? "free", store_id: data.store_id ?? null,
    }).select().single();
    if (error) throw new Error(error.message);
    await context.supabase.from("ticket_messages").insert({
      ticket_id: ticket.id, user_id: context.userId, from_admin: false, content: data.message,
    });
    return ticket;
  });

export const getTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const [{ data: ticket }, { data: msgs }] = await Promise.all([
      context.supabase.from("support_tickets").select("*").eq("id", data.id).maybeSingle(),
      context.supabase.from("ticket_messages").select("*").eq("ticket_id", data.id).order("created_at"),
    ]);
    if (!ticket) throw new Error("Ticket não encontrado");
    return { ticket, messages: msgs ?? [] };
  });

export const replyTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ ticket_id: z.string().uuid(), content: z.string().min(1).max(4000) }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    const { data: msg, error } = await context.supabase.from("ticket_messages").insert({
      ticket_id: data.ticket_id, user_id: context.userId, from_admin: !!isAdmin, content: data.content,
    }).select().single();
    if (error) throw new Error(error.message);
    await context.supabase.from("support_tickets").update({ updated_at: new Date().toISOString() }).eq("id", data.ticket_id);
    return msg;
  });

export const closeTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("support_tickets").update({ status: "closed" }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
