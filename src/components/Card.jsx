export default function Card({
  children,
  className = '',
  onClick,
  padding = 'p-4',
  ...props
}) {
  const isClickable = !!onClick;

  return (
    <div
      onClick={onClick}
      className={`
        bg-white rounded-2xl shadow-sm border border-gray-100
        ${padding}
        ${isClickable ? 'cursor-pointer active:bg-gray-50 transition-colors' : ''}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
}
