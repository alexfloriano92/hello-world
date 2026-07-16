import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowRight,
  Sparkles,
  Palette,
  Rocket,
  ShieldCheck,
  Zap,
  Car,
  Bot,
  BarChart3,
  Globe,
  Upload,
  Check,
  Star,
  MessageSquare,
  Search,
  Camera,
  Share2,
  Users,
} from "lucide-react";
import { useState } from "react";
import { PixCheckoutModal } from "@/components/PixCheckoutModal";
import type { PlanForCheckout } from "@/lib/checkout";

export const Route = createFileRoute("/")({
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main>
        <Hero />
        <TrustBar />
        <HowItWorks />
        <GeneratorShowcase />
        <Features />
        <Pricing />
        <Integrations />
        <FAQ />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}

/* ----------------------------- HEADER ----------------------------- */
function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/50 glass">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <a href="#" className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-primary shadow-glow">
            <Car className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-display text-lg font-bold tracking-tight">AutoSite</span>
        </a>
        <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
          <a href="#como-funciona" className="hover:text-foreground transition">Como funciona</a>
          <a href="#recursos" className="hover:text-foreground transition">Recursos</a>
          <a href="#planos" className="hover:text-foreground transition">Planos</a>
          <a href="#integracoes" className="hover:text-foreground transition">Integrações</a>
          <a href="#faq" className="hover:text-foreground transition">FAQ</a>
        </nav>
        <div className="flex items-center gap-3">
          <a href="/auth" className="hidden text-sm text-muted-foreground hover:text-foreground sm:inline">
            Entrar
          </a>
          <a
            href="/auth"
            className="inline-flex items-center gap-2 rounded-full bg-gradient-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-elegant transition hover:brightness-110"
          >
            Criar meu site
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    </header>
  );
}

/* ----------------------------- HERO ----------------------------- */
function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-hero">
      <div className="pointer-events-none absolute inset-0 opacity-40 [background-image:linear-gradient(oklch(1_0_0/0.04)_1px,transparent_1px),linear-gradient(90deg,oklch(1_0_0/0.04)_1px,transparent_1px)] [background-size:56px_56px]" />
      <div className="relative mx-auto max-w-7xl px-6 py-24 md:py-32">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border glass px-4 py-1.5 text-xs font-medium text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            IA que transforma sua logo em um site completo
          </div>
          <h1 className="font-display text-5xl font-bold leading-[1.05] tracking-tight md:text-7xl">
            O site da sua revenda,
            <br />
            <span className="text-gradient">pronto em minutos.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground md:text-xl">
            Envie sua logomarca. Nossa IA analisa cores, tipografia e estilo — e entrega um site
            exclusivo, otimizado para SEO e conversão de leads de veículos.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href="/auth"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-primary px-7 py-3.5 text-base font-semibold text-primary-foreground shadow-elegant transition hover:brightness-110"
            >
              Começar grátis por 7 dias
              <ArrowRight className="h-4 w-4" />
            </a>
            <a
              href="#como-funciona"
              className="inline-flex items-center gap-2 rounded-full border border-border px-7 py-3.5 text-base font-medium text-foreground transition hover:bg-surface"
            >
              Ver demonstração
            </a>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Sem cartão de crédito • Cancele quando quiser • Suporte em português
          </p>
        </div>

        <HeroPreview />
      </div>
    </section>
  );
}

