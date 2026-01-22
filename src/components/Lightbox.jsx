import { useState, useEffect, useRef, useCallback } from 'react';

// Inline SVG Icons
const XMarkIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const ChevronLeftIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
  </svg>
);

const ChevronRightIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
  </svg>
);

const TrashIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
  </svg>
);

export default function Lightbox({
  photos,
  initialIndex = 0,
  isOpen,
  onClose,
  onDelete,
  canDelete = false
}) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const lastTap = useRef(0);
  const dragStart = useRef({ x: 0, y: 0 });

  // Reset when opening
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
      setScale(1);
      setPosition({ x: 0, y: 0 });
    }
  }, [isOpen, initialIndex]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      switch (e.key) {
        case 'ArrowLeft':
          goToPrevious();
          break;
        case 'ArrowRight':
          goToNext();
          break;
        case 'Escape':
          onClose();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentIndex, photos?.length]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const goToPrevious = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      resetZoom();
    }
  }, [currentIndex]);

  const goToNext = useCallback(() => {
    if (photos && currentIndex < photos.length - 1) {
      setCurrentIndex(currentIndex + 1);
      resetZoom();
    }
  }, [currentIndex, photos?.length]);

  const resetZoom = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleTouchStart = (e) => {
    if (scale > 1) return; // Disable swipe when zoomed
    touchStartX.current = e.touches[0].clientX;

    // Double tap detection
    const now = Date.now();
    if (now - lastTap.current < 300) {
      handleDoubleTap();
    }
    lastTap.current = now;
  };

  const handleTouchMove = (e) => {
    if (scale > 1) return;
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (scale > 1) return;

    const diff = touchStartX.current - touchEndX.current;
    const threshold = 50;

    if (diff > threshold && currentIndex < photos.length - 1) {
      goToNext();
    } else if (diff < -threshold && currentIndex > 0) {
      goToPrevious();
    }
  };

  const handleDoubleTap = () => {
    if (scale > 1) {
      resetZoom();
    } else {
      setScale(2);
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleDelete = () => {
    if (onDelete && photos[currentIndex]) {
      onDelete(photos[currentIndex].id);
      if (currentIndex >= photos.length - 1 && currentIndex > 0) {
        setCurrentIndex(currentIndex - 1);
      }
    }
  };

  if (!isOpen || !photos || photos.length === 0) return null;

  const currentPhoto = photos[currentIndex];

  return (
    <div
      className="fixed inset-0 z-50 bg-black flex flex-col"
      onClick={handleBackdropClick}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 text-white">
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
        >
          <XMarkIcon className="w-6 h-6" />
        </button>

        <div className="text-sm font-medium">
          {currentIndex + 1} / {photos.length}
        </div>

        {canDelete && (
          <button
            onClick={handleDelete}
            className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center hover:bg-red-500/40 transition-colors text-red-400"
          >
            <TrashIcon className="w-5 h-5" />
          </button>
        )}
        {!canDelete && <div className="w-10" />}
      </div>

      {/* Image Container */}
      <div
        className="flex-1 flex items-center justify-center overflow-hidden relative"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <img
          src={currentPhoto?.data}
          alt=""
          className="max-w-full max-h-full object-contain select-none transition-transform duration-200"
          style={{
            transform: `scale(${scale}) translate(${position.x}px, ${position.y}px)`,
          }}
          draggable={false}
          onDoubleClick={handleDoubleTap}
        />

        {/* Desktop Navigation Arrows */}
        {photos.length > 1 && (
          <>
            <button
              onClick={goToPrevious}
              className={`absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white transition-all hidden md:flex ${
                currentIndex === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-white/20'
              }`}
              disabled={currentIndex === 0}
            >
              <ChevronLeftIcon className="w-8 h-8" />
            </button>
            <button
              onClick={goToNext}
              className={`absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white transition-all hidden md:flex ${
                currentIndex === photos.length - 1 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-white/20'
              }`}
              disabled={currentIndex === photos.length - 1}
            >
              <ChevronRightIcon className="w-8 h-8" />
            </button>
          </>
        )}
      </div>

      {/* Bottom Thumbnail Strip */}
      {photos.length > 1 && (
        <div className="p-4 bg-black/50">
          <div className="flex gap-2 justify-center overflow-x-auto pb-safe">
            {photos.map((photo, index) => (
              <button
                key={photo.id || index}
                onClick={() => {
                  setCurrentIndex(index);
                  resetZoom();
                }}
                className={`flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition-all ${
                  index === currentIndex
                    ? 'border-white ring-2 ring-white/30'
                    : 'border-transparent opacity-50 hover:opacity-100'
                }`}
              >
                <img
                  src={photo.data}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Swipe hint for mobile */}
      {photos.length > 1 && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 text-white/50 text-xs md:hidden">
          Wischen zum Navigieren • Doppeltippen zum Zoomen
        </div>
      )}
    </div>
  );
}
