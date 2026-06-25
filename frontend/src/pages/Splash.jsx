import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export default function Splash() {
  const navigate = useNavigate();
  const { t } = useApp();

  return (
    <div className="min-h-screen bg-dark-900 flex flex-col items-center justify-between px-6 py-12 overflow-hidden relative">
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-neon-pink opacity-10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 left-1/3 w-64 h-64 bg-neon-purple opacity-10 rounded-full blur-3xl" />
      </div>

      {/* Logo + tagline */}
      <div className="flex-1 flex flex-col items-center justify-center text-center relative z-10">
        <div className="mb-6">
          <span className="text-6xl font-black tracking-tight">
            <span className="text-white">Catch</span>
            <span className="bg-neon-gradient bg-clip-text text-transparent">Me</span>
          </span>
          <div className="mt-1 h-1 w-16 mx-auto rounded-full bg-neon-gradient" />
        </div>

        <p className="text-2xl font-bold text-white mb-3">{t('splash_tagline')}</p>
        <p className="text-gray-400 text-base max-w-xs">{t('splash_sub')}</p>

      </div>

      {/* CTA buttons */}
      <div className="w-full max-w-sm flex flex-col gap-3 relative z-10">
        <button
          onClick={() => navigate('/auth?mode=register')}
          className="w-full py-4 rounded-2xl bg-neon-gradient text-white font-bold text-lg shadow-lg hover:opacity-90 active:scale-95 transition-all animate-pulse-neon"
        >
          {t('get_started')}
        </button>
        <button
          onClick={() => navigate('/auth?mode=login')}
          className="w-full py-4 rounded-2xl border border-dark-500 text-gray-300 font-semibold text-lg hover:border-neon-pink hover:text-white transition-all"
        >
          {t('sign_in')}
        </button>
        <div className="text-center pt-2">
          <button
            onClick={() => navigate('/club-register')}
            className="text-gray-500 text-sm hover:text-neon-pink transition-colors"
          >
            Have a club? <span className="text-neon-pink font-semibold">Create account</span>
          </button>
        </div>
      </div>
    </div>
  );
}
