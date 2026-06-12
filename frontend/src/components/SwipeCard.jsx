import { useRef, useState } from 'react';

const INTENTION_STYLES = {
  poznanstvo: { label: '👋 Acquaintance / Poznanstvo', bg: 'bg-blue-500/90', border: 'border-blue-400' },
  veza: { label: '❤️ Relationship / Veza', bg: 'bg-rose-500/90', border: 'border-rose-400' },
  avantura: { label: '🔥 Adventure / Avantura', bg: 'bg-orange-500/90', border: 'border-orange-400' },
};

export default function SwipeCard({ member, isMale, onSwipeLeft, onSwipeRight, onMessage }) {
  const cardRef = useRef();
  const [drag, setDrag] = useState({ x: 0, y: 0, dragging: false, startX: 0, startY: 0 });
  const [leaving, setLeaving] = useState(null); // 'left' | 'right'

  const threshold = 100;
  const intention = INTENTION_STYLES[member.intention] || null;

  const getPointerPos = (e) => {
    if (e.touches) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    return { x: e.clientX, y: e.clientY };
  };

  const onStart = (e) => {
    const pos = getPointerPos(e);
    setDrag({ x: 0, y: 0, dragging: true, startX: pos.x, startY: pos.y });
  };

  const onMove = (e) => {
    if (!drag.dragging) return;
    e.preventDefault();
    const pos = getPointerPos(e);
    setDrag(d => ({ ...d, x: pos.x - d.startX, y: pos.y - d.startY }));
  };

  const onEnd = () => {
    if (!drag.dragging) return;
    if (drag.x > threshold) {
      setLeaving('right');
      setTimeout(() => { onSwipeRight(); }, 300);
    } else if (drag.x < -threshold) {
      setLeaving('left');
      setTimeout(() => { onSwipeLeft(); }, 300);
    } else {
      setDrag({ x: 0, y: 0, dragging: false, startX: 0, startY: 0 });
      return;
    }
    setDrag(d => ({ ...d, dragging: false }));
  };

  const rotation = drag.x / 15;
  const opacity = leaving
    ? 0
    : Math.max(0, 1 - Math.abs(drag.x) / 400);

  let transform = `translateX(${drag.x}px) translateY(${drag.y * 0.3}px) rotate(${rotation}deg)`;
  if (leaving === 'left') transform = 'translateX(-150%) rotate(-30deg)';
  if (leaving === 'right') transform = 'translateX(150%) rotate(30deg)';

  const swipeIndicatorLeft = drag.x < -30;
  const swipeIndicatorRight = drag.x > 30;

  return (
    <div
      ref={cardRef}
      className="absolute inset-0 rounded-3xl overflow-hidden shadow-2xl cursor-grab active:cursor-grabbing select-none"
      style={{
        transform,
        opacity,
        transition: drag.dragging ? 'none' : 'transform 0.3s ease, opacity 0.3s ease',
        touchAction: 'none',
      }}
      onMouseDown={onStart}
      onMouseMove={onMove}
      onMouseUp={onEnd}
      onMouseLeave={onEnd}
      onTouchStart={onStart}
      onTouchMove={onMove}
      onTouchEnd={onEnd}
    >
      {/* Photo */}
      <div className="w-full h-full bg-dark-700">
        {member.photo_url
          ? <img src={member.photo_url} className="w-full h-full object-cover pointer-events-none" alt={member.name} />
          : <div className="w-full h-full flex items-center justify-center text-9xl bg-dark-600">👤</div>
        }
      </div>

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-card-gradient pointer-events-none" />

      {/* Intention badge — TOP */}
      {intention && (
        <div className="absolute top-4 left-0 right-0 flex justify-center pointer-events-none">
          <span className={`${intention.bg} text-white text-sm font-bold px-4 py-1.5 rounded-full backdrop-blur-sm border ${intention.border}`}>
            {intention.label}
          </span>
        </div>
      )}

      {/* Name — BOTTOM */}
      <div className="absolute bottom-0 left-0 right-0 p-6 pointer-events-none">
        <h2 className="text-white font-black text-2xl">{member.name}</h2>
      </div>

      {/* Swipe indicators */}
      {swipeIndicatorLeft && (
        <div className="absolute top-1/2 left-6 -translate-y-1/2 border-4 border-red-500 rounded-xl px-4 py-2 rotate-12">
          <span className="text-red-500 font-black text-2xl">PASS</span>
        </div>
      )}
      {swipeIndicatorRight && (
        <div className="absolute top-1/2 right-6 -translate-y-1/2 border-4 border-neon-pink rounded-xl px-4 py-2 -rotate-12">
          <span className="text-neon-pink font-black text-2xl">💌</span>
        </div>
      )}

      {/* Message button tap zone */}
      {isMale && !drag.dragging && (
        <button
          className="absolute bottom-6 right-6 w-12 h-12 rounded-full bg-neon-gradient flex items-center justify-center text-xl shadow-lg"
          onClick={(e) => { e.stopPropagation(); onMessage(); }}
        >
          💌
        </button>
      )}
    </div>
  );
}
