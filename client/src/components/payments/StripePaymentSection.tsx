import { useEffect, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import type { ApiClient } from "@/hooks/useApiClient";
import { createPaymentIntent } from "@/services/api/payments";
import { getErrorMessage } from "@/utils/getErrorMessage";

const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
const stripePromise = publishableKey ? loadStripe(publishableKey) : null;

interface StripePaymentSectionProps {
  amount: number;
  apiClient: ApiClient;
  onConfirmReady: (confirm: () => Promise<string | null>) => void;
}

function StripePaymentInner({
  onConfirmReady,
}: {
  onConfirmReady: (confirm: () => Promise<string | null>) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();

  useEffect(() => {
    onConfirmReady(async () => {
      if (!stripe || !elements) {
        return null;
      }

      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: "if_required",
        confirmParams: {
          return_url: `${window.location.origin}/sales`,
        },
      });

      if (error) {
        throw new Error(error.message || "Payment failed");
      }

      if (paymentIntent?.status !== "succeeded") {
        throw new Error("Payment was not completed");
      }

      return paymentIntent.id;
    });
  }, [stripe, elements, onConfirmReady]);

  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
      <PaymentElement
        options={{
          layout: "tabs",
          paymentMethodOrder: ["card"],
          wallets: {
            applePay: "never",
            googlePay: "never",
          },
        }}
      />
    </div>
  );
}

export function StripePaymentSection({
  amount,
  apiClient,
  onConfirmReady,
}: StripePaymentSectionProps) {
  const [clientSecret, setClientSecret] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!publishableKey) {
      setError("Stripe publishable key is not configured");
      return;
    }

    if (amount <= 0) {
      setClientSecret("");
      return;
    }

    let cancelled = false;

    async function loadIntent() {
      setLoading(true);
      setError("");
      try {
        const data = await createPaymentIntent(apiClient, amount);
        if (!cancelled) {
          setClientSecret(data.clientSecret);
        }
      } catch (err) {
        if (!cancelled) {
          setClientSecret("");
          setError(getErrorMessage(err, "Failed to initialize Stripe payment"));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadIntent();

    return () => {
      cancelled = true;
    };
  }, [amount, apiClient]);

  if (!publishableKey) {
    return (
      <p className="text-sm text-red-600">
        Add VITE_STRIPE_PUBLISHABLE_KEY to enable Stripe payments.
      </p>
    );
  }

  if (loading) {
    return <p className="text-sm text-slate-500">Loading payment form...</p>;
  }

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  if (!clientSecret || !stripePromise) {
    return null;
  }

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        appearance: { theme: "stripe" },
      }}
    >
      <StripePaymentInner onConfirmReady={onConfirmReady} />
    </Elements>
  );
}
