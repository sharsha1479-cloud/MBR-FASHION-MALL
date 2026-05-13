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
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
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
  const productImages = Array.isArray(product.images) && product.images.length > 0 ? product.images : [product.images];
  const hasMultipleImages = productImages.length > 1;
  const inStock = Number(product.stock) > 0;
  const totalAmount = Math.round(getEffectivePrice(product) * quantity * 100);

  const showPreviousImage = () => {
    if (!hasMultipleImages) return;
    setSelectedImageIndex((current) => (current === 0 ? productImages.length - 1 : current - 1));
  };

  const showNextImage = () => {
    if (!hasMultipleImages) return;
    setSelectedImageIndex((current) => (current === productImages.length - 1 ? 0 : current + 1));
  };

  const handleTouchEnd = (clientX: number) => {
    if (touchStartX === null) return;
    const distance = touchStartX - clientX;

    if (Math.abs(distance) > 40) {
      if (distance > 0) {
        showNextImage();
      } else {
        showPreviousImage();
      }
    }

    setTouchStartX(null);
  };

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
    <div className="mx-auto w-full max-w-6xl overflow-hidden px-3 py-6 sm:px-6 sm:py-12">
      <div className="grid min-w-0 gap-6 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:gap-8 sm:rounded-3xl sm:p-6 md:gap-10 md:p-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <div className="order-1 min-w-0 lg:order-none">
          <div
            className="relative aspect-[4/5] w-full max-w-full overflow-hidden rounded-2xl bg-slate-100 sm:aspect-square sm:rounded-3xl lg:aspect-[4/5]"
            onTouchStart={(event) => setTouchStartX(event.touches[0].clientX)}
            onTouchEnd={(event) => handleTouchEnd(event.changedTouches[0].clientX)}
          >
            <img src={imageUrl} alt={product.name} className="h-full w-full select-none object-cover" draggable={false} />
            {hasMultipleImages && (
              <>
                <button
                  type="button"
                  onClick={showPreviousImage}
                  aria-label="Previous product image"
                  className="absolute left-3 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/70 bg-white/90 text-slate-900 shadow-lg transition hover:bg-white sm:flex"
                >
                  <span aria-hidden="true" className="text-2xl leading-none">‹</span>
                </button>
                <button
                  type="button"
                  onClick={showNextImage}
                  aria-label="Next product image"
                  className="absolute right-3 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/70 bg-white/90 text-slate-900 shadow-lg transition hover:bg-white sm:flex"
                >
                  <span aria-hidden="true" className="text-2xl leading-none">›</span>
                </button>
                <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5 rounded-full bg-black/35 px-2.5 py-1.5 backdrop-blur">
                  {productImages.map((img: string, index: number) => (
                    <button
                      key={`${img}-dot`}
                      type="button"
                      onClick={() => setSelectedImageIndex(index)}
                      aria-label={`Show image ${index + 1}`}
                      className={`h-2 rounded-full border-0 p-0 shadow-none transition-all ${selectedImageIndex === index ? 'w-6 bg-white' : 'w-2 bg-white/55'}`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
          {hasMultipleImages && (
            <div className="mt-3 flex max-w-full gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {productImages.map((img: string, index: number) => (
                <button
                  key={img}
                  type="button"
                  onClick={() => setSelectedImageIndex(index)}
                  className={`h-20 w-20 shrink-0 overflow-hidden rounded-2xl border transition sm:h-24 sm:w-24 ${selectedImageIndex === index ? 'border-maroon ring-2 ring-maroon/20' : 'border-slate-200 opacity-75 hover:opacity-100'}`}
                >
                  <img src={getProductImageUrl(img)} alt={`${product.name} ${index + 1}`} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <section className="order-2 min-w-0 overflow-hidden break-words flex flex-col justify-center lg:order-none">
          <p className="text-xs uppercase tracking-[0.22em] text-maroon sm:text-sm sm:tracking-[0.3em]">{product.category}</p>
          <h1 className="mt-2 text-2xl font-semibold leading-tight text-slate-900 sm:mt-3 sm:text-3xl md:text-4xl">{product.name}</h1>
          <div className="mt-3 sm:mt-4">
            <ProductPrice product={product} size="lg" />
          </div>
          <p className="mt-4 max-w-full whitespace-normal text-sm leading-6 text-slate-700 sm:mt-6 sm:text-base sm:leading-8">{product.description || 'No description available.'}</p>

          <div className="mt-4 grid min-w-0 grid-cols-1 gap-3 min-[360px]:grid-cols-2 sm:mt-6 sm:gap-4">
            <div className="min-w-0">
              <label className="text-xs sm:text-sm font-semibold text-slate-700">Available sizes</label>
              <select value={size} onChange={(event) => setSize(event.target.value)} className="mt-2 w-full p-2 sm:p-3 border border-slate-300 rounded-lg text-sm">
                {(product.sizes || []).map((option: string) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
            <div className="min-w-0">
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
              className="rounded-full bg-maroon px-4 sm:px-5 py-3 sm:py-4 text-xs sm:text-sm font-semibold text-white shadow hover:bg-maroon/90 disabled:cursor-not-allowed disabled:opacity-60 transition w-full"
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
            <p className="text-sm uppercase tracking-[0.3em] text-maroon">Explore more</p>
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
