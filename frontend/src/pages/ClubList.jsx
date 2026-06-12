import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { useApp } from '../context/AppContext';
import Navbar from '../components/Navbar';

export default function ClubList() {
  const navigate = useNavigate();
  const { t, checkin, profile } = useApp();
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/clubs?city=Belgrade')
      .then(r => setClubs(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-dark-900 pb-24">
      {/* Header */}
      <div className="px-6 pt-12 pb-6">
        <div className="flex items-center justify-between mb-1">
          <div>
            <p className="text-gray-500 text-sm">👋 {profile?.name}</p>
            <h1 className="text-2xl font-black text-white">
              {t('clubs_in')} <span className="bg-neon-gradient bg-clip-text text-transparent">Belgrade</span>
            </h1>
          </div>
          {checkin && (
            <div className="bg-dark-700 border border-neon-pink/30 rounded-xl px-3 py-2 text-right">
              <p className="text-xs text-gray-500">Live at</p>
              <p className="text-white text-sm font-bold truncate max-w-[120px]">{checkin.clubs?.name}</p>
            </div>
          )}
        </div>
      </div>

      {/* Club list */}
      {loading ? (
        <div className="flex items-center justify-center h-64 text-gray-500">{t('loading')}</div>
      ) : (
        <div className="px-4 flex flex-col gap-4">
          {clubs.map(club => (
            <button
              key={club.id}
              onClick={() => navigate(`/clubs/${club.id}`)}
              className="relative w-full rounded-2xl overflow-hidden shadow-xl active:scale-95 transition-transform"
            >
              <img
                src={club.photo_url}
                alt={club.name}
                className="w-full h-48 object-cover"
                onError={e => { e.target.src = 'https://images.unsplash.com/photo-1566737236500-c8ac43014a67?w=800'; }}
              />
              <div className="absolute inset-0 bg-card-gradient" />

              {checkin?.club_id === club.id && (
                <div className="absolute top-3 right-3 bg-neon-pink text-white text-xs font-bold px-3 py-1 rounded-full">
                  {t('checked_in')}
                </div>
              )}

              <div className="absolute bottom-0 left-0 right-0 p-4 text-left">
                <h3 className="text-white font-black text-xl">{club.name}</h3>
                <p className="text-gray-300 text-sm mt-0.5">📍 {club.address}</p>
                {club.description && (
                  <p className="text-gray-400 text-xs mt-1 line-clamp-1">{club.description}</p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      <Navbar />
    </div>
  );
}
