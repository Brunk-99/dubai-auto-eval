export default function FloatingButton({ onClick, children, className = '' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        fixed right-6
        w-14 h-14
        bg-blue-600 text-white
        rounded-full shadow-lg
        flex items-center justify-center
        hover:bg-blue-700 active:bg-blue-800
        active:scale-95
        transition-all
        z-50
        ${className}
      `}
      style={{ bottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))' }}
    >
      {children}
    </button>
  );
}
