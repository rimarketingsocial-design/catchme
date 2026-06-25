import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../lib/api';
import { useApp } from '../context/AppContext';
import CheckinModal from '../components/CheckinModal';

const IconBack = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6"/>
  </svg>
);
const IconPin = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
  </svg>
);
const IconMusic = ({ size = 12 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
  </svg>
);
const IconFire = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-neon-pink">
    <path d="M12 2c0 0-5 5.5-5 10a5 5 0 0 0 10 0c0-2-1-4-2-5.5 0 2-1.5 3-1.5 3S12 7 12 2z"/>
  </svg>
);
const IconUser = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
  </svg>
);
const IconStar = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
);
const IconArrow = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
  </svg>
);

export default function ClubDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, profile, checkin, setCheckin } = useApp();
  const [club, setClub] = useState(null);
  const [members, setMembers] = useState([]);
  const [goingUsers, setGoingUsers] = useState([]);
  const [todayEvent, setTodayEvent] = useState(null);
  const [showCheckin, setShowCheckin] = useState(false);
  const [showInClubDialog, setShowInClubDialog] = useState(false);
  const [myStatus, setMyStatus] = useState('going');
  const [loading, setLoading] = useState(true);
  const dialogDismissed = useRef(false);

  const isCheckedIn = checkin?.club_id === id;

  useEffect(() => {
    Promise.all([
      api.get(`/api/clubs/${id}`),
      api.get(`/api/clubs/${id}/members`),
      api.get(`/api/events?club_id=${id}`),
      api.get(`/api/checkins/club/${id}`),
    ]).then(([clubRes, membersRes, eventsRes, goingRes]) => {
      setClub(clubRes.data);
      setMembers(membersRes.data);
      setGoingUsers(goingRes.data || []);
      const today = new Date().toISOString().split('T')[0];
      const te = (eventsRes.data || []).find(e => e.date === today);
      setTodayEvent(te || null);

      // Find my current status
      const mine = (goingRes.data || []).find(u => u.user_id === profile?.id);
      if (mine) setMyStatus(mine.status);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  // Poll for "Are you in the club?" dialog once event starts
  useEffect(() => {
    if (!todayEvent || !isCheckedIn || dialogDismissed.current || myStatus === 'in_club') return;

    const check = () => {
      const now = new Date();
      const [h, m] = todayEvent.start_time.split(':').map(Number);
      const startToday = new Date();
      startToday.setHours(h, m, 0, 0);
      if (now >= startToday && myStatus === 'going' && !dialogDismissed.current) {
        setShowInClubDialog(true);
      }
    };

    check();
    const interval = setInterval(check, 60000);
    return () => clearInterval(interval);
  }, [todayEvent, isCheckedIn, myStatus]);

  const handleCheckout = async () => {
    await api.delete('/api/checkins/me');
    setCheckin(null);
  };

  const onCheckinSuccess = (newCheckin) => {
    setCheckin(newCheckin);
    setShowCheckin(false);
    // Add self to going list
    setGoingUsers(prev => {
      const exists = prev.find(u => u.user_id === profile?.id);
      if (exists) return prev;
      return [...prev, {
        user_id: profile?.id,
        name: profile?.name,
        photo_url: profile?.photo_url,
        status: 'going',
      }];
    });
  };

  const handleInClub = async () => {
    try {
      await api.patch('/api/checkins/me/status', { status: 'in_club' });
      setMyStatus('in_club');
      setGoingUsers(prev => prev.map(u =>
        u.user_id === profile?.id ? { ...u, status: 'in_club' } : u
      ));
    } catch {}
    setShowInClubDialog(false);
    dialogDismissed.current = true;
  };

  const handleNotYet = () => {
    setShowInClubDialog(false);
    dialogDismissed.current = true;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center text-gray-500">
        {t('loading')}
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-dark-900 pb-10">
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
          <IconBack />
        </button>
      </div>

      {/* Club info */}
      <div className="px-6 -mt-4 relative z-10">
        <h1 className="text-3xl font-black text-white">{club?.name}</h1>
        <p className="text-gray-400 mt-1 flex items-center gap-1.5"><span className="text-neon-pink"><IconPin /></span>{club?.address}</p>
        {club?.genre && <p className="text-gray-500 text-sm mt-0.5 flex items-center gap-1.5"><span className="text-neon-purple"><IconMusic /></span>{club.genre}</p>}
        {todayEvent && (
          <div className="mt-3 flex items-center gap-2 bg-neon-pink/15 border border-neon-pink/30 rounded-2xl px-4 py-2.5">
            <span className="text-neon-pink"><IconFire /></span>
            <div>
              <p className="text-white font-bold text-sm">{todayEvent.name}</p>
              <p className="text-neon-pink text-xs font-semibold">
                Tonight · {todayEvent.start_time?.slice(0, 5)}h
                {todayEvent.end_time ? ` – ${todayEvent.end_time.slice(0, 5)}h` : ''}
              </p>
            </div>
          </div>
        )}
        {club?.description && <p className="text-gray-500 text-sm mt-2">{club.description}</p>}

        {/* Member count */}
        <div className="flex items-center gap-2 mt-4 mb-4">
          <div className="flex -space-x-2">
            {members.slice(0, 4).map((m, i) => (
              <div key={i} className="w-8 h-8 rounded-full border-2 border-dark-900 bg-dark-600 overflow-hidden">
                {m.photo_url
                  ? <img src={m.photo_url} className="w-full h-full object-cover" alt="" />
                  : <span className="w-full h-full flex items-center justify-center text-gray-500"><IconUser /></span>
                }
              </div>
            ))}
          </div>
          <p className="text-gray-400 text-sm">
            <span className="text-white font-bold">{members.length}</span> {t('people_here')}
          </p>
        </div>

        {/* Going to this party scroll — only after check-in */}
        {isCheckedIn && goingUsers.length > 0 && (
          <div className="mb-5">
            <p className="text-gray-500 text-xs font-semibold mb-2 uppercase tracking-wider">{t('going_to_party')}</p>
            <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1" style={{ scrollbarWidth: 'none' }}>
              {goingUsers.map(u => (
                <div key={u.user_id} className="flex flex-col items-center gap-1.5 flex-shrink-0 w-16">
                  <div className={`relative w-12 h-12 rounded-full overflow-hidden border-2 ${
                    u.status === 'in_club' ? 'border-green-400' : 'border-neon-pink/60'
                  }`}>
                    {u.photo_url
                      ? <img src={u.photo_url} className="w-full h-full object-cover" alt="" />
                      : <div className="w-full h-full bg-dark-600 flex items-center justify-center text-gray-500"><IconUser /></div>
                    }
                    {u.status === 'in_club' && (
                      <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-400 rounded-full border-2 border-dark-900" />
                    )}
                  </div>
                  <p className="text-gray-300 text-[10px] font-medium text-center leading-tight truncate w-full">
                    {u.user_id === profile?.id ? 'You' : u.name}
                  </p>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                    u.status === 'in_club'
                      ? 'bg-green-400/20 text-green-400'
                      : 'bg-neon-pink/20 text-neon-pink'
                  }`}>
                    {u.status === 'in_club' ? t('in_the_club') : `${t('going_to')} ${club?.name}`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Check-in / checkout button */}
        {isCheckedIn ? (
          <div className="flex flex-col gap-3">
            <button
              onClick={() => navigate(`/clubs/${id}/swipe`)}
              className="w-full py-4 rounded-2xl bg-neon-gradient text-white font-bold text-lg shadow-lg flex items-center justify-center gap-2"
            >
              <IconStar /> See who's here <IconArrow />
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
            <span className="flex items-center justify-center gap-2"><IconStar /> {t('free_checkin')}</span>
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

      {/* Are you in the club? dialog */}
      {showInClubDialog && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm px-4 pb-10">
          <div className="w-full max-w-sm bg-dark-800 border border-neon-pink/30 rounded-3xl p-6 shadow-2xl">
            <div className="text-center mb-5">
              <div className="w-14 h-14 rounded-full bg-neon-pink/20 border border-neon-pink/40 flex items-center justify-center mx-auto mb-2 text-neon-pink">
                <IconMusic size={26} />
              </div>
              <h3 className="text-white font-black text-xl mt-2">{t('are_you_in_club')}</h3>
              <p className="text-gray-400 text-sm mt-1">{club?.name} — {todayEvent?.name}</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleNotYet}
                className="flex-1 py-3 rounded-2xl border border-dark-500 text-gray-400 font-semibold"
              >
                {t('not_yet')}
              </button>
              <button
                onClick={handleInClub}
                className="flex-1 py-3 rounded-2xl bg-neon-gradient text-white font-bold"
              >
                {t('yes_im_in')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
