import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../lib/api';
import { useApp } from '../context/AppContext';
import CheckinModal from '../components/CheckinModal';

export default function ClubDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, profile, checkin, setCheckin } = useApp();
  const [club, setClub] = useState(null);
  const [members, setMembers] = useState([]);
  const [showCheckin, setShowCheckin] = useState(false);
  const [loading, setLoading] = useState(true);

  const isCheckedIn = checkin?.club_id === id;

  useEffect(() => {
    Promise.all([
      api.get(`/api/clubs/${id}`),
      api.get(`/api/clubs/${id}/members`),
    ]).then(([clubRes, membersRes]) => {
      setClub(clubRes.data);
      setMembers(membersRes.data);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const handleCheckout = async () => {
    await api.delete('/api/checkins/me');
    setCheckin(null);
  };

  const onCheckinSuccess = (newCheckin) => {
    setCheckin(newCheckin);
    setShowCheckin(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center text-gray-500">
        {t('loading')}
      </div>
    );
  }

  const oppositeLabel = profile?.gender === 'male' ? '💃' : '🕺';
  const isMale = profile?.gender === 'male';

  return (
    <div className="min-h-screen bg-dark-900">
      {/* Hero image */}
      <div className="relative h-64">
        <img
          src={club?.photo_url}
          alt={club?.name}
          className="w-full h-full object-cover"
          onError={e => { e.target.src = 'https://images.unsplash.com/photo-1566737236500-c8ac43014a67?w=800'; }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-dark-900" />
        <button
          onClick={() => navigate('/clubs')}
          className="absolute top-4 left-4 w-10 h-10 bg-black/50 backdrop-blur rounded-full flex items-center justify-center text-white"
        >
          ←
        </button>
      </div>

      {/* Club info */}
      <div className="px-6 -mt-4 relative z-10">
        <h1 className="text-3xl font-black text-white">{club?.name}</h1>
        <p className="text-gray-400 mt-1">📍 {club?.address}</p>
        {club?.description && <p className="text-gray-500 text-sm mt-2">{club.description}</p>}

        {/* Member count */}
        <div className="flex items-center gap-2 mt-4 mb-6">
          <div className="flex -space-x-2">
            {members.slice(0, 4).map((m, i) => (
              <div key={i} className="w-8 h-8 rounded-full border-2 border-dark-900 bg-dark-600 overflow-hidden">
                {m.photo_url
                  ? <img src={m.photo_url} className="w-full h-full object-cover" alt="" />
                  : <span className="w-full h-full flex items-center justify-center text-xs">{oppositeLabel}</span>
                }
              </div>
            ))}
          </div>
          <p className="text-gray-400 text-sm">
            <span className="text-white font-bold">{members.length}</span> {t('people_here')}
          </p>
        </div>

        {/* Check-in / checkout button */}
        {isCheckedIn ? (
          <div className="flex flex-col gap-3">
            <button
              onClick={() => navigate(`/clubs/${id}/swipe`)}
              className="w-full py-4 rounded-2xl bg-neon-gradient text-white font-bold text-lg shadow-lg"
            >
              {oppositeLabel} Pogledaj ko je tu →
            </button>
            <button
              onClick={handleCheckout}
              className="w-full py-3 rounded-2xl border border-dark-500 text-gray-400 font-semibold"
            >
              {t('check_out')}
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowCheckin(true)}
            className="w-full py-4 rounded-2xl bg-neon-gradient text-white font-bold text-lg shadow-lg animate-pulse-neon"
          >
            {`✨ ${t('free_checkin')}`}
          </button>
        )}
      </div>

      {showCheckin && (
        <CheckinModal
          club={club}
          onSuccess={onCheckinSuccess}
          onClose={() => setShowCheckin(false)}
        />
      )}
    </div>
  );
}
