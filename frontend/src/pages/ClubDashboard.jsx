import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import api from '../lib/api';

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

export default function ClubDashboard() {
  const navigate = useNavigate();
  const [club, setClub] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [eventEndTime, setEventEndTime] = useState('');

  useEffect(() => {
    loadData();
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
        name: eventName,
        date: eventDate,
        start_time: eventTime,
        end_time: eventEndTime || undefined,
      });
      setEvents(prev => [...prev, data]);
      setEventName(''); setEventDate(''); setEventTime(''); setEventEndTime('');
      setShowForm(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Greška');
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

  const formatDate = (d) => new Date(d).toLocaleDateString('sr-RS', { weekday: 'short', day: 'numeric', month: 'short' });

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
            <p className="text-gray-500 text-xs mb-1">Dashboard kluba</p>
            <h1 className="text-white font-black text-2xl">{club?.name}</h1>
            <p className="text-gray-500 text-sm mt-0.5 flex items-center gap-1.5 flex-wrap">
              <span className="text-neon-pink"><IconPin /></span>{club?.address}
              {club?.genre && <><span className="text-dark-500">·</span><span className="text-neon-purple"><IconMusic /></span>{club?.genre}</>}
            </p>
          </div>
          <button onClick={handleLogout} className="text-gray-600 text-xs hover:text-red-400 transition-colors mt-1">
            Odjavi se
          </button>
        </div>
      </div>

      {/* Club photo */}
      {club?.photo_url && (
        <div className="mx-6 rounded-2xl overflow-hidden h-40 mb-6">
          <img src={club.photo_url} className="w-full h-full object-cover" alt={club.name} />
        </div>
      )}

      {/* Events section */}
      <div className="px-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-bold text-lg">Događaji / Events</h2>
          <button
            onClick={() => setShowForm(!showForm)}
            className="text-sm bg-neon-gradient text-white font-semibold px-4 py-2 rounded-xl"
          >
            + Dodaj
          </button>
        </div>

        {/* Add event form */}
        {showForm && (
          <form onSubmit={handleAddEvent} className="bg-dark-800 border border-neon-pink/20 rounded-2xl p-4 mb-4 flex flex-col gap-3">
            <h3 className="text-white font-semibold text-sm">Novi događaj</h3>
            {error && <p className="text-red-400 text-xs">{error}</p>}
            <input
              value={eventName} onChange={e => setEventName(e.target.value)} required
              placeholder="Naziv žurke"
              className="w-full bg-dark-700 border border-dark-500 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-neon-pink transition-colors"
            />
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-gray-500 text-xs mb-1 flex items-center gap-1"><span className="text-neon-pink opacity-70"><IconCalendar /></span> Date</label>
                <input
                  type="date" value={eventDate} onChange={e => setEventDate(e.target.value)} required
                  className="w-full bg-dark-700 border border-dark-500 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-neon-pink transition-colors [color-scheme:dark]"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-gray-500 text-xs mb-1 flex items-center gap-1"><span className="text-neon-purple opacity-70"><IconClock /></span> Start</label>
                <input
                  type="time" value={eventTime} onChange={e => setEventTime(e.target.value)} required
                  className="w-full bg-dark-700 border border-dark-500 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-neon-pink transition-colors [color-scheme:dark]"
                />
              </div>
              <div className="flex-1">
                <label className="text-gray-500 text-xs mb-1 flex items-center gap-1"><span className="text-gray-500 opacity-70"><IconClock /></span> Ends</label>
                <input
                  type="time" value={eventEndTime} onChange={e => setEventEndTime(e.target.value)}
                  className="w-full bg-dark-700 border border-dark-500 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-neon-pink transition-colors [color-scheme:dark]"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl border border-dark-500 text-gray-400 text-sm font-semibold">
                Otkaži
              </button>
              <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl bg-neon-gradient text-white text-sm font-bold disabled:opacity-40">
                {saving ? '...' : 'Sačuvaj'}
              </button>
            </div>
          </form>
        )}

        {/* Events list */}
        {events.length === 0 ? (
          <div className="text-center py-12 text-gray-600">
            <div className="w-14 h-14 rounded-full bg-dark-800 border border-dark-600 flex items-center justify-center mx-auto mb-3">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="12" y1="14" x2="12" y2="18"/><line x1="10" y1="16" x2="14" y2="16"/>
              </svg>
            </div>
            <p>No events yet. Add the first one!</p>
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
                <button
                  onClick={() => handleDelete(event.id)}
                  className="text-gray-600 hover:text-red-400 transition-colors ml-4 p-1"
                >
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
