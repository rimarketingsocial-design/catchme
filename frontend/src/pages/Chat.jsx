import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../lib/api';
import { useApp } from '../context/AppContext';

const INTENTION_COLORS = {
  poznanstvo: 'bg-blue-500/20 text-blue-300',
  veza: 'bg-rose-500/20 text-rose-300',
  avantura: 'bg-orange-500/20 text-orange-300',
};

const IconBack = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6"/>
  </svg>
);
const IconUser = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
  </svg>
);
const IconSend = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
  </svg>
);

export default function Chat() {
  const { otherId } = useParams();
  const navigate = useNavigate();
  const { t, profile } = useApp();
  const [thread, setThread] = useState({ messages: [], other_user: null });
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef();

  const load = () => {
    api.get(`/api/messages/thread/${otherId}`)
      .then(r => setThread(r.data))
      .catch(err => setError(err.response?.data?.error || t('error')))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [otherId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [thread.messages]);

  const handleSend = async () => {
    if (!reply.trim() || sending) return;
    setSending(true);
    setError('');
    try {
      await api.post(`/api/messages/reply-to/${otherId}`, { content: reply.trim() });
      setReply('');
      load();
    } catch (err) {
      setError(err.response?.data?.error || t('error'));
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center text-gray-500">
        {t('loading')}
      </div>
    );
  }

  const other = thread.other_user;
  const messages = thread.messages || [];
  const intentionType = messages[0]?.intention_type;

  return (
    <div className="min-h-screen bg-dark-900 flex flex-col">
      {/* Header */}
      <div className="bg-dark-800 border-b border-dark-600 px-4 pt-10 pb-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/inbox')} className="text-gray-400 hover:text-white mr-1">
            <IconBack />
          </button>
          <div className="w-10 h-10 rounded-full bg-dark-600 overflow-hidden">
            {other?.photo_url
              ? <img src={other.photo_url} className="w-full h-full object-cover" alt="" />
              : <div className="w-full h-full flex items-center justify-center text-gray-500"><IconUser /></div>
            }
          </div>
          <div>
            <p className="text-white font-bold">{other?.name || '...'}</p>
            {intentionType && (
              <span className={`text-xs px-2 py-0.5 rounded-full ${INTENTION_COLORS[intentionType] || ''}`}>
                {t(intentionType)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 flex flex-col gap-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-600 text-sm mt-10">{t('no_messages')}</div>
        )}
        {messages.map((msg, i) => {
          const isMe = msg.sender_id === profile?.id;
          const showClub = i === 0 && msg.club?.name;
          return (
            <div key={msg.id}>
              {showClub && (
                <div className="text-center mb-2">
                  <span className="text-gray-600 text-xs bg-dark-800 px-3 py-1 rounded-full">
                    📍 {msg.club.name}
                  </span>
                </div>
              )}
              <div className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                  isMe
                    ? 'bg-neon-gradient text-white rounded-br-sm'
                    : 'bg-dark-700 text-white rounded-bl-sm'
                }`}>
                  <p className="text-sm leading-relaxed">{msg.content}</p>
                  <p className={`text-xs mt-1 ${isMe ? 'text-white/60' : 'text-gray-500'}`}>
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Reply input */}
      <div className="bg-dark-800 border-t border-dark-600 px-4 py-4">
        {error && <p className="text-red-400 text-xs mb-2">{error}</p>}
        <div className="flex gap-3 items-end">
          <textarea
            value={reply}
            onChange={e => setReply(e.target.value)}
            placeholder={t('type_reply')}
            rows={1}
            className="flex-1 bg-dark-700 border border-dark-500 rounded-xl px-4 py-3 text-white placeholder-gray-600
              focus:outline-none focus:border-neon-pink resize-none text-sm"
            style={{ maxHeight: 100 }}
            onInput={e => {
              e.target.style.height = 'auto';
              e.target.style.height = e.target.scrollHeight + 'px';
            }}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <button
            onClick={handleSend}
            disabled={!reply.trim() || sending}
            className="w-12 h-12 rounded-xl bg-neon-gradient flex items-center justify-center text-white disabled:opacity-40 transition-all active:scale-90"
          >
            {sending ? '...' : <IconSend />}
          </button>
        </div>
      </div>
    </div>
  );
}
