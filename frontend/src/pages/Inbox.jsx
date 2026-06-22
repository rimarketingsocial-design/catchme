import { useEffect, useState } from 'react';
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

export default function Inbox() {
  const navigate = useNavigate();
  const { t, profile, session } = useApp();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  const isMale = profile?.gender === 'male';

  const load = () => {
    const endpoint = isMale ? '/api/messages/sent' : '/api/messages/inbox';
    api.get(endpoint)
      .then(r => setMessages(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();

    // Realtime subscription for new messages
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

  const unreadCount = messages.filter(m => !m.read).length;

  return (
    <div className="min-h-screen bg-dark-900 pb-24">
      <div className="px-6 pt-12 pb-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-black text-white">{t('inbox')}</h1>
          {unreadCount > 0 && (
            <span className="bg-neon-pink text-white text-xs font-bold px-2.5 py-1 rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 text-gray-500">{t('loading')}</div>
      ) : messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-center px-8">
          <span className="text-5xl mb-4">💌</span>
          <p className="text-white font-bold text-lg">{t('no_messages')}</p>
          <p className="text-gray-500 text-sm mt-2">{t('no_messages_sub')}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3 px-4">
          {messages.map(msg => (
            <button
              key={msg.id}
              onClick={() => navigate(`/chat/${msg.id}`)}
              className={`w-full bg-dark-800 rounded-2xl p-4 text-left border transition-all active:scale-95 ${
                !msg.read ? 'border-neon-pink/40 bg-dark-700' : 'border-dark-600'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-full bg-dark-600 overflow-hidden flex-shrink-0">
                  {(isMale ? msg.receiver?.photo_url : msg.sender?.photo_url)
                    ? <img src={isMale ? msg.receiver?.photo_url : msg.sender?.photo_url} className="w-full h-full object-cover" alt="" />
                    : <div className="w-full h-full flex items-center justify-center text-xl">👤</div>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-white font-bold">{isMale ? msg.receiver?.name : msg.sender?.name}</p>
                    <div className="flex items-center gap-2">
                      {!msg.read && <div className="w-2 h-2 rounded-full bg-neon-pink" />}
                      <p className="text-gray-600 text-xs">
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full border mb-1.5 ${
                    INTENTION_COLORS[msg.intention_type] || 'text-gray-400'
                  }`}>
                    {t(msg.intention_type)}
                  </span>
                  <p className="text-gray-400 text-sm truncate">{msg.content}</p>
                  {msg.club?.name && (
                    <p className="text-gray-600 text-xs mt-1">📍 {msg.club.name}</p>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      <Navbar />
    </div>
  );
}
