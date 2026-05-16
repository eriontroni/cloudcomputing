import { NavLink } from 'react-router-dom';
import { BookOpen, Film, GraduationCap, Moon, Sun, LayoutDashboard } from 'lucide-react';

const navItems = [
  { to: '/blog', icon: BookOpen, label: 'Personal Blog', color: 'text-blue-500' },
  { to: '/movies', icon: Film, label: 'Movie Rental', color: 'text-purple-500' },
  { to: '/gradebook', icon: GraduationCap, label: 'Gradebook', color: 'text-green-500' },
];

export default function Sidebar({ darkMode, setDarkMode }) {
  return (
    <aside className="w-64 flex-shrink-0 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
      <div className="p-5 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <LayoutDashboard className="text-primary-500" size={24} />
          <span className="font-bold text-lg text-gray-800 dark:text-white">MultiDB</span>
        </div>
        <p className="text-xs text-gray-400 mt-1">Database Dashboard</p>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map(({ to, icon: Icon, label, color }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`
            }
          >
            <Icon size={20} className={color} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setDarkMode(!darkMode)}
          className="flex items-center gap-2 w-full px-4 py-2 rounded-xl text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
        >
          {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          {darkMode ? 'Light Mode' : 'Dark Mode'}
        </button>
      </div>
    </aside>
  );
}
