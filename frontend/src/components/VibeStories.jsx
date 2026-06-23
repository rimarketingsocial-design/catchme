import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import api from '../lib/api';
import { useApp } from '../context/AppContext';
import StoryViewer from './StoryViewer';

const MEDAL_COLORS = {
  fire:  'from-orange-500 to-red-500',
  vibe:  'from-purple-500 to-indigo-500',
  queen: 'from-yellow-400 to-orange-400',
  party: 'from-pink-500 to-purple-600',
};
const MEDAL_EMOJI = { fire: '🔥', vibe: '💫', queen: '👑', party: '🎉' };

export default function VibeStories({ city, clubId }) {
  const { profile } = useApp();
  const [stories, setStories] = useState([]);
  const [viewing, setViewing] = useState(null);

  const fetchStories = async () => {
    try {
      const params = clubId ? `?club_id=${clubId}` : city ? `?city=${city}` : '';
      const { data } = await api.get(`/api/vibe${params}`);
      setStories(data);
    } catch {}
  };

  useEffect(() => {
    fetchStories();

    // Realtime — re-sort instantly when a coin is sent
    const channel = supabase
      .channel('coins-live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'catch_coins' }, () => {
        fetchStories();
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [city, clubId]);

  const onCoinSent = (storyId) => {
    setStories(prev =>
      [...prev.map(s => s.id === storyId ? { ...s, coin_count: (s.coin_count || 0) + 1 } : s)]
        .sort((a, b) => (b.coin_count || 0) - (a.coin_count || 0))
    );
  };

  if (!stories.length) return null;

  return (
    <>
      <div className="px-4 mb-5">
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide" style={{ scrollbarWidth: 'none' }}>
          {stories.map((story, i) => {
            const isOwn = story.user_id === profile?.id;
            const gradient = MEDAL_COLORS[story.medal] || 'from-neon-pink to-neon-purple';
            const coins = story.coin_count || 0;

            return (
              <button
                key={story.id}
                onClick={() => setViewing(i)}
                className="flex-shrink-0 flex flex-col items-center gap-1.5"
              >
                <div className={`w-[62px] h-[62px] rounded-full p-[2.5px] bg-gradient-to-br ${gradient} relative`}>
                  <div className="w-full h-full rounded-full overflow-hidden bg-dark-800 border-2 border-dark-900">
                    <img
                      src={story.photo_url}
                      className="w-full h-full object-cover"
                      alt={story.user?.name}
                    />
                  </div>

                  {/* Medal badge */}
                  <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-dark-900 flex items-center justify-center text-xs leading-none">
                    {MEDAL_EMOJI[story.medal]}
                  </div>

                  {/* Live Coin counter */}
                  <div className={`absolute -top-1.5 -right-1.5 min-w-[20px] h-5 rounded-full flex items-center justify-center px-1 gap-0.5 border border-dark-900 transition-all duration-300 ${
                    coins > 0 ? 'bg-yellow-400' : 'bg-dark-700'
                  }`}>
                    <span className="text-[8px]">🪙</span>
                    <span className={`text-[9px] font-black leading-none ${coins > 0 ? 'text-black' : 'text-gray-500'}`}>
                      {coins}
                    </span>
                  </div>
                </div>

                <span className="text-gray-400 text-[10px] font-medium max-w-[62px] truncate text-center">
                  {isOwn ? 'Ti' : story.user?.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {viewing !== null && (
        <StoryViewer
          stories={stories}
          initialIndex={viewing}
          onClose={() => setViewing(null)}
          onCoinSent={onCoinSent}
          currentUserId={profile?.id}
        />
      )}
    </>
  );
}
