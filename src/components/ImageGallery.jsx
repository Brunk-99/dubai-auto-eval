import { useState, useRef, useEffect } from 'react';

// Inline SVG Icons
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

export default function ImageGallery({ photos, onPhotoClick, className = '' }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const containerRef = useRef(null);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  // Reset index when photos change
  useEffect(() => {
    setCurrentIndex(0);
  }, [photos?.length]);

  if (!photos || photos.length === 0) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 rounded-xl aspect-video ${className}`}>
        <span className="text-gray-400">Keine Fotos</span>
      </div>
    );
  }

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current;
    const threshold = 50;

    if (diff > threshold && currentIndex < photos.length - 1) {
      // Swipe left - next
      setCurrentIndex(currentIndex + 1);
    } else if (diff < -threshold && currentIndex > 0) {
      // Swipe right - previous
      setCurrentIndex(currentIndex - 1);
    }
  };

  const goToPrevious = (e) => {
    e.stopPropagation();
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const goToNext = (e) => {
    e.stopPropagation();
    if (currentIndex < photos.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleClick = () => {
    if (onPhotoClick) {
      onPhotoClick(currentIndex);
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* Main Image Container */}
      <div
        ref={containerRef}
        className="relative aspect-[4/3] bg-gray-900 rounded-xl overflow-hidden cursor-pointer"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleClick}
      >
        <img
          src={photos[currentIndex]?.data}
          alt=""
          className="w-full h-full object-contain"
          draggable={false}
        />

        {/* Navigation Arrows (Desktop) */}
        {photos.length > 1 && (
          <>
            <button
              onClick={goToPrevious}
              className={`absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 flex items-center justify-center text-white transition-opacity ${
                currentIndex === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-black/70'
              }`}
              disabled={currentIndex === 0}
            >
              <ChevronLeftIcon className="w-6 h-6" />
            </button>
            <button
              onClick={goToNext}
              className={`absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 flex items-center justify-center text-white transition-opacity ${
                currentIndex === photos.length - 1 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-black/70'
              }`}
              disabled={currentIndex === photos.length - 1}
            >
              <ChevronRightIcon className="w-6 h-6" />
            </button>
          </>
        )}

        {/* Photo Counter */}
        {photos.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/60 text-white text-sm font-medium">
            {currentIndex + 1} / {photos.length}
          </div>
        )}
      </div>

      {/* Thumbnail Strip */}
      {photos.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {photos.map((photo, index) => (
            <button
              key={photo.id || index}
              onClick={() => setCurrentIndex(index)}
              className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                index === currentIndex
                  ? 'border-blue-500 ring-2 ring-blue-500/30'
                  : 'border-transparent opacity-60 hover:opacity-100'
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
      )}
    </div>
  );
}
