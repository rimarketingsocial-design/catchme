import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import api from '../lib/api';
import { useApp } from '../context/AppContext';
import Navbar from '../components/Navbar';

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
  const counterLabel = isMale ? 'Djevojaka tu' : 'Momaka tu';

  const fetchCounts = useCallback(async () => {
    try {
      const { data } = await api.get('/api/clubs/counts?city=Belgrade');
      setCounts(prev => {
        // Find which clubs changed and animate them
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
    // Initial load
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

    // Supabase Realtime — instant update on check-in/out
    const channel = supabase
      .channel('checkins-live')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'checkins',
      }, () => fetchCounts())
      .subscribe();

    // Polling fallback every 8 seconds (in case realtime not enabled)
    const interval = setInterval(fetchCounts, 8000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [fetchCounts]);

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
      <div className="px-5 pt-14 pb-4">
        <p className="text-gray-500 text-sm mb-0.5">👋 {profile?.name}</p>
        <h1 className="text-3xl font-black text-white leading-tight">
          Klubovi u{' '}
          <span className="bg-neon-gradient bg-clip-text text-transparent">Beogradu</span>
        </h1>
        {checkin && (
          <div className="mt-3 flex items-center gap-2 bg-neon-pink/10 border border-neon-pink/30 rounded-2xl px-4 py-2.5 w-fit">
            <div className="w-2 h-2 rounded-full bg-neon-pink animate-pulse" />
            <p className="text-neon-pink text-sm font-semibold">Live: {checkin.clubs?.name}</p>
          </div>
        )}
      </div>

      {/* Club list */}
      {loading ? (
        <div className="flex items-center justify-center h-64 text-gray-500">{t('loading')}</div>
      ) : (
        <div className="px-4 flex flex-col gap-4">
          {clubs.map(club => {
            const count = counts[club.id] || 0;
            const isActive = checkin?.club_id === club.id;
            const isAnimating = animating[club.id];
            const todayEvent = todayEvents[club.id];

            return (
              <button
                key={club.id}
                onClick={() => navigate(`/clubs/${club.id}`)}
                className="relative w-full rounded-3xl overflow-hidden shadow-2xl active:scale-95 transition-all duration-200"
              >
                <img
                  src={club.photo_url}
                  alt={club.name}
                  className="w-full h-52 object-cover"
                  onError={e => { e.target.src = 'https://picsum.photos/seed/club/800/500'; }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

                {/* Live counter */}
                <div className={`absolute top-3 right-3 flex flex-col items-center backdrop-blur-md border rounded-2xl px-3 py-2 min-w-[64px] transition-all duration-300 ${
                  count > 0
                    ? 'bg-black/60 border-neon-pink/40'
                    : 'bg-black/40 border-white/10'
                }`}>
                  <span
                    key={count}
                    className={`text-2xl font-black leading-none ${count > 0 ? 'text-neon-pink' : 'text-gray-500'} ${isAnimating ? 'count-pop' : ''}`}
                  >
                    {count}
                  </span>
                  <span className="text-gray-300 text-[10px] font-medium mt-0.5 leading-tight text-center">
                    {counterLabel}
                  </span>
                  {count > 0 && (
                    <div className={`w-1.5 h-1.5 rounded-full bg-neon-pink mt-1 ${isAnimating ? 'animate-ping' : 'animate-pulse'}`} />
                  )}
                </div>

                {isActive && (
                  <div className="absolute top-3 left-3 bg-neon-pink text-white text-xs font-bold px-3 py-1.5 rounded-full">
                    ✓ Prijavljen
                  </div>
                )}

                <div className="absolute bottom-0 left-0 right-0 p-4 text-left">
                  <h3 className="text-white font-black text-xl leading-tight">{club.name}</h3>
                  <p className="text-gray-300 text-sm mt-1">📍 {club.address}</p>
                  {club.genre && (
                    <p className="text-gray-400 text-xs mt-0.5">🎵 {club.genre}</p>
                  )}
                  {todayEvent && (
                    <div className="mt-2 flex items-center gap-1.5 bg-neon-pink/20 border border-neon-pink/40 rounded-xl px-3 py-1.5 w-fit">
                      <span className="text-neon-pink text-xs font-bold">🎉 {todayEvent.name}</span>
                      <span className="text-gray-400 text-xs">· {todayEvent.start_time?.slice(0, 5)}h</span>
                    </div>
                  )}
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
