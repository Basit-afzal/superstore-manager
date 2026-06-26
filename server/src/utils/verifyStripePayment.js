import Sale from '../models/sale.js';
import { getStripe, toStripeAmount } from '../services/stripe.service.js';

export async function verifyStripePayment(paymentIntentId, storeId, expectedAmount) {
  const stripe = getStripe();
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  const intent = await stripe.paymentIntents.retrieve(paymentIntentId);

  if (intent.status !== 'succeeded') {
    throw new Error('Payment has not been completed');
  }

  if (intent.metadata.store_id !== String(storeId)) {
    throw new Error('Payment does not belong to this store');
  }

  if (intent.amount !== toStripeAmount(expectedAmount)) {
    throw new Error('Payment amount does not match sale total');
  }

  const existingSale = await Sale.findOne({
    stripe_payment_intent_id: paymentIntentId,
  });

  if (existingSale) {
    throw new Error('This payment has already been used for a sale');
  }

  return intent;
}
