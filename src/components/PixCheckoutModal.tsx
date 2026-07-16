import { useEffect, useState } from "react";
import { X, Copy, Check, MessageCircle, QrCode } from "lucide-react";
import { CHECKOUT, buildWhatsappUrl, type PlanForCheckout } from "@/lib/checkout";
import { supabase } from "@/integrations/supabase/client";
import { createPaymentRequest } from "@/lib/payments.functions";

type Props = {
  open: boolean;
  onClose: () => void;
  plan: PlanForCheckout | null;
  yearly: boolean;
};

export function PixCheckoutModal({ open, onClose, plan, yearly }: Props) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) setCopied(false);
  }, [open]);

  if (!open || !plan) return null;

  const price = yearly ? plan.priceYearly : plan.priceMonthly;
  const cycle = yearly ? "anual" : "mensal";
  const total = yearly ? price * 12 : price;

  const copy = async () => {
    await navigator.clipboard.writeText(CHECKOUT.pixKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const waUrl = buildWhatsappUrl(plan, yearly);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-card p-8 shadow-elegant"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1.5 text-muted-foreground hover:bg-surface"
          aria-label="Fechar"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary/15">
            <QrCode className="h-6 w-6 text-primary" />
          </div>
          <h2 className="mt-4 font-display text-2xl font-bold">
            Plano {plan.name} — {cycle}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Pagamento via Pix com confirmação por WhatsApp
          </p>
        </div>

        <div className="mt-6 rounded-xl border border-border bg-surface/40 p-5">
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-muted-foreground">Valor</span>
            <div className="text-right">
              <div className="font-display text-3xl font-bold">R$ {price}<span className="text-sm font-normal text-muted-foreground">/mês</span></div>
              {yearly && (
                <div className="text-xs text-muted-foreground">
                  Cobrança única de R$ {total} (12 meses, 20% off)
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Como pagar em 3 passos
          </h3>

          <ol className="space-y-4 text-sm">
            <li className="flex gap-3">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">1</span>
              <div className="flex-1">
                <p className="font-medium text-foreground">Copie a chave Pix</p>
                <div className="mt-2 flex items-center gap-2 rounded-lg border border-border bg-background p-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] uppercase text-muted-foreground">{CHECKOUT.pixKeyType}</div>
                    <div className="truncate font-mono text-sm">{CHECKOUT.pixKey}</div>
                  </div>
                  <button
                    onClick={copy}
                    className="inline-flex items-center gap-1.5 rounded-md bg-primary/15 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/25"
                  >
                    {copied ? <><Check className="h-3.5 w-3.5" /> Copiado</> : <><Copy className="h-3.5 w-3.5" /> Copiar</>}
                  </button>
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  Beneficiário: <span className="font-medium text-foreground">{CHECKOUT.beneficiary}</span>
                </div>
              </div>
            </li>

            <li className="flex gap-3">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">2</span>
              <div className="flex-1">
                <p className="font-medium text-foreground">Pague R$ {yearly ? total : price} no seu banco</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Abra o app do banco → Pix → Pagar com chave → cole a chave acima → confirme o valor e o beneficiário.
                </p>
              </div>
            </li>

            <li className="flex gap-3">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">3</span>
              <div className="flex-1">
                <p className="font-medium text-foreground">Envie o comprovante no WhatsApp</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  A gente ativa seu plano em até 1h útil e libera o acesso.
                </p>
              </div>
            </li>
          </ol>
        </div>

        <button
          onClick={async () => {
            const planKey = plan.name.toLowerCase() as "starter" | "pro" | "premium" | "start";
            const normalized = planKey === "start" ? "starter" : planKey;
            const amount = yearly ? price * 12 : price;
            try {
              const { data: sess } = await supabase.auth.getSession();
              if (sess.session) {
                await createPaymentRequest({
                  data: { plan: normalized as "starter" | "pro" | "premium", cycle: yearly ? "yearly" : "monthly", amount_brl: amount },
                });
              }
            } catch (e) {
              console.error("[pix] failed to record request", e);
            }
            window.open(waUrl, "_blank", "noopener,noreferrer");
          }}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#25D366] px-5 py-3.5 text-sm font-semibold text-white shadow-elegant transition hover:brightness-110"
        >
          <MessageCircle className="h-5 w-5" />
          Falar no WhatsApp com mensagem pronta
        </button>

        <p className="mt-3 text-center text-xs text-muted-foreground">
          Ou envie diretamente para <span className="font-mono text-foreground">+55 {CHECKOUT.whatsappNumber.slice(2, 4)} {CHECKOUT.whatsappNumber.slice(4, 9)}-{CHECKOUT.whatsappNumber.slice(9)}</span>
        </p>
      </div>
    </div>
  );
}
