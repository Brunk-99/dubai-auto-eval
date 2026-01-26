import { useTheme } from '../lib/theme.jsx';

export default function Card({
  children,
  className = '',
  onClick,
  padding = 'p-4',
  ...props
}) {
  const { theme, themeId } = useTheme();
  const isClickable = !!onClick;

  // Dynamic styles based on theme
  const bgClass = theme.cardBg;
  const borderClass = themeId === 'dark' ? 'border-gray-700' : 'border-gray-100';
  const hoverClass = themeId === 'dark' ? 'active:bg-gray-700' : 'active:bg-gray-50';

  return (
    <div
      onClick={onClick}
      className={`
        ${bgClass} rounded-2xl shadow-sm border ${borderClass}
        ${padding}
        ${isClickable ? `cursor-pointer ${hoverClass} transition-colors` : ''}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
}
