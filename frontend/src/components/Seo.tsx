import { useEffect } from 'react';

type SeoProps = {
  title: string;
  description: string;
  canonical?: string;
  image?: string;
  type?: string;
};

const setMeta = (selector: string, attribute: 'content' | 'href', value: string) => {
  const element = document.head.querySelector(selector);
  if (element) element.setAttribute(attribute, value);
};

const Seo = ({ title, description, canonical, image = '/images/site/hero-fashion-store.webp', type = 'website' }: SeoProps) => {
  useEffect(() => {
    const absoluteUrl = canonical || window.location.href;
    const absoluteImage = new URL(image, window.location.origin).toString();

    document.title = title;
    setMeta('meta[name="description"]', 'content', description);
    setMeta('link[rel="canonical"]', 'href', absoluteUrl);
    setMeta('meta[property="og:title"]', 'content', title);
    setMeta('meta[property="og:description"]', 'content', description);
    setMeta('meta[property="og:url"]', 'content', absoluteUrl);
    setMeta('meta[property="og:image"]', 'content', absoluteImage);
    setMeta('meta[property="og:type"]', 'content', type);
    setMeta('meta[name="twitter:title"]', 'content', title);
    setMeta('meta[name="twitter:description"]', 'content', description);
    setMeta('meta[name="twitter:image"]', 'content', absoluteImage);
  }, [canonical, description, image, title, type]);

  return null;
};

export default Seo;
