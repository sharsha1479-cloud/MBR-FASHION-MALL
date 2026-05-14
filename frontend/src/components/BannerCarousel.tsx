import { useEffect, useRef, useState, type MouseEvent, type PointerEvent } from 'react';
import { Link } from 'react-router-dom';
import { BANNER_PLACEHOLDER_IMAGE, getBannerImageUrl } from '../services/banner';

type Banner = {
  id: string;
  image: string;
  link?: string | null;
};

const BannerCarousel = ({ banners }: { banners: Banner[] }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const pointerStartX = useRef<number | null>(null);
  const pointerEndX = useRef<number | null>(null);
  const didSwipe = useRef(false);

  useEffect(() => {
    if (banners.length <= 1) return;

    const interval = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % banners.length);
    }, 5000);

    return () => window.clearInterval(interval);
  }, [banners.length]);

  if (banners.length === 0) return null;

  const activeBanner = banners[activeIndex] || banners[0];

  const goToPrevious = () => {
    setActiveIndex((current) => (current - 1 + banners.length) % banners.length);
  };

  const goToNext = () => {
    setActiveIndex((current) => (current + 1) % banners.length);
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (banners.length <= 1) return;
    pointerStartX.current = event.clientX;
    pointerEndX.current = event.clientX;
    didSwipe.current = false;
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (pointerStartX.current === null) return;
    pointerEndX.current = event.clientX;
  };

  const handlePointerUp = () => {
    if (pointerStartX.current === null || pointerEndX.current === null) return;

    const swipeDistance = pointerEndX.current - pointerStartX.current;
    const swipeThreshold = 45;

    if (Math.abs(swipeDistance) >= swipeThreshold) {
      didSwipe.current = true;
      if (swipeDistance > 0) {
        goToPrevious();
      } else {
        goToNext();
      }
    }

    pointerStartX.current = null;
    pointerEndX.current = null;
  };

  const handleClickCapture = (event: MouseEvent<HTMLDivElement>) => {
    if (!didSwipe.current) return;
    event.preventDefault();
    event.stopPropagation();
    didSwipe.current = false;
  };

  const content = (
    <div className="relative h-[150px] w-full overflow-hidden rounded-xl border border-primary/10 bg-slate-900 shadow-lg shadow-primary/10 sm:h-[260px] sm:rounded-2xl md:h-[360px] lg:h-[420px]">
      <img
        src={getBannerImageUrl(activeBanner.image)}
        alt="Homepage banner"
        onError={(event) => {
          event.currentTarget.onerror = null;
          event.currentTarget.src = BANNER_PLACEHOLDER_IMAGE;
        }}
        className="h-full w-full object-cover"
        draggable={false}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-primary/10 sm:hidden" />
    </div>
  );

  return (
    <section className="w-full px-3 py-2 sm:px-5 sm:py-6 lg:px-8">
      <div className="w-full">
        <div
          className="relative w-full touch-pan-y select-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onClickCapture={handleClickCapture}
        >
          {activeBanner.link ? (
            <Link to={activeBanner.link} aria-label="Open banner">
              {content}
            </Link>
          ) : content}

          {banners.length > 1 && (
            <div className="pointer-events-none absolute bottom-3 left-0 right-0 flex justify-center gap-2 sm:bottom-4">
              {banners.map((banner, index) => (
                <span
                  key={banner.id}
                  className={`h-2.5 rounded-full transition-all ${activeIndex === index ? 'w-8 bg-white' : 'w-2.5 bg-white/60'}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default BannerCarousel;
