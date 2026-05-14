import { API_ORIGIN } from './api';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1']);

export const resolveImageUrl = (image: string | undefined, placeholderImage: string) => {
  const rawImage = image?.trim();

  if (!rawImage) {
    return placeholderImage;
  }

  if (/^(data:|blob:)/i.test(rawImage)) {
    return rawImage;
  }

  const normalizedImage = rawImage.replace(/\\/g, '/');

  if (/^https?:\/\//i.test(normalizedImage)) {
    try {
      const imageUrl = new URL(normalizedImage);
      if (LOCAL_HOSTS.has(imageUrl.hostname)) {
        if (!API_ORIGIN) {
          return `${imageUrl.pathname}${imageUrl.search}${imageUrl.hash}`;
        }

        const apiOrigin = new URL(API_ORIGIN);
        imageUrl.protocol = apiOrigin.protocol;
        imageUrl.hostname = apiOrigin.hostname;
        imageUrl.port = apiOrigin.port;
        return imageUrl.toString();
      }
    } catch {
      return placeholderImage;
    }

    return normalizedImage;
  }

  if (normalizedImage.startsWith('/uploads/')) {
    return `${API_ORIGIN}${normalizedImage}`;
  }

  if (normalizedImage.startsWith('uploads/')) {
    return `${API_ORIGIN}/${normalizedImage}`;
  }

  if (normalizedImage.startsWith('/')) {
    return normalizedImage;
  }

  return `${API_ORIGIN}/uploads/${normalizedImage}`;
};
