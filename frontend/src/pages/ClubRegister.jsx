import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import api from '../lib/api';

const GENRES = ['House', 'Techno', 'Hip-Hop', 'R&B', 'Pop', 'Latino', 'Turbo-Folk', 'Rock', 'EDM', 'Commercial'];

export default function ClubRegister() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: info, 2: account
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [clubName, setClubName] = useState('');
  const [address, setAddress] = useState('');
  const [genre, setGenre] = useState('');
  const [city, setCity] = useState('Belgrade');
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handlePhoto = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const uploadPhoto = async (clubName) => {
    if (!photoFile) return null;
    const ext = photoFile.name.split('.').pop();
    const path = `clubs/${clubName.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('avatars').upload(path, photoFile, { upsert: true });
    if (error) return null;
    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    return data.publicUrl;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const photo_url = await uploadPhoto(clubName);
      const { data } = await api.post('/api/club-auth/register', {
        email, password, club_name: clubName, address, genre, city, photo_url,
      });
      navigate('/club-login?registered=1');
    } catch (err) {
      setError(err.response?.data?.error || 'Greška pri registraciji');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-900 flex flex-col px-6 py-10">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => step === 2 ? setStep(1) : navigate('/')} className="text-gray-400 hover:text-white">
          ←
        </button>
        <div>
          <h1 className="text-white font-black text-xl">Registracija kluba</h1>
          <p className="text-gray-500 text-xs">Korak {step} od 2</p>
        </div>
      </div>

      {/* Progress */}
      <div className="flex gap-2 mb-8">
        <div className="h-1 flex-1 rounded-full bg-neon-gradient" />
        <div className={`h-1 flex-1 rounded-full ${step === 2 ? 'bg-neon-gradient' : 'bg-dark-600'}`} />
      </div>

      {error && (
        <div className="mb-4 bg-red-500/20 border border-red-500/40 rounded-xl px-4 py-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-5 flex-1">
        {step === 1 ? (
          <>
            {/* Club photo */}
            <div className="flex flex-col items-center gap-2">
              <label className="text-gray-400 text-sm self-start mb-1">Fotografija kluba (horizontalna)</label>
              <label className="w-full h-40 rounded-2xl border-2 border-dashed border-dark-500 overflow-hidden cursor-pointer hover:border-neon-pink transition-colors flex items-center justify-center relative">
                {photoPreview
                  ? <img src={photoPreview} className="w-full h-full object-cover" alt="" />
                  : <div className="flex flex-col items-center gap-2 text-gray-600">
                      <span className="text-4xl">📷</span>
                      <span className="text-sm">Dodaj fotografiju</span>
                    </div>
                }
                <input type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
              </label>
            </div>

            {/* Club name */}
            <div>
              <label className="text-gray-400 text-sm mb-1.5 block">Naziv kluba *</label>
              <input
                value={clubName} onChange={e => setClubName(e.target.value)} required
                className="w-full bg-dark-700 border border-dark-500 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-neon-pink transition-colors"
                placeholder="npr. Drugstore"
              />
            </div>

            {/* City */}
            <div>
              <label className="text-gray-400 text-sm mb-1.5 block">Grad *</label>
              <input
                value={city} onChange={e => setCity(e.target.value)} required
                className="w-full bg-dark-700 border border-dark-500 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-neon-pink transition-colors"
                placeholder="npr. Beograd"
              />
            </div>

            {/* Address */}
            <div>
              <label className="text-gray-400 text-sm mb-1.5 block">Adresa *</label>
              <input
                value={address} onChange={e => setAddress(e.target.value)} required
                className="w-full bg-dark-700 border border-dark-500 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-neon-pink transition-colors"
                placeholder="npr. Savska 5, Beograd"
              />
            </div>

            {/* Genre */}
            <div>
              <label className="text-gray-400 text-sm mb-1.5 block">Žanr muzike *</label>
              <select
                value={genre} onChange={e => setGenre(e.target.value)} required
                className="w-full bg-dark-700 border border-dark-500 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-neon-pink transition-colors"
              >
                <option value="">Odaberi žanr</option>
                {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>

            <button
              type="button"
              onClick={() => { if (clubName && address && genre && city) setStep(2); }}
              disabled={!clubName || !address || !genre || !city}
              className="w-full py-4 rounded-2xl bg-neon-gradient text-white font-bold disabled:opacity-40 transition-all mt-auto"
            >
              Dalje →
            </button>
          </>
        ) : (
          <>
            <div>
              <label className="text-gray-400 text-sm mb-1.5 block">Email adresa *</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)} required
                className="w-full bg-dark-700 border border-dark-500 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-neon-pink transition-colors"
                placeholder="club@example.com"
              />
            </div>
            <div>
              <label className="text-gray-400 text-sm mb-1.5 block">Lozinka *</label>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6}
                className="w-full bg-dark-700 border border-dark-500 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-neon-pink transition-colors"
                placeholder="Minimum 6 karaktera"
              />
            </div>

            <div className="bg-dark-800 rounded-2xl p-4 text-sm text-gray-400">
              <p className="font-semibold text-white mb-2">Rezime:</p>
              <p>🏠 {clubName}</p>
              <p>📍 {address}, {city}</p>
              <p>🎵 {genre}</p>
            </div>

            <button
              type="submit" disabled={loading || !email || !password}
              className="w-full py-4 rounded-2xl bg-neon-gradient text-white font-bold disabled:opacity-40 transition-all mt-auto"
            >
              {loading ? 'Registracija...' : 'Napravi nalog kluba'}
            </button>
          </>
        )}
      </form>

      <p className="text-center text-gray-600 text-sm mt-6">
        Već imaš nalog?{' '}
        <button onClick={() => navigate('/club-login')} className="text-neon-pink font-semibold">
          Prijavi se
        </button>
      </p>
    </div>
  );
}
