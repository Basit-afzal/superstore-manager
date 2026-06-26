import {
  getStripe,
  isStripeConfigured,
  toStripeAmount,
} from '../services/stripe.service.js';

export const createPaymentIntent = async (req, res) => {
  try {
    if (!isStripeConfigured()) {
      return res.status(503).json({ message: 'Stripe is not configured' });
    }

    const amount = Number(req.body.amount);
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Invalid payment amount' });
    }

    const stripe = getStripe();
    const paymentIntent = await stripe.paymentIntents.create({
      amount: toStripeAmount(amount),
      currency: 'usd',
      payment_method_types: ['card'],
      metadata: {
        store_id: String(req.store),
      },
    });

    return res.status(200).json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || 'Failed to create payment intent',
    });
  }
};
