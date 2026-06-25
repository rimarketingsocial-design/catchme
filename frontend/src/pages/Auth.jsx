import { useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import api from '../lib/api';
import { useApp } from '../context/AppContext';
import enStrings from '../i18n/en';

export default function Auth() {
  const [params] = useSearchParams();
  const isRegister = params.get('mode') !== 'login';
  const navigate = useNavigate();
  const { switchLanguage, fetchProfile } = useApp();
  const t = (key) => enStrings[key] || key;

  const [step, setStep] = useState(1); // 1=credentials, 2=profile
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [gender, setGender] = useState('');
  const [lang, setLang] = useState('en');
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const fileRef = useRef();

  const handlePhoto = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const uploadPhoto = async (userId) => {
    if (!photoFile) return null;
    const ext = photoFile.name.split('.').pop();
    const path = `avatars/${userId}.${ext}`;
    const { error } = await supabase.storage
      .from('avatars')
      .upload(path, photoFile, { upsert: true });
    if (error) return null;
    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    return data.publicUrl;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      await fetchProfile();
      navigate('/clubs');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterStep1 = (e) => {
    e.preventDefault();
    if (!email || !password) return setError('Email and password are required');
    if (password.length < 6) return setError('Password must be at least 6 characters');
    setError('');
    setStep(2);
  };

  const handleRegisterStep2 = async (e) => {
    e.preventDefault();
    if (!name || !gender) return setError('Name and gender are required');
    setError('');
    setLoading(true);
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
      if (signUpError) throw signUpError;

      const userId = data.user?.id;
      const photo_url = await uploadPhoto(userId);

      switchLanguage(lang);

      await api.post('/api/auth/profile', { name, gender, photo_url, language: lang, city: 'Belgrade' });

      if (gender === 'female') {
        navigate('/intention');
      } else {
        navigate('/clubs');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isRegister) {
    return (
      <div className="min-h-screen bg-dark-900 flex flex-col px-6 py-10">
        <button onClick={() => navigate('/')} className="text-gray-400 hover:text-white mb-8 flex items-center gap-2">
          ← {t('back')}
        </button>

        <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full">
          <h1 className="text-3xl font-black text-white mb-2">{t('login')}</h1>
          <p className="text-gray-500 mb-8">{t('no_account')}{' '}
            <button onClick={() => navigate('/auth?mode=register')} className="text-neon-pink font-semibold">
              {t('register')}
            </button>
          </p>

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <Input label={t('email')} type="email" value={email} onChange={setEmail} />
            <Input label={t('password')} type="password" value={password} onChange={setPassword} />
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full py-4 rounded-2xl bg-neon-gradient text-white font-bold text-lg mt-2 disabled:opacity-50">
              {loading ? t('loading') : t('sign_in')}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-900 flex flex-col px-6 py-10">
      <button onClick={() => step === 1 ? navigate('/') : setStep(1)}
        className="text-gray-400 hover:text-white mb-8 flex items-center gap-2">
        ← {t('back')}
      </button>

      <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full">
        <div className="flex gap-2 mb-8">
          {[1, 2].map(s => (
            <div key={s} className={`h-1 flex-1 rounded-full transition-all ${
              s <= step ? 'bg-neon-gradient' : 'bg-dark-600'
            }`} />
          ))}
        </div>

        <h1 className="text-3xl font-black text-white mb-2">{t('create_account')}</h1>
        <p className="text-gray-500 mb-8">{t('have_account')}{' '}
          <button onClick={() => navigate('/auth?mode=login')} className="text-neon-pink font-semibold">
            {t('sign_in')}
          </button>
        </p>

        {step === 1 && (
          <form onSubmit={handleRegisterStep1} className="flex flex-col gap-4">
            <Input label={t('email')} type="email" value={email} onChange={setEmail} />
            <Input label={t('password')} type="password" value={password} onChange={setPassword} />

            <div>
              <label className="text-gray-400 text-sm mb-2 block">{t('select_language')}</label>
              <div className="flex gap-3">
                {[['en', 'English'], ['sr', 'Srpski'], ['de', 'Deutsch']].map(([val, label]) => (
                  <button key={val} type="button" onClick={() => { setLang(val); switchLanguage(val); }}
                    className={`flex-1 py-3 rounded-xl border font-semibold transition-all ${
                      lang === val ? 'border-neon-pink text-neon-pink bg-dark-700' : 'border-dark-500 text-gray-400'
                    }`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button type="submit"
              className="w-full py-4 rounded-2xl bg-neon-gradient text-white font-bold text-lg mt-2">
              {t('confirm')} →
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleRegisterStep2} className="flex flex-col gap-4">
            {/* Photo */}
            <div className="flex flex-col items-center gap-3">
              <button type="button" onClick={() => fileRef.current?.click()}
                className="w-24 h-24 rounded-full border-2 border-dashed border-neon-pink flex items-center justify-center overflow-hidden">
                {photoPreview
                  ? <img src={photoPreview} className="w-full h-full object-cover" alt="preview" />
                  : <span className="text-3xl">📷</span>
                }
              </button>
              <span className="text-neon-pink text-sm">{t('upload_photo')}</span>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
            </div>

            <Input label={t('full_name')} value={name} onChange={setName} />

            <div>
              <label className="text-gray-400 text-sm mb-2 block">{t('gender')}</label>
              <div className="flex gap-3">
                {[['male', '♂ ' + t('male')], ['female', '♀ ' + t('female')]].map(([val, label]) => (
                  <button key={val} type="button" onClick={() => setGender(val)}
                    className={`flex-1 py-3 rounded-xl border font-semibold transition-all ${
                      gender === val ? 'border-neon-pink text-neon-pink bg-dark-700' : 'border-dark-500 text-gray-400'
                    }`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full py-4 rounded-2xl bg-neon-gradient text-white font-bold text-lg mt-2 disabled:opacity-50">
              {loading ? t('loading') : t('register')}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function Input({ label, type = 'text', value, onChange }) {
  return (
    <div>
      <label className="text-gray-400 text-sm mb-1.5 block">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full bg-dark-700 border border-dark-500 rounded-xl px-4 py-3 text-white placeholder-gray-600
          focus:outline-none focus:border-neon-pink transition-colors"
      />
    </div>
  );
}
