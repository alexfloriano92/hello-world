import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight, ArrowLeft, Check, Loader2, Upload, Sparkles, Car,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { extractPaletteFromFile, type Palette } from "@/lib/palette";
import { generateStoreCopy, type GeneratedCopy } from "@/lib/generate-copy.functions";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: [{ title: "Configurar sua loja — AutoSite" }, { name: "robots", content: "noindex" }],
  }),
  beforeLoad: async () => {
    const { amIAdmin } = await import("@/lib/payments.functions");
    const { redirect } = await import("@tanstack/react-router");
    try {
      const res = await amIAdmin();
      if (res?.isAdmin) throw redirect({ to: "/admin" });
    } catch (e) {
      if (e && typeof e === "object" && "to" in e) throw e;
    }
  },
  component: Onboarding,
});

type Plan = "start" | "pro" | "premium";
const PLANS: { id: Plan; name: string; price: string; features: string[]; highlight?: boolean }[] = [
  { id: "start", name: "Start", price: "R$ 149/mês", features: ["Até 25 veículos", "Domínio personalizado", "SEO básico"] },
  { id: "pro", name: "Pro", price: "R$ 299/mês", highlight: true, features: ["Até 50 veículos", "Blog + Chatbot IA", "Múltiplos usuários"] },
  { id: "premium", name: "Premium", price: "R$ 599/mês", features: ["Ilimitado", "CRM completo", "OLX, Webmotors, iCarros"] },
];

