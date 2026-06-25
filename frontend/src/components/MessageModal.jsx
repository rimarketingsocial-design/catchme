import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
    borderRadius: '12px',
  },
};

const PRICES = { poznanstvo: '$1.00', veza: '$2.00', avantura: '$3.00' };
const INTENTION_STYLES = {
  poznanstvo: 'bg-blue-500/20 border-blue-500/50 text-blue-300',
  veza: 'bg-rose-500/20 border-rose-500/50 text-rose-300',
  avantura: 'bg-orange-500/20 border-orange-500/50 text-orange-300',
};

export default function MessageModal({ member, clubId, onClose, onSent }) {
  const { t } = useApp();
  const navigate = useNavigate();
  const [content, setContent] = useState('');
  const [clientSecret, setClientSecret] = useState(null);
  const [paymentIntentId, setPaymentIntentId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const intention = member.intention || 'poznanstvo';
  const price = PRICES[intention];

  const initPayment = async () => {
    if (!content.trim()) return setError('Please write a message first');
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/api/payments/create-intent', {
        type: 'message',
        intention_type: intention,
      });
      setClientSecret(data.client_secret);
      setPaymentIntentId(data.payment_intent_id);
    } catch (err) {
      setError(err.response?.data?.error || t('error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end justify-center animate-fade-in"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-lg bg-dark-800 rounded-t-3xl border-t border-dark-600 p-6 animate-slide-up">
        <div className="w-10 h-1 bg-dark-500 rounded-full mx-auto mb-6" />

        {/* Recipient */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-full bg-dark-600 overflow-hidden">
            {member.photo_url
              ? <img src={member.photo_url} className="w-full h-full object-cover" alt="" />
              : <div className="w-full h-full flex items-center justify-center text-xl">👤</div>
            }
          </div>
          <div>
            <p className="text-white font-bold">{member.name}</p>
            <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${INTENTION_STYLES[intention] || ''}`}>
              {t(intention)}
            </span>
          </div>
          <div className="ml-auto text-right">
            <p className="text-gray-500 text-xs">{t('message_cost')}</p>
            <p className="text-white font-black text-xl">{price}</p>
          </div>
        </div>

        {!clientSecret ? (
          <>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder={t('your_message')}
              rows={3}
              maxLength={500}
              className="w-full bg-dark-700 border border-dark-500 rounded-xl px-4 py-3 text-white placeholder-gray-600
                focus:outline-none focus:border-neon-pink resize-none text-sm mb-1"
            />
            <p className="text-gray-600 text-xs text-right mb-4">{content.length}/500</p>

            {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

            {import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY?.includes('placeholder') ? (
              <button
                onClick={async () => {
                  if (!content.trim()) return setError('Upiši poruku prvo');
                  setLoading(true);
                  try {
                    const res = await api.post('/api/messages', {
                      receiver_id: member.user_id,
                      club_id: clubId,
                      content,
                      intention_type: intention,
                      payment_intent_id: 'test_' + Date.now(),
                    });
                    if (res.data?.existing) {
                      onClose();
                      navigate(`/chat/${res.data.other_user_id}`);
                      return;
                    }
                    onSent();
                  } catch (err) {
                    setError(err.response?.data?.error || t('error'));
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading || !content.trim()}
                className="w-full py-4 rounded-2xl bg-neon-gradient text-white font-bold text-lg disabled:opacity-50"
              >
                {loading ? t('loading') : `🧪 Test Pošalji (${price} - bez plaćanja)`}
              </button>
            ) : (
              <button
                onClick={initPayment}
                disabled={loading || !content.trim()}
                className="w-full py-4 rounded-2xl bg-neon-gradient text-white font-bold text-lg disabled:opacity-50"
              >
                {loading ? t('loading') : `${t('pay_and_send')} ${price}`}
              </button>
            )}
          </>
        ) : (
          <Elements stripe={stripePromise} options={{ clientSecret, appearance: STRIPE_APPEARANCE }}>
            <MessagePaymentForm
              member={member}
              clubId={clubId}
              content={content}
              intention={intention}
              paymentIntentId={paymentIntentId}
              price={price}
              onSent={onSent}
              onClose={onClose}
              navigate={navigate}
              t={t}
            />
          </Elements>
        )}

        <button onClick={onClose} className="w-full py-3 mt-2 text-gray-500 hover:text-white text-sm transition-colors">
          {t('cancel')}
        </button>
      </div>
    </div>
  );
}

function MessagePaymentForm({ member, clubId, content, intention, paymentIntentId, price, onSent, onClose, navigate, t }) {
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

      const res = await api.post('/api/messages', {
        receiver_id: member.user_id,
        club_id: clubId,
        content,
        intention_type: intention,
        payment_intent_id: paymentIntentId,
      });

      if (res.data?.existing) {
        onClose();
        navigate(`/chat/${res.data.other_user_id}`);
        return;
      }
      onSent();
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
        {processing ? t('loading') : `Pay ${price} & Send`}
      </button>
    </form>
  );
}
