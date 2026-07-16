// Catalogo de designs. Uma loja escolhe UM variant + UMA paleta + UM par de fontes.
// Persistencia: gravamos "variant|style_tag_livre" dentro de stores.style_tag,
// e as cores/fontes vao nos campos ja existentes (primary_color, font_display, etc.).
// Assim funciona sem migracao.

export const LAYOUT_VARIANTS = [
  "aurora",
  "editorial",
  "monolith",
  "showroom",
  "neo-marche",
  "concourse",
  "default",
] as const;
export type LayoutVariant = (typeof LAYOUT_VARIANTS)[number];

export type StorePalette = {
  primary: string;
  secondary: string;
  accent: string;
  neutral: string;
};

export type StoreFontPair = { display: string; body: string };

// Pares Google Fonts curados. Cada par tem um "id" curto que a IA escolhe.
export const FONT_PAIRS: Record<string, StoreFontPair & { google: string }> = {
  "space-inter":     { display: "Space Grotesk", body: "Inter",        google: "Space+Grotesk:wght@500;700&family=Inter:wght@400;500;600" },
  "playfair-inter":  { display: "Playfair Display", body: "Inter",     google: "Playfair+Display:wght@600;800&family=Inter:wght@400;500;600" },
  "syne-manrope":    { display: "Syne", body: "Manrope",               google: "Syne:wght@600;800&family=Manrope:wght@400;500;600" },
  "bebas-inter":     { display: "Bebas Neue", body: "Inter",           google: "Bebas+Neue&family=Inter:wght@400;500;600" },
  "dm-serif-work":   { display: "DM Serif Display", body: "Work Sans", google: "DM+Serif+Display&family=Work+Sans:wght@400;500;600" },
  "archivo-mono":    { display: "Archivo Black", body: "JetBrains Mono", google: "Archivo+Black&family=JetBrains+Mono:wght@400;500" },
  "instrument-work": { display: "Instrument Serif", body: "Work Sans", google: "Instrument+Serif:ital@0;1&family=Work+Sans:wght@400;500;600" },
  "urbanist-figtree":{ display: "Urbanist", body: "Figtree",           google: "Urbanist:wght@600;800&family=Figtree:wght@400;500;600" },
};
export type FontPairId = keyof typeof FONT_PAIRS;

// Cada variant tem defaults quando a IA nao especifica algo.
export const VARIANT_DEFAULTS: Record<LayoutVariant, {
  fontPair: FontPairId;
  palette: StorePalette;
  moodLabel: string;
}> = {
  aurora: {
    fontPair: "space-inter",
    palette: { primary: "#7c3aed", secondary: "#0f172a", accent: "#22d3ee", neutral: "#0b0f19" },
    moodLabel: "Aurora — noturno iridescente",
  },
  editorial: {
    fontPair: "instrument-work",
    palette: { primary: "#111111", secondary: "#f5f1ea", accent: "#c2410c", neutral: "#1c1917" },
    moodLabel: "Editorial — revista de curadoria",
  },
  monolith: {
    fontPair: "archivo-mono",
    palette: { primary: "#0a0a0a", secondary: "#fafafa", accent: "#eab308", neutral: "#0a0a0a" },
    moodLabel: "Monolith — Swiss brutalista",
  },
  showroom: {
    fontPair: "bebas-inter",
    palette: { primary: "#dc2626", secondary: "#0a0a0a", accent: "#f59e0b", neutral: "#050505" },
    moodLabel: "Showroom — luxo cinematografico",
  },
  "neo-marche": {
    fontPair: "urbanist-figtree",
    palette: { primary: "#0ea5e9", secondary: "#facc15", accent: "#ec4899", neutral: "#0f172a" },
    moodLabel: "Neo-Marche — pop tatil",
  },
  concourse: {
    fontPair: "archivo-mono",
    palette: { primary: "#10b981", secondary: "#020617", accent: "#22d3ee", neutral: "#020617" },
    moodLabel: "Concourse — retrofuturista HUD",
  },
  default: {
    fontPair: "space-inter",
    palette: { primary: "#e63946", secondary: "#0b2e5e", accent: "#f4a261", neutral: "#0b0f19" },
    moodLabel: "Classico",
  },
};

