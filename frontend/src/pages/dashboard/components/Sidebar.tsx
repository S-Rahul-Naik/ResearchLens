import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';

export type DashboardSection =
  | 'overview'
  | 'datasets'
  | 'gaps'
  | 'topics'
  | 'trends'
  | 'map'
  | 'chatbot'
  | 'evaluation';

interface SidebarProps {
  active: DashboardSection;
  onNavigate: (section: DashboardSection) => void;
  onOpenHistory?: () => void;
  sessionRunCount?: number;
}

const navItems: { id: DashboardSection; label: string; icon: string; badge?: string }[] = [
  { id: 'overview', label: 'Overview', icon: 'ri-dashboard-3-line' },
  { id: 'datasets', label: 'Datasets', icon: 'ri-database-2-line' },
  { id: 'gaps', label: 'Gap Detection', icon: 'ri-radar-line', badge: 'Main' },
  { id: 'topics', label: 'Topic Explorer', icon: 'ri-price-tag-3-line' },
  { id: 'trends', label: 'Trend Analysis', icon: 'ri-line-chart-line' },
  { id: 'map', label: 'Research Map', icon: 'ri-map-2-line' },
  { id: 'chatbot', label: 'AI Chatbot', icon: 'ri-chat-3-line' },
];

export default function Sidebar({ active, onNavigate, onOpenHistory, sessionRunCount = 0 }: SidebarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <aside className="flex flex-col h-full bg-[#0a1628] w-64 flex-shrink-0">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/8">
        <Link to="/" className="flex items-center gap-3">
          <img
            src="https://public.readdy.ai/ai/img_res/c3ba04c3-362e-4eb4-b5f2-b15a59a83c21.png"
            alt="ResearchLens"
            className="h-8 w-8 object-contain"
          />
          <span className="text-base font-bold text-white tracking-tight">ResearchLens</span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-white/25 px-3 mb-3">Workspace</p>
        {navItems.map((item) => {
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              data-section={item.id}
              onClick={() => onNavigate(item.id)}
              className={`whitespace-nowrap w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer text-left
                ${isActive
                  ? 'bg-white/10 text-white border-l-2 border-[#2dd4bf]'
                  : 'text-white/55 hover:text-white/90 hover:bg-white/5'
                }`}
            >
              <div className={`w-5 h-5 flex items-center justify-center flex-shrink-0 ${isActive ? 'text-[#2dd4bf]' : ''}`}>
                <i className={`${item.icon} text-base`} />
              </div>
              <span className="flex-1">{item.label}</span>
              {item.badge && (
                <span className="text-[10px] font-semibold bg-teal-600/30 text-teal-300 px-1.5 py-0.5 rounded">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}

        {/* History separator */}
        <div className="mt-3 pt-3 border-t border-white/8">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-white/25 px-3 mb-2">Records</p>
          <button
            onClick={onOpenHistory}
            className="whitespace-nowrap w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer text-left text-white/55 hover:text-white/90 hover:bg-white/5"
          >
            <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
              <i className="ri-history-line text-base" />
            </div>
            <span className="flex-1">Analysis History</span>
            {sessionRunCount > 0 && (
              <span className="text-[10px] font-bold bg-teal-500 text-white px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                {sessionRunCount}
              </span>
            )}
          </button>
        </div>
      </nav>

      {/* User */}
      <div className="px-3 py-4 border-t border-white/8">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer">
          <div className="w-8 h-8 rounded-full bg-teal-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
            {user?.name?.charAt(0) ?? 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-white truncate">{user?.name}</div>
            <div className="text-[10px] text-white/40 truncate">{user?.email}</div>
          </div>
          <button
            onClick={handleLogout}
            title="Sign out"
            className="whitespace-nowrap w-6 h-6 flex items-center justify-center text-white/30 hover:text-white/70 transition-colors cursor-pointer flex-shrink-0"
          >
            <i className="ri-logout-box-r-line text-sm" />
          </button>
        </div>
      </div>
    </aside>
  );
}
