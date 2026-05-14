import { useEffect, useRef, useState } from 'react';
import { fetchProducts, getProductImageUrl } from '../services/product';
import { fetchCategories, getCategoryImageUrl } from '../services/category';
import ProductCard from '../components/ProductCard';
import CategoryCard from '../components/CategoryCard';
import ComboCard from '../components/ComboCard';
import LoadingSkeleton from '../components/LoadingSkeleton';
import Hero from '../components/Hero';
import BannerCarousel from '../components/BannerCarousel';
import { fetchBanners } from '../services/banner';
import { fetchCombos, getComboImageUrl } from '../services/combo';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import LazyImage from '../components/LazyImage';

const NEW_ARRIVALS_COUNT = 12;
const NEW_ARRIVALS_ROTATION_MS = 12000;
const ALL_PRODUCTS_CATEGORY = {
  value: 'all-products',
  label: 'All Products',
  image: '/images/site/category-all-products.jpg',
  to: '/products',
};

const shuffleProducts = (items: any[]) => {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }
  return shuffled;
};

const HomePage = () => {
  const trendingScrollRef = useRef<HTMLDivElement | null>(null);
  const comboScrollRef = useRef<HTMLDivElement | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [newArrivalProducts, setNewArrivalProducts] = useState<any[]>([]);
  const [trendingProducts, setTrendingProducts] = useState<any[]>([]);
  const [comboProducts, setComboProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [banners, setBanners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const categoryTiles = [ALL_PRODUCTS_CATEGORY, ...categories];

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const [allProducts, trending] = await Promise.all([
          fetchProducts({ page: 1, limit: 36 }),
          fetchProducts({ trending: 'true', page: 1, limit: 18 }),
        ]);
        setProducts(allProducts);
        setNewArrivalProducts(shuffleProducts(allProducts).slice(0, NEW_ARRIVALS_COUNT));
        setTrendingProducts(trending);
      } catch (error) {
        console.error('Failed to load home page products', error);
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, []);

  useEffect(() => {
    const loadCombos = async () => {
      try {
        const combos = await fetchCombos();
        setComboProducts(Array.isArray(combos) ? combos : []);
      } catch (error) {
        console.error('Failed to load combo products', error);
        setComboProducts([]);
      }
    };

    loadCombos();
  }, []);

  useEffect(() => {
    if (products.length <= NEW_ARRIVALS_COUNT) {
      setNewArrivalProducts(products);
      return;
    }

    const interval = window.setInterval(() => {
      setNewArrivalProducts(shuffleProducts(products).slice(0, NEW_ARRIVALS_COUNT));
    }, NEW_ARRIVALS_ROTATION_MS);

    return () => window.clearInterval(interval);
  }, [products]);

  useEffect(() => {
    if (trendingProducts.length <= 2) return;

    const interval = window.setInterval(() => {
      const container = trendingScrollRef.current;
      const firstCard = container?.querySelector<HTMLElement>('[data-trending-card]');
      if (!container || !firstCard) return;

      const gap = 12;
      const nextLeft = container.scrollLeft + firstCard.offsetWidth + gap;
      const reachedEnd = nextLeft >= container.scrollWidth - container.clientWidth - 4;

      container.scrollTo({
        left: reachedEnd ? 0 : nextLeft,
        behavior: 'smooth',
      });
    }, 2600);

    return () => window.clearInterval(interval);
  }, [trendingProducts.length]);

  useEffect(() => {
    if (comboProducts.length <= 1) return;

    const interval = window.setInterval(() => {
      const container = comboScrollRef.current;
      const firstCard = container?.querySelector<HTMLElement>('[data-combo-card]');
      if (!container || !firstCard) return;

      const gap = 12;
      const nextLeft = container.scrollLeft + firstCard.offsetWidth + gap;
      const reachedEnd = nextLeft >= container.scrollWidth - container.clientWidth - 4;

      container.scrollTo({
        left: reachedEnd ? 0 : nextLeft,
        behavior: 'smooth',
      });
    }, 2800);

    return () => window.clearInterval(interval);
  }, [comboProducts.length]);

  useEffect(() => {
    const loadBanners = async () => {
      try {
        const bannerData = await fetchBanners();
        setBanners(Array.isArray(bannerData) ? bannerData.slice(0, 3) : []);
      } catch (error) {
        console.error('Failed to load homepage banners', error);
        setBanners([]);
      }
    };

    loadBanners();
  }, []);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const categoryData = await fetchCategories();
        if (Array.isArray(categoryData) && categoryData.length > 0) {
          setCategories(categoryData);
        } else {
          setCategories([]);
        }
      } catch (error) {
        console.error('Failed to load categories', error);
        setCategories([]);
      }
    };

    loadCategories();
  }, []);

  return (
    <div>
      <Hero />

      {categories.length > 0 && (
        <section className="bg-[#ffffff] px-3 pb-3 pt-3 sm:hidden">
          <p className="mb-3 whitespace-nowrap border-b border-maroon/20 pb-2 text-center text-[clamp(10px,3.1vw,14px)] font-black uppercase tracking-[0.08em] text-slate-950">
            Your Style Destination Starts Here
          </p>
          <div className="flex flex-wrap justify-center gap-x-2 gap-y-3 pb-1">
            {categoryTiles.slice(0, 8).map((category) => (
              <Link key={category.value} to={category.to ?? `/products?category=${category.value}`} className="w-[calc((100%_-_1.5rem)/4)] min-w-0 text-center">
                <span className="mx-auto block aspect-square w-full overflow-hidden rounded-2xl bg-white shadow-md shadow-maroon/10">
                  <LazyImage src={getCategoryImageUrl(category.image)} alt={category.label} width={160} height={160} sizes="25vw" className="h-full w-full object-cover" />
                </span>
                <span className="mt-1.5 block truncate text-[11px] font-semibold leading-4 text-slate-900">{category.label}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <BannerCarousel banners={banners} />

      <section className="relative overflow-hidden bg-[linear-gradient(135deg,#7d0015_0%,#960019_48%,#5d0010_100%)] px-4 py-6 text-white sm:px-6 sm:py-14 md:py-20">
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-white/10 to-transparent" />
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[length:30px_30px] opacity-20" />
        <div className="relative max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="mx-auto mb-5 max-w-3xl text-center sm:mb-10 md:mb-12"
          >
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-white/80 sm:mb-3 sm:text-xs sm:tracking-[0.32em]">Fresh drops</p>
            <h2 className="text-2xl font-bold tracking-normal text-white sm:text-4xl md:text-5xl">New Arrivals</h2>
            <p className="mx-auto mt-2 max-w-2xl px-2 text-xs leading-5 text-slate-200 sm:mt-4 sm:text-base sm:leading-6 md:text-lg">
              A rotating edit of the latest styles, refreshed while you browse.
            </p>
          </motion.div>
          {loading ? <LoadingSkeleton /> : (
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="grid grid-cols-2 gap-2 rounded-2xl border border-white/25 bg-[#fff7ec]/95 p-2 shadow-2xl shadow-slate-950/25 sm:grid-cols-2 sm:gap-4 sm:rounded-3xl sm:p-4 md:grid-cols-3 md:gap-6 md:p-5"
            >
              {newArrivalProducts.map((product, index) => (
                <div key={product.id} className={index >= 8 ? 'hidden sm:block' : ''}>
                  <ProductCard id={product.id} name={product.name} price={product.price} mrp={product.mrp} offerPrice={product.offerPrice} image={getProductImageUrl(product.images)} category={product.category} variant="featured" />
                </div>
              ))}
            </motion.div>
          )}
          {!loading && newArrivalProducts.length > 0 && (
            <div className="mt-5 flex justify-center sm:mt-8">
              <Link
                to="/products"
                className="rounded-md border border-white/25 bg-white px-6 py-3 text-sm font-black text-maroon shadow-xl shadow-slate-950/20 transition hover:-translate-y-0.5 hover:bg-[#fff7ec] hover:shadow-2xl sm:px-8 sm:text-base"
              >
                Show All Products
              </Link>
            </div>
          )}
        </div>
      </section>

      <section className="hidden py-8 px-4 sm:block sm:py-12 sm:px-6 md:py-16 bg-accent">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-8 sm:mb-10 md:mb-12"
          >
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-primary mb-3 sm:mb-4">Shop by Category</h2>
            <p className="text-sm sm:text-base md:text-lg text-primary/70 max-w-2xl mx-auto px-2">
              Explore our curated collections designed for every occasion.
            </p>
          </motion.div>
          {categories.length > 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-4 md:gap-6"
            >
              {categoryTiles.map((category) => (
                <CategoryCard
                  key={category.value}
                  label={category.label}
                  value={category.value}
                  image={getCategoryImageUrl(category.image)}
                  to={category.to}
                />
              ))}
            </motion.div>
          ) : (
            <p className="text-center text-slate-500 text-sm sm:text-base">No categories are configured yet. Add categories from the admin panel.</p>
          )}
        </div>
      </section>

      <section className="bg-white px-4 py-10 sm:px-6 sm:py-14 md:py-16">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="mb-8 text-center sm:mb-10 md:mb-12"
          >
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.32em] text-primary/70">Hot picks</p>
            <h2 className="mb-3 text-3xl font-bold tracking-normal text-primary sm:text-4xl md:text-5xl">Trending Styles</h2>
            <p className="mx-auto max-w-2xl px-2 text-sm leading-6 text-slate-600 sm:text-base md:text-lg">
              What's hot right now in MBR Fashion Hub, all in one easy scroll.
            </p>
          </motion.div>

          {loading ? <LoadingSkeleton /> : trendingProducts.length > 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="overflow-hidden rounded-[1.75rem] border border-primary/10 bg-gradient-to-br from-white via-white to-soft/60 px-3 py-3 shadow-xl shadow-primary/5 sm:px-5 sm:py-6"
            >
              <div ref={trendingScrollRef} className="-mx-3 overflow-x-auto scroll-smooth px-3 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:-mx-5 sm:px-5">
                <div className="flex snap-x snap-mandatory gap-3 sm:gap-4 md:gap-5">
                  {trendingProducts.map((product) => (
                    <div key={product.id} data-trending-card className="w-[43vw] flex-none snap-start sm:w-[34vw] md:w-[25vw] lg:w-[20%] xl:w-[18%]">
                      <ProductCard
                        id={product.id}
                        name={product.name}
                        price={product.price}
                        mrp={product.mrp}
                        offerPrice={product.offerPrice}
                        image={getProductImageUrl(product.images)}
                        category={product.category}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          ) : (
            <p className="text-center text-slate-500">No trending styles are configured yet. Visit the admin panel to select trending products.</p>
          )}
        </div>
      </section>

      <section className="bg-slate-950 px-4 py-10 text-white sm:px-6 sm:py-14 md:py-16">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="mb-8 text-center sm:mb-10 md:mb-12"
          >
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.32em] text-white/80">Bundle deals</p>
            <h2 className="mb-3 text-3xl font-bold tracking-normal text-white sm:text-4xl md:text-5xl">Combo Offers</h2>
            <p className="mx-auto max-w-2xl px-2 text-sm leading-6 text-slate-300 sm:text-base md:text-lg">
              Handpicked sets with sharper pricing for complete looks.
            </p>
          </motion.div>

          {loading ? <LoadingSkeleton /> : comboProducts.length > 0 ? (
            <motion.div
              ref={comboScrollRef}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="-mx-4 overflow-x-auto scroll-smooth px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:-mx-6 sm:px-6"
            >
              <div className="flex snap-x snap-mandatory gap-3 sm:gap-5">
                {comboProducts.map((combo) => (
                  <div key={combo.id} data-combo-card className="w-[43vw] flex-none snap-start sm:w-[42vw] lg:w-[30%] xl:w-[24%]">
                    <ComboCard
                      name={combo.name}
                      description={combo.description}
                      mrp={combo.mrp}
                      offerPrice={combo.offerPrice}
                      image={getComboImageUrl(combo.image)}
                      stock={combo.stock}
                      link={`/combo/${combo.id}`}
                    />
                  </div>
                ))}
              </div>
            </motion.div>
          ) : (
            <p className="text-center text-slate-300">No combo offers are configured yet. Add combo products from the admin panel.</p>
          )}
        </div>
      </section>

      <section className="px-4 pb-6 pt-5 sm:px-6 sm:py-12 md:py-16 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-5 sm:mb-10"
          >
            <h2 className="text-xl sm:text-3xl md:text-4xl font-bold text-slate-900 mb-2 sm:mb-4">Our Stores</h2>
            <p className="text-xs leading-5 sm:text-base md:text-lg text-slate-600 max-w-2xl mx-auto px-2">
              Visit our flagship locations for a personalized shopping experience.
            </p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="grid grid-cols-2 gap-3 sm:gap-6 md:grid-cols-4 md:gap-8"
          >
            {[
              {
                title: 'Anakapalle Store',
                address: 'Near NTR Statue, Main Road, upstairs Cell Point, beside Panjab Handlums',
                image: '/images/site/store-anakapalle.jpg',
              },
              {
                title: 'Gajuwaka Store',
                address: 'Alpha Down, beside Ratna Vaari Vantilu, upstairs Juice Point',
                image: '/images/site/store-gajuwaka.jpg',
              },
              {
                title: 'Chodavaram Store',
                address: 'Upstairs New Ratnam Restaurant',
                image: '/images/site/store-chodavaram.jpg',
              },
              {
                title: 'Atchutapuram Store',
                address: 'Opp. SK Mart, upstairs Sri Sai Mobiles',
                image: '/images/site/store-atchutapuram.jpg',
              },
            ].map((store, index) => (
              <div key={store.title} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg sm:rounded-3xl">
                <div className="h-24 overflow-hidden sm:h-52">
                  <LazyImage src={store.image} alt={store.title} width={520} height={320} sizes="(min-width: 768px) 25vw, 50vw" className="h-full w-full object-cover transition-transform duration-500 hover:scale-105" />
                </div>
                <div className="p-2.5 sm:p-6">
                  <h3 className="text-sm font-semibold leading-5 text-slate-900 mb-1 sm:mb-3 sm:text-2xl">{store.title}</h3>
                  <p className="text-[10px] leading-4 text-slate-500 mb-2 sm:mb-4 sm:text-sm sm:leading-5">{store.address}</p>
                  <div className="rounded-xl bg-slate-100 p-2 text-[10px] leading-4 text-slate-600 sm:rounded-3xl sm:p-4 sm:text-sm sm:leading-5">
                    <p className="font-semibold text-slate-900">Store Hours</p>
                    <p>Open daily 10am - 9pm</p>
                  </div>
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
