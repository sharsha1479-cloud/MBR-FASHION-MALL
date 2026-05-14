import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { addCartItem } from '../services/cart';
import { addWishlistItem } from '../services/wishlist';
import { PRODUCT_PLACEHOLDER_IMAGE, fetchProductById, getProductImageUrl, fetchProducts } from '../services/product';
import ProductCard from '../components/ProductCard';
import { ProductPrice } from '../utils/pricing';

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, any>) => {
      open: () => void;
      on: (event: string, callback: (response: any) => void) => void;
    };
  }
}

const getSizeStocks = (variant: any) => {
  if (Array.isArray(variant?.sizeStocks) && variant.sizeStocks.length > 0) {
    return variant.sizeStocks.map((item: any) => ({
      size: String(item.size || ''),
      stock: Number(item.stock || 0),
    })).filter((item: any) => item.size);
  }

  return (variant?.sizes || []).map((sizeOption: string, index: number) => ({
    size: sizeOption,
    stock: Number(variant?.stock || 0),
  }));
};

const ProductDetailPage = () => {
  const { id } = useParams();
  const [product, setProduct] = useState<any>(null);
  const [recommendedProducts, setRecommendedProducts] = useState<any[]>([]);
  const [size, setSize] = useState('');
  const [selectedVariantId, setSelectedVariantId] = useState('');
  const [quantity, setQuantity] = useState<number | ''>(1);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [dragStartX, setDragStartX] = useState<number | null>(null);
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (!id) return;

    fetchProductById(id)
      .then((data) => {
        setProduct(data);
        const firstVariant = data.variants?.[0];
        setSelectedVariantId(firstVariant?.id || '');
        const firstSize = getSizeStocks(firstVariant || data).find((item: any) => item.stock > 0) || getSizeStocks(firstVariant || data)[0];
        setSize(firstSize?.size || '');
        
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

  const variants = Array.isArray(product.variants) && product.variants.length > 0 ? product.variants : [];
  const selectedVariant = variants.find((variant: any) => variant.id === selectedVariantId) || variants[0] || product;
  const productImages = Array.isArray(selectedVariant.images) && selectedVariant.images.length > 0 ? selectedVariant.images : [selectedVariant.images];
  const imageUrl = getProductImageUrl(productImages[selectedImageIndex] || productImages);
  const hasMultipleImages = productImages.length > 1;
  const sizeStocks = getSizeStocks(selectedVariant);
  const selectedSizeStock = sizeStocks.find((item: any) => item.size === size);
  const availableStock = Number(selectedSizeStock?.stock ?? selectedVariant.stock ?? 0);
  const inStock = availableStock > 0;
  const hasSizes = sizeStocks.length > 0;
  const maxQuantity = Math.max(availableStock, 1);
  const quantityValue = quantity === '' ? 0 : quantity;
  const clampedQuantity = Math.min(Math.max(quantityValue, 1), maxQuantity);

  const showPreviousImage = () => {
    if (!hasMultipleImages) return;
    setSelectedImageIndex((current) => (current === 0 ? productImages.length - 1 : current - 1));
  };

  const showNextImage = () => {
    if (!hasMultipleImages) return;
    setSelectedImageIndex((current) => (current === productImages.length - 1 ? 0 : current + 1));
  };

  const handleSlideEnd = (clientX: number) => {
    if (dragStartX === null) return;
    const distance = dragStartX - clientX;

    if (Math.abs(distance) > 40) {
      if (distance > 0) {
        showNextImage();
      } else {
        showPreviousImage();
      }
    }

    setDragStartX(null);
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

    if (!selectedVariant?.id) {
      setError('Please select a color.');
      return;
    }

    if (hasSizes && !size) {
      setError('Please select a size.');
      return;
    }
    if (quantity === '') {
      setError('Please enter a quantity.');
      return;
    }
    if (quantity > availableStock) {
      setError(`Only ${availableStock} left in stock for this size.`);
      return;
    }

    try {
      await addCartItem(product.id, clampedQuantity, { variantId: selectedVariant.id, size });
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
      if (!selectedVariant?.id) {
        setError('Please select a color.');
        setPaymentLoading(false);
        return;
      }
      if (hasSizes && !size) {
        setError('Please select a size.');
        setPaymentLoading(false);
        return;
      }
      if (quantity === '') {
        setError('Please enter a quantity.');
        setPaymentLoading(false);
        return;
      }
      if (quantity > availableStock) {
        setError(`Only ${availableStock} left in stock for this size.`);
        setPaymentLoading(false);
        return;
      }
      await addCartItem(product.id, clampedQuantity, { variantId: selectedVariant.id, size });
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
      await addWishlistItem(product.id, selectedVariant?.id);
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
            className={`relative aspect-[4/5] w-full max-w-full overflow-hidden rounded-2xl bg-slate-100 sm:aspect-square sm:rounded-3xl lg:aspect-[4/5] ${hasMultipleImages ? 'cursor-grab active:cursor-grabbing' : ''}`}
            onPointerDown={(event) => {
              if (!hasMultipleImages) return;
              event.currentTarget.setPointerCapture(event.pointerId);
              setDragStartX(event.clientX);
            }}
            onPointerUp={(event) => {
              if (!hasMultipleImages) return;
              event.currentTarget.releasePointerCapture(event.pointerId);
              handleSlideEnd(event.clientX);
            }}
            onPointerCancel={() => setDragStartX(null)}
          >
            <img
              src={imageUrl}
              alt={product.name}
              onError={(event) => {
                event.currentTarget.onerror = null;
                event.currentTarget.src = PRODUCT_PLACEHOLDER_IMAGE;
              }}
              className="h-full w-full select-none object-cover"
              draggable={false}
            />
            {hasMultipleImages && (
              <>
                <button
                  type="button"
                  onClick={showPreviousImage}
                  aria-label="Previous product image"
                  className="absolute left-3 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/70 bg-white/90 text-slate-900 shadow-lg transition hover:bg-white"
                >
                  <span aria-hidden="true" className="text-2xl leading-none">‹</span>
                </button>
                <button
                  type="button"
                  onClick={showNextImage}
                  aria-label="Next product image"
                  className="absolute right-3 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/70 bg-white/90 text-slate-900 shadow-lg transition hover:bg-white"
                >
                  <span aria-hidden="true" className="text-2xl leading-none">›</span>
                </button>
                <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5 rounded-full bg-black/35 px-2.5 py-1.5 backdrop-blur">
                  {productImages.map((img: string, index: number) => (
                    <span
                      key={`${img}-dot`}
                      className={`h-2 rounded-full transition-all ${selectedImageIndex === index ? 'w-6 bg-white' : 'w-2 bg-white/55'}`}
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
                  <img
                    src={getProductImageUrl(img)}
                    alt={`${product.name} ${index + 1}`}
                    onError={(event) => {
                      event.currentTarget.onerror = null;
                      event.currentTarget.src = PRODUCT_PLACEHOLDER_IMAGE;
                    }}
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        <section className="order-2 min-w-0 overflow-hidden break-words flex flex-col justify-center lg:order-none">
          <p className="text-xs uppercase tracking-[0.22em] text-maroon sm:text-sm sm:tracking-[0.3em]">{product.category}</p>
          <h1 className="mt-2 text-2xl font-semibold leading-tight text-slate-900 sm:mt-3 sm:text-3xl md:text-4xl">{product.name}</h1>
          <div className="mt-3 sm:mt-4">
            <ProductPrice product={selectedVariant} size="lg" />
          </div>
          <p className="mt-4 max-w-full whitespace-normal text-sm leading-6 text-slate-700 sm:mt-6 sm:text-base sm:leading-8">{product.description || 'No description available.'}</p>

          {variants.length > 0 && (
            <div className="mt-4 sm:mt-6">
              <label className="text-xs sm:text-sm font-semibold text-slate-700">Color</label>
              <div className="mt-2 flex flex-wrap gap-2">
                {variants.map((variant: any) => (
                  <button
                    key={variant.id}
                    type="button"
                    onClick={() => {
                      setSelectedVariantId(variant.id);
                      setSelectedImageIndex(0);
                      const nextSize = getSizeStocks(variant).find((item: any) => item.stock > 0) || getSizeStocks(variant)[0];
                      setSize(nextSize?.size || '');
                      setQuantity(1);
                      setMessage('');
                      setError('');
                    }}
                    className={`flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition ${selectedVariant?.id === variant.id ? 'border-maroon bg-maroon/10 text-maroon ring-2 ring-maroon/15' : 'border-slate-300 bg-white text-slate-700 hover:border-maroon/40'}`}
                  >
                    <span
                      className="h-5 w-5 rounded-full border border-slate-300"
                      style={{ backgroundColor: variant.colorCode || '#94a3b8' }}
                    />
                    {variant.colorName}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4 grid min-w-0 grid-cols-1 gap-3 min-[360px]:grid-cols-2 sm:mt-6 sm:gap-4">
            <div className="min-w-0">
              <label className="text-xs sm:text-sm font-semibold text-slate-700">Available sizes</label>
              <div className="mt-2 flex flex-wrap gap-2">
                {sizeStocks.map((option: any) => (
                  <button
                    key={option.size}
                    type="button"
                    disabled={option.stock <= 0}
                    onClick={() => {
                      setSize(option.size);
                      setQuantity(1);
                      setMessage('');
                      setError('');
                    }}
                    className={`rounded-full border px-3 py-2 text-xs font-semibold transition ${size === option.size ? 'border-maroon bg-maroon/10 text-maroon ring-2 ring-maroon/15' : 'border-slate-300 bg-white text-slate-700 hover:border-maroon/40'} disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400`}
                  >
                    {option.size}
                  </button>
                ))}
              </div>
            </div>
            <div className="min-w-0">
              <label className="text-xs sm:text-sm font-semibold text-slate-700">Quantity</label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                min={1}
                max={maxQuantity}
                value={quantity}
                onFocus={(event) => event.target.select()}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  if (nextValue === '') {
                    setQuantity('');
                    return;
                  }
                  if (!/^\d+$/.test(nextValue)) return;
                  const nextQuantity = Math.max(1, Number(nextValue));
                  setQuantity(Math.min(nextQuantity, maxQuantity));
                }}
                onBlur={() => {
                  if (quantity === '') setQuantity(1);
                }}
                className="mt-2 w-full p-2 sm:p-3 border border-slate-300 rounded-lg text-sm"
              />
            </div>
          </div>

          <p className={`mt-4 sm:mt-5 text-xs sm:text-sm font-semibold ${inStock ? 'text-green-700' : 'text-red-700'}`}>
            {inStock ? `Only ${availableStock} left in stock` : 'Out of stock'}
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
