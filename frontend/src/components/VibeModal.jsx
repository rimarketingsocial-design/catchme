import { useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import api from '../lib/api';
import { useApp } from '../context/AppContext';

const MEDALS = [
  { id: 'fire',  emoji: '🔥', label: 'Fire',  color: 'border-orange-400 bg-orange-400/10' },
  { id: 'vibe',  emoji: '💫', label: 'Vibe',  color: 'border-purple-400 bg-purple-400/10' },
  { id: 'queen', emoji: '👑', label: 'Queen', color: 'border-yellow-400 bg-yellow-400/10' },
  { id: 'party', emoji: '🎉', label: 'Party', color: 'border-neon-pink bg-neon-pink/10' },
];

export default function VibeModal({ onClose, onSuccess }) {
  const { checkin, profile } = useApp();
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState(null);
  const [medal, setMedal] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef();

  const handlePhoto = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPhoto(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    if (!photo || !medal) return;
    if (!checkin) return setError('Morate biti prijavljeni u klub');
    setError('');
    setUploading(true);
    try {
      const ext = photo.name.split('.').pop();
      const path = `vibes/${profile.id}-${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from('avatars').upload(path, photo, { upsert: true });
      if (uploadErr) throw uploadErr;
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);

      await api.post('/api/vibe', { club_id: checkin.club_id, photo_url: publicUrl, medal });
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Greška');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-dark-800 rounded-t-3xl px-6 pt-5 pb-10 flex flex-col gap-5"
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="w-10 h-1 bg-dark-500 rounded-full mx-auto" />

        <h2 className="text-white font-black text-xl text-center">Dodaj Vibe 🔥</h2>
        {!checkin && (
          <p className="text-red-400 text-sm text-center">Morate biti prijavljeni u klub da biste dodali Vibe</p>
        )}
        {error && <p className="text-red-400 text-sm text-center">{error}</p>}

        {/* Photo upload */}
        <div
          className="w-full h-52 rounded-2xl border-2 border-dashed border-dark-500 overflow-hidden cursor-pointer flex items-center justify-center relative"
          onClick={() => fileRef.current?.click()}
        >
          {preview ? (
            <img src={preview} className="w-full h-full object-cover" alt="" />
          ) : (
            <div className="flex flex-col items-center gap-3 text-gray-500">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
              <span className="text-sm font-medium">Dodaj selfie iz kluba</span>
            </div>
          )}
          <input ref={fileRef} type="file" accept="image/*" capture="user" className="hidden" onChange={handlePhoto} />
        </div>

        {/* Medal selection */}
        <div>
          <p className="text-gray-400 text-sm font-semibold mb-3 text-center">Odaberi Catch medalju</p>
          <div className="grid grid-cols-4 gap-3">
            {MEDALS.map(m => (
              <button
                key={m.id}
                onClick={() => setMedal(m.id)}
                className={`flex flex-col items-center gap-1.5 py-3 rounded-2xl border-2 transition-all ${
                  medal === m.id ? m.color : 'border-dark-600 bg-dark-700'
                }`}
              >
                <span className="text-2xl">{m.emoji}</span>
                <span className={`text-xs font-bold ${medal === m.id ? 'text-white' : 'text-gray-500'}`}>{m.label}</span>
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={!photo || !medal || uploading || !checkin}
          className="w-full py-4 rounded-2xl font-bold text-white disabled:opacity-40 transition-all"
          style={{ background: 'linear-gradient(135deg, #f72585, #7209b7)' }}
        >
          {uploading ? 'Postavljanje...' : 'Objavi Vibe'}
        </button>
      </div>
    </div>
  );
}
