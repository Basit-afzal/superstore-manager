import type { ApiClient } from '@/hooks/useApiClient';

export interface PaymentIntentResponse {
  clientSecret: string;
  paymentIntentId: string;
}

export const createPaymentIntent = async (
  client: ApiClient,
  amount: number,
): Promise<PaymentIntentResponse> => {
  return client.post<PaymentIntentResponse>('/payments/intent', { amount });
};
