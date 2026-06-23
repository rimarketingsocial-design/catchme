import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';

const IconClubs = ({ active }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#f72585' : '#6b7280'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
  </svg>
);

const IconMessages = ({ active }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#f72585' : '#6b7280'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
);

const IconSociety = ({ active }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#f72585' : '#6b7280'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);

const IconProfile = ({ active }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#f72585' : '#6b7280'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
  </svg>
);

export default function Navbar({ onVibeClick }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { t } = useApp();

  const tabs = [
    { path: '/clubs', icon: IconClubs, label: t('clubs') },
    { path: '/inbox', icon: IconMessages, label: t('messages') },
    null, // center button placeholder
    { path: '/society', icon: IconSociety, label: t('society') },
    { path: '/profile', icon: IconProfile, label: t('profile') },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-dark-900/95 backdrop-blur-xl border-t border-dark-700/60 pb-safe">
      <div className="flex items-center justify-around max-w-lg mx-auto h-16 px-2">
        {tabs.map((tab, i) => {
          if (!tab) {
            // Center Vibe button
            return (
              <button
                key="vibe"
                onClick={onVibeClick}
                className="relative -mt-6 w-14 h-14 rounded-full flex items-center justify-center shadow-2xl"
                style={{ background: 'radial-gradient(circle at 40% 35%, #f72585, #7209b7)' }}
              >
                <div className="absolute inset-0 rounded-full opacity-40 blur-md"
                  style={{ background: 'radial-gradient(circle, #f72585, transparent)' }} />
                <svg width="24" height="24" viewBox="0 0 24 24" fill="white" className="relative z-10">
                  <line x1="12" y1="5" x2="12" y2="19" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                  <line x1="5" y1="12" x2="19" y2="12" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                </svg>
              </button>
            );
          }

          const active = pathname.startsWith(tab.path);
          const Icon = tab.icon;

          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className="flex flex-col items-center gap-1 py-1 px-3 transition-all"
            >
              <Icon active={active} />
              <span className={`text-[10px] font-semibold ${active ? 'text-neon-pink' : 'text-gray-500'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
