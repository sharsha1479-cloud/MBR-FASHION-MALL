import { useEffect, useState } from 'react';
import { fetchProducts, getProductImageUrl } from '../services/product';
import ProductCard from '../components/ProductCard';
import CategoryCard from '../components/CategoryCard';
import LoadingSkeleton from '../components/LoadingSkeleton';
import Hero from '../components/Hero';
import { motion } from 'framer-motion';

const categories = [
  { label: 'Shirts', value: 'shirts', image: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80' },
  { label: 'T-Shirts', value: 't-shirts', image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80' },
  { label: 'Jeans', value: 'jeans', image: 'https://images.unsplash.com/photo-1542272604-787c3835535d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80' },
];

const HomePage = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts().then((data) => {
      setProducts(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  return (
    <div>
      <Hero />

      <section className="py-16 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl font-bold text-primary mb-4">New Arrivals</h2>
            <p className="text-lg text-accent max-w-2xl mx-auto">
              Discover the latest in men's fashion, crafted for the modern gentleman.
            </p>
          </motion.div>
          {loading ? <LoadingSkeleton /> : (
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="grid gap-6 md:grid-cols-2 lg:grid-cols-4"
            >
              {products.slice(0, 8).map((product) => (
                <ProductCard key={product.id} id={product.id} name={product.name} price={product.price} image={getProductImageUrl(product.images?.[0])} category={product.category} />
              ))}
            </motion.div>
          )}
        </div>
      </section>

      <section className="py-16 px-6 bg-accent">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl font-bold text-primary mb-4">Shop by Category</h2>
            <p className="text-lg text-primary/70 max-w-2xl mx-auto">
              Explore our curated collections designed for every occasion.
            </p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="grid gap-6 md:grid-cols-3"
          >
            {categories.map((category) => (
              <CategoryCard key={category.value} label={category.label} value={category.value} image={category.image} />
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
              What's hot right now in men's fashion.
            </p>
          </motion.div>
          {loading ? <LoadingSkeleton /> : (
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="grid gap-6 md:grid-cols-2 lg:grid-cols-4"
            >
              {products.slice(8, 16).map((product) => (
                <ProductCard key={product.id} id={product.id} name={product.name} price={product.price} image={getProductImageUrl(product.images?.[0])} category={product.category} />
              ))}
            </motion.div>
          )}
        </div>
      </section>
    </div>
  );
};

export default HomePage;
