import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import api from '../lib/api';
import { useApp } from '../context/AppContext';
import Navbar from '../components/Navbar';

const INTENTIONS = [
  { type: 'poznanstvo', emoji: '👋', color: 'border-blue-500 text-blue-400' },
  { type: 'veza', emoji: '❤️', color: 'border-rose-500 text-rose-400' },
  { type: 'avantura', emoji: '🔥', color: 'border-orange-500 text-orange-400' },
];

export default function Profile() {
  const navigate = useNavigate();
  const { t, profile, fetchProfile, logout, checkin } = useApp();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [intentionSaving, setIntentionSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [intentionToast, setIntentionToast] = useState('');
  const [intentionLock, setIntentionLock] = useState(null); // { hours_left, minutes_left, unlock_at }

  // Edit form state
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const fileRef = useRef();

  const startEdit = () => {
    setUsername(profile?.name || '');
    setBio(profile?.bio || '');
    setPhotoFile(null);
    setPhotoPreview(null);
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setPhotoFile(null);
    setPhotoPreview(null);
  };

  const handlePhoto = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const uploadPhoto = async () => {
    if (!photoFile) return null;
    const ext = photoFile.name.split('.').pop();
    const path = `avatars/${profile.id}.${ext}`;
    const { error } = await supabase.storage
      .from('avatars')
      .upload(path, photoFile, { upsert: true });
    if (error) return null;
    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    return data.publicUrl;
  };

  const handleSave = async () => {
    if (!username.trim()) return;
    setSaving(true);
    try {
      let photo_url = profile?.photo_url;
      if (photoFile) {
        const uploaded = await uploadPhoto();
        if (uploaded) photo_url = uploaded;
      }
      await api.patch('/api/auth/profile', {
        name: username.trim(),
        bio: bio.trim(),
        photo_url,
      });
      await fetchProfile();
      setEditing(false);
      setPhotoFile(null);
      setPhotoPreview(null);
      setSuccessMsg(t('profile_saved'));
      setTimeout(() => setSuccessMsg(''), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleIntention = async (type) => {
    if (intentionLock) return;
    setIntentionSaving(true);
    try {
      await api.post('/api/intentions', { type });
      await fetchProfile();
      const intentionLabel = { poznanstvo: 'Poznanstvo', veza: 'Veza', avantura: 'Avantura' }[type];
      setIntentionToast(`Vaša namjera za večeras je "${intentionLabel}". Namjeru možete promijeniti nakon 12h. Srećno! 🍀`);
      setTimeout(() => setIntentionToast(''), 5000);
    } catch (err) {
      const data = err.response?.data;
      if (data?.error === 'locked') {
        setIntentionLock(data);
      }
    } finally {
      setIntentionSaving(false);
    }
  };

  // Check lock status from existing intention
  const checkIntentionLock = () => {
    const intention = profile?.intentions?.[0];
    if (!intention?.updated_at) return null;
    const updatedAt = new Date(intention.updated_at);
    const msSince = Date.now() - updatedAt.getTime();
    const msLock = 12 * 60 * 60 * 1000;
    if (msSince < msLock) {
      const msRemaining = msLock - msSince;
      const hoursLeft = Math.floor(msRemaining / (60 * 60 * 1000));
      const minutesLeft = Math.floor((msRemaining % (60 * 60 * 1000)) / (60 * 1000));
      return { hours_left: hoursLeft, minutes_left: minutesLeft };
    }
    return null;
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const currentIntention = profile?.intentions?.[0]?.type;
  const displayPhoto = photoPreview || profile?.photo_url;
  const activeLock = intentionLock || checkIntentionLock();

  return (
    <div className="min-h-screen bg-dark-900 pb-24">
      <div className="px-6 pt-12 pb-4 flex items-center justify-between">
        <h1 className="text-2xl font-black text-white">{t('profile')}</h1>
        {!editing && (
          <button
            onClick={startEdit}
            className="text-sm text-neon-pink font-semibold border border-neon-pink/40 px-4 py-1.5 rounded-xl hover:bg-neon-pink/10 transition-all"
          >
            ✏️ {t('edit_profile')}
          </button>
        )}
      </div>

      {/* Success message */}
      {successMsg && (
        <div className="mx-6 mb-4 bg-green-500/20 border border-green-500/40 rounded-xl px-4 py-3 text-green-400 text-sm font-semibold text-center">
          ✅ {successMsg}
        </div>
      )}

      {/* Intention toast */}
      {intentionToast && (
        <div className="fixed top-6 left-4 right-4 z-50 bg-dark-800 border border-neon-pink/40 rounded-2xl px-5 py-4 shadow-2xl animate-slide-up">
          <p className="text-white text-sm font-semibold leading-relaxed text-center">{intentionToast}</p>
        </div>
      )}

      {editing ? (
        /* ── EDIT MODE ── */
        <div className="px-6 flex flex-col gap-5">
          {/* Photo upload */}
          <div className="flex flex-col items-center gap-3 py-4">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-24 h-24 rounded-full border-2 border-dashed border-neon-pink overflow-hidden relative group"
            >
              {displayPhoto
                ? <img src={displayPhoto} className="w-full h-full object-cover" alt="" />
                : <div className="w-full h-full flex items-center justify-center text-4xl bg-dark-700">👤</div>
              }
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                <span className="text-2xl">📷</span>
              </div>
            </button>
            <span className="text-neon-pink text-sm cursor-pointer" onClick={() => fileRef.current?.click()}>
              {t('upload_photo')}
            </span>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
          </div>

          {/* Username */}
          <div>
            <label className="text-gray-400 text-sm mb-1.5 block">{t('username')}</label>
            <input
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full bg-dark-700 border border-dark-500 rounded-xl px-4 py-3 text-white
                focus:outline-none focus:border-neon-pink transition-colors"
            />
          </div>

          {/* Bio */}
          <div>
            <label className="text-gray-400 text-sm mb-1.5 block">{t('bio')}</label>
            <textarea
              value={bio}
              onChange={e => setBio(e.target.value)}
              placeholder={t('bio_placeholder')}
              rows={3}
              maxLength={160}
              className="w-full bg-dark-700 border border-dark-500 rounded-xl px-4 py-3 text-white placeholder-gray-600
                focus:outline-none focus:border-neon-pink transition-colors resize-none text-sm"
            />
            <p className="text-gray-600 text-xs text-right mt-1">{bio.length}/160</p>
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              onClick={cancelEdit}
              className="flex-1 py-3 rounded-2xl border border-dark-500 text-gray-400 font-semibold hover:border-gray-400 transition-all"
            >
              {t('cancel')}
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !username.trim()}
              className="flex-1 py-3 rounded-2xl bg-neon-gradient text-white font-bold disabled:opacity-50 transition-all"
            >
              {saving ? t('loading') : t('save_changes')}
            </button>
          </div>
        </div>
      ) : (
        /* ── VIEW MODE ── */
        <>
          {/* Avatar + name */}
          <div className="flex flex-col items-center py-6">
            <div className="w-24 h-24 rounded-full bg-dark-600 overflow-hidden border-2 border-neon-pink/50 mb-3">
              {profile?.photo_url
                ? <img src={profile.photo_url} className="w-full h-full object-cover" alt="" />
                : <div className="w-full h-full flex items-center justify-center text-4xl">👤</div>
              }
            </div>
            <h2 className="text-white font-black text-xl">{profile?.name}</h2>
            <p className="text-gray-500 text-sm mt-1">
              {profile?.gender === 'male' ? '♂ Muško' : '♀ Žensko'} · {profile?.city}
            </p>
            {profile?.bio && (
              <p className="text-gray-400 text-sm mt-3 text-center px-8 leading-relaxed">{profile.bio}</p>
            )}
          </div>

          <div className="px-6 flex flex-col gap-4">
            {/* Current checkin */}
            {checkin && (
              <div className="bg-dark-800 border border-neon-pink/20 rounded-2xl p-4">
                <p className="text-gray-500 text-xs mb-1">Trenutno si u</p>
                <p className="text-white font-bold">{checkin.clubs?.name}</p>
                <p className="text-gray-500 text-xs mt-1">
                  Ističe: {new Date(checkin.expires_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            )}

            {/* Intention (females only) */}
            {profile?.gender === 'female' && (
              <div className="bg-dark-800 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-gray-400 text-sm font-semibold">{t('set_intention')}</p>
                  {activeLock && (
                    <span className="text-xs text-orange-400 font-medium">
                      🔒 {activeLock.hours_left}h {activeLock.minutes_left}m
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  {INTENTIONS.map(({ type, emoji, color }) => (
                    <button
                      key={type}
                      onClick={() => handleIntention(type)}
                      disabled={intentionSaving || !!activeLock}
                      className={`flex-1 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                        currentIntention === type
                          ? `${color} bg-dark-700`
                          : activeLock
                          ? 'border-dark-600 text-gray-700 cursor-not-allowed'
                          : 'border-dark-500 text-gray-500 hover:border-gray-400'
                      }`}
                    >
                      {emoji} {t(type)}
                    </button>
                  ))}
                </div>
                {activeLock && (
                  <p className="text-gray-600 text-xs mt-3 text-center">
                    Možete promijeniti namjeru za {activeLock.hours_left}h {activeLock.minutes_left}m
                  </p>
                )}
              </div>
            )}

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="w-full py-4 rounded-2xl border border-dark-500 text-gray-400 font-semibold hover:border-red-500 hover:text-red-400 transition-all mt-2"
            >
              {t('logout')}
            </button>
          </div>
        </>
      )}

      <Navbar />
    </div>
  );
}
