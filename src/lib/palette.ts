// Client-side palette extraction from a logo image using canvas.
// Simple color quantization: buckets colors, picks dominant + accent + neutral.

export type Palette = {
  primary: string;
  secondary: string;
  accent: string;
  neutral: string;
  style: "elegante" | "corporativo" | "esportivo" | "premium" | "moderno";
};

export async function extractPaletteFromFile(file: File): Promise<Palette> {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const canvas = document.createElement("canvas");
    const size = 128;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0, size, size);
    const data = ctx.getImageData(0, 0, size, size).data;

    type Bucket = { r: number; g: number; b: number; count: number; score: number };
    const vivid = new Map<string, Bucket>();
    const neutrals = new Map<string, Bucket>();

    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3];
      if (a < 200) continue;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      const lightness = (max + min) / 2;
      const delta = max - min;
      const saturation = delta === 0 ? 0 : delta / (255 - Math.abs(2 * lightness - 255) || 1);

      // Split neutral (grays/black/white) from vivid pixels; only vivid pixels
      // in a mid-luminance sweet spot contribute to "score" for primary picking.
      const key = `${r >> 5}-${g >> 5}-${b >> 5}`;
      const isNeutralPx = saturation < 0.15;
      const map = isNeutralPx ? neutrals : vivid;
      const entry = map.get(key) || { r: 0, g: 0, b: 0, count: 0, score: 0 };
      entry.r += r; entry.g += g; entry.b += b; entry.count += 1;

      if (!isNeutralPx && lightness >= 40 && lightness <= 220 && saturation >= 0.35) {
        // Peak weight around L=128 and S=1; heavily deprioritizes dark/dull edges.
        const lightWeight = 1 - Math.abs(lightness - 128) / 128;
        entry.score += saturation * lightWeight;
      }
      map.set(key, entry);
    }

    const toRGB = (b: Bucket): RGB => ({
      r: b.r / b.count, g: b.g / b.count, b: b.b / b.count, count: b.count,
    });

    const vividSorted = [...vivid.values()]
      .filter((b) => b.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(toRGB);

    const anySorted = [...vivid.values(), ...neutrals.values()]
      .sort((a, b) => b.count - a.count)
      .map(toRGB);

    const primary = vividSorted[0] ?? pickColorful(anySorted) ?? anySorted[0];
    const secondary =
      vividSorted.find((c) => Math.hypot(c.r - primary.r, c.g - primary.g, c.b - primary.b) > 80) ??
      pickDistinct(anySorted, primary) ??
      shift(primary, 30);
    const accent =
      vividSorted.find(
        (c) =>
          c !== primary &&
          c !== secondary &&
          Math.hypot(c.r - primary.r, c.g - primary.g, c.b - primary.b) > 100 &&
          Math.hypot(c.r - secondary.r, c.g - secondary.g, c.b - secondary.b) > 60,
      ) ?? complement(primary);

    const neutralSorted = [...neutrals.values()].sort((a, b) => b.count - a.count).map(toRGB);
    const neutral =
      neutralSorted.find(isNeutral) ??
      anySorted.find(isNeutral) ??
      { r: 20, g: 20, b: 24, count: 1 };

    return {
      primary: rgb(primary),
      secondary: rgb(secondary),
      accent: rgb(accent),
      neutral: rgb(neutral),
      style: classifyStyle(primary),
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

type RGB = { r: number; g: number; b: number; count?: number };

function pickColorful(list: RGB[]): RGB | undefined {
  return list.find((c) => {
    const max = Math.max(c.r, c.g, c.b), min = Math.min(c.r, c.g, c.b);
    return max - min > 40 && max < 240 && min > 10;
  });
}
function pickDistinct(list: RGB[], from: RGB): RGB | undefined {
  return list.find((c) => Math.hypot(c.r - from.r, c.g - from.g, c.b - from.b) > 80);
}
function isNeutral(c: RGB): boolean {
  const max = Math.max(c.r, c.g, c.b), min = Math.min(c.r, c.g, c.b);
  return max - min < 15;
}
function complement(c: RGB): RGB {
  return { r: 255 - c.r, g: 255 - c.g, b: 255 - c.b };
}
function shift(c: RGB, amt: number): RGB {
  return { r: clamp(c.r + amt), g: clamp(c.g + amt), b: clamp(c.b + amt) };
}
function clamp(n: number) { return Math.max(0, Math.min(255, Math.round(n))); }
function rgb(c: RGB): string {
  const to = (n: number) => Math.round(n).toString(16).padStart(2, "0");
  return `#${to(c.r)}${to(c.g)}${to(c.b)}`;
}
function classifyStyle(c: RGB): Palette["style"] {
  const { r, g, b } = c;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  if (max - min < 20) return max < 80 ? "elegante" : "moderno";
  if (r > g && r > b) return "esportivo";
  if (b > r && b > g) return "corporativo";
  if (g > r && g > b) return "premium";
  return "moderno";
}
