import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import api from '../lib/api';
import { useApp } from '../context/AppContext';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

const STRIPE_APPEARANCE = {
  theme: 'night',
  variables: {
    colorPrimary: '#ff2d78',
    colorBackground: '#1a1a28',
    colorText: '#ffffff',
    colorDanger: '#ff4d4d',
    fontFamily: 'Inter, system-ui, sans-serif',
    borderRadius: '12px',
  },
};

export default function CheckinModal({ club, onSuccess, onClose }) {
  const { t, profile } = useApp();
  const [clientSecret, setClientSecret] = useState(null);
  const [paymentIntentId, setPaymentIntentId] = useState(null);
  const [loading, setLoading] = useState(false);
  const isMale = profile?.gender === 'male';

  const initPayment = async () => {
    setLoading(true);
    try {
      const { data } = await api.post('/api/payments/create-intent', { type: 'checkin' });
      setClientSecret(data.client_secret);
      setPaymentIntentId(data.payment_intent_id);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFreeCheckin = async () => {
    setLoading(true);
    try {
      const { data } = await api.post('/api/checkins', { club_id: club.id });
      onSuccess(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end justify-center animate-fade-in"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-lg bg-dark-800 rounded-t-3xl border-t border-dark-600 p-6 animate-slide-up">
        <div className="w-10 h-1 bg-dark-500 rounded-full mx-auto mb-6" />

        <div className="flex items-center gap-3 mb-6">
          <img src={club.photo_url} className="w-14 h-14 rounded-xl object-cover" alt={club.name}
            onError={e => { e.target.src = 'https://images.unsplash.com/photo-1566737236500-c8ac43014a67?w=400'; }} />
          <div>
            <h2 className="text-white font-black text-xl">{club.name}</h2>
            <p className="text-gray-500 text-sm">📍 {club.address}</p>
          </div>
        </div>

        {!isMale ? (
          <div>
            <div className="bg-dark-700 rounded-2xl p-4 mb-4 text-center">
              <span className="text-3xl">✨</span>
              <p className="text-white font-bold mt-2">{t('free_checkin')}</p>
              <p className="text-gray-500 text-sm mt-1">Check in is free for women</p>
            </div>
            <button
              onClick={handleFreeCheckin}
              disabled={loading}
              className="w-full py-4 rounded-2xl bg-neon-gradient text-white font-bold text-lg disabled:opacity-50"
            >
              {loading ? t('loading') : `✨ ${t('free_checkin')}`}
            </button>
          </div>
        ) : !clientSecret ? (
          <div>
            <div className="bg-dark-700 rounded-2xl p-4 mb-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">{t('check_in')}</span>
                <span className="text-white font-bold text-xl">$0.50</span>
              </div>
              <p className="text-gray-500 text-xs mt-2">Valid for 8 hours at {club.name}</p>
            </div>
            <button
              onClick={initPayment}
              disabled={loading}
              className="w-full py-4 rounded-2xl bg-neon-gradient text-white font-bold text-lg disabled:opacity-50"
            >
              {loading ? t('loading') : `🎟 ${t('checkin_cost')}`}
            </button>
          </div>
        ) : (
          <Elements stripe={stripePromise} options={{ clientSecret, appearance: STRIPE_APPEARANCE }}>
            <CheckinPaymentForm
              clubId={club.id}
              paymentIntentId={paymentIntentId}
              onSuccess={onSuccess}
              t={t}
            />
          </Elements>
        )}

        <button onClick={onClose} className="w-full py-3 mt-3 text-gray-500 hover:text-white text-sm transition-colors">
          {t('cancel')}
        </button>
      </div>
    </div>
  );
}

function CheckinPaymentForm({ clubId, paymentIntentId, onSuccess, t }) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setProcessing(true);
    setError('');

    try {
      const { error: stripeError } = await stripe.confirmPayment({
        elements,
        redirect: 'if_required',
      });

      if (stripeError) {
        setError(stripeError.message);
        return;
      }

      // Payment succeeded — create checkin
      const { data } = await api.post('/api/checkins', {
        club_id: clubId,
        payment_intent_id: paymentIntentId,
      });
      onSuccess(data);
    } catch (err) {
      setError(err.response?.data?.error || t('error'));
    } finally {
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement />
      {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
      <button
        type="submit"
        disabled={!stripe || processing}
        className="w-full py-4 rounded-2xl bg-neon-gradient text-white font-bold text-lg mt-4 disabled:opacity-50"
      >
        {processing ? t('loading') : `Pay $0.50 & Check In`}
      </button>
    </form>
  );
}
