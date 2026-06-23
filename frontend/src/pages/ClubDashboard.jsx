import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import api from '../lib/api';

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
      });
      setEvents(prev => [...prev, data]);
      setEventName(''); setEventDate(''); setEventTime('');
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
            <p className="text-gray-500 text-sm mt-0.5">📍 {club?.address} · 🎵 {club?.genre}</p>
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
              <input
                type="date" value={eventDate} onChange={e => setEventDate(e.target.value)} required
                className="flex-1 bg-dark-700 border border-dark-500 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-neon-pink transition-colors"
              />
              <input
                type="time" value={eventTime} onChange={e => setEventTime(e.target.value)} required
                className="flex-1 bg-dark-700 border border-dark-500 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-neon-pink transition-colors"
              />
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
            <p className="text-4xl mb-3">🎉</p>
            <p>Nema događaja. Dodaj prvi!</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {events.map(event => (
              <div key={event.id} className="bg-dark-800 border border-dark-600 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-white font-bold">{event.name}</p>
                  <p className="text-gray-500 text-sm mt-0.5">
                    📅 {formatDate(event.date)} · 🕐 {event.start_time?.slice(0, 5)}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(event.id)}
                  className="text-gray-600 hover:text-red-400 transition-colors text-lg ml-4"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
