import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import api from '../lib/api';

export default function ClubLogin() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const registered = params.get('registered');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) throw authError;

      // Verify this is a club account
      const { data } = await api.get('/api/club-auth/me');
      if (!data) throw new Error('Nije pronađen klub za ovaj nalog');

      navigate('/club-dashboard');
    } catch (err) {
      setError(err.message || 'Greška pri prijavi');
      await supabase.auth.signOut();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-900 flex flex-col px-6 py-10">
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => navigate('/')} className="text-gray-400 hover:text-white">←</button>
        <h1 className="text-white font-black text-xl">Prijava kluba</h1>
      </div>

      {registered && (
        <div className="mb-4 bg-green-500/20 border border-green-500/40 rounded-xl px-4 py-3 text-green-400 text-sm">
          ✅ Nalog je kreiran! Prijavite se.
        </div>
      )}

      {error && (
        <div className="mb-4 bg-red-500/20 border border-red-500/40 rounded-xl px-4 py-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleLogin} className="flex flex-col gap-5">
        <div>
          <label className="text-gray-400 text-sm mb-1.5 block">Email adresa</label>
          <input
            type="email" value={email} onChange={e => setEmail(e.target.value)} required
            className="w-full bg-dark-700 border border-dark-500 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-neon-pink transition-colors"
          />
        </div>
        <div>
          <label className="text-gray-400 text-sm mb-1.5 block">Lozinka</label>
          <input
            type="password" value={password} onChange={e => setPassword(e.target.value)} required
            className="w-full bg-dark-700 border border-dark-500 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-neon-pink transition-colors"
          />
        </div>
        <button
          type="submit" disabled={loading}
          className="w-full py-4 rounded-2xl bg-neon-gradient text-white font-bold disabled:opacity-40"
        >
          {loading ? 'Prijava...' : 'Prijavi se'}
        </button>
      </form>

      <p className="text-center text-gray-600 text-sm mt-6">
        Nemaš nalog?{' '}
        <button onClick={() => navigate('/club-register')} className="text-neon-pink font-semibold">
          Registruj klub
        </button>
      </p>
    </div>
  );
}
