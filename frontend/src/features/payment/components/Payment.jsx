import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useDispatch, useSelector } from 'react-redux';
import { createPaymentIntent, resetPayment } from '../paymentSlice';

// Load Stripe outside component
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

function CheckoutForm() {
  const dispatch = useDispatch();
  const stripe = useStripe();
  const elements = useElements();
  const clientSecret = useSelector(state => state.payment.clientSecret);
  const status = useSelector(state => state.payment.status);
  const error = useSelector(state => state.payment.error);
  const [amount, setAmount] = useState(0);
  const [message, setMessage] = useState('');

  useEffect(() => {
    return () => { dispatch(resetPayment()); };
  }, [dispatch]);

  const handleAmountChange = (e) => {
    setAmount(parseInt(e.target.value, 10));
  };

  const handlePay = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) {
      return;
    }
    if (!clientSecret) {
      dispatch(createPaymentIntent(amount));
      return;
    }
    const cardElement = elements.getElement(CardElement);
    const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: { card: cardElement }
    });
    if (stripeError) {
      setMessage(stripeError.message);
    } else if (paymentIntent && paymentIntent.status === 'succeeded') {
      setMessage('Payment successful!');
    }
  };

  return (
    <form onSubmit={handlePay} className="max-w-md mx-auto p-4">
      <h2 className="text-2xl mb-4">Make a Payment</h2>
      <input
        type="number"
        placeholder="Amount in cents"
        value={amount}
        onChange={handleAmountChange}
        className="border p-2 mb-4 w-full"
      />
      {clientSecret && (
        <div className="border p-4 mb-4">
          <CardElement />
        </div>
      )}
      <button
        type="submit"
        className="bg-green-500 text-white py-2 px-4"
        disabled={status === 'loading' || !stripe}
      >
        {clientSecret ? (status === 'loading' ? 'Processing...' : 'Pay') : (status === 'loading' ? 'Creating...' : 'Create Payment Intent')}
      </button>
      {message && <p className="mt-2 text-red-500">{message}</p>}
    </form>
  );
}

export default function Payment() {
  return (
    <Elements stripe={stripePromise}>
      <CheckoutForm />
    </Elements>
  );
}
