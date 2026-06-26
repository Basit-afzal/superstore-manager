const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cod: 'COD',
  card_on_delivery: 'Card on Delivery',
  stripe: 'Online Payment (Stripe)',
  cash: 'COD',
  card: 'Card on Delivery',
  digital: 'Digital',
};

export function formatPaymentMethod(method: string): string {
  return PAYMENT_METHOD_LABELS[method] ?? method.replace(/_/g, ' ');
}
