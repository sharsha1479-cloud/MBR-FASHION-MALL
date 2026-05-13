import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { fetchComboById, getComboImageUrl } from '../services/combo';
import { addCartItem } from '../services/cart';
import { useAuth } from '../context/AuthContext';

const getSizeStocks = (variant: any) => {
  if (Array.isArray(variant?.sizeStocks) && variant.sizeStocks.length > 0) {
    return variant.sizeStocks.map((item: any) => ({
      size: String(item.size || ''),
      stock: Number(item.stock || 0),
    })).filter((item: any) => item.size);
  }

  return (variant?.sizes || []).map((sizeOption: string) => ({
    size: sizeOption,
    stock: Number(variant?.stock || 0),
  }));
};

const ComboDetailPage = () => {
  const { id } = useParams();
  const [combo, setCombo] = useState<any>(null);
  const [selectedVariantId, setSelectedVariantId] = useState('');
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [size, setSize] = useState('');
  const [quantity, setQuantity] = useState<number | ''>(1);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [dragStartX, setDragStartX] = useState<number | null>(null);
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (!id) return;

    fetchComboById(id)
      .then((data) => {
        setCombo(data);
        const firstVariant = data.variants?.[0];
        setSelectedVariantId(firstVariant?.id || '');
        const firstSize = getSizeStocks(firstVariant || data).find((item: any) => item.stock > 0) || getSizeStocks(firstVariant || data)[0];
        setSize(firstSize?.size || '');
        setError('');
      })
      .catch(() => {
        setCombo(null);
        setError('Combo product could not be loaded.');
      });
  }, [id]);

  if (error && !combo) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-16 text-center sm:px-6">
        <p className="text-slate-500">{error}</p>
        <Link to="/" className="mt-5 inline-flex rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800">
          Back to home
        </Link>
      </div>
    );
  }

  if (!combo) {
    return <p className="mx-auto max-w-6xl px-6 py-16 text-slate-500">Loading combo product...</p>;
  }

  const variants = Array.isArray(combo.variants) && combo.variants.length > 0 ? combo.variants : [];
  const selectedVariant = variants.find((variant: any) => variant.id === selectedVariantId) || variants[0] || combo;
  const comboImages = Array.isArray(selectedVariant.images) && selectedVariant.images.length > 0 ? selectedVariant.images : [combo.image];
  const hasMultipleImages = comboImages.length > 1;
  const imageUrl = getComboImageUrl(comboImages[selectedImageIndex] || combo.image);
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
    setSelectedImageIndex((current) => (current === 0 ? comboImages.length - 1 : current - 1));
  };

  const showNextImage = () => {
    if (!hasMultipleImages) return;
    setSelectedImageIndex((current) => (current === comboImages.length - 1 ? 0 : current + 1));
  };

  const handleSlideEnd = (clientX: number) => {
    if (dragStartX === null) return;
    const distance = dragStartX - clientX;

    if (Math.abs(distance) > 40) {
      if (distance > 0) showNextImage();
      else showPreviousImage();
    }

    setDragStartX(null);
  };

  const requireLogin = () => {
    navigate('/login', { state: { from: { pathname: `/combo/${combo.id}` } } });
  };

  const handleAddToCart = async () => {
    setMessage('');
    setError('');

    if (!isAuthenticated) {
      requireLogin();
      return false;
    }

    if (!selectedVariant?.id) {
      setError('Please select a color.');
      return false;
    }

    if (hasSizes && !size) {
      setError('Please select a size.');
      return false;
    }

    if (quantity === '') {
      setError('Please enter a quantity.');
      return false;
    }

    if (quantity > availableStock) {
      setError(`Only ${availableStock} left in stock for this size.`);
      return false;
    }

    try {
      await addCartItem('', clampedQuantity, { comboProductId: combo.id, comboVariantId: selectedVariant.id, size });
      setMessage('Combo product added to cart.');
      return true;
    } catch (cartError: any) {
      if (cartError.response?.status === 401) {
        requireLogin();
        return false;
      }
      setError(cartError.response?.data?.message || 'Could not add combo product to cart.');
      return false;
    }
  };

  const handleBuyNow = async () => {
    const added = await handleAddToCart();
    if (added) navigate('/cart');
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="grid gap-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-6 md:gap-10 md:p-8 lg:grid-cols-[1.05fr_0.95fr]">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className={`relative aspect-[4/5] overflow-hidden rounded-2xl bg-slate-100 sm:aspect-square sm:rounded-3xl lg:aspect-[4/5] ${hasMultipleImages ? 'cursor-grab active:cursor-grabbing' : ''}`}
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
          <img src={imageUrl} alt={combo.name} className="h-full w-full select-none object-cover" draggable={false} />
          {hasMultipleImages && (
            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5 rounded-full bg-black/35 px-2.5 py-1.5 backdrop-blur">
              {comboImages.map((img: string, index: number) => (
                <span
                  key={`${img}-dot`}
                  className={`h-2 rounded-full transition-all ${selectedImageIndex === index ? 'w-6 bg-white' : 'w-2 bg-white/55'}`}
                />
              ))}
            </div>
          )}
        </motion.div>

        <motion.section
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.08 }}
          className="flex flex-col justify-center"
        >
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-maroon sm:text-sm">Combo offer</p>
          <h1 className="mt-3 text-3xl font-semibold text-slate-950 sm:text-4xl md:text-5xl">{combo.name}</h1>
          <div className="mt-5 flex flex-wrap items-end gap-3">
            <span className="text-3xl font-bold text-slate-950">Rs. {Number(selectedVariant.offerPrice).toFixed(0)}</span>
            {selectedVariant.mrp && selectedVariant.mrp > selectedVariant.offerPrice && (
              <span className="pb-1 text-lg font-semibold text-slate-400 line-through">Rs. {Number(selectedVariant.mrp).toFixed(0)}</span>
            )}
          </div>
          <p className="mt-6 text-base leading-8 text-slate-700">{combo.description || 'A curated combo offer from MBR Fashion Hub.'}</p>

          {variants.length > 0 && (
            <div className="mt-6">
              <label className="text-sm font-semibold text-slate-700">Color</label>
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
                    <span className="h-5 w-5 rounded-full border border-slate-300" style={{ backgroundColor: variant.colorCode || '#94a3b8' }} />
                    {variant.colorName}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {hasSizes && (
              <div>
                <label className="text-sm font-semibold text-slate-700">Available sizes</label>
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
            )}
            <div>
              <label className="text-sm font-semibold text-slate-700">Quantity</label>
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
                className="mt-2 w-full rounded-lg border border-slate-300 p-3 text-sm"
              />
            </div>
          </div>

          <p className={`mt-4 text-sm font-semibold ${inStock ? 'text-green-700' : 'text-red-700'}`}>
            {inStock ? `Only ${availableStock} left in stock` : 'Out of stock'}
          </p>

          {message && <p className="mt-5 rounded-2xl bg-green-100 px-4 py-3 text-sm text-green-700">{message}</p>}
          {error && <p className="mt-5 rounded-2xl bg-red-100 px-4 py-3 text-sm text-red-700">{error}</p>}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={handleAddToCart} disabled={!inStock} className="inline-flex justify-center rounded-full bg-maroon px-6 py-3 text-sm font-semibold text-white shadow hover:bg-maroon/90 disabled:cursor-not-allowed disabled:opacity-60">
              Add to Cart
            </button>
            <button type="button" onClick={handleBuyNow} disabled={!inStock} className="inline-flex justify-center rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60">
              Buy Now
            </button>
            <Link to="/products" className="inline-flex justify-center rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50">
              Browse products
            </Link>
          </div>
        </motion.section>
      </div>
    </div>
  );
};

export default ComboDetailPage;
