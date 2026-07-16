import { Lock, Sparkles } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { usePlanFeature } from "@/hooks/use-plan-feature";
import type { Feature } from "@/lib/features.functions";
import { Loader2 } from "lucide-react";

const REQUIRED: Record<Feature, string> = {
  custom_domain: "Start",
  multiple_users: "Pro",
  blog: "Pro",
  chatbot: "Pro",
  banners: "Pro",
  advanced_stats: "Pro",
  priority_support: "Pro",
  crm: "Premium",
  account_manager: "Premium",
};

export function FeatureGate({ feature, children, title }: { feature: Feature; children: React.ReactNode; title?: string }) {
  const { enabled, loading } = usePlanFeature(feature);
  if (loading) return <div className="grid place-items-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (enabled) return <>{children}</>;
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-gradient-primary text-primary-foreground shadow-glow">
        <Lock className="h-5 w-5" />
      </div>
      <h2 className="mt-4 font-display text-xl font-bold">{title ?? "Recurso premium"}</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Este recurso está disponível a partir do plano <span className="font-semibold text-foreground">{REQUIRED[feature]}</span>.
      </p>
      <Link to="/" hash="planos" className="mt-6 inline-flex items-center gap-2 rounded-full bg-gradient-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-glow">
        <Sparkles className="h-4 w-4" /> Ver planos
      </Link>
    </div>
  );
}
