import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getBannerImageUrl } from '../services/banner';

type Banner = {
  id: string;
  image: string;
  link?: string | null;
};

const BannerCarousel = ({ banners }: { banners: Banner[] }) => {
  const [activeIndex, setActiveIndex] = useState(0);

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

  const content = (
    <div className="relative h-[220px] w-full overflow-hidden rounded-2xl bg-slate-900 shadow-sm sm:h-[320px] md:h-[420px] lg:h-[460px]">
      <img
        src={getBannerImageUrl(activeBanner.image)}
        alt="Homepage banner"
        className="h-full w-full object-cover"
      />
    </div>
  );

  return (
    <section className="w-full px-3 py-4 sm:px-5 sm:py-6 lg:px-8">
      <div className="w-full">
        <div className="relative w-full">
          {activeBanner.link ? (
            <Link to={activeBanner.link} aria-label="Open banner">
              {content}
            </Link>
          ) : content}

          {banners.length > 1 && (
            <>
              <button
                type="button"
                onClick={goToPrevious}
                aria-label="Previous banner"
                className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-900 shadow transition hover:bg-white sm:left-5 sm:h-10 sm:w-10"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={goToNext}
                aria-label="Next banner"
                className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-900 shadow transition hover:bg-white sm:right-5 sm:h-10 sm:w-10"
              >
                ›
              </button>
              <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
                {banners.map((banner, index) => (
                  <button
                    key={banner.id}
                    type="button"
                    onClick={() => setActiveIndex(index)}
                    aria-label={`Show banner ${index + 1}`}
                    className={`h-2.5 rounded-full transition-all ${activeIndex === index ? 'w-8 bg-white' : 'w-2.5 bg-white/60 hover:bg-white/80'}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
};

export default BannerCarousel;
