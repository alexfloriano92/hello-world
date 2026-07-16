
## Objetivo
A IA deixa de gerar apenas o copy da loja e passa a **compor um site inteiro sob medida**: layout, ritmo visual, paleta, tipografia, hero, micro-interações. Cada cliente recebe um site claramente diferente dos outros — sofisticado, moderno, com interação única.

## Arquitetura da decisão de design

Cada loja armazena um "briefing visual" resolvido no momento do onboarding (e regenerável depois):

- `layout_variant` — id do template arquitetônico (uma de 6 opções).
- `design_meta` (jsonb) — hero_style, motion_intent, section_order, radius_scale, texture, tom.
- `primary_color`, `secondary_color`, `accent_color`, `neutral_color` — paleta harmônica.
- `font_display`, `font_body` — par tipográfico Google Fonts.

Nada é aleatório na hora do render: a IA escolhe uma vez, salvamos, e o site público carrega deterministicamente.

## Os 6 layouts (arquiteturas distintas, não temas de cor)

Cada um é um componente completo diferente — hierarquia, seções, ritmo, comportamento — não só cores/fontes trocadas:

1. **Aurora** — noturno, glassmorphism, blobs de luz animados, nav flutuante em pílula, cards com brilho iridescente. Vibe: startup premium, tech.
2. **Editorial** — capa de revista, serif oversized, numeração de seções, grid assimétrico 60/40, imagens sangrando. Vibe: marca de curadoria, boutique.
3. **Monolith** — Swiss minimalista, tipografia gigante em preto/branco, captions em mono, grid rígido, uma única cor de destaque. Vibe: sério, direto, arquitetônico.
4. **Showroom** — luxo escuro tipo BMW/Porsche, hero cinematográfico full-bleed, cards com spotlight ao hover, Bebas/Playfair. Vibe: premium tradicional.
5. **Neo-Marché** — pop/tátil, bordas grossas, shadow offset, adesivos girados, cores saturadas. Vibe: revenda de bairro moderna, popular.
6. **Concourse** — retrofuturista, terminal/mono, scanlines sutis, badges HUD, contagem de estoque tipo painel. Vibe: garagem esportiva, performance.

Fallback: `default` (o layout atual, preservado para lojas antigas até re-gerarem).

## O que a IA faz

Novo server fn `generateStoreDesign` — 1 chamada ao Lovable AI Gateway (google/gemini-3.5-flash) com output estruturado (`response_format: json_object`) e schema validado por Zod. Recebe nome da loja, cidade, tag de estilo e cor extraída do logo; devolve:

```
{
  layout_variant: "aurora" | "editorial" | "monolith" | "showroom" | "neo-marche" | "concourse",
  palette: { primary, secondary, accent, neutral },
  fonts:   { display, body },   // pares Google Fonts curados
  design_meta: {
    hero_style: "cinematic" | "typographic" | "split" | "collage" | "hud",
    motion:     "soft" | "sharp" | "playful" | "still",
    section_order: ["hero","stock","about","contact"] | variações,
    radius:     "sharp" | "soft" | "pill",
    texture:    "none" | "grain" | "grid" | "scanlines",
    tone_note:  string
  }
}
```

Prompt instrui a IA a **não repetir a combinação padrão do gênero** e a casar layout com o estilo do logo (ex.: logo vetorial minimalista → Monolith; logo com serifa → Editorial; logo tech → Aurora).

Fallback determinístico por hash do nome quando a IA falhar — garantindo que mesmo sem crédito de IA, lojas diferentes ainda recebem layouts diferentes.

## Ordem das entregas neste turno

1. **Migração** `supabase/migrations/...store_ai_layouts.sql`: adiciona `layout_variant text`, `design_meta jsonb` em `stores` (grants preservados; leitura pública via política já existente).
2. **`src/lib/store-design.ts`** — catálogo de variantes, paletas curadas, pares de fontes, helper `pickDesignDeterministic()`.
3. **`src/lib/generate-design.functions.ts`** — server fn `generateStoreDesign` com validação Zod + fallback.
4. **`src/components/store-layouts/`**
   - `shared.tsx` — StockSection e ContactSection reaproveitáveis (extraídas do loja.$slug atual), header/footer building blocks.
   - `aurora.tsx`, `editorial.tsx`, `monolith.tsx`, `showroom.tsx`, `neo-marche.tsx`, `concourse.tsx` — cada um um layout completo.
   - `index.tsx` — `renderStoreLayout(variant, props)` faz o dispatch, com fallback para `default`.
5. **`src/routes/loja.$slug.tsx`** — vira um shell fino: carrega fontes escolhidas via `head().links`, injeta CSS vars da paleta, delega ao layout escolhido.
6. **Onboarding** (`_authenticated/onboarding.tsx`) — depois de `generateStoreCopy`, chama `generateStoreDesign` em paralelo; salva `layout_variant`, `design_meta`, `font_display`, `font_body` no insert.
7. **Gerenciar loja** (`_authenticated/gerenciar.$id.tsx`) — botão "Regenerar design com IA" que roda `generateStoreDesign` e faz update; preview do variant atual.
8. **QA**: typecheck + Playwright abrindo `/loja/<slug>` para cada variant via slug de teste, screenshots comparativos.

## Detalhes técnicos

- **Fontes**: cada variant tem um par Google Fonts default; a IA escolhe entre pares pré-aprovados para não retornar fontes inexistentes. Injetadas por rota via `head().links` no `/loja/$slug` — sem `@import` remoto em `styles.css`.
- **Motion**: CSS + `motion-safe:` utilities do Tailwind + pequenas animações declarativas. Sem novas dependências.
- **RLS**: colunas novas herdam as políticas existentes em `stores` (anon SELECT quando `published=true`). Sem alterações de policy.
- **Retrocompatibilidade**: lojas sem `layout_variant` renderizam o layout `default` (o design atual, preservado).
- **`no_supabase` no sandbox**: a migração fica pronta como arquivo; você aplica no seu projeto Supabase externo. Todo o código nasce tolerante a `layout_variant`/`design_meta` ausentes.

## O que fica de fora deste turno (transparência)

- Editor "manual" de tokens de design (paleta/fontes/variant em formulário). O botão de regenerar por IA cobre 90% do caso; edição fina de tokens fica para um turno seguinte se você quiser.
- A/B test entre layouts.
- Preview em tempo real no dashboard (renderizar miniatura de cada variant).
