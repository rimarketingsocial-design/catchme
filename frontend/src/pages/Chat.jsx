import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../lib/api';
import { useApp } from '../context/AppContext';

const INTENTION_COLORS = {
  poznanstvo: 'bg-blue-500/20 text-blue-300',
  veza: 'bg-rose-500/20 text-rose-300',
  avantura: 'bg-orange-500/20 text-orange-300',
};

export default function Chat() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, profile } = useApp();
  const [message, setMessage] = useState(null);
  const [replies, setReplies] = useState([]);
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef();

  const load = () => {
    api.get(`/api/messages/${id}`)
      .then(r => {
        setMessage(r.data);
        setReplies(r.data.replies || []);
      })
      .catch(err => {
        console.error(err);
        setError(err.response?.data?.error || 'Poruka nije pronađena');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [replies]);

  const handleSendReply = async () => {
    if (!reply.trim() || sending) return;
    setSending(true);
    setError('');
    try {
      await api.post(`/api/messages/${id}/reply`, { content: reply.trim() });
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

  if (!message) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <p className="text-gray-500">{t('error')}</p>
      </div>
    );
  }

  const isSender = message.sender_id === profile?.id;
  const other = isSender ? message.receiver : message.sender;

  return (
    <div className="min-h-screen bg-dark-900 flex flex-col">
      {/* Header */}
      <div className="bg-dark-800 border-b border-dark-600 px-4 pt-10 pb-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-white mr-1">←</button>
          <div className="w-10 h-10 rounded-full bg-dark-600 overflow-hidden">
            {other?.photo_url
              ? <img src={other.photo_url} className="w-full h-full object-cover" alt="" />
              : <div className="w-full h-full flex items-center justify-center">👤</div>
            }
          </div>
          <div>
            <p className="text-white font-bold">{other?.name}</p>
            <span className={`text-xs px-2 py-0.5 rounded-full ${INTENTION_COLORS[message.intention_type] || ''}`}>
              {t(message.intention_type)}
            </span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 flex flex-col gap-4">
        {/* Club context */}
        {message.club && (
          <div className="text-center">
            <span className="text-gray-600 text-xs bg-dark-800 px-3 py-1 rounded-full">
              📍 {message.club.name}
            </span>
          </div>
        )}

        {/* Original message */}
        <div className={`flex ${isSender ? 'justify-end' : 'justify-start'}`}>
          <div className={`max-w-[75%] rounded-2xl px-4 py-3 ${
            isSender
              ? 'bg-neon-gradient text-white rounded-br-sm'
              : 'bg-dark-700 text-white rounded-bl-sm'
          }`}>
            <p className="text-sm leading-relaxed">{message.content}</p>
            <p className={`text-xs mt-1 ${isSender ? 'text-white/60' : 'text-gray-500'}`}>
              {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>

        {/* Replies */}
        {replies.map((r, i) => {
          const isMyReply = r.sender_id === profile?.id;
          return (
            <div key={i} className={`flex ${isMyReply ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                isMyReply
                  ? 'bg-neon-gradient text-white rounded-br-sm'
                  : 'bg-dark-700 text-white rounded-bl-sm'
              }`}>
                <p className="text-sm leading-relaxed">{r.content}</p>
                <p className={`text-xs mt-1 ${isMyReply ? 'text-white/60' : 'text-gray-500'}`}>
                  {new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          );
        })}

        <div ref={bottomRef} />
      </div>

      {/* Reply input (females) or waiting message (males) */}
      {!isSender ? (
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
                  handleSendReply();
                }
              }}
            />
            <button
              onClick={handleSendReply}
              disabled={!reply.trim() || sending}
              className="w-12 h-12 rounded-xl bg-neon-gradient flex items-center justify-center text-white disabled:opacity-40 transition-all active:scale-90"
            >
              {sending ? '...' : '✈'}
            </button>
          </div>
        </div>
      ) : (
        replies.length === 0 && (
          <div className="bg-dark-800 border-t border-dark-600 px-6 py-5 text-center">
            <p className="text-gray-500 text-sm">⏳ Čeka se odgovor...</p>
          </div>
        )
      )}
    </div>
  );
}
