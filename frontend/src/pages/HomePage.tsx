import { useEffect, useState } from 'react';
import { fetchProducts, getProductImageUrl } from '../services/product';
import { fetchCategories, getCategoryImageUrl } from '../services/category';
import ProductCard from '../components/ProductCard';
import CategoryCard from '../components/CategoryCard';
import LoadingSkeleton from '../components/LoadingSkeleton';
import Hero from '../components/Hero';
import BannerCarousel from '../components/BannerCarousel';
import { fetchBanners } from '../services/banner';
import { motion } from 'framer-motion';

const NEW_ARRIVALS_COUNT = 8;
const NEW_ARRIVALS_ROTATION_MS = 12000;

const shuffleProducts = (items: any[]) => {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }
  return shuffled;
};

const HomePage = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [newArrivalProducts, setNewArrivalProducts] = useState<any[]>([]);
  const [trendingProducts, setTrendingProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [banners, setBanners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const [allProducts, trending] = await Promise.all([
          fetchProducts(),
          fetchProducts({ trending: 'true' }),
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
      <BannerCarousel banners={banners} />

      <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 px-4 py-10 text-white sm:px-6 sm:py-14 md:py-20">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 20% 20%, #fb923c 0, transparent 28%), radial-gradient(circle at 80% 0%, #14b8a6 0, transparent 24%)' }} />
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[length:28px_28px] opacity-20" />
        <div className="relative max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="mx-auto mb-8 max-w-3xl text-center sm:mb-10 md:mb-12"
          >
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.32em] text-orange-200">Fresh drops</p>
            <h2 className="text-3xl font-bold tracking-normal text-white sm:text-4xl md:text-5xl">New Arrivals</h2>
            <p className="mx-auto mt-4 max-w-2xl px-2 text-sm leading-6 text-slate-200 sm:text-base md:text-lg">
              A rotating edit of the latest styles, refreshed while you browse.
            </p>
          </motion.div>
          {loading ? <LoadingSkeleton /> : (
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="grid grid-cols-2 gap-3 rounded-3xl border border-white/10 bg-white/10 p-3 shadow-2xl shadow-slate-950/30 backdrop-blur sm:grid-cols-2 sm:gap-4 sm:p-4 md:grid-cols-3 md:gap-6 md:p-5 lg:grid-cols-4"
            >
              {newArrivalProducts.map((product) => (
                <ProductCard key={product.id} id={product.id} name={product.name} price={product.price} mrp={product.mrp} offerPrice={product.offerPrice} image={getProductImageUrl(product.images)} category={product.category} variant="featured" />
              ))}
            </motion.div>
          )}
        </div>
      </section>

      <section className="py-8 px-4 sm:py-12 sm:px-6 md:py-16 bg-accent">
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
              className="grid gap-3 sm:gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3"
            >
              {categories.map((category) => (
                <CategoryCard
                  key={category.value}
                  label={category.label}
                  value={category.value}
                  image={getCategoryImageUrl(category.image)}
                />
              ))}
            </motion.div>
          ) : (
            <p className="text-center text-slate-500 text-sm sm:text-base">No categories are configured yet. Add categories from the admin panel.</p>
          )}
        </div>
      </section>

      <section className="py-8 px-4 sm:py-12 sm:px-6 md:py-16 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-8 sm:mb-10"
          >
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 mb-3 sm:mb-4">Our Stores</h2>
            <p className="text-sm sm:text-base md:text-lg text-slate-600 max-w-2xl mx-auto px-2">
              Visit our flagship locations for a personalized shopping experience.
            </p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="grid gap-4 sm:gap-6 md:gap-8 grid-cols-1 sm:grid-cols-2 md:grid-cols-3"
          >
            {[
              {
                title: 'Downtown Boutique',
                address: '123 Fashion Ave, New York, NY',
                image: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80',
              },
              {
                title: 'City Center Showroom',
                address: '456 Style St, Chicago, IL',
                image: 'https://images.unsplash.com/photo-1494526585095-c41746248156?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80',
              },
              {
                title: 'Coastal Collection',
                address: '789 Beach Rd, Los Angeles, CA',
                image: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80',
              },
            ].map((store) => (
              <div key={store.title} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
                <div className="h-52 overflow-hidden">
                  <img src={store.image} alt={store.title} className="h-full w-full object-cover transition-transform duration-500 hover:scale-105" />
                </div>
                <div className="p-6">
                  <h3 className="text-2xl font-semibold text-slate-900 mb-3">{store.title}</h3>
                  <p className="text-sm text-slate-500 mb-4">{store.address}</p>
                  <div className="rounded-3xl bg-slate-100 p-4 text-sm text-slate-600">
                    <p className="font-semibold text-slate-900">Store Hours</p>
                    <p>Open daily 10am - 9pm</p>
                  </div>
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      <section className="py-16 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl font-bold text-primary mb-4">Trending Styles</h2>
            <p className="text-lg text-accent max-w-2xl mx-auto">
              What's hot right now in MBR Fashion Hub.
            </p>
          </motion.div>
          {loading ? <LoadingSkeleton /> : trendingProducts.length > 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="grid gap-6 md:grid-cols-2 lg:grid-cols-4"
            >
              {trendingProducts.slice(0, 8).map((product) => (
                <ProductCard key={product.id} id={product.id} name={product.name} price={product.price} mrp={product.mrp} offerPrice={product.offerPrice} image={getProductImageUrl(product.images)} category={product.category} />
              ))}
            </motion.div>
          ) : (
            <p className="text-center text-slate-500">No trending styles are configured yet. Visit the admin panel to select trending products.</p>
          )}
        </div>
      </section>
    </div>
  );
};

export default HomePage;