function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState<0 | 1 | 2 | 3>(0);
  const [plan, setPlan] = useState<Plan>("pro");
  const [storeName, setStoreName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [palette, setPalette] = useState<Palette | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);

  const slug = useMemo(
    () => storeName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
    [storeName],
  );

  const onFile = async (f: File) => {
    setFile(f);
    setLogoPreview(URL.createObjectURL(f));
    setAnalyzing(true);
    try {
      const p = await extractPaletteFromFile(f);
      setPalette(p);
    } catch {
      toast.error("Não foi possível analisar a imagem. Tente outro arquivo.");
    } finally {
      setAnalyzing(false);
    }
  };

  const [copy, setCopy] = useState<GeneratedCopy | null>(null);
  const [generatingCopy, setGeneratingCopy] = useState(false);
  const [copyProgressStep, setCopyProgressStep] = useState(0);
  const [copyWasCanceled, setCopyWasCanceled] = useState(false);
  const [regeneratingCopy, setRegeneratingCopy] = useState(false);
  const copyCanceledRef = useRef(false);

  useEffect(() => {
    if (step === 3 && palette && storeName && !copy && !generatingCopy) {
      copyCanceledRef.current = false;
      setGeneratingCopy(true);
      generateStoreCopy({ data: { storeName, style: palette.style } })
        .then((c) => {
          if (copyCanceledRef.current) return;
          setCopy(c);
        })
        .catch(() => {
          if (copyCanceledRef.current) return;
          toast.error("Não foi possível gerar textos, usando padrão.");
        })
        .finally(() => {
          if (copyCanceledRef.current) return;
          setGeneratingCopy(false);
        });
    }
  }, [step, palette, storeName, copy, generatingCopy]);

  const cancelCopyGeneration = () => {
    if (!generatingCopy) return;
    copyCanceledRef.current = true;
    setGeneratingCopy(false);
    setCopyWasCanceled(true);
    setCopy({
      hero_headline: `${storeName}: seu próximo carro está aqui`,
      hero_subheadline: "Seminovos selecionados, revisados e com garantia.",
      tagline: "Confiança que anda com você",
      about_text: `A ${storeName} é referência em qualidade e confiança no mercado automotivo.`,
      cta_text: "Ver estoque completo",
    });
    toast.info("Geração de textos cancelada. Você pode editar depois.");
  };

  const regenerateCopy = async () => {
    if (!palette || !storeName || regeneratingCopy || generatingCopy) return;
    setRegeneratingCopy(true);
    try {
      const c = await generateStoreCopy({ data: { storeName, style: palette.style } });
      setCopy(c);
      setCopyWasCanceled(false);
      toast.success("Textos gerados com sucesso!");
    } catch {
      toast.error("Não foi possível gerar os textos. Tente novamente.");
    } finally {
      setRegeneratingCopy(false);
    }
  };

  useEffect(() => {
    if (!generatingCopy) return;
    setCopyProgressStep(0);
    const interval = setInterval(() => setCopyProgressStep((s) => (s + 1) % 3), 900);
    return () => clearInterval(interval);
  }, [generatingCopy]);

  const finish = async () => {
    if (!file || !palette || !storeName) return;
    setSaving(true);
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;
      if (!uid) throw new Error("Sessão expirada");

      // Upload logo
      const ext = file.name.split(".").pop() || "png";
      const path = `${uid}/${slug || "loja"}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("logos").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: signed } = await supabase.storage.from("logos").createSignedUrl(path, 60 * 60 * 24 * 365);

      // Ensure slug uniqueness
      let finalSlug = slug || `loja-${Date.now()}`;
      const { data: existing } = await supabase.from("stores").select("id").eq("slug", finalSlug).maybeSingle();
      if (existing) finalSlug = `${finalSlug}-${Math.floor(Math.random() * 1000)}`;

      const { error: insErr } = await supabase.from("stores").insert({
        owner_id: uid,
        name: storeName,
        slug: finalSlug,
        plan,
        logo_url: signed?.signedUrl ?? path,
        primary_color: palette.primary,
        secondary_color: palette.secondary,
        accent_color: palette.accent,
        neutral_color: palette.neutral,
        style_tag: palette.style,
        onboarded: true,
        ...(copy ?? {}),
      } as any);
      if (insErr) throw insErr;

      toast.success("Loja criada! Bem-vindo ao painel.");
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const canNext =
    (step === 0 && !!plan) ||
    (step === 1 && storeName.trim().length > 2) ||
    (step === 2 && !!palette) ||
    step === 3;

  return (
    <div className="min-h-screen bg-gradient-hero px-6 py-10">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-primary shadow-glow">
              <Car className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-display text-lg font-bold">AutoSite</span>
          </a>
          <Stepper current={step} />
        </div>

        <div className="rounded-3xl border border-border bg-card p-8 shadow-elegant md:p-12">
          {step === 3 && generatingCopy && (
            <CopyProgress step={copyProgressStep} onCancel={cancelCopyGeneration} />
          )}
          <fieldset disabled={generatingCopy} className="border-0 p-0 m-0 min-w-0 transition-opacity disabled:opacity-60">
            {step === 0 && <StepPlan plan={plan} setPlan={setPlan} />}
            {step === 1 && <StepStoreName name={storeName} setName={setStoreName} slug={slug} />}
            {step === 2 && (
              <StepLogo
                file={file} logoPreview={logoPreview} palette={palette} analyzing={analyzing}
                onFile={onFile}
              />
            )}
            {step === 3 && <StepReview storeName={storeName} plan={plan} palette={palette!} setPalette={setPalette} logoPreview={logoPreview!} copy={copy} generatingCopy={generatingCopy} copyWasCanceled={copyWasCanceled} regeneratingCopy={regeneratingCopy} onRegenerate={regenerateCopy} />}
          </fieldset>

          <div className="mt-10 flex items-center justify-between">
            <button
              onClick={() => setStep((s) => Math.max(0, s - 1) as typeof step)}
              disabled={step === 0 || generatingCopy}
              className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-medium disabled:opacity-40"
            >
              <ArrowLeft className="h-4 w-4" /> Voltar
            </button>
            {step < 3 ? (
              <button
                onClick={() => setStep((s) => (s + 1) as typeof step)}
                disabled={!canNext || generatingCopy}
                className="inline-flex items-center gap-2 rounded-full bg-gradient-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-elegant transition hover:brightness-110 disabled:opacity-50"
              >
                Continuar <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={finish}
                disabled={saving || !palette || !file || generatingCopy}
                className="inline-flex items-center gap-2 rounded-full bg-gradient-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-elegant transition hover:brightness-110 disabled:opacity-50"
                title={generatingCopy ? "Aguarde a IA terminar de gerar os textos…" : undefined}
              >
                {(saving || generatingCopy) && <Loader2 className="h-4 w-4 animate-spin" />}
                {generatingCopy ? "Gerando textos…" : "Criar minha loja"} <Sparkles className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* Steps */
function Stepper({ current }: { current: number }) {
  const labels = ["Plano", "Loja", "Logo", "Revisão"];
  return (
    <div className="hidden items-center gap-2 md:flex">
      {labels.map((l, i) => (
        <div key={l} className="flex items-center gap-2">
          <div className={`grid h-7 w-7 place-items-center rounded-full text-xs font-bold ${
            i <= current ? "bg-gradient-primary text-primary-foreground shadow-glow" : "bg-muted text-muted-foreground"
          }`}>{i + 1}</div>
          <span className={`text-sm ${i <= current ? "text-foreground" : "text-muted-foreground"}`}>{l}</span>
          {i < labels.length - 1 && <div className="mx-2 h-px w-8 bg-border" />}
        </div>
      ))}
    </div>
  );
}

function StepPlan({ plan, setPlan }: { plan: Plan; setPlan: (p: Plan) => void }) {
  return (
    <div>
      <h2 className="font-display text-3xl font-bold">Escolha seu plano</h2>
      <p className="mt-2 text-muted-foreground">Comece grátis por 7 dias. Cancele quando quiser.</p>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {PLANS.map((p) => (
          <button
            key={p.id}
            onClick={() => setPlan(p.id)}
            className={`relative rounded-2xl border p-6 text-left transition ${
              plan === p.id ? "border-primary bg-primary/5 shadow-elegant" : "border-border hover:border-primary/40"
            }`}
          >
            {p.highlight && (
              <span className="absolute -top-2 right-4 rounded-full bg-gradient-primary px-2 py-0.5 text-[10px] font-bold uppercase text-primary-foreground">
                Popular
              </span>
            )}
            <h3 className="font-display text-xl font-bold">{p.name}</h3>
            <p className="mt-1 text-sm text-primary">{p.price}</p>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              {p.features.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 text-primary" /> {f}
                </li>
              ))}
            </ul>
          </button>
        ))}
      </div>
    </div>
  );
}

function StepStoreName({ name, setName, slug }: { name: string; setName: (v: string) => void; slug: string }) {
  return (
    <div>
      <h2 className="font-display text-3xl font-bold">Como se chama sua revenda?</h2>
      <p className="mt-2 text-muted-foreground">Isso vai aparecer no seu site e no seu subdomínio.</p>
      <div className="mt-8 space-y-3">
        <label className="block">
          <span className="text-sm text-muted-foreground">Nome da loja</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex.: Prime Motors"
            className="mt-1 w-full rounded-xl border border-border bg-background px-4 py-3 text-base outline-none focus:border-primary"
          />
        </label>
        <div className="rounded-xl border border-border bg-surface/50 px-4 py-3 font-mono text-sm text-muted-foreground">
          {(slug || "sua-loja")}.autosite.com.br
        </div>
      </div>
    </div>
  );
}

function StepLogo({
  file, logoPreview, palette, analyzing, onFile,
}: {
  file: File | null; logoPreview: string | null; palette: Palette | null; analyzing: boolean;
  onFile: (f: File) => void;
}) {
  return (
    <div>
      <h2 className="font-display text-3xl font-bold">Envie sua logomarca</h2>
      <p className="mt-2 text-muted-foreground">
        Nossa IA analisa cores e estilo em segundos. Formatos: PNG, JPG, SVG.
      </p>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <label className="group relative flex aspect-square cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-surface/40 p-8 text-center transition hover:border-primary hover:bg-surface">
          <input
            type="file"
            accept="image/*"
            className="absolute inset-0 cursor-pointer opacity-0"
            onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
          />
          {logoPreview ? (
            <img src={logoPreview} alt="Logo" className="max-h-full max-w-full object-contain" />
          ) : (
            <>
              <Upload className="h-10 w-10 text-muted-foreground group-hover:text-primary" />
              <p className="mt-3 font-medium">Clique para enviar ou arraste</p>
              <p className="mt-1 text-xs text-muted-foreground">Máximo 5 MB</p>
            </>
          )}
        </label>

        <div className="rounded-2xl border border-border bg-surface/40 p-6">
          <h3 className="font-display text-lg font-semibold flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> Análise da IA
          </h3>
          {analyzing && (
            <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Analisando cores e estilo…
            </div>
          )}
          {!analyzing && !palette && (
            <p className="mt-6 text-sm text-muted-foreground">
              Envie sua logo para ver a paleta gerada.
            </p>
          )}
          {palette && (
            <div className="mt-6 space-y-4">
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground">Estilo detectado</p>
                <p className="mt-1 font-display text-xl font-bold capitalize text-gradient">{palette.style}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground">Paleta</p>
                <div className="mt-2 grid grid-cols-4 gap-2">
                  {([
                    ["Primária", palette.primary],
                    ["Secundária", palette.secondary],
                    ["Destaque", palette.accent],
                    ["Neutra", palette.neutral],
                  ] as const).map(([label, color]) => (
                    <div key={label} className="rounded-lg border border-border overflow-hidden">
                      <div className="aspect-square" style={{ background: color }} />
                      <div className="px-2 py-1.5 text-[10px]">
                        <p className="font-medium">{label}</p>
                        <p className="font-mono text-muted-foreground">{color}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      {file && <p className="mt-4 text-xs text-muted-foreground">Arquivo: {file.name}</p>}
    </div>
  );
}

function StepReview({
  storeName, plan, palette, setPalette, logoPreview, copy, generatingCopy,
  copyWasCanceled, regeneratingCopy, onRegenerate,
}: {
  storeName: string;
  plan: Plan;
  palette: Palette;
  setPalette: (updater: (p: Palette | null) => Palette | null) => void;
  logoPreview: string;
  copy: GeneratedCopy | null;
  generatingCopy: boolean;
  copyWasCanceled: boolean;
  regeneratingCopy: boolean;
  onRegenerate: () => void;
}) {
  const swatches = [
    { key: "primary" as const, label: "Primária", color: palette.primary },
    { key: "secondary" as const, label: "Secundária", color: palette.secondary },
    { key: "accent" as const, label: "Destaque", color: palette.accent },
    { key: "neutral" as const, label: "Neutra", color: palette.neutral },
  ];

  const isHex = (v: string) => /^#[0-9a-fA-F]{6}$/.test(v);
  const updateColor = (key: keyof Palette, value: string) => {
    setPalette((p) => (p ? { ...p, [key]: value } : p));
  };
  const resetOne = (key: "primary" | "secondary" | "accent" | "neutral") => {
    // no-op; user can re-upload if needed. Reset removed for simplicity.
    void key;
  };
  void resetOne;

  return (
    <div>
      <h2 className="font-display text-3xl font-bold">Tudo pronto!</h2>
      <p className="mt-2 text-muted-foreground">Ajuste as cores se quiser — a prévia atualiza em tempo real.</p>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        {/* Loja */}
        <div className="rounded-2xl border border-border p-6">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Loja</p>
          <p className="mt-1 font-display text-2xl font-bold">{storeName}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
              Plano {plan}
            </span>
            <span className="inline-flex items-center rounded-full border border-border bg-surface/60 px-3 py-1 text-xs font-semibold uppercase tracking-wider capitalize">
              Estilo {palette.style}
            </span>
          </div>
        </div>

        {/* Logo */}
        <div className="rounded-2xl border border-border p-6 flex items-center gap-4">
          <img src={logoPreview} alt="Logo" className="h-20 w-20 rounded-xl bg-white object-contain p-2" />
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Logomarca</p>
            <p className="mt-1 text-sm text-muted-foreground">Aplicada em toda identidade da loja.</p>
          </div>
        </div>
      </div>

      {/* Paleta editável */}
      <div className="mt-6 rounded-2xl border border-border p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Paleta editável</p>
            <p className="mt-1 font-display text-lg font-semibold">Personalize as 4 cores da sua marca</p>
          </div>
          <span className="hidden text-xs text-muted-foreground md:inline">Clique no swatch ou edite o hex</span>
        </div>
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {swatches.map(({ key, label, color }) => {
            const valid = isHex(color);
            return (
              <div key={key} className="overflow-hidden rounded-xl border border-border">
                <label className="relative block aspect-[4/3] cursor-pointer" style={{ background: valid ? color : "#000" }}>
                  <input
                    type="color"
                    value={valid ? color : "#000000"}
                    onChange={(e) => updateColor(key, e.target.value)}
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                    aria-label={`Escolher cor ${label}`}
                  />
                </label>
                <div className="px-3 py-2 space-y-1">
                  <p className="text-sm font-semibold">{label}</p>
                  <input
                    type="text"
                    value={color}
                    onChange={(e) => {
                      const v = e.target.value.startsWith("#") ? e.target.value : `#${e.target.value}`;
                      updateColor(key, v.slice(0, 7));
                    }}
                    spellCheck={false}
                    className={`w-full rounded-md border bg-background px-2 py-1 font-mono text-xs uppercase outline-none focus:border-primary ${
                      valid ? "border-border text-muted-foreground" : "border-destructive text-destructive"
                    }`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>


      {/* Textos gerados por IA */}
      <div className="mt-6 rounded-2xl border border-border p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Textos gerados por IA</p>
            <p className="mt-1 font-display text-lg font-semibold">Copy personalizado para sua loja</p>
            {copyWasCanceled && !regeneratingCopy && (
              <p className="mt-1 text-xs text-muted-foreground">Você cancelou a geração — usando textos padrão.</p>
            )}
          </div>
          {(copyWasCanceled || regeneratingCopy) && !generatingCopy && (
            <button
              type="button"
              onClick={onRegenerate}
              disabled={regeneratingCopy}
              className="inline-flex shrink-0 items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {regeneratingCopy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              {regeneratingCopy ? "Gerando…" : "Gerar novamente"}
            </button>
          )}
        </div>
        {copy && (
          <div className="mt-4 space-y-3 text-sm">
            <div><span className="text-xs uppercase tracking-wider text-muted-foreground">Título:</span> <span className="font-semibold">{copy.hero_headline}</span></div>
            <div><span className="text-xs uppercase tracking-wider text-muted-foreground">Subtítulo:</span> <span className="text-muted-foreground">{copy.hero_subheadline}</span></div>
            <div><span className="text-xs uppercase tracking-wider text-muted-foreground">Slogan:</span> <span className="italic">{copy.tagline}</span></div>
            <div><span className="text-xs uppercase tracking-wider text-muted-foreground">Sobre:</span> <span className="text-muted-foreground">{copy.about_text}</span></div>
          </div>
        )}
      </div>

      {/* Preview simulado do site */}
      <div className="mt-6 rounded-2xl border border-border p-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Prévia do site</p>
        <div
          className="mt-4 overflow-hidden rounded-xl border border-border"
          style={{ background: palette.neutral, color: "#fff" }}
        >
          <div
            className="flex items-center justify-between px-5 py-3"
            style={{ background: `linear-gradient(135deg, ${palette.primary}, ${palette.secondary})` }}
          >
            <div className="flex items-center gap-2">
              <img src={logoPreview} alt="" className="h-7 w-7 rounded bg-white object-contain p-0.5" />
              <span className="font-display text-sm font-bold">{storeName}</span>
            </div>
            <span
              className="rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider"
              style={{ background: palette.accent, color: palette.neutral }}
            >
              WhatsApp
            </span>
          </div>
          <div className="px-5 py-6">
            <p className="font-display text-lg font-bold">
              {copy?.hero_headline ?? "Seminovos com procedência garantida"}
            </p>
            <p className="mt-1 text-xs opacity-70">
              {copy?.hero_subheadline ?? "Financiamento em até 60x · Aceitamos seu usado"}
            </p>
            <div className="mt-4 flex gap-2">
              <span
                className="rounded-full px-3 py-1.5 text-[11px] font-semibold"
                style={{ background: palette.primary, color: "#fff" }}
              >
                {copy?.cta_text ?? "Ver estoque"}
              </span>
              <span
                className="rounded-full border px-3 py-1.5 text-[11px] font-semibold"
                style={{ borderColor: palette.accent, color: palette.accent }}
              >
                Simular parcelas
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CopyProgress({ step, onCancel }: { step: number; onCancel: () => void }) {
  const steps = ["Analisando identidade", "Criando textos", "Finalizando copy"];
  const [confirmOpen, setConfirmOpen] = useState(false);
  return (
    <div className="mb-6 rounded-2xl border border-primary/20 bg-primary/5 p-4">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/10">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Gerando textos com IA...</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {steps.map((label, i) => (
              <span
                key={label}
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider transition-colors ${
                  i <= step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                {i < step && <Check className="h-3 w-3" />}
                {label}
              </span>
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          className="shrink-0 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          Cancelar
        </button>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar a geração de textos?</AlertDialogTitle>
            <AlertDialogDescription>
              Os textos gerados pela IA serão substituídos por uma versão padrão. Você poderá editá-los depois no painel da loja.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuar gerando</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmOpen(false);
                onCancel();
              }}
            >
              Sim, cancelar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
