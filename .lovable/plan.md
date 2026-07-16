# Plano: implementar as features dos planos

Vou entregar em **4 fases**, do mais viável ao mais complexo. Cada fase é utilizável sozinha, então você pode aprovar tudo ou parar em qualquer ponto.

## Fase 1 — Base de gating por plano (fundação obrigatória)
Sem isso, nenhuma feature abaixo consegue ser "só do Pro" ou "só do Premium".

- Função SQL `plan_has_feature(user_id, feature)` mapeando cada feature → planos permitidos.
- Hook `usePlanFeature(feature)` no front para bloquear UI com upsell.
- Middleware de server function `requirePlanFeature('x')` para bloquear no backend.
- Badge "Disponível no Pro/Premium" nos itens bloqueados.

## Fase 2 — Features viáveis sem integrações externas
Tudo roda dentro do Lovable Cloud, sem chaves de terceiros.

1. **Domínio personalizado** (Start+)
   - Campo `custom_domain` em `stores` + verificação DNS TXT.
   - Página em `/gerenciar/$id/dominio` com instruções (A record → 185.158.133.1).
   - Loader de `loja.$slug` aceita match por host além de slug.

2. **Múltiplos usuários por loja** (Pro+)
   - Nova tabela `store_members(store_id, user_id, role)` com RLS.
   - Tela de convites por e-mail, aceite via link mágico.
   - Todas as políticas de `vehicles/leads` passam a considerar membership.

3. **Blog** (Pro+)
   - Tabelas `posts(store_id, slug, title, content, cover, published_at)`.
   - Editor rich text em `/gerenciar/$id/blog`.
   - Rotas públicas `/loja/$slug/blog` e `/loja/$slug/blog/$postSlug`.

4. **Chatbot IA** (Pro+)
   - Server fn `chatWithStore` usando Lovable AI Gateway (grátis, sem chave).
   - Contexto: dados da loja + estoque atual.
   - Widget flutuante em `loja.$slug`.

5. **Banners automáticos** (Pro+)
   - Server fn `generateBanner` usando `imagegen` (Lovable AI).
   - Templates: "Chegou!", "Oferta", "Recém-chegados".
   - Galeria em `/gerenciar/$id/banners` com download.

6. **CRM completo** (Premium)
   - Extender `leads` com: `status` (novo/contato/negociação/fechado/perdido), `assigned_to`, `notes`, `next_followup`.
   - Kanban board em `/gerenciar/$id/crm`.
   - Histórico de interações por lead.

7. **Suporte prioritário / Gerente de conta** (Pro/Premium)
   - Tabela `support_tickets` com SLA por plano.
   - Chat interno com admin, priorização por plano.

## Fase 3 — Integrações que exigem chaves do usuário
Cada uma pede credenciais do dono da loja (não do Lovable).

8. **WhatsApp integrado real** (hoje é só link `wa.me`)
   - WhatsApp Business Cloud API: token + phone number ID por loja.
   - Auto-resposta com IA + roteamento de leads.

9. **Instagram + Google Business** (Premium)
   - Instagram Graph API (Meta): publicação automática de novos veículos.
   - Google Business Profile API: sync de fotos + posts.

10. **Facebook Marketplace** (Premium)
    - Não tem API pública oficial. Alternativa: gerar feed XML que o vendedor sobe manualmente, ou usar Catalog API do Facebook (para anúncios pagos).
    - **Recomendo trocar o texto** para "Feed para Marketplace" para não prometer o que a Meta não permite.

## Fase 4 — Integrações com portais de veículos
Cada portal cobra à parte e exige contrato B2B.

11. **OLX / Webmotors / iCarros** (Premium)
    - Gerar feed XML no padrão de cada portal em `/api/public/feed/$storeId/(olx|webmotors|icarros).xml`.
    - Painel para o dono conectar a conta dele em cada portal e colar a URL do feed.
    - Automação real (publicação direta) exige contratos B2B que **cada dono de loja precisa fechar** — não é algo que o SaaS pode fazer sozinho.

12. **Automação completa** (Premium)
    - Workflows: novo veículo → gera banner → publica Instagram → cria post no blog → notifica leads interessados.
    - Motor de regras em cima do que foi feito nas fases 2–3.

## Como quer prosseguir?

Sugiro aprovar **Fase 1 + Fase 2** de uma vez (é o maior salto de valor e não depende de nada externo). Fases 3 e 4 tratamos depois, feature por feature, porque cada uma exige decisões suas (qual conta de API usar, aceitar limitações da Meta etc.).

Responda com:
- **"vai fase 1 e 2"** → começo agora
- **"só fase 1"** → entrego só a fundação e você decide o resto depois
- **"quero X específico primeiro"** → priorizo o que você pedir
