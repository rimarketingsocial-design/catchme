import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { useApp } from '../context/AppContext';
import Navbar from '../components/Navbar';

export default function Society() {
  const navigate = useNavigate();
  const { profile } = useApp();
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/society')
      .then(r => setConnections(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const coinBalance = profile?.catch_coins_total || 0;
  const freeMessages = Math.floor(coinBalance / 10);

  return (
    <div className="min-h-screen bg-dark-900 pb-28">
      <div className="px-5 pt-14 pb-6">
        <h1 className="text-3xl font-black text-white">Društvo</h1>
        <p className="text-gray-500 text-sm mt-1">Veze koje si izgradio/la ove noći</p>

        {/* Coin balance */}
        <div className="mt-4 bg-dark-800 border border-yellow-400/20 rounded-2xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🪙</span>
            <div>
              <p className="text-white font-bold">{coinBalance} Catch Coins</p>
              <p className="text-gray-500 text-xs">
                {freeMessages > 0
                  ? `${freeMessages} besplatna poruka${freeMessages > 1 ? 'e' : ''} dostupno`
                  : `Još ${10 - (coinBalance % 10)} coina do besplatne poruke`}
              </p>
            </div>
          </div>
          <div className="bg-yellow-400/10 border border-yellow-400/30 rounded-xl px-3 py-1.5">
            <span className="text-yellow-400 text-sm font-bold">{freeMessages}x</span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40 text-gray-500">Učitavanje...</div>
      ) : connections.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-56 gap-3 px-8 text-center">
          <div className="w-16 h-16 rounded-full bg-dark-800 flex items-center justify-center text-3xl">👥</div>
          <p className="text-gray-400 font-semibold">Nema veza još</p>
          <p className="text-gray-600 text-sm">Razmijenite 10+ poruka sa nekim te večeri da otključate Društvo</p>
        </div>
      ) : (
        <div className="px-4 flex flex-col gap-3">
          {connections.map(conn => (
            <div key={conn.id} className="bg-dark-800 border border-neon-pink/20 rounded-2xl p-4 flex items-center gap-3">
              <div className="w-12 h-12 rounded-full overflow-hidden bg-dark-600 border-2 border-neon-pink/40 flex-shrink-0">
                {conn.other_user?.photo_url
                  ? <img src={conn.other_user.photo_url} className="w-full h-full object-cover" alt="" />
                  : <div className="w-full h-full flex items-center justify-center text-gray-500 text-xl">👤</div>
                }
              </div>
              <div className="flex-1">
                <p className="text-white font-bold">{conn.other_user?.name}</p>
                <p className="text-gray-500 text-xs mt-0.5">
                  🏠 {conn.club?.name} · {new Date(conn.unlocked_at).toLocaleDateString('sr-RS')}
                </p>
              </div>
              <div className="flex items-center gap-1 bg-neon-pink/10 border border-neon-pink/30 rounded-xl px-3 py-1.5">
                <span className="text-neon-pink text-xs font-bold">Chat otključan</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <Navbar />
    </div>
  );
}