// -------- Persistencia via style_tag ---------
// Formato: "aurora|Sofisticada moderna"  ou  "Sofisticada moderna" (variant=default)
const VARIANT_SET = new Set<string>(LAYOUT_VARIANTS as readonly string[]);

export function encodeStyleTag(variant: LayoutVariant, style: string): string {
  const clean = (style ?? "").replace(/\|/g, " ").trim();
  return clean ? `${variant}|${clean}` : variant;
}

export function decodeStyleTag(tag: string | null | undefined): { variant: LayoutVariant; style: string } {
  if (!tag) return { variant: "default", style: "" };
  const idx = tag.indexOf("|");
  if (idx === -1) {
    return VARIANT_SET.has(tag) ? { variant: tag as LayoutVariant, style: "" } : { variant: "default", style: tag };
  }
  const head = tag.slice(0, idx);
  const rest = tag.slice(idx + 1);
  if (VARIANT_SET.has(head)) return { variant: head as LayoutVariant, style: rest };
  return { variant: "default", style: tag };
}

// -------- Fallback deterministico ---------
// Sem IA disponivel, ainda queremos que lojas diferentes recebam layouts diferentes.
function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}

export type StoreDesign = {
  layout_variant: LayoutVariant;
  palette: StorePalette;
  fonts: StoreFontPair & { pairId: FontPairId };
  design_meta: {
    hero_style: "cinematic" | "typographic" | "split" | "collage" | "hud";
    motion: "soft" | "sharp" | "playful" | "still";
    radius: "sharp" | "soft" | "pill";
    texture: "none" | "grain" | "grid" | "scanlines";
    tone_note: string;
  };
};

const HERO_BY_VARIANT: Record<LayoutVariant, StoreDesign["design_meta"]["hero_style"]> = {
  aurora: "cinematic",
  editorial: "collage",
  monolith: "typographic",
  showroom: "cinematic",
  "neo-marche": "split",
  concourse: "hud",
  default: "split",
};

export function pickDesignDeterministic(seed: string, seedPalette?: Partial<StorePalette>): StoreDesign {
  const options: LayoutVariant[] = ["aurora", "editorial", "monolith", "showroom", "neo-marche", "concourse"];
  const variant = options[hash(seed) % options.length];
  const defs = VARIANT_DEFAULTS[variant];
  const palette: StorePalette = {
    primary: seedPalette?.primary || defs.palette.primary,
    secondary: seedPalette?.secondary || defs.palette.secondary,
    accent: seedPalette?.accent || defs.palette.accent,
    neutral: seedPalette?.neutral || defs.palette.neutral,
  };
  const fp = FONT_PAIRS[defs.fontPair];
  return {
    layout_variant: variant,
    palette,
    fonts: { pairId: defs.fontPair, display: fp.display, body: fp.body },
    design_meta: {
      hero_style: HERO_BY_VARIANT[variant],
      motion: variant === "monolith" ? "still" : variant === "neo-marche" ? "playful" : variant === "concourse" ? "sharp" : "soft",
      radius: variant === "monolith" || variant === "concourse" ? "sharp" : variant === "neo-marche" ? "soft" : "pill",
      texture: variant === "concourse" ? "scanlines" : variant === "editorial" ? "grain" : variant === "monolith" ? "grid" : "none",
      tone_note: defs.moodLabel,
    },
  };
}

// Endereco Google Fonts CSS2 para inclusao via <link>
export function googleFontsHref(pairId: FontPairId): string {
  const spec = FONT_PAIRS[pairId]?.google;
  if (!spec) return "";
  return `https://fonts.googleapis.com/css2?family=${spec}&display=swap`;
}