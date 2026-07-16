// Configuração central de cobrança manual via WhatsApp + Pix.
// Altere aqui para trocar número, chave ou beneficiário em todo o site.

export const CHECKOUT = {
  whatsappNumber: "5535997477461", // formato internacional, sem + nem espaços
  pixKey: "35999353417",
  pixKeyType: "Telefone",
  beneficiary: "Maria Carolyne Pereira",
  bank: "",
} as const;

export type PlanForCheckout = {
  name: string;
  priceMonthly: number;
  priceYearly: number;
};

export function buildWhatsappUrl(plan: PlanForCheckout, yearly: boolean) {
  const price = yearly ? plan.priceYearly : plan.priceMonthly;
  const cycle = yearly ? "anual" : "mensal";
  const total = yearly ? price * 12 : price;
  const totalTxt = yearly
    ? ` (12x R$${price} = R$${total} à vista com 20% off)`
    : "";

  const msg =
    `Olá! Quero assinar o plano *${plan.name}* (${cycle}) da AutoSite.\n\n` +
    `💰 Valor: R$${price}/mês${totalTxt}\n\n` +
    `Pode me enviar os dados do Pix pra confirmar o pagamento? Obrigado!`;

  return `https://wa.me/${CHECKOUT.whatsappNumber}?text=${encodeURIComponent(msg)}`;
}
