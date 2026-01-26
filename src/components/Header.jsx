import { useNavigate } from 'react-router-dom';
import { useTheme } from '../lib/theme.jsx';
import AdminMenu from './AdminMenu';

export default function Header({
  title,
  showBack = false,
  showMenu = false,
  backTo,
  rightAction,
  className = '',
}) {
  const navigate = useNavigate();
  const { theme } = useTheme();

  const handleBack = () => {
    if (backTo) {
      navigate(backTo);
    } else {
      navigate(-1);
    }
  };

  return (
    <header className={`sticky top-0 z-40 safe-area-top ${theme.headerBg} ${className}`}>
      <div className="flex items-center justify-between h-14 px-4">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {showMenu && <AdminMenu />}
          {showBack && (
            <button
              onClick={handleBack}
              className={`p-2 -ml-2 rounded-full transition-colors ${theme.headerHover}`}
              aria-label="Zurück"
            >
              <svg className={`w-6 h-6 ${theme.headerIcon}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <h1 className={`text-lg font-semibold truncate ${theme.headerText}`}>
            {title}
          </h1>
        </div>
        {rightAction && (
          <div className="flex-shrink-0 ml-4">
            {rightAction}
          </div>
        )}
      </div>
    </header>
  );
}
