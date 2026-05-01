import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { addCartItem } from '../services/cart';
import { createRazorpayOrder } from '../services/payment';
import { fetchProductById, getProductImageUrl } from '../services/product';

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
  const [size, setSize] = useState('');
  const [quantity, setQuantity] = useState(1);
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
      })
      .catch(() => setError('Product could not be loaded.'));
  }, [id]);

  if (!product) {
    return <p className="mx-auto max-w-6xl px-6 py-16 text-slate-500">Loading product...</p>;
  }

  const imageUrl = getProductImageUrl(product.images?.[0]);
  const inStock = Number(product.stock) > 0;
  const totalAmount = Math.round(Number(product.price) * quantity * 100);

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

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <div className="grid gap-10 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:grid-cols-[1.05fr_0.95fr] lg:p-8">
        <div className="overflow-hidden rounded-3xl bg-slate-100">
          <img src={imageUrl} alt={product.name} className="h-full min-h-[360px] w-full object-cover" />
        </div>

        <section className="flex flex-col justify-center">
          <p className="text-sm uppercase tracking-[0.3em] text-orange-500">{product.category}</p>
          <h1 className="mt-3 text-4xl font-semibold text-slate-900">{product.name}</h1>
          <p className="mt-4 text-3xl font-semibold text-slate-900">Rs. {Number(product.price).toFixed(0)}</p>
          <p className="mt-6 text-base leading-8 text-slate-700">{product.description || 'No description available.'}</p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-semibold text-slate-700">Available sizes</label>
              <select value={size} onChange={(event) => setSize(event.target.value)} className="mt-2 w-full p-3">
                {(product.sizes || []).map((option: string) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700">Quantity</label>
              <input
                type="number"
                min={1}
                max={Math.max(product.stock, 1)}
                value={quantity}
                onChange={(event) => setQuantity(Math.max(1, Number(event.target.value)))}
                className="mt-2 w-full p-3"
              />
            </div>
          </div>

          <p className={`mt-5 text-sm font-semibold ${inStock ? 'text-green-700' : 'text-red-700'}`}>
            {inStock ? `${product.stock} in stock` : 'Out of stock'}
          </p>

          {message && <p className="mt-5 rounded-2xl bg-green-100 px-4 py-3 text-sm text-green-700">{message}</p>}
          {error && <p className="mt-5 rounded-2xl bg-red-100 px-4 py-3 text-sm text-red-700">{error}</p>}

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <button
              onClick={handleAddToCart}
              disabled={!inStock}
              className="rounded-full bg-orange-600 px-5 py-4 text-sm font-semibold text-white shadow hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Add to Cart
            </button>
            <button
              onClick={handleBuyNow}
              disabled={!inStock || paymentLoading}
              className="rounded-full bg-slate-900 px-5 py-4 text-sm font-semibold text-white shadow hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {paymentLoading ? 'Opening Payment...' : 'Buy Now'}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};

export default ProductDetailPage;
