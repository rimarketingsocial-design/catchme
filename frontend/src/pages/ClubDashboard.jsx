import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import api from '../lib/api';
import { useApp } from '../context/AppContext';

const GENRES = ['House', 'Techno', 'Hip-Hop', 'R&B', 'Pop', 'Latino', 'Turbo-Folk', 'Rock', 'EDM', 'Commercial'];
const LANGUAGES = [
  { code: 'en', flag: '🇬🇧', label: 'English' },
  { code: 'sr', flag: '🇷🇸', label: 'Srpski' },
  { code: 'de', flag: '🇩🇪', label: 'Deutsch' },
];

const IconPin = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
  </svg>
);
const IconMusic = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
  </svg>
);
const IconCalendar = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);
const IconClock = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
);
const IconTrash = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
  </svg>
);
const IconMenu = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
  </svg>
);
const IconEdit = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);
const IconGlobe = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
  </svg>
);
const IconLogout = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);
const IconChevron = ({ open }) => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);

export default function ClubDashboard() {
  const navigate = useNavigate();
  const { t, language, switchLanguage } = useApp();
  const [club, setClub] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [showMenu, setShowMenu] = useState(false);
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const menuRef = useRef();

  const [editName, setEditName] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editGenre, setEditGenre] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [eventEndTime, setEventEndTime] = useState('');

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false);
        setShowLangPicker(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const loadData = async () => {
    try {
      const { data: clubData } = await api.get('/api/club-auth/me');
      setClub(clubData);
      const { data: eventsData } = await api.get(`/api/events?club_id=${clubData.id}`);
      setEvents(eventsData || []);
    } catch {
      navigate('/club-login');
    } finally {
      setLoading(false);
    }
  };

  const handleAddEvent = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const { data } = await api.post('/api/events', {
        name: eventName, date: eventDate, start_time: eventTime,
        end_time: eventEndTime || undefined,
      });
      setEvents(prev => [...prev, data]);
      setEventName(''); setEventDate(''); setEventTime(''); setEventEndTime('');
      setShowForm(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Error saving event');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    await api.delete(`/api/events/${id}`);
    setEvents(prev => prev.filter(e => e.id !== id));
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const openEdit = () => {
    setEditName(club?.name || '');
    setEditAddress(club?.address || '');
    setEditGenre(club?.genre || '');
    setEditCity(club?.city || '');
    setShowEditProfile(true);
    setShowMenu(false);
  };

  const handleSaveProfile = async () => {
    setEditSaving(true);
    try {
      const { data } = await api.patch('/api/club-auth/me', {
        name: editName.trim(), address: editAddress.trim(),
        genre: editGenre, city: editCity.trim(),
      });
      setClub(data);
      setShowEditProfile(false);
    } catch {}
    setEditSaving(false);
  };

  const formatDate = (d) => new Date(d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="text-center">
          <span className="text-4xl font-black"><span className="text-white">Catch</span><span className="bg-neon-gradient bg-clip-text text-transparent">Me</span></span>
          <div className="mt-4 flex justify-center gap-1">
            {[0,1,2].map(i => <div key={i} className="w-2 h-2 rounded-full bg-neon-pink animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-900 pb-10">
      {/* Header */}
      <div className="px-6 pt-12 pb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-white font-black text-2xl">{club?.name}</h1>
            <p className="text-gray-500 text-sm mt-0.5 flex items-center gap-1.5 flex-wrap">
              <span className="text-neon-pink"><IconPin /></span>{club?.address}
              {club?.genre && <><span className="text-dark-500">·</span><span className="text-neon-purple"><IconMusic /></span>{club?.genre}</>}
            </p>
          </div>

          {/* Hamburger menu */}
          <div className="relative mt-1" ref={menuRef}>
            <button
              onClick={() => { setShowMenu(v => !v); setShowLangPicker(false); }}
              className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-400 hover:text-white hover:bg-dark-700 transition-all"
            >
              <IconMenu />
            </button>

            {showMenu && (
              <div className="absolute right-0 top-11 w-56 bg-dark-800 border border-dark-600 rounded-2xl shadow-2xl z-50">
                {/* Edit Profile */}
                <button
                  onClick={openEdit}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-gray-300 hover:bg-dark-700 hover:text-white transition-colors text-sm font-medium rounded-t-2xl"
                >
                  <span className="text-neon-pink"><IconEdit /></span>
                  {t('edit_profile')}
                </button>

                <div className="border-t border-dark-600" />

                {/* App Language toggle */}
                <button
                  onClick={() => setShowLangPicker(v => !v)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-gray-300 hover:bg-dark-700 hover:text-white transition-colors text-sm font-medium"
                >
                  <span className="text-neon-purple"><IconGlobe /></span>
                  App Language
                  <span className="ml-auto flex items-center gap-1.5 text-gray-400 text-xs">
                    {LANGUAGES.find(l => l.code === language)?.flag}
                    <IconChevron open={showLangPicker} />
                  </span>
                </button>

                {/* Language options — expand inline */}
                {showLangPicker && (
                  <div className="border-t border-dark-600/40">
                    {LANGUAGES.map(lang => (
                      <button
                        key={lang.code}
                        onClick={() => { switchLanguage(lang.code); setShowLangPicker(false); setShowMenu(false); }}
                        className={`w-full flex items-center gap-3 px-6 py-3 text-sm transition-colors ${
                          language === lang.code
                            ? 'text-white font-semibold bg-neon-pink/10'
                            : 'text-gray-400 hover:text-white hover:bg-dark-700'
                        }`}
                      >
                        <span>{lang.flag}</span>
                        {lang.label}
                        {language === lang.code && <span className="ml-auto text-neon-pink">✓</span>}
                      </button>
                    ))}
                  </div>
                )}

                <div className="border-t border-dark-600" />

                {/* Sign Out */}
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-gray-300 hover:bg-dark-700 hover:text-red-400 transition-colors text-sm font-medium rounded-b-2xl"
                >
                  <span><IconLogout /></span>
                  {t('sign_out')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Profile modal */}
      {showEditProfile && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm px-4 pb-10">
          <div className="w-full max-w-sm bg-dark-800 border border-dark-600 rounded-3xl p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-bold text-lg">{t('edit_profile')}</h3>
              <button onClick={() => setShowEditProfile(false)} className="text-gray-500 hover:text-white text-xl">✕</button>
            </div>
            <input value={editName} onChange={e => setEditName(e.target.value)} placeholder="Club name"
              className="w-full bg-dark-700 border border-dark-500 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-neon-pink transition-colors" />
            <input value={editAddress} onChange={e => setEditAddress(e.target.value)} placeholder="Address"
              className="w-full bg-dark-700 border border-dark-500 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-neon-pink transition-colors" />
            <input value={editCity} onChange={e => setEditCity(e.target.value)} placeholder="City"
              className="w-full bg-dark-700 border border-dark-500 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-neon-pink transition-colors" />
            <select value={editGenre} onChange={e => setEditGenre(e.target.value)}
              className="w-full bg-dark-700 border border-dark-500 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-neon-pink transition-colors [color-scheme:dark]">
              <option value="">Select genre</option>
              {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
            <div className="flex gap-3">
              <button onClick={() => setShowEditProfile(false)}
                className="flex-1 py-3 rounded-2xl border border-dark-500 text-gray-400 font-semibold">
                {t('cancel')}
              </button>
              <button onClick={handleSaveProfile} disabled={editSaving}
                className="flex-1 py-3 rounded-2xl bg-neon-gradient text-white font-bold disabled:opacity-40">
                {editSaving ? '...' : t('save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Club photo */}
      {club?.photo_url && (
        <div className="mx-6 rounded-2xl overflow-hidden h-40 mb-6">
          <img src={club.photo_url} className="w-full h-full object-cover" alt={club.name} />
        </div>
      )}

      {/* Events section */}
      <div className="px-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-bold text-lg">{t('events')}</h2>
          <button onClick={() => setShowForm(!showForm)}
            className="text-sm bg-neon-gradient text-white font-semibold px-4 py-2 rounded-xl">
            {t('add_event')}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleAddEvent} className="bg-dark-800 border border-neon-pink/20 rounded-2xl p-4 mb-4 flex flex-col gap-3">
            <h3 className="text-white font-semibold text-sm">{t('new_event')}</h3>
            {error && <p className="text-red-400 text-xs">{error}</p>}
            <input value={eventName} onChange={e => setEventName(e.target.value)} required
              placeholder={t('party_name')}
              className="w-full bg-dark-700 border border-dark-500 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-neon-pink transition-colors" />
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-gray-500 text-xs mb-1 flex items-center gap-1"><span className="text-neon-pink opacity-70"><IconCalendar /></span> Date</label>
                <input type="date" value={eventDate} onChange={e => setEventDate(e.target.value)} required
                  className="w-full bg-dark-700 border border-dark-500 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-neon-pink transition-colors [color-scheme:dark]" />
              </div>
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-gray-500 text-xs mb-1 flex items-center gap-1"><span className="text-neon-purple opacity-70"><IconClock /></span> Start</label>
                <input type="time" value={eventTime} onChange={e => setEventTime(e.target.value)} required
                  className="w-full bg-dark-700 border border-dark-500 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-neon-pink transition-colors [color-scheme:dark]" />
              </div>
              <div className="flex-1">
                <label className="text-gray-500 text-xs mb-1 flex items-center gap-1"><span className="text-gray-500 opacity-70"><IconClock /></span> Ends</label>
                <input type="time" value={eventEndTime} onChange={e => setEventEndTime(e.target.value)}
                  className="w-full bg-dark-700 border border-dark-500 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-neon-pink transition-colors [color-scheme:dark]" />
              </div>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowForm(false)}
                className="flex-1 py-2.5 rounded-xl border border-dark-500 text-gray-400 text-sm font-semibold">
                {t('cancel')}
              </button>
              <button type="submit" disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-neon-gradient text-white text-sm font-bold disabled:opacity-40">
                {saving ? '...' : t('save')}
              </button>
            </div>
          </form>
        )}

        {events.length === 0 ? (
          <div className="text-center py-12 text-gray-600">
            <div className="w-14 h-14 rounded-full bg-dark-800 border border-dark-600 flex items-center justify-center mx-auto mb-3">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="12" y1="14" x2="12" y2="18"/><line x1="10" y1="16" x2="14" y2="16"/>
              </svg>
            </div>
            <p>{t('no_events')}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {events.map(event => (
              <div key={event.id} className="bg-dark-800 border border-dark-600 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-white font-bold">{event.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="flex items-center gap-1 text-gray-500 text-xs">
                      <span className="text-neon-pink opacity-70"><IconCalendar /></span>
                      {formatDate(event.date)}
                    </span>
                    <span className="text-dark-500 text-xs">·</span>
                    <span className="flex items-center gap-1 text-gray-500 text-xs">
                      <span className="text-neon-purple opacity-70"><IconClock /></span>
                      {event.start_time?.slice(0, 5)}{event.end_time ? ` – ${event.end_time.slice(0, 5)}` : ''}
                    </span>
                  </div>
                </div>
                <button onClick={() => handleDelete(event.id)}
                  className="text-gray-600 hover:text-red-400 transition-colors ml-4 p-1">
                  <IconTrash />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
