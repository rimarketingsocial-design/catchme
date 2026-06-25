import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import api from '../lib/api';
import { useApp } from '../context/AppContext';
import Navbar from '../components/Navbar';

const INTENTION_COLORS = {
  poznanstvo: 'text-blue-400 bg-blue-400/10 border-blue-400/30',
  veza: 'text-rose-400 bg-rose-400/10 border-rose-400/30',
  avantura: 'text-orange-400 bg-orange-400/10 border-orange-400/30',
};

const PINNED_KEY = 'catchme_pinned_convos';

function getPinned() {
  try { return new Set(JSON.parse(localStorage.getItem(PINNED_KEY) || '[]')); }
  catch { return new Set(); }
}
function savePinned(set) {
  localStorage.setItem(PINNED_KEY, JSON.stringify([...set]));
}

const IconPin = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" stroke="none">
    <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5v6h2v-6h5v-2l-2-2z"/>
  </svg>
);
const IconTrash = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
  </svg>
);
const IconUser = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
  </svg>
);
const IconMail = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
  </svg>
);

export default function Inbox() {
  const navigate = useNavigate();
  const { t, profile } = useApp();
  const [convos, setConvos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pinned, setPinned] = useState(getPinned);
  const [menuOpen, setMenuOpen] = useState(null); // other_user_id
  const [deleting, setDeleting] = useState(null);
  const menuRef = useRef();

  const load = () => {
    api.get('/api/messages/conversations')
      .then(r => setConvos(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel('inbox')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `receiver_id=eq.${profile?.id}`,
      }, () => load())
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [profile?.id]);

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const togglePin = (userId) => {
    setPinned(prev => {
      const next = new Set(prev);
      next.has(userId) ? next.delete(userId) : next.add(userId);
      savePinned(next);
      return next;
    });
    setMenuOpen(null);
  };

  const handleDelete = async (userId) => {
    setDeleting(userId);
    setMenuOpen(null);
    try {
      await api.delete(`/api/messages/conversation/${userId}`);
      setConvos(prev => prev.filter(c => c.other_user_id !== userId));
      setPinned(prev => {
        const next = new Set(prev);
        next.delete(userId);
        savePinned(next);
        return next;
      });
    } catch (e) {
      console.error(e);
    } finally {
      setDeleting(null);
    }
  };

  const totalUnread = convos.reduce((sum, c) => sum + (c.unread_count || 0), 0);

  const sorted = [...convos].sort((a, b) => {
    const ap = pinned.has(a.other_user_id) ? 1 : 0;
    const bp = pinned.has(b.other_user_id) ? 1 : 0;
    if (ap !== bp) return bp - ap;
    return new Date(b.latest_time) - new Date(a.latest_time);
  });

  return (
    <div className="min-h-screen bg-dark-900 pb-24">
      <div className="px-6 pt-12 pb-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-black text-white">{t('inbox')}</h1>
          {totalUnread > 0 && (
            <span className="bg-neon-pink text-white text-xs font-bold px-2.5 py-1 rounded-full">
              {totalUnread}
            </span>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 text-gray-500">{t('loading')}</div>
      ) : sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-center px-8">
          <span className="text-gray-700 mb-4"><IconMail /></span>
          <p className="text-white font-bold text-lg">{t('no_messages')}</p>
          <p className="text-gray-500 text-sm mt-2">{t('no_messages_sub')}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3 px-4" ref={menuRef}>
          {sorted.map(conv => {
            const isPinned = pinned.has(conv.other_user_id);
            const canPin = conv.message_count >= 10;
            const isMenuOpen = menuOpen === conv.other_user_id;
            const isDeleting = deleting === conv.other_user_id;

            return (
              <div key={conv.other_user_id} className="relative">
                <button
                  onClick={() => navigate(`/chat/${conv.other_user_id}`)}
                  onContextMenu={e => { e.preventDefault(); setMenuOpen(conv.other_user_id); }}
                  disabled={isDeleting}
                  className={`w-full bg-dark-800 rounded-2xl p-4 text-left border transition-all active:scale-95 ${
                    conv.unread_count > 0 ? 'border-neon-pink/40 bg-dark-700' : 'border-dark-600'
                  } ${isDeleting ? 'opacity-40' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative flex-shrink-0">
                      <div className="w-12 h-12 rounded-full bg-dark-600 overflow-hidden">
                        {conv.other_user?.photo_url
                          ? <img src={conv.other_user.photo_url} className="w-full h-full object-cover" alt="" />
                          : <div className="w-full h-full flex items-center justify-center text-gray-500"><IconUser /></div>
                        }
                      </div>
                      {isPinned && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-neon-pink rounded-full flex items-center justify-center text-white">
                          <IconPin />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <p className="text-white font-bold">{conv.other_user?.name}</p>
                        <div className="flex items-center gap-2">
                          {conv.unread_count > 0 && (
                            <span className="bg-neon-pink text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                              {conv.unread_count}
                            </span>
                          )}
                          <p className="text-gray-600 text-xs">
                            {new Date(conv.latest_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                      <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full border mb-1 ${
                        INTENTION_COLORS[conv.intention_type] || 'text-gray-400'
                      }`}>
                        {t(conv.intention_type)}
                      </span>
                      <p className="text-gray-400 text-sm truncate">{conv.latest_content}</p>
                      {conv.club?.name && (
                        <p className="text-gray-600 text-xs mt-0.5">📍 {conv.club.name}</p>
                      )}
                    </div>

                    {/* Long-press / options button */}
                    <button
                      onClick={e => { e.stopPropagation(); setMenuOpen(isMenuOpen ? null : conv.other_user_id); }}
                      className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-gray-500 hover:text-white rounded-full"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/>
                      </svg>
                    </button>
                  </div>
                </button>

                {/* Dropdown menu */}
                {isMenuOpen && (
                  <div className="absolute right-2 top-14 z-30 bg-dark-700 border border-dark-500 rounded-2xl shadow-2xl overflow-hidden min-w-[160px]">
                    {canPin && (
                      <button
                        onClick={() => togglePin(conv.other_user_id)}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-white hover:bg-dark-600 transition-colors"
                      >
                        <span className="text-neon-pink"><IconPin /></span>
                        {isPinned ? 'Unpin chat' : 'Pin chat'}
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(conv.other_user_id)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:bg-dark-600 transition-colors"
                    >
                      <IconTrash />
                      Delete chat
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Navbar />
    </div>
  );
}
