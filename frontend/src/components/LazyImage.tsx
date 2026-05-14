import { useEffect, useRef, useState } from 'react';

type LazyImageProps = {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  eager?: boolean;
  sizes?: string;
};

const toModernSource = (src: string, extension: 'avif' | 'webp') => {
  if (!src || /^(data:|https?:\/\/)/.test(src)) return '';
  if (!/\.(jpe?g|png)$/i.test(src)) return '';
  return src.replace(/\.(jpe?g|png)$/i, `.${extension}`);
};

const LazyImage = ({ src, alt, className = '', width, height, eager = false, sizes }: LazyImageProps) => {
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [isVisible, setIsVisible] = useState(eager);

  useEffect(() => {
    if (eager || isVisible) return;

    const node = imageRef.current;
    if (!node || !('IntersectionObserver' in window)) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '320px 0px' }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [eager, isVisible]);

  const webpSrc = toModernSource(src, 'webp');
  const avifSrc = toModernSource(src, 'avif');
  const imageSrc = isVisible ? src : undefined;

  return (
    <picture>
      {isVisible && avifSrc && <source srcSet={avifSrc} type="image/avif" sizes={sizes} />}
      {isVisible && webpSrc && <source srcSet={webpSrc} type="image/webp" sizes={sizes} />}
      <img
        ref={imageRef}
        src={imageSrc}
        alt={alt}
        width={width}
        height={height}
        loading={eager ? 'eager' : 'lazy'}
        decoding={eager ? 'sync' : 'async'}
        fetchPriority={eager ? 'high' : 'auto'}
        className={className}
      />
    </picture>
  );
};

export default LazyImage;
