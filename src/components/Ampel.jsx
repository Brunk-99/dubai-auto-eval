const colors = {
  green: {
    bg: 'bg-green-500',
    glow: 'shadow-green-500/50',
    text: 'text-green-700',
  },
  yellow: {
    bg: 'bg-yellow-500',
    glow: 'shadow-yellow-500/50',
    text: 'text-yellow-700',
  },
  red: {
    bg: 'bg-red-500',
    glow: 'shadow-red-500/50',
    text: 'text-red-700',
  },
};

export default function Ampel({ status, size = 'md', showLabel = false }) {
  const { color, label, reason } = status || { color: 'yellow', label: 'Unbekannt' };
  const colorClasses = colors[color] || colors.yellow;

  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-6 h-6',
  };

  return (
    <div className="flex items-center gap-2">
      <div
        className={`
          ${sizeClasses[size]}
          ${colorClasses.bg}
          rounded-full
          shadow-lg ${colorClasses.glow}
        `}
        title={reason}
      />
      {showLabel && (
        <span className={`text-sm font-medium ${colorClasses.text}`}>
          {label}
        </span>
      )}
    </div>
  );
}
