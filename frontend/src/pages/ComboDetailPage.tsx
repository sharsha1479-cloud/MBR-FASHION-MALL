import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { fetchComboById, getComboImageUrl } from '../services/combo';
import { addCartItem } from '../services/cart';
import { useAuth } from '../context/AuthContext';

const ComboDetailPage = () => {
  const { id } = useParams();
  const [combo, setCombo] = useState<any>(null);
  const [size, setSize] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (!id) return;

    fetchComboById(id)
      .then((data) => {
        setCombo(data);
        setSize(data.sizes?.[0] || '');
        setError('');
      })
      .catch(() => {
        setCombo(null);
        setError('Combo product could not be loaded.');
      });
  }, [id]);

  if (error) {
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

  const inStock = Number(combo.stock ?? 0) > 0;
  const availableSizes = combo.sizes || [];

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

    if (availableSizes.length > 0 && !size) {
      setError('Please select a size.');
      return false;
    }

    try {
      await addCartItem('', quantity, { comboProductId: combo.id, size });
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
    if (added) {
      navigate('/cart');
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="grid gap-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-6 md:gap-10 md:p-8 lg:grid-cols-[1.05fr_0.95fr]">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="overflow-hidden rounded-2xl bg-slate-100 sm:rounded-3xl"
        >
          <img src={getComboImageUrl(combo.image)} alt={combo.name} className="h-full min-h-[300px] w-full object-cover sm:min-h-[440px]" />
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
            <span className="text-3xl font-bold text-slate-950">Rs. {Number(combo.offerPrice).toFixed(2)}</span>
            {combo.mrp && combo.mrp > combo.offerPrice && (
              <span className="pb-1 text-lg font-semibold text-slate-400 line-through">Rs. {Number(combo.mrp).toFixed(2)}</span>
            )}
          </div>
          <p className={`mt-4 text-sm font-semibold ${inStock ? 'text-green-700' : 'text-red-700'}`}>
            {inStock ? `${combo.stock} combo${Number(combo.stock) === 1 ? '' : 's'} available` : 'Out of stock'}
          </p>
          <p className="mt-6 text-base leading-8 text-slate-700">{combo.description || 'A curated combo offer from MBR Fashion Hub.'}</p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {availableSizes.length > 0 && (
              <div>
                <label className="text-sm font-semibold text-slate-700">Available sizes</label>
                <select value={size} onChange={(event) => setSize(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 p-3 text-sm">
                  {availableSizes.map((option: string) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="text-sm font-semibold text-slate-700">Quantity</label>
              <input
                type="number"
                min={1}
                max={Math.max(Number(combo.stock || 1), 1)}
                value={quantity}
                onChange={(event) => setQuantity(Math.max(1, Number(event.target.value)))}
                className="mt-2 w-full rounded-lg border border-slate-300 p-3 text-sm"
              />
            </div>
          </div>

          {message && <p className="mt-5 rounded-2xl bg-green-100 px-4 py-3 text-sm text-green-700">{message}</p>}
          {error && <p className="mt-5 rounded-2xl bg-red-100 px-4 py-3 text-sm text-red-700">{error}</p>}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={!inStock}
              className="inline-flex justify-center rounded-full bg-maroon px-6 py-3 text-sm font-semibold text-white shadow hover:bg-maroon/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Add to Cart
            </button>
            <button
              type="button"
              onClick={handleBuyNow}
              disabled={!inStock}
              className="inline-flex justify-center rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Buy Now
            </button>
            <Link
              to="/products"
              className="inline-flex justify-center rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
            >
              Browse products
            </Link>
          </div>
        </motion.section>
      </div>
    </div>
  );
};

export default ComboDetailPage;
