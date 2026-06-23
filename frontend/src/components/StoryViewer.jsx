import { useState, useEffect, useRef } from 'react';
import api from '../lib/api';

const MEDAL_EMOJI = { fire: '🔥', vibe: '💫', queen: '👑', party: '🎉' };
const MEDAL_LABEL = { fire: 'Fire', vibe: 'Vibe', queen: 'Queen', party: 'Party' };

export default function StoryViewer({ stories, initialIndex, onClose, onCoinSent, currentUserId }) {
  const [idx, setIdx] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const [coinSent, setCoinSent] = useState({});
  const [sending, setSending] = useState(false);
  const intervalRef = useRef();

  const story = stories[idx];
  const isOwn = story?.user_id === currentUserId;

  useEffect(() => {
    setProgress(0);
    clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          goNext();
          return 0;
        }
        return p + 1;
      });
    }, 50); // 5 seconds per story
    return () => clearInterval(intervalRef.current);
  }, [idx]);

  const goNext = () => {
    if (idx < stories.length - 1) { setIdx(i => i + 1); }
    else onClose();
  };

  const goPrev = () => {
    if (idx > 0) setIdx(i => i - 1);
  };

  const sendCoin = async () => {
    if (isOwn || coinSent[story.id] || sending) return;
    setSending(true);
    try {
      await api.post(`/api/vibe/${story.id}/coin`);
      setCoinSent(prev => ({ ...prev, [story.id]: true }));
      onCoinSent?.(story.id);
    } catch {}
    finally { setSending(false); }
  };

  if (!story) return null;

  const timeLeft = () => {
    const ms = new Date(story.expires_at) - Date.now();
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex items-center justify-center" onClick={onClose}>
      <div className="relative w-full max-w-lg h-full" onClick={e => e.stopPropagation()}>
        {/* Story image */}
        <img src={story.photo_url} className="w-full h-full object-cover" alt="" />

        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80" />

        {/* Progress bars */}
        <div className="absolute top-3 left-3 right-3 flex gap-1">
          {stories.map((_, i) => (
            <div key={i} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-none"
                style={{ width: i < idx ? '100%' : i === idx ? `${progress}%` : '0%' }}
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="absolute top-8 left-4 right-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-white/50">
              <img src={story.user?.photo_url || ''} className="w-full h-full object-cover" alt="" />
            </div>
            <div>
              <p className="text-white text-sm font-bold leading-tight">{story.user?.name}</p>
              <p className="text-white/60 text-xs">{timeLeft()} preostalo</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur rounded-xl px-3 py-1.5">
            <span className="text-lg">{MEDAL_EMOJI[story.medal]}</span>
            <span className="text-white text-xs font-bold">{MEDAL_LABEL[story.medal]}</span>
          </div>
        </div>

        {/* Tap zones */}
        <div className="absolute inset-0 flex">
          <div className="flex-1" onClick={goPrev} />
          <div className="flex-1" onClick={goNext} />
        </div>

        {/* Bottom: Catch Coin */}
        <div className="absolute bottom-8 left-4 right-4 flex items-center justify-between">
          <div className="flex items-center gap-2 bg-black/40 backdrop-blur rounded-2xl px-4 py-2">
            <span className="text-yellow-400 text-lg">🪙</span>
            <span className="text-white font-bold">{story.coin_count || 0}</span>
            <span className="text-white/60 text-xs">Catch Coins</span>
          </div>

          {!isOwn && (
            <button
              onClick={sendCoin}
              disabled={coinSent[story.id] || sending}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-sm transition-all ${
                coinSent[story.id]
                  ? 'bg-yellow-400/20 border border-yellow-400/50 text-yellow-400'
                  : 'bg-yellow-400 text-black hover:bg-yellow-300 active:scale-95'
              }`}
            >
              <span>🪙</span>
              {coinSent[story.id] ? 'Poslato!' : 'Pošalji Coin'}
            </button>
          )}
        </div>

        {/* Close */}
        <button onClick={onClose} className="absolute top-8 right-4 w-8 h-8 bg-black/40 rounded-full flex items-center justify-center text-white text-lg">
          ✕
        </button>
      </div>
    </div>
  );
}
