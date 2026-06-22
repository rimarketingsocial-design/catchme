import { useState } from 'react';
import api from '../lib/api';
import { useApp } from '../context/AppContext';

export default function CheckinModal({ club, onSuccess, onClose }) {
  const { t, profile } = useApp();
  const [loading, setLoading] = useState(false);

  const handleCheckin = async () => {
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
            onError={e => { e.target.src = 'https://picsum.photos/seed/club/400/400'; }} />
          <div>
            <h2 className="text-white font-black text-xl">{club.name}</h2>
            <p className="text-gray-500 text-sm">📍 {club.address}</p>
          </div>
        </div>

        <div className="bg-dark-700 rounded-2xl p-4 mb-4 text-center">
          <span className="text-3xl">✨</span>
          <p className="text-white font-bold mt-2">{t('free_checkin')}</p>
          <p className="text-gray-500 text-sm mt-1">Važi 8 sati u {club.name}</p>
        </div>

        <button
          onClick={handleCheckin}
          disabled={loading}
          className="w-full py-4 rounded-2xl bg-neon-gradient text-white font-bold text-lg disabled:opacity-50"
        >
          {loading ? t('loading') : `✨ ${t('check_in')}`}
        </button>

        <button onClick={onClose} className="w-full py-3 mt-3 text-gray-500 hover:text-white text-sm transition-colors">
          {t('cancel')}
        </button>
      </div>
    </div>
  );
}
