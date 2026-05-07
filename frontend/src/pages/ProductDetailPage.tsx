import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { addCartItem } from '../services/cart';
import { addWishlistItem } from '../services/wishlist';
import { createRazorpayOrder } from '../services/payment';
import { fetchProductById, getProductImageUrl, fetchProducts } from '../services/product';
import ProductCard from '../components/ProductCard';
import { ProductPrice, getEffectivePrice } from '../utils/pricing';

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, any>) => {
      open: () => void;
      on: (event: string, callback: (response: any) => void) => void;
    };
  }
}

const loadRazorpayScript = () => {
  return new Promise<boolean>((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

const ProductDetailPage = () => {
  const { id } = useParams();
  const [product, setProduct] = useState<any>(null);
  const [recommendedProducts, setRecommendedProducts] = useState<any[]>([]);
  const [size, setSize] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [paymentLoading, setPaymentLoading] = useState(false);
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  useEffect(() => {
    if (!id) return;

    fetchProductById(id)
      .then((data) => {
        setProduct(data);
        setSize(data.sizes?.[0] || '');
        
        // Fetch recommended products from same category
        return fetchProducts({ category: data.category });
      })
      .then((products) => {
        // Filter out current product and limit to 8
        const related = products.filter((p: any) => p.id !== id).slice(0, 8);
        setRecommendedProducts(related);
      })
      .catch(() => setError('Product could not be loaded.'));
  }, [id]);

  if (!product) {
    return <p className="mx-auto max-w-6xl px-6 py-16 text-slate-500">Loading product...</p>;
  }

  const imageUrl = getProductImageUrl(product.images?.[selectedImageIndex] || product.images);
  const inStock = Number(product.stock) > 0;
  const totalAmount = Math.round(getEffectivePrice(product) * quantity * 100);

  const requireLogin = () => {
    navigate('/login', { state: { from: { pathname: `/product/${product.id}` } } });
  };

  const handleAddToCart = async () => {
    setMessage('');
    setError('');

    if (!isAuthenticated) {
      requireLogin();
      return;
    }

    try {
      await addCartItem(product.id, quantity);
      setMessage('Product added to cart.');
    } catch (cartError: any) {
      if (cartError.response?.status === 401) {
        requireLogin();
        return;
      }
      setError(cartError.response?.data?.message || 'Could not add product to cart.');
    }
  };

  const handleBuyNow = async () => {
    setMessage('');
    setError('');

    if (!isAuthenticated) {
      requireLogin();
      return;
    }

    setPaymentLoading(true);
    try {
      await addCartItem(product.id, quantity);
      navigate('/cart');
    } catch (cartError: any) {
      if (cartError.response?.status === 401) {
        requireLogin();
        return;
      }
      setError(cartError.response?.data?.message || 'Could not add product to cart.');
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleAddToWishlist = async () => {
    setMessage('');
    setError('');

    if (!isAuthenticated) {
      requireLogin();
      return;
    }

    try {
      await addWishlistItem(product.id);
      setMessage('Added to wishlist.');
    } catch (wishlistError: any) {
      if (wishlistError.response?.status === 401) {
        requireLogin();
        return;
      }
      setError(wishlistError.response?.data?.message || 'Could not add product to wishlist.');
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 sm:py-12">
      <div className="grid gap-6 sm:gap-8 md:gap-10 rounded-2xl sm:rounded-3xl border border-slate-200 bg-white p-4 sm:p-6 md:p-8 shadow-sm lg:grid-cols-[1.05fr_0.95fr]">
        <div className="order-1 lg:order-none">
          <div className="overflow-hidden rounded-2xl sm:rounded-3xl bg-slate-100">
            <img src={imageUrl} alt={product.name} className="h-full min-h-[280px] sm:min-h-[360px] w-full object-cover" />
          </div>
          {product.images?.length > 1 && (
            <div className="mt-3 grid grid-cols-4 gap-2">
              {product.images.map((img: string, index: number) => (
                <button
                  key={img}
                  type="button"
                  onClick={() => setSelectedImageIndex(index)}
                  className={`overflow-hidden rounded-2xl border transition ${selectedImageIndex === index ? 'border-orange-500 ring-1 ring-orange-200' : 'border-slate-200'}`}
                >
                  <img src={getProductImageUrl(img)} alt={`${product.name} ${index + 1}`} className="h-20 w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <section className="flex flex-col justify-center">
          <p className="text-xs sm:text-sm uppercase tracking-[0.3em] text-orange-500">{product.category}</p>
          <h1 className="mt-2 sm:mt-3 text-2xl sm:text-3xl md:text-4xl font-semibold text-slate-900">{product.name}</h1>
          <div className="mt-3 sm:mt-4">
            <ProductPrice product={product} size="lg" />
          </div>
          <p className="mt-4 sm:mt-6 text-sm sm:text-base leading-6 sm:leading-8 text-slate-700">{product.description || 'No description available.'}</p>

          <div className="mt-4 sm:mt-6 grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-2 md:grid-cols-2">
            <div>
              <label className="text-xs sm:text-sm font-semibold text-slate-700">Available sizes</label>
              <select value={size} onChange={(event) => setSize(event.target.value)} className="mt-2 w-full p-2 sm:p-3 border border-slate-300 rounded-lg text-sm">
                {(product.sizes || []).map((option: string) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs sm:text-sm font-semibold text-slate-700">Quantity</label>
              <input
                type="number"
                min={1}
                max={Math.max(product.stock, 1)}
                value={quantity}
                onChange={(event) => setQuantity(Math.max(1, Number(event.target.value)))}
                className="mt-2 w-full p-2 sm:p-3 border border-slate-300 rounded-lg text-sm"
              />
            </div>
          </div>

          <p className={`mt-4 sm:mt-5 text-xs sm:text-sm font-semibold ${inStock ? 'text-green-700' : 'text-red-700'}`}>
            {inStock ? `${product.stock} in stock` : 'Out of stock'}
          </p>

          {message && <p className="mt-4 sm:mt-5 rounded-2xl bg-green-100 px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-green-700">{message}</p>}
          {error && <p className="mt-4 sm:mt-5 rounded-2xl bg-red-100 px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-red-700">{error}</p>}

          <div className="mt-6 grid gap-2 sm:gap-3 grid-cols-1 sm:grid-cols-3">
            <button
              onClick={handleAddToCart}
              disabled={!inStock}
              className="rounded-full bg-orange-600 px-4 sm:px-5 py-3 sm:py-4 text-xs sm:text-sm font-semibold text-white shadow hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60 transition w-full"
            >
              Add to Cart
            </button>
            <button
              onClick={handleBuyNow}
              disabled={!inStock || paymentLoading}
              className="rounded-full bg-slate-900 px-4 sm:px-5 py-3 sm:py-4 text-xs sm:text-sm font-semibold text-white shadow hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 transition w-full"
            >
              {paymentLoading ? 'Opening...' : 'Buy Now'}
            </button>
            <button
              onClick={handleAddToWishlist}
              className="rounded-full border border-slate-300 bg-white px-4 sm:px-5 py-3 sm:py-4 text-xs sm:text-sm font-semibold text-slate-900 shadow hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 transition w-full"
            >
              Wishlist
            </button>
          </div>
        </section>
      </div>

      {/* Recommended Products Section */}
      {recommendedProducts.length > 0 && (
        <section className="mt-12 sm:mt-16">
          <div className="mb-8">
            <p className="text-sm uppercase tracking-[0.3em] text-orange-500">Explore more</p>
            <h2 className="mt-2 text-2xl sm:text-3xl md:text-4xl font-semibold text-slate-900">
              Recommended from {product?.category}
            </h2>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="grid gap-3 sm:gap-4 md:gap-6 grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
          >
            {recommendedProducts.map((recProduct) => (
              <ProductCard
                key={recProduct.id}
                id={recProduct.id}
                name={recProduct.name}
                price={recProduct.price}
                mrp={recProduct.mrp}
                offerPrice={recProduct.offerPrice}
                image={getProductImageUrl(recProduct.images)}
                category={recProduct.category}
              />
            ))}
          </motion.div>
        </section>
      )}
    </div>
  );
};

export default ProductDetailPage;
