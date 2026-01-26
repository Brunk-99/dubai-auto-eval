import { useNavigate } from 'react-router-dom';
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

  const handleBack = () => {
    if (backTo) {
      navigate(backTo);
    } else {
      navigate(-1);
    }
  };

  return (
    <header className={`sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-gray-100 safe-area-top ${className}`}>
      <div className="flex items-center justify-between h-14 px-4">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {showMenu && <AdminMenu />}
          {showBack && (
            <button
              onClick={handleBack}
              className="p-2 -ml-2 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors"
              aria-label="Zurück"
            >
              <svg className="w-6 h-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <h1 className="text-lg font-semibold text-gray-900 truncate">
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
