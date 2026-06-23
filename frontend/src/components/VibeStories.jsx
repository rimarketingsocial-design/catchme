import { useState, useEffect } from 'react';
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

export default function VibeStories({ clubId }) {
  const { profile } = useApp();
  const [stories, setStories] = useState([]);
  const [viewing, setViewing] = useState(null);

  useEffect(() => {
    const params = clubId ? `?club_id=${clubId}` : '';
    api.get(`/api/vibe${params}`)
      .then(r => setStories(r.data))
      .catch(() => {});
  }, [clubId]);

  const onCoinSent = (storyId) => {
    setStories(prev => prev.map(s =>
      s.id === storyId ? { ...s, coin_count: (s.coin_count || 0) + 1 } : s
    ));
  };

  if (!stories.length) return null;

  return (
    <>
      <div className="px-4 mb-4">
        <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
          {stories.map((story, i) => {
            const isOwn = story.user_id === profile?.id;
            const gradient = MEDAL_COLORS[story.medal] || 'from-neon-pink to-neon-purple';

            return (
              <button
                key={story.id}
                onClick={() => setViewing(i)}
                className="flex-shrink-0 flex flex-col items-center gap-1.5"
              >
                {/* Story ring */}
                <div className={`w-16 h-16 rounded-full p-[2.5px] bg-gradient-to-br ${gradient} relative`}>
                  <div className="w-full h-full rounded-full overflow-hidden bg-dark-800 border-2 border-dark-900">
                    <img
                      src={story.photo_url}
                      className="w-full h-full object-cover"
                      alt={story.user?.name}
                    />
                  </div>
                  {/* Medal badge */}
                  <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-dark-900 flex items-center justify-center text-xs">
                    {MEDAL_EMOJI[story.medal]}
                  </div>
                  {/* Coin counter */}
                  {story.coin_count > 0 && (
                    <div className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-neon-pink rounded-full flex items-center justify-center px-1">
                      <span className="text-white text-[9px] font-black">{story.coin_count}</span>
                    </div>
                  )}
                </div>
                <span className="text-gray-400 text-[10px] font-medium max-w-[60px] truncate">
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
