import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import api from '../lib/api';
import { useApp } from '../context/AppContext';
import Navbar from '../components/Navbar';

const IconPin = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
  </svg>
);

const IconMusic = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
  </svg>
);

const IconClock = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
);

const IconFire = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2c0 0-5 5.5-5 10a5 5 0 0 0 10 0c0-2-1-4-2-5.5 0 2-1.5 3-1.5 3S12 7 12 2z"/>
  </svg>
);

export default function ClubList() {
  const navigate = useNavigate();
  const { t, checkin, profile } = useApp();
  const [clubs, setClubs] = useState([]);
  const [counts, setCounts] = useState({});
  const [todayEvents, setTodayEvents] = useState({});
  const [animating, setAnimating] = useState({});
  const [loading, setLoading] = useState(true);
  const prevCounts = useRef({});

  const isMale = profile?.gender === 'male';
  const counterLabel = isMale ? 'Djevojaka' : 'Momaka';

  const fetchCounts = useCallback(async () => {
    try {
      const { data } = await api.get('/api/clubs/counts?city=Belgrade');
      setCounts(prev => {
        const changed = {};
        Object.keys(data).forEach(clubId => {
          if (data[clubId] !== prev[clubId]) changed[clubId] = true;
        });
        Object.keys(prev).forEach(clubId => {
          if (!data[clubId] && prev[clubId]) changed[clubId] = true;
        });
        if (Object.keys(changed).length > 0) {
          setAnimating(changed);
          setTimeout(() => setAnimating({}), 800);
        }
        return data;
      });
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    Promise.all([
      api.get('/api/clubs?city=Belgrade'),
      api.get('/api/clubs/counts?city=Belgrade'),
      api.get('/api/events/today?city=Belgrade'),
    ]).then(([clubsRes, countsRes, eventsRes]) => {
      setClubs(clubsRes.data);
      setCounts(countsRes.data);
      setTodayEvents(eventsRes.data);
      prevCounts.current = countsRes.data;
    }).catch(console.error)
      .finally(() => setLoading(false));

    const channel = supabase
      .channel('checkins-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'checkins' }, () => fetchCounts())
      .subscribe();

    const interval = setInterval(fetchCounts, 8000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [fetchCounts]);

  // Only show clubs with an event tonight
  const activeClubs = clubs.filter(c => todayEvents[c.id]);

  return (
    <div className="min-h-screen bg-dark-900 pb-28">
      <style>{`
        @keyframes countPop {
          0%   { transform: scale(1); }
          40%  { transform: scale(1.5); }
          70%  { transform: scale(0.9); }
          100% { transform: scale(1); }
        }
        .count-pop { animation: countPop 0.5s ease-out; }
      `}</style>

      {/* Header */}
      <div className="px-5 pt-14 pb-6">
        <p className="text-gray-500 text-sm mb-0.5">Dobro veče, {profile?.name}</p>
        <h1 className="text-3xl font-black text-white leading-tight">
          Večeras u{' '}
          <span className="bg-neon-gradient bg-clip-text text-transparent">Beogradu</span>
        </h1>
        {checkin && (
          <div className="mt-3 flex items-center gap-2 bg-neon-pink/10 border border-neon-pink/30 rounded-2xl px-4 py-2.5 w-fit">
            <div className="w-2 h-2 rounded-full bg-neon-pink animate-pulse" />
            <p className="text-neon-pink text-sm font-semibold">Live: {checkin.clubs?.name}</p>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64 text-gray-500">{t('loading')}</div>
      ) : activeClubs.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 gap-3 text-center px-8">
          <span className="text-5xl opacity-30">🌙</span>
          <p className="text-gray-500 text-base font-medium">Nema žurki večeras</p>
          <p className="text-gray-600 text-sm">Provjerite sutra</p>
        </div>
      ) : (
        <div className="px-4 flex flex-col gap-5">
          {activeClubs.map(club => {
            const count = counts[club.id] || 0;
            const isActive = checkin?.club_id === club.id;
            const isAnimating = animating[club.id];
            const event = todayEvents[club.id];

            return (
              <button
                key={club.id}
                onClick={() => navigate(`/clubs/${club.id}`)}
                className="relative w-full rounded-3xl overflow-hidden shadow-2xl active:scale-95 transition-all duration-200"
              >
                <img
                  src={club.photo_url}
                  alt={club.name}
                  className="w-full h-56 object-cover"
                  onError={e => { e.target.src = 'https://picsum.photos/seed/club/800/500'; }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />

                {/* Live counter */}
                <div className={`absolute top-3 right-3 flex flex-col items-center backdrop-blur-md border rounded-2xl px-3 py-2 min-w-[60px] transition-all ${
                  count > 0 ? 'bg-black/60 border-neon-pink/50' : 'bg-black/40 border-white/10'
                }`}>
                  <span
                    key={count}
                    className={`text-xl font-black leading-none ${count > 0 ? 'text-neon-pink' : 'text-gray-500'} ${isAnimating ? 'count-pop' : ''}`}
                  >
                    {count}
                  </span>
                  <span className="text-gray-300 text-[9px] font-medium mt-0.5 leading-tight text-center">{counterLabel}</span>
                  {count > 0 && (
                    <div className={`w-1.5 h-1.5 rounded-full bg-neon-pink mt-1 ${isAnimating ? 'animate-ping' : 'animate-pulse'}`} />
                  )}
                </div>

                {isActive && (
                  <div className="absolute top-3 left-3 bg-neon-pink text-white text-xs font-bold px-3 py-1.5 rounded-full">
                    ✓ Prijavljen
                  </div>
                )}

                {/* Bottom info */}
                <div className="absolute bottom-0 left-0 right-0 p-4 text-left">
                  <h3 className="text-white font-black text-2xl leading-tight">{club.name}</h3>

                  <div className="flex items-center gap-3 mt-1.5">
                    {club.address && (
                      <span className="flex items-center gap-1 text-gray-400 text-xs">
                        <IconPin /> {club.address}
                      </span>
                    )}
                    {club.genre && (
                      <span className="flex items-center gap-1 text-gray-400 text-xs">
                        <IconMusic /> {club.genre}
                      </span>
                    )}
                  </div>

                  {/* Tonight's event */}
                  <div className="mt-2.5 flex items-center gap-2">
                    <div className="flex items-center gap-1.5 bg-neon-pink/20 border border-neon-pink/40 rounded-xl px-3 py-1.5">
                      <span className="text-neon-pink"><IconFire /></span>
                      <span className="text-white text-xs font-bold">{event.name}</span>
                    </div>
                    <div className="flex items-center gap-1 bg-white/10 border border-white/10 rounded-xl px-2.5 py-1.5">
                      <span className="text-gray-400"><IconClock /></span>
                      <span className="text-gray-200 text-xs font-semibold">{event.start_time?.slice(0, 5)}h</span>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <Navbar />
    </div>
  );
}
