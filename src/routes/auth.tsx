import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Car, Loader2, Mail, Lock, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — AutoSite" },
      { name: "description", content: "Acesse ou crie sua conta na AutoSite." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    // If already signed in, bounce to the app
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) navigate({ to: "/dashboard" });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast.success("Se o email existir, enviamos um link para redefinir sua senha.");
        setMode("login");
      } else if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: name },
          },
        });
        if (error) throw error;
        toast.success("Conta criada! Verifique seu email se a confirmação estiver ativa.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao autenticar");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error(result.error.message || "Falha no login com Google");
      setLoading(false);
      return;
    }
    if (result.redirected) return;
    // Session set — navigate
    navigate({ to: "/dashboard" });
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
        <h1 className="font-display text-2xl font-bold text-center">
          {mode === "login" ? "Bem-vindo de volta" : mode === "signup" ? "Criar sua conta" : "Recuperar senha"}
        </h1>
        <p className="mt-1 text-center text-sm text-muted-foreground">
          {mode === "login"
            ? "Acesse o painel da sua revenda."
            : mode === "signup"
            ? "Comece grátis por 7 dias."
            : "Enviaremos um link para o seu email."}
        </p>

        {mode !== "forgot" && (
          <>
            <button
              onClick={handleGoogle}
              disabled={loading}
              className="mt-6 flex w-full items-center justify-center gap-3 rounded-full border border-border bg-background px-5 py-3 text-sm font-medium transition hover:bg-surface disabled:opacity-60"
            >
              <GoogleIcon />
              Continuar com Google
            </button>

            <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
              <div className="h-px flex-1 bg-border" />
              ou com email
              <div className="h-px flex-1 bg-border" />
            </div>
          </>
        )}

        <form onSubmit={handleEmail} className="space-y-3">
          {mode === "signup" && (
            <Field icon={<User className="h-4 w-4" />} value={name} onChange={setName} placeholder="Nome completo" />
          )}
          <Field icon={<Mail className="h-4 w-4" />} type="email" value={email} onChange={setEmail} placeholder="email@revenda.com.br" required />
          {mode !== "forgot" && (
            <Field icon={<Lock className="h-4 w-4" />} type="password" value={password} onChange={setPassword} placeholder="Senha (mínimo 6 caracteres)" required minLength={6} />
          )}
          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-elegant transition hover:brightness-110 disabled:opacity-60"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === "login" ? "Entrar" : mode === "signup" ? "Criar conta" : "Enviar link"}
          </button>
        </form>

        {mode === "login" && (
          <p className="mt-4 text-center text-xs">
            <button onClick={() => setMode("forgot")} className="text-muted-foreground hover:text-primary hover:underline">
              Esqueci minha senha
            </button>
          </p>
        )}

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {mode === "forgot" ? (
            <button onClick={() => setMode("login")} className="font-medium text-primary hover:underline">
              ← Voltar para login
            </button>
          ) : (
            <>
              {mode === "login" ? "Ainda não tem conta?" : "Já tem conta?"}{" "}
              <button
                onClick={() => setMode(mode === "login" ? "signup" : "login")}
                className="font-medium text-primary hover:underline"
              >
                {mode === "login" ? "Criar agora" : "Entrar"}
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}

function Field({
  icon, type = "text", value, onChange, placeholder, required, minLength,
}: {
  icon: React.ReactNode; type?: string; value: string; onChange: (v: string) => void;
  placeholder: string; required?: boolean; minLength?: number;
}) {
  return (
    <label className="flex items-center gap-3 rounded-xl border border-border bg-background px-4 py-3 focus-within:border-primary">
      <span className="text-muted-foreground">{icon}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        minLength={minLength}
        className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
      />
    </label>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.1 18.9 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.5-4.5 2.4-7.2 2.4-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.6 39.6 16.2 44 24 44z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.1 5.6l6.2 5.2C40.9 35.7 44 30.3 44 24c0-1.3-.1-2.3-.4-3.5z"/>
    </svg>
  );
}
