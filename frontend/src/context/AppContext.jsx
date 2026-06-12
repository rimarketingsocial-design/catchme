import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import api from '../lib/api';
import en from '../i18n/en';
import sr from '../i18n/sr';

const AppContext = createContext(null);

const TRANSLATIONS = { en, sr };

export function AppProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [language, setLanguage] = useState(() => localStorage.getItem('catchme_lang') || 'en');
  const [checkin, setCheckin] = useState(null);
  const [loading, setLoading] = useState(true);

  const t = (key) => TRANSLATIONS[language]?.[key] || TRANSLATIONS.en[key] || key;

  const switchLanguage = (lang) => {
    setLanguage(lang);
    localStorage.setItem('catchme_lang', lang);
  };

  const fetchProfile = async () => {
    try {
      const { data } = await api.get('/api/auth/profile');
      setProfile(data);
      if (data.language) switchLanguage(data.language);
      return data;
    } catch {
      setProfile(null);
      return null;
    }
  };

  const fetchCheckin = async () => {
    try {
      const { data } = await api.get('/api/checkins/me');
      setCheckin(data);
    } catch {
      setCheckin(null);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchProfile().then(() => fetchCheckin()).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchProfile().then(() => fetchCheckin());
      } else {
        setProfile(null);
        setCheckin(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setCheckin(null);
    setSession(null);
  };

  return (
    <AppContext.Provider value={{
      session, profile, setProfile, language, t, switchLanguage,
      checkin, setCheckin, fetchCheckin, fetchProfile, loading, logout,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};
