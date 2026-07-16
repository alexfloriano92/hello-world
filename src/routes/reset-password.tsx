import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Car, Lock, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Redefinir senha — AutoSite" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Supabase places recovery tokens in the URL hash and fires a
    // PASSWORD_RECOVERY event once the session is established.
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    // If arriving with an existing session (no hash), also allow the form.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) return toast.error("Senha deve ter pelo menos 6 caracteres");
    if (password !== confirm) return toast.error("As senhas não coincidem");
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Senha atualizada. Faça login com a nova senha.");
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  return (
    <div className="min-h-screen bg-gradient-hero flex flex-col items-center justify-center px-6 py-16">
      <a href="/" className="mb-8 flex items-center gap-2">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-primary shadow-glow">
          <Car className="h-5 w-5 text-primary-foreground" />
        </div>
        <span className="font-display text-xl font-bold">AutoSite</span>
      </a>
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-elegant">
        <h1 className="font-display text-2xl font-bold text-center">Definir nova senha</h1>
        <p className="mt-1 text-center text-sm text-muted-foreground">
          {ready ? "Escolha uma senha forte que você vá lembrar." : "Validando link de recuperação…"}
        </p>
        <form onSubmit={submit} className="mt-6 space-y-3">
          <label className="flex items-center gap-3 rounded-xl border border-border bg-background px-4 py-3 focus-within:border-primary">
            <Lock className="h-4 w-4 text-muted-foreground" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Nova senha (mínimo 6)"
              minLength={6}
              disabled={!ready || saving}
              required
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </label>
          <label className="flex items-center gap-3 rounded-xl border border-border bg-background px-4 py-3 focus-within:border-primary">
            <Lock className="h-4 w-4 text-muted-foreground" />
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Confirmar nova senha"
              minLength={6}
              disabled={!ready || saving}
              required
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </label>
          <button
            type="submit"
            disabled={!ready || saving}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-elegant hover:brightness-110 disabled:opacity-60"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Atualizar senha
          </button>
        </form>
      </div>
    </div>
  );
}
