import { Outlet, NavLink, useLocation } from 'react-router-dom';

const navItems = [
  { to: '/', label: '首页', icon: '🏠' },
  { to: '/training', label: '训练', icon: '🏋️' },
  { to: '/calendar', label: '日历', icon: '📅' },
  { to: '/body', label: '身体', icon: '💪' },
];

export default function Layout() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      <main className="max-w-lg mx-auto px-4 py-4">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-10 safe-area-pb">
        <div className="max-w-lg mx-auto flex justify-around">
          {navItems.map((item) => {
            const isActive = item.to === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.to);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={`flex flex-col items-center py-2 px-3 text-xs gap-0.5 transition-colors ${
                  isActive ? 'text-blue-600 font-medium' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
