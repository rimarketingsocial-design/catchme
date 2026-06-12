import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { useApp } from '../context/AppContext';

const INTENTIONS = [
  {
    type: 'poznanstvo',
    emoji: '👋',
    color: 'from-blue-500 to-cyan-400',
    border: 'border-blue-500',
    glow: 'shadow-blue-500/30',
  },
  {
    type: 'veza',
    emoji: '❤️',
    color: 'from-rose-500 to-pink-400',
    border: 'border-rose-500',
    glow: 'shadow-rose-500/30',
  },
  {
    type: 'avantura',
    emoji: '🔥',
    color: 'from-orange-500 to-yellow-400',
    border: 'border-orange-500',
    glow: 'shadow-orange-500/30',
  },
];

export default function Intention() {
  const navigate = useNavigate();
  const { t } = useApp();
  const [selected, setSelected] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!selected) return;
    setLoading(true);
    try {
      await api.post('/api/intentions', { type: selected });
      navigate('/clubs');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-900 flex flex-col px-6 py-10">
      <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full">
        <div className="text-center mb-10">
          <span className="text-4xl">💫</span>
          <h1 className="text-3xl font-black text-white mt-4 mb-2">{t('set_intention')}</h1>
          <p className="text-gray-500">{t('intention_hint')}</p>
        </div>

        <div className="flex flex-col gap-4">
          {INTENTIONS.map(({ type, emoji, color, border, glow }) => (
            <button
              key={type}
              onClick={() => setSelected(type)}
              className={`relative p-5 rounded-2xl border-2 transition-all text-left ${
                selected === type
                  ? `${border} bg-dark-700 shadow-xl ${glow}`
                  : 'border-dark-500 bg-dark-800 hover:border-dark-400'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center text-2xl shadow-lg`}>
                  {emoji}
                </div>
                <div>
                  <p className="text-white font-bold text-lg">{t(type)}</p>
                </div>
                {selected === type && (
                  <div className="ml-auto w-6 h-6 rounded-full bg-neon-gradient flex items-center justify-center">
                    <span className="text-white text-xs">✓</span>
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>

        <button
          onClick={handleSave}
          disabled={!selected || loading}
          className="w-full py-4 rounded-2xl bg-neon-gradient text-white font-bold text-lg mt-8 disabled:opacity-40 transition-all"
        >
          {loading ? t('loading') : t('save')}
        </button>
      </div>
    </div>
  );
}
