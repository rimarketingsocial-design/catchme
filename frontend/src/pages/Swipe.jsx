import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../lib/api';
import { useApp } from '../context/AppContext';
import SwipeCard from '../components/SwipeCard';
import MessageModal from '../components/MessageModal';

export default function Swipe() {
  const { id: clubId } = useParams();
  const navigate = useNavigate();
  const { t, profile } = useApp();
  const [members, setMembers] = useState([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [messagingUser, setMessagingUser] = useState(null);

  useEffect(() => {
    api.get(`/api/clubs/${clubId}/members`)
      .then(r => setMembers(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [clubId]);

  const handleSwipe = (direction) => {
    if (direction === 'right' && profile?.gender === 'male') {
      setMessagingUser(members[index]);
    }
    setTimeout(() => setIndex(i => i + 1), 300);
  };

  const current = members[index];
  const hasMore = index < members.length;

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center text-gray-500">
        {t('loading')}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-900 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-10 pb-4">
        <button onClick={() => navigate(`/clubs/${clubId}`)} className="text-gray-400 hover:text-white text-lg">
          ←
        </button>
        <div className="text-center">
          <p className="text-gray-500 text-xs">{index + 1} / {members.length}</p>
          <p className="text-white font-bold">{t('swipe_hint')}</p>
        </div>
        <div className="w-8" />
      </div>

      {/* Card area */}
      <div className="flex-1 flex items-center justify-center px-4 relative">
        {!hasMore ? (
          <div className="text-center">
            <div className="text-6xl mb-4">🌙</div>
            <p className="text-white text-xl font-bold">{t('no_one_here')}</p>
            <p className="text-gray-500 mt-2">{t('no_one_sub')}</p>
            <button
              onClick={() => setIndex(0)}
              className="mt-6 px-6 py-3 rounded-xl border border-neon-pink text-neon-pink font-semibold"
            >
              ↩ {t('retry')}
            </button>
          </div>
        ) : (
          <div className="relative w-full max-w-sm" style={{ height: 520 }}>
            {/* Next card (peek) */}
            {members[index + 1] && (
              <div className="absolute inset-x-4 inset-y-2 rounded-3xl overflow-hidden opacity-60 scale-95">
                <MemberCard member={members[index + 1]} t={t} />
              </div>
            )}
            {/* Current card */}
            <SwipeCard
              key={current.user_id}
              member={current}
              t={t}
              isMale={profile?.gender === 'male'}
              onSwipeLeft={() => handleSwipe('left')}
              onSwipeRight={() => handleSwipe('right')}
              onMessage={() => {
                if (profile?.gender === 'male') setMessagingUser(current);
              }}
            />
          </div>
        )}
      </div>

      {/* Action buttons */}
      {hasMore && (
        <div className="flex items-center justify-center gap-8 pb-12 px-6">
          <button
            onClick={() => handleSwipe('left')}
            className="w-16 h-16 rounded-full bg-dark-700 border border-dark-500 flex items-center justify-center text-2xl hover:border-gray-400 active:scale-90 transition-all"
          >
            ✕
          </button>
          {profile?.gender === 'male' && (
            <button
              onClick={() => handleSwipe('right')}
              className="w-20 h-20 rounded-full bg-neon-gradient flex items-center justify-center text-3xl shadow-xl animate-pulse-neon active:scale-90 transition-all"
            >
              💌
            </button>
          )}
          <button
            onClick={() => handleSwipe('left')}
            className="w-16 h-16 rounded-full bg-dark-700 border border-dark-500 flex items-center justify-center text-2xl hover:border-gray-400 active:scale-90 transition-all"
          >
            →
          </button>
        </div>
      )}

      {messagingUser && (
        <MessageModal
          member={messagingUser}
          clubId={clubId}
          t={t}
          onClose={() => setMessagingUser(null)}
          onSent={() => { setMessagingUser(null); }}
        />
      )}
    </div>
  );
}

function MemberCard({ member, t }) {
  return (
    <div className="w-full h-full bg-dark-700 rounded-3xl overflow-hidden">
      {member.photo_url
        ? <img src={member.photo_url} className="w-full h-full object-cover" alt={member.name} />
        : <div className="w-full h-full flex items-center justify-center text-8xl bg-dark-600">👤</div>
      }
    </div>
  );
}