function HeroPreview() {
  return (
    <div className="relative mx-auto mt-20 max-w-5xl">
      <div className="absolute -inset-6 -z-10 rounded-[2rem] bg-gradient-mesh opacity-30 blur-3xl" />
      <div className="overflow-hidden rounded-2xl border border-border shadow-elegant glass">
        {/* Mock browser */}
        <div className="flex items-center gap-2 border-b border-border bg-surface/50 px-4 py-3">
          <div className="flex gap-1.5">
            <span className="h-3 w-3 rounded-full bg-destructive/60" />
            <span className="h-3 w-3 rounded-full bg-primary/60" />
            <span className="h-3 w-3 rounded-full bg-success/60" />
          </div>
          <div className="mx-auto flex items-center gap-2 rounded-md bg-background/60 px-3 py-1 text-xs text-muted-foreground">
            <Globe className="h-3 w-3" /> minharevenda.autosite.com.br
          </div>
        </div>
        <div className="relative grid grid-cols-1 gap-6 bg-gradient-to-br from-surface to-background p-8 md:grid-cols-3">
          {[
            { name: "Toyota Corolla XEi", year: "2023 · 18.500 km", price: "R$ 138.900" },
            { name: "Jeep Compass Limited", year: "2022 · 34.200 km", price: "R$ 164.900" },
            { name: "Honda Civic Touring", year: "2021 · 42.000 km", price: "R$ 129.900" },
          ].map((car, i) => (
            <div
              key={car.name}
              className="group overflow-hidden rounded-xl border border-border bg-card shadow-card transition hover:-translate-y-1 hover:shadow-elegant"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <div className="relative h-32 bg-gradient-to-br from-primary/20 via-surface-elevated to-accent/10">
                <div className="absolute right-2 top-2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                  DESTAQUE
                </div>
                <Car className="absolute bottom-2 right-3 h-16 w-16 text-foreground/20" strokeWidth={1} />
              </div>
              <div className="p-4">
                <h3 className="font-display text-sm font-semibold">{car.name}</h3>
                <p className="text-xs text-muted-foreground">{car.year}</p>
                <p className="mt-2 text-base font-bold text-primary">{car.price}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ----------------------------- TRUST BAR ----------------------------- */
function TrustBar() {
  return (
    <section className="border-y border-border/50 bg-surface/30 py-10">
      <div className="mx-auto max-w-7xl px-6">
        <p className="text-center text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Feito para revendas que vendem sério
        </p>
        <div className="mt-6 grid grid-cols-2 gap-6 text-center md:grid-cols-4">
          {[
            { v: "3 min", l: "Site pronto" },
            { v: "+230%", l: "Leads gerados" },
            { v: "99.9%", l: "Uptime garantido" },
            { v: "SEO A+", l: "Core Web Vitals" },
          ].map((s) => (
            <div key={s.l}>
              <p className="font-display text-3xl font-bold text-gradient">{s.v}</p>
              <p className="mt-1 text-sm text-muted-foreground">{s.l}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ----------------------------- COMO FUNCIONA ----------------------------- */
function HowItWorks() {
  const steps = [
    { icon: Upload, title: "1. Envie sua logomarca", desc: "Faça upload da logo em PNG, JPG ou SVG. Nada de briefings longos." },
    { icon: Bot, title: "2. IA analisa sua marca", desc: "Nossa IA identifica cores dominantes, tipografia ideal e estilo visual." },
    { icon: Palette, title: "3. Site é gerado", desc: "Paleta, componentes, banners e layout — 100% exclusivos para sua loja." },
    { icon: Rocket, title: "4. Publique e venda", desc: "Subdomínio grátis ou conecte seu domínio próprio em um clique." },
  ];
  return (
    <section id="como-funciona" className="py-24">
      <div className="mx-auto max-w-7xl px-6">
        <SectionHeader
          eyebrow="Como funciona"
          title="Do logo ao site publicado em 4 passos"
          subtitle="Zero código. Zero designer. Zero espera."
        />
        <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <div
              key={s.title}
              className="group relative rounded-2xl border border-border bg-card p-6 shadow-card transition hover:-translate-y-1 hover:border-primary/50"
            >
              <div className="mb-4 grid h-12 w-12 place-items-center rounded-xl bg-gradient-primary text-primary-foreground shadow-glow">
                <s.icon className="h-6 w-6" />
              </div>
              <h3 className="font-display text-lg font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{s.desc}</p>
              <div className="absolute right-4 top-4 font-mono text-xs text-muted-foreground/40">
                0{i + 1}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ----------------------------- GENERATOR SHOWCASE ----------------------------- */
function GeneratorShowcase() {
  const palettes = [
    { name: "Logo preta", tag: "Elegante", colors: ["#0a0a0a", "#f5c518", "#e5e5e5", "#1c1c1c"] },
    { name: "Logo azul", tag: "Corporativo", colors: ["#0b3b8a", "#3b82f6", "#dbeafe", "#0f172a"] },
    { name: "Logo vermelha", tag: "Esportivo", colors: ["#7f1d1d", "#ef4444", "#fef2f2", "#111111"] },
    { name: "Logo verde", tag: "Premium", colors: ["#064e3b", "#10b981", "#ecfdf5", "#0b1f16"] },
  ];
  return (
    <section className="border-y border-border/50 bg-surface/30 py-24">
      <div className="mx-auto max-w-7xl px-6">
        <SectionHeader
          eyebrow="Gerador Inteligente"
          title="Nunca dois sites iguais."
          subtitle="A IA combina cores, espaçamentos, tipografia, animações e componentes de forma única para cada marca."
        />
        <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {palettes.map((p) => (
            <div key={p.name} className="rounded-2xl border border-border bg-card p-6 shadow-card">
              <div className="mb-4 flex items-center justify-between">
                <span className="font-display text-sm font-semibold">{p.name}</span>
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-primary">
                  {p.tag}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {p.colors.map((c) => (
                  <div
                    key={c}
                    className="aspect-square rounded-lg border border-border"
                    style={{ background: c }}
                  />
                ))}
              </div>
              <div className="mt-4 space-y-2">
                <div className="h-2 w-3/4 rounded-full" style={{ background: p.colors[1] }} />
                <div className="h-2 w-1/2 rounded-full bg-muted" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ----------------------------- FEATURES ----------------------------- */
function Features() {
  const items = [
    { icon: Search, title: "Busca inteligente", desc: "Filtros por marca, modelo, ano, câmbio, combustível, KM e preço." },
    { icon: Camera, title: "Fotos com IA", desc: "Remove fundo, corrige iluminação, adiciona marca d'água e organiza automaticamente." },
    { icon: Bot, title: "Anúncios gerados por IA", desc: "Título, descrição, hashtags e SEO otimizados para cada veículo." },
    { icon: MessageSquare, title: "CRM completo", desc: "Kanban de leads, WhatsApp, agenda de test drives e funil de vendas." },
    { icon: Share2, title: "Feed XML para portais", desc: "Exporte seu estoque para OLX, Webmotors e iCarros via feed padronizado." },
    { icon: BarChart3, title: "Dashboard executivo", desc: "KPIs, mapa de calor, origem dos visitantes e ROI por campanha." },
    { icon: ShieldCheck, title: "LGPD & segurança", desc: "2FA, criptografia, auditoria, backups automáticos e logs completos." },
    { icon: Zap, title: "Performance máxima", desc: "SSR, ISR, CDN global, lazy loading e Core Web Vitals nota A+." },
  ];
  return (
    <section id="recursos" className="py-24">
      <div className="mx-auto max-w-7xl px-6">
        <SectionHeader
          eyebrow="Recursos"
          title="Tudo para vender mais carros — em um só lugar."
        />
        <div className="mt-16 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {items.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-border bg-card p-6 shadow-card transition hover:border-primary/40"
            >
              <f.icon className="h-6 w-6 text-primary" />
              <h3 className="mt-4 font-display text-base font-semibold">{f.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ----------------------------- PRICING ----------------------------- */
function Pricing() {
  const [yearly, setYearly] = useState(false);
  const [selected, setSelected] = useState<PlanForCheckout | null>(null);
  const plans = [
    {
      name: "Start",
      priceMonthly: 149,
      priceYearly: 119,
      desc: "Para lojas começando a operar online.",
      features: [
        "Até 25 veículos",
        "Domínio personalizado",
        "WhatsApp integrado",
        "Formulário de contato",
        "SEO básico",
        "Suporte por email",
      ],
    },
    {
      name: "Pro",
      priceMonthly: 299,
      priceYearly: 239,
      desc: "Para lojas em crescimento acelerado.",
      highlight: true,
      features: [
        "Tudo do Start",
        "Até 50 veículos",
        "Blog + Chatbot IA",
        "Banners automáticos",
        "Estatísticas avançadas",
        "Múltiplos usuários",
        "Suporte prioritário",
      ],
    },
    {
      name: "Premium",
      priceMonthly: 599,
      priceYearly: 479,
      desc: "Operação completa e automação total.",
      features: [
        "Tudo do Pro",
        "50+ veículos (ilimitados)",
        "CRM completo com histórico de leads",
        "Feed XML para OLX, Webmotors e iCarros",
        "WhatsApp Business API oficial",
        "Suporte prioritário premium",
      ],
    },
  ];
  return (
    <section id="planos" className="border-y border-border/50 bg-surface/30 py-24">
      <div className="mx-auto max-w-7xl px-6">
        <SectionHeader
          eyebrow="Planos"
          title="Preço claro. Sem surpresas."
          subtitle="Comece grátis por 7 dias em qualquer plano."
        />
        <div className="mt-8 flex justify-center">
          <div className="inline-flex rounded-full border border-border bg-card p-1">
            <button
              onClick={() => setYearly(false)}
              className={`rounded-full px-5 py-2 text-sm font-medium transition ${
                !yearly ? "bg-gradient-primary text-primary-foreground shadow-elegant" : "text-muted-foreground"
              }`}
            >
              Mensal
            </button>
            <button
              onClick={() => setYearly(true)}
              className={`rounded-full px-5 py-2 text-sm font-medium transition ${
                yearly ? "bg-gradient-primary text-primary-foreground shadow-elegant" : "text-muted-foreground"
              }`}
            >
              Anual <span className="ml-1 text-xs opacity-80">-20%</span>
            </button>
          </div>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {plans.map((p) => (
            <div
              key={p.name}
              className={`relative rounded-2xl border p-8 shadow-card transition ${
                p.highlight
                  ? "border-primary/60 bg-card shadow-elegant"
                  : "border-border bg-card"
              }`}
            >
              {p.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-primary px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-primary-foreground shadow-glow">
                  Mais popular
                </div>
              )}
              <h3 className="font-display text-2xl font-bold">{p.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{p.desc}</p>
              <div className="mt-6 flex items-baseline gap-1">
                <span className="text-sm text-muted-foreground">R$</span>
                <span className="font-display text-5xl font-bold">
                  {yearly ? p.priceYearly : p.priceMonthly}
                </span>
                <span className="text-sm text-muted-foreground">/mês</span>
              </div>
              <button
                onClick={() => setSelected({ name: p.name, priceMonthly: p.priceMonthly, priceYearly: p.priceYearly })}
                className={`mt-6 inline-flex w-full items-center justify-center rounded-full px-5 py-3 text-sm font-semibold transition ${
                  p.highlight
                    ? "bg-gradient-primary text-primary-foreground shadow-elegant hover:brightness-110"
                    : "border border-border text-foreground hover:bg-surface"
                }`}
              >
                Assinar via Pix
              </button>
              <ul className="mt-8 space-y-3 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span className="text-foreground/90">{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <PixCheckoutModal open={!!selected} onClose={() => setSelected(null)} plan={selected} yearly={yearly} />
    </section>
  );
}

/* ----------------------------- INTEGRATIONS ----------------------------- */
function Integrations() {
  const names = [
    "Webmotors", "iCarros", "OLX", "WhatsApp Business API", "Pix",
    "Google Analytics", "Resend",
  ];
  return (
    <section id="integracoes" className="py-24">
      <div className="mx-auto max-w-7xl px-6">
        <SectionHeader
          eyebrow="Integrações"
          title="Conecte onde seus clientes estão."
          subtitle="Publique um veículo uma vez, apareça em todos os canais."
        />
        <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {names.map((n) => (
            <div
              key={n}
              className="rounded-xl border border-border bg-card px-4 py-6 text-center text-sm font-medium text-muted-foreground shadow-card transition hover:border-primary/40 hover:text-foreground"
            >
              {n}
            </div>
          ))}
        </div>

        <div className="mt-16 grid gap-6 rounded-2xl border border-border bg-card p-8 shadow-card md:grid-cols-3">
          {[
            { icon: Users, title: "Multi-tenant", desc: "Cada loja com dados totalmente isolados e permissões por perfil." },
            { icon: Star, title: "Marketplace de temas", desc: "Troque o visual sem perder conteúdo. Sempre atualizado." },
            { icon: ShieldCheck, title: "Backup diário", desc: "Auditoria completa, versionamento e restauração em 1 clique." },
          ].map((f) => (
            <div key={f.title} className="flex items-start gap-4">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-primary text-primary-foreground shadow-glow">
                <f.icon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-display text-base font-semibold">{f.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ----------------------------- FAQ ----------------------------- */
function FAQ() {
  const qs = [
    { q: "Preciso saber programar?", a: "Não. O AutoSite é 100% no-code. Envie sua logo e a IA cuida do restante." },
    { q: "Posso usar meu próprio domínio?", a: "Sim. Você recebe um subdomínio grátis e pode conectar seu domínio próprio em qualquer plano." },
    { q: "Como funciona o teste grátis?", a: "7 dias grátis em qualquer plano, sem cartão de crédito. Você só paga se decidir continuar." },
    { q: "Consigo migrar meu site atual?", a: "Sim. Nossa equipe importa seu estoque de veículos de qualquer plataforma sem custo adicional." },
    { q: "Como funciona a integração com OLX, Webmotors e iCarros?", a: "Geramos um feed XML padronizado com seu estoque (disponível no plano Premium). Você envia essa URL ao gerente comercial do portal — cada portal exige um contrato B2B para importar o feed." },
    { q: "E se eu quiser cancelar?", a: "Você cancela quando quiser, direto do painel. Sem multa, sem burocracia." },
  ];
  return (
    <section id="faq" className="border-y border-border/50 bg-surface/30 py-24">
      <div className="mx-auto max-w-4xl px-6">
        <SectionHeader eyebrow="Dúvidas frequentes" title="Perguntas que sempre recebemos" />
        <div className="mt-12 space-y-3">
          {qs.map((item) => (
            <details
              key={item.q}
              className="group rounded-xl border border-border bg-card p-6 shadow-card open:border-primary/40"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between font-display text-base font-semibold">
                {item.q}
                <span className="ml-4 grid h-7 w-7 place-items-center rounded-full border border-border transition group-open:rotate-45">
                  <span className="text-lg leading-none">+</span>
                </span>
              </summary>
              <p className="mt-3 text-sm text-muted-foreground">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ----------------------------- CTA ----------------------------- */
function CTA() {
  return (
    <section className="py-24">
      <div className="mx-auto max-w-5xl px-6">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-hero p-12 text-center shadow-elegant md:p-16">
          <div className="pointer-events-none absolute -top-24 left-1/2 h-64 w-[80%] -translate-x-1/2 rounded-full bg-primary/30 blur-3xl" />
          <h2 className="relative font-display text-4xl font-bold tracking-tight md:text-5xl">
            Pronto para transformar sua revenda?
          </h2>
          <p className="relative mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
            Envie sua logo agora e receba seu site pronto em minutos.
          </p>
          <a
            href="/auth"
            className="relative mt-8 inline-flex items-center gap-2 rounded-full bg-gradient-primary px-8 py-4 text-base font-semibold text-primary-foreground shadow-elegant transition hover:brightness-110"
          >
            Criar meu site grátis
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    </section>
  );
}

/* ----------------------------- FOOTER ----------------------------- */
function Footer() {
  return (
    <footer className="border-t border-border bg-surface/40">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-10 md:grid-cols-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-primary shadow-glow">
                <Car className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="font-display text-lg font-bold">AutoSite</span>
            </div>
            <p className="mt-4 max-w-xs text-sm text-muted-foreground">
              A plataforma de sites para revendas de veículos que mais cresce no Brasil.
            </p>
          </div>
          {[
            { title: "Produto", links: ["Recursos", "Planos", "Integrações", "Roadmap"] },
            { title: "Empresa", links: ["Sobre", "Blog", "Contato", "Parcerias"] },
            { title: "Legal", links: ["Termos de uso", "Privacidade (LGPD)", "Cookies", "Segurança"] },
          ].map((col) => (
            <div key={col.title}>
              <h4 className="font-display text-sm font-semibold">{col.title}</h4>
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                {col.links.map((l) => (
                  <li key={l}>
                    <a href="#" className="hover:text-foreground transition">{l}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 text-xs text-muted-foreground md:flex-row">
          <p>© {new Date().getFullYear()} AutoSite. Todos os direitos reservados.</p>
          <p>Feito com IA no Brasil 🇧🇷</p>
        </div>
      </div>
    </footer>
  );
}

/* ----------------------------- HELPERS ----------------------------- */
function SectionHeader({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle?: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="text-xs font-semibold uppercase tracking-widest text-primary">{eyebrow}</p>
      <h2 className="mt-3 font-display text-4xl font-bold tracking-tight md:text-5xl">{title}</h2>
      {subtitle && <p className="mt-4 text-lg text-muted-foreground">{subtitle}</p>}
    </div>
  );
}
