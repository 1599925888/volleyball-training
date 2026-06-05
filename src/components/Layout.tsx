import { Outlet, NavLink, useLocation } from 'react-router-dom';

const navItems = [
  { to: '/', label: '首页', icon: '📊' },
  { to: '/training', label: '训练', icon: '🏋️' },
  { to: '/calendar', label: '日历', icon: '📅' },
  { to: '/body', label: '身体', icon: '💪' },
  { to: '/diet', label: '饮食', icon: '🍽️' },
];

export default function Layout() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      <header className="bg-blue-700 text-white px-4 py-3 sticky top-0 z-10">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <h1 className="text-lg font-semibold tracking-tight">排球训练管理</h1>
          <NavLink to="/settings" className="text-white/80 hover:text-white text-sm">
            ⚙️
          </NavLink>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-4">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-10">
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
                  isActive
                    ? 'text-blue-600'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <span className="text-xl">{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
