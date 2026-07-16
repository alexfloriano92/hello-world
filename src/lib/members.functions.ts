import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const Roles = z.enum(["admin", "editor", "viewer"]);

async function assertOwnerOrPlan(supabase: any, userId: string, storeId: string) {
  const { data: store } = await supabase.from("stores").select("id,owner_id").eq("id", storeId).maybeSingle();
  if (!store || store.owner_id !== userId) throw new Error("Somente o dono pode gerenciar membros");
  const { data: has } = await supabase.rpc("plan_has_feature", { _user_id: userId, _feature: "multiple_users" });
  if (!has) throw new Error("Recurso disponível no plano Pro ou superior");
}

export const listMembers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ store_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: has } = await context.supabase.rpc("has_store_access", { _store_id: data.store_id, _user_id: context.userId });
    if (!has) throw new Error("Sem acesso");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: members }, { data: invites }, { data: store }] = await Promise.all([
      supabaseAdmin.from("store_members").select("id,user_id,role,created_at").eq("store_id", data.store_id),
      supabaseAdmin.from("store_invites").select("id,email,role,token,expires_at,accepted_at,created_at").eq("store_id", data.store_id).order("created_at", { ascending: false }),
      supabaseAdmin.from("stores").select("owner_id").eq("id", data.store_id).maybeSingle(),
    ]);
    const ids = Array.from(new Set([...(members ?? []).map((m) => m.user_id), store?.owner_id].filter(Boolean))) as string[];
    const { data: users } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    const map = new Map<string, string>();
    for (const u of users?.users ?? []) if (ids.includes(u.id)) map.set(u.id, u.email ?? u.id);
    return {
      owner: store?.owner_id ? { user_id: store.owner_id, email: map.get(store.owner_id) ?? null } : null,
      members: (members ?? []).map((m) => ({ ...m, email: map.get(m.user_id) ?? null })),
      invites: invites ?? [],
    };
  });

export const inviteMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ store_id: z.string().uuid(), email: z.string().email(), role: Roles }).parse(d))
  .handler(async ({ data, context }) => {
    await assertOwnerOrPlan(context.supabase, context.userId, data.store_id);
    const { data: row, error } = await context.supabase.from("store_invites").insert({
      store_id: data.store_id, email: data.email.toLowerCase(), role: data.role, invited_by: context.userId,
    }).select("id,token").single();
    if (error) throw new Error(error.message);
    return row;
  });

export const revokeInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ invite_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("store_invites").delete().eq("id", data.invite_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removeMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ member_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("store_members").delete().eq("id", data.member_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const acceptInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ token: z.string().min(10) }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: mem, error } = await context.supabase.rpc("accept_store_invite", { _token: data.token });
    if (error) throw new Error(error.message);
    return mem;
  });

export const getInviteInfo = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ token: z.string().min(10) }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: inv } = await supabaseAdmin.from("store_invites").select("email,role,expires_at,accepted_at,store_id").eq("token", data.token).maybeSingle();
    if (!inv) return null;
    const { data: st } = await supabaseAdmin.from("stores").select("name").eq("id", inv.store_id).maybeSingle();
    return { ...inv, store_name: st?.name ?? null };
  });
