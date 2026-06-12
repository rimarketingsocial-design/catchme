import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { useApp } from '../context/AppContext';
import Navbar from '../components/Navbar';

const INTENTIONS = [
  { type: 'poznanstvo', emoji: '👋', color: 'border-blue-500 text-blue-400' },
  { type: 'veza', emoji: '❤️', color: 'border-rose-500 text-rose-400' },
  { type: 'avantura', emoji: '🔥', color: 'border-orange-500 text-orange-400' },
];

export default function Profile() {
  const navigate = useNavigate();
  const { t, profile, fetchProfile, logout, checkin } = useApp();
  const [saving, setSaving] = useState(false);

  const handleIntention = async (type) => {
    setSaving(true);
    try {
      await api.post('/api/intentions', { type });
      await fetchProfile();
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const currentIntention = profile?.intentions?.[0]?.type;

  return (
    <div className="min-h-screen bg-dark-900 pb-24">
      <div className="px-6 pt-12 pb-6">
        <h1 className="text-2xl font-black text-white">{t('profile')}</h1>
      </div>

      {/* Avatar + name */}
      <div className="flex flex-col items-center py-6">
        <div className="w-24 h-24 rounded-full bg-dark-600 overflow-hidden border-2 border-neon-pink/50 mb-3">
          {profile?.photo_url
            ? <img src={profile.photo_url} className="w-full h-full object-cover" alt="" />
            : <div className="w-full h-full flex items-center justify-center text-4xl">👤</div>
          }
        </div>
        <h2 className="text-white font-black text-xl">{profile?.name}</h2>
        <p className="text-gray-500 text-sm mt-1">
          {profile?.gender === 'male' ? '♂ Male' : '♀ Female'} · {profile?.city}
        </p>
      </div>

      <div className="px-6 flex flex-col gap-4">
        {/* Current checkin */}
        {checkin && (
          <div className="bg-dark-800 border border-neon-pink/20 rounded-2xl p-4">
            <p className="text-gray-500 text-xs mb-1">Currently at</p>
            <p className="text-white font-bold">{checkin.clubs?.name}</p>
            <p className="text-gray-500 text-xs mt-1">
              Expires: {new Date(checkin.expires_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        )}

        {/* Intention (females only) */}
        {profile?.gender === 'female' && (
          <div className="bg-dark-800 rounded-2xl p-4">
            <p className="text-gray-400 text-sm font-semibold mb-3">{t('set_intention')}</p>
            <div className="flex gap-2">
              {INTENTIONS.map(({ type, emoji, color }) => (
                <button
                  key={type}
                  onClick={() => handleIntention(type)}
                  disabled={saving}
                  className={`flex-1 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                    currentIntention === type
                      ? `${color} bg-dark-700`
                      : 'border-dark-500 text-gray-500 hover:border-gray-400'
                  }`}
                >
                  {emoji} {t(type)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full py-4 rounded-2xl border border-dark-500 text-gray-400 font-semibold hover:border-red-500 hover:text-red-400 transition-all mt-2"
        >
          {t('logout')}
        </button>
      </div>

      <Navbar />
    </div>
  );
}
