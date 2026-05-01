import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { clearCart, fetchCart } from '../services/cart';
import { createRazorpayOrder } from '../services/payment';
import { createOrder } from '../services/order';
import { getProductImageUrl } from '../services/product';

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

const CheckoutPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [shipping, setShipping] = useState({ fullName: '', address: '', city: '', postalCode: '', country: '' });
  const [loading, setLoading] = useState(true);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const total = useMemo(
    () => cartItems.reduce((sum, item) => sum + Number(item.product.price) * Number(item.quantity), 0),
    [cartItems]
  );

  const loadCart = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchCart();
      setCartItems(data.items || []);
    } catch (cartError: any) {
      if (cartError.response?.status === 401) {
        navigate('/login', { state: { from: { pathname: '/checkout' } } });
        return;
      }
      setError(cartError.response?.data?.message || 'Could not load cart.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: { pathname: '/checkout' } } });
      return;
    }
    loadCart();
  }, [isAuthenticated]);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    setShipping({ ...shipping, [event.target.name]: event.target.value });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage('');
    setError('');

    if (cartItems.length === 0 || total <= 0) {
      setError('Your cart is empty.');
      return;
    }

    setPaymentLoading(true);
    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded || !window.Razorpay) {
        throw new Error('Razorpay checkout could not be loaded.');
      }

      const razorpayOrder = await createRazorpayOrder(Math.round(total * 100), `checkout_${Date.now()}`);
      const checkout = new window.Razorpay({
        key: razorpayOrder.key,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        name: 'Mens Fashion',
        description: `Order for ${cartItems.length} item${cartItems.length === 1 ? '' : 's'}`,
        order_id: razorpayOrder.id,
        prefill: {
          name: shipping.fullName || user?.name || '',
          email: user?.email || '',
        },
        notes: {
          address: [shipping.address, shipping.city, shipping.postalCode, shipping.country].filter(Boolean).join(', '),
        },
        theme: { color: '#ea580c' },
        handler: async (response: any) => {
          try {
            await createOrder({
              orderItems: cartItems.map((item) => ({
                product: item.product.id,
                quantity: item.quantity,
                price: item.product.price,
              })),
              totalAmount: total,
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              paymentSignature: response.razorpay_signature,
              paymentStatus: 'paid',
              status: 'placed',
            });
            await clearCart();
            setCartItems([]);
            setMessage('Payment successful. Your order is confirmed.');
          } catch (saveError: any) {
            setError(saveError.response?.data?.message || 'Payment succeeded, but saving the order failed. Please contact support.');
          } finally {
            setPaymentLoading(false);
          }
        },
      });

      checkout.on('payment.failed', (response: any) => {
        setError(response.error?.description || 'Payment failed. Please try again.');
        setPaymentLoading(false);
      });

      checkout.open();
    } catch (paymentError: any) {
      if (paymentError.response?.status === 401) {
        navigate('/login', { state: { from: { pathname: '/checkout' } } });
        return;
      }
      const apiMessage = paymentError.response?.data?.message || paymentError.message;
      setError(
        apiMessage?.includes('Razorpay test keys')
          ? 'Razorpay test keys are missing in backend/.env. Add your test key ID and secret, then restart the backend.'
          : apiMessage || 'Could not start payment.'
      );
      setPaymentLoading(false);
    }
  };

  if (loading) {
    return <p className="text-slate-500">Loading checkout...</p>;
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-3xl font-semibold text-slate-900">Checkout</h1>
        {message && <p className="mt-6 rounded-2xl bg-green-100 px-4 py-3 text-sm text-green-700">{message}</p>}
        {error && <p className="mt-6 rounded-2xl bg-red-100 px-4 py-3 text-sm text-red-700">{error}</p>}

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            {['fullName', 'city', 'postalCode', 'country'].map((field) => (
              <div key={field}>
                <label className="text-sm font-semibold text-slate-700">{field === 'fullName' ? 'Full Name' : field.charAt(0).toUpperCase() + field.slice(1)}</label>
                <input
                  name={field}
                  value={(shipping as any)[field]}
                  onChange={handleChange}
                  required
                  className="mt-2 w-full p-3"
                />
              </div>
            ))}
            <div className="sm:col-span-2">
              <label className="text-sm font-semibold text-slate-700">Address</label>
              <input name="address" value={shipping.address} onChange={handleChange} required className="mt-2 w-full p-3" />
            </div>
          </div>
          <button
            type="submit"
            disabled={paymentLoading || cartItems.length === 0}
            className="w-full rounded-full bg-orange-600 px-5 py-4 text-sm font-semibold text-white shadow hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {paymentLoading ? 'Opening Razorpay...' : `Place Order - Rs. ${total.toFixed(0)}`}
          </button>
        </form>
      </div>

      <aside className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">Order summary</h2>
        {cartItems.length === 0 ? (
          <p className="mt-5 text-sm text-slate-500">
            Your cart is empty. <Link to="/products" className="text-orange-600 hover:text-orange-700">Shop now.</Link>
          </p>
        ) : (
          <div className="mt-5 space-y-4">
            {cartItems.map((item) => {
              const product = item.product;
              return (
                <div key={item.id} className="flex gap-4 border-b border-slate-200 pb-4">
                  <img src={getProductImageUrl(product.images?.[0])} alt={product.name} className="h-20 w-20 rounded-2xl object-cover" />
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">{product.name}</p>
                    <p className="text-sm text-slate-500">Qty {item.quantity}</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">Rs. {(product.price * item.quantity).toFixed(0)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div className="mt-6 flex items-center justify-between text-lg font-semibold text-slate-900">
          <span>Total</span>
          <span>Rs. {total.toFixed(0)}</span>
        </div>
      </aside>
    </div>
  );
};

export default CheckoutPage;
