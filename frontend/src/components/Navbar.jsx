import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export default function Navbar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { t, profile } = useApp();

  const tabs = [
    { path: '/clubs', icon: '🎵', label: t('clubs') },
    ...(profile?.gender === 'female' ? [{ path: '/inbox', icon: '💌', label: t('messages') }] : []),
    { path: '/profile', icon: '👤', label: t('profile') },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-dark-800/90 backdrop-blur-lg border-t border-dark-600 px-2 pb-safe">
      <div className="flex items-center justify-around max-w-lg mx-auto py-2">
        {tabs.map(tab => {
          const active = pathname.startsWith(tab.path);
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all ${
                active ? 'text-neon-pink' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <span className="text-xl">{tab.icon}</span>
              <span className={`text-xs font-semibold ${active ? 'text-neon-pink' : ''}`}>{tab.label}</span>
              {active && <div className="w-1 h-1 rounded-full bg-neon-pink" />}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
