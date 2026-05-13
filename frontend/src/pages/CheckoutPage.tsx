import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { clearCart, fetchCart } from '../services/cart';
import { createRazorpayOrder } from '../services/payment';
import { createOrder } from '../services/order';
import { getProductImageUrl } from '../services/product';
import { getComboImageUrl } from '../services/combo';
import { validateCoupon } from '../services/coupon';
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

const CheckoutPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [shipping, setShipping] = useState({ fullName: '', address: '', city: '', postalCode: '', country: '' });
  const [loading, setLoading] = useState(true);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<any | null>(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponMessage, setCouponMessage] = useState('');

  const subtotal = useMemo(
    () => cartItems.reduce((sum, item) => {
      const product = item.product || item.comboProduct;
      const price = item.comboProduct ? Number(item.price ?? item.comboVariant?.offerPrice ?? getEffectivePrice(product)) : Number(item.price ?? item.variant?.offerPrice ?? item.variant?.price ?? getEffectivePrice(product));
      return sum + price * Number(item.quantity);
    }, 0),
    [cartItems]
  );
  const total = Math.max(subtotal - discountAmount, 0);

  useEffect(() => {
    setAppliedCoupon(null);
    setDiscountAmount(0);
    setCouponMessage('');
  }, [subtotal]);

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

  const handleApplyCoupon = async () => {
    setCouponMessage('');
    setError('');

    if (!couponCode.trim()) {
      setCouponMessage('Enter a coupon code.');
      return;
    }

    setCouponLoading(true);
    try {
      const result = await validateCoupon(couponCode, subtotal);
      setAppliedCoupon(result.coupon);
      setDiscountAmount(Number(result.discountAmount || 0));
      setCouponCode(result.coupon.code);
      setCouponMessage(`Coupon applied. You saved Rs. ${Number(result.discountAmount || 0).toFixed(0)}.`);
    } catch (couponError: any) {
      setAppliedCoupon(null);
      setDiscountAmount(0);
      setCouponMessage(couponError.response?.data?.message || 'Invalid coupon code.');
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setDiscountAmount(0);
    setCouponCode('');
    setCouponMessage('');
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
        name: 'MBR Fashion Hub',
        description: `Order for ${cartItems.length} item${cartItems.length === 1 ? '' : 's'}`,
        order_id: razorpayOrder.id,
        prefill: {
          name: shipping.fullName || user?.name || '',
          email: user?.email || '',
        },
        notes: {
          address: [shipping.address, shipping.city, shipping.postalCode, shipping.country].filter(Boolean).join(', '),
        },
        theme: { color: '#960019' },
        handler: async (response: any) => {
          try {
            await createOrder({
              orderItems: cartItems.map((item) => {
                const product = item.product || item.comboProduct;
                const price = item.comboProduct ? Number(item.price ?? item.comboVariant?.offerPrice ?? getEffectivePrice(product)) : Number(item.price ?? item.variant?.offerPrice ?? item.variant?.price ?? getEffectivePrice(product));
                return {
                  product: item.product?.id,
                  comboProduct: item.comboProduct?.id,
                  comboVariant: item.comboVariant?.id || item.comboVariantId,
                  quantity: item.quantity,
                  price,
                  variant: item.variant?.id || item.variantId,
                  size: item.size,
                  colorName: item.colorName,
                  image: item.image,
                };
              }),
              subtotalAmount: subtotal,
              totalAmount: total,
              couponCode: appliedCoupon?.code,
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              paymentSignature: response.razorpay_signature,
              paymentStatus: 'paid',
              status: 'placed',
            });
            await clearCart();
            setCartItems([]);
            setMessage('Payment successful. Your order is confirmed.');
            navigate('/orders');
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
    <div className="mx-auto max-w-4xl space-y-6 sm:space-y-8">
      <aside className="rounded-2xl sm:rounded-3xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm">
        <h2 className="text-xl sm:text-2xl font-semibold text-slate-900">Order summary</h2>
        {cartItems.length === 0 ? (
          <p className="mt-4 sm:mt-5 text-xs sm:text-sm text-slate-500">
            Your cart is empty. <Link to="/products" className="text-maroon hover:text-maroon/80">Shop now.</Link>
          </p>
        ) : (
          <div className="mt-4 sm:mt-5 space-y-3 sm:space-y-4">
            {cartItems.map((item) => {
              const product = item.product || item.comboProduct;
              const variantProduct = item.comboProduct ? (item.comboVariant || product) : (item.variant || product);
              const itemPrice = item.comboProduct ? Number(item.price ?? variantProduct.offerPrice ?? 0) : Number(item.price ?? variantProduct.offerPrice ?? variantProduct.price ?? 0);
              const imageUrl = item.comboProduct ? getComboImageUrl(item.image || item.comboVariant?.images?.[0] || product.image) : getProductImageUrl(item.image || item.variant?.images || product.images);
              return (
                <div key={item.id} className="flex gap-3 sm:gap-4 border-b border-slate-200 pb-3 sm:pb-4">
                  <img src={imageUrl} alt={product.name} className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl object-cover flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 text-sm sm:text-base truncate">{product.name}</p>
                    <p className="text-xs sm:text-sm text-slate-500">Qty {item.quantity}</p>
                    {item.colorName && <p className="text-xs sm:text-sm text-slate-500">Color {item.colorName}</p>}
                    {item.size && <p className="text-xs sm:text-sm text-slate-500">Size {item.size}</p>}
                    <div className="mt-1">
                      <ProductPrice product={{ ...variantProduct, offerPrice: itemPrice }} quantity={item.quantity} size="sm" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div className="mt-6 flex items-center justify-between text-base sm:text-lg font-semibold text-slate-900">
          <span>Subtotal</span>
          <span>Rs. {subtotal.toFixed(0)}</span>
        </div>
        <div className="mt-3 rounded-2xl border border-maroon/10 bg-cream p-3">
          <label className="text-xs font-semibold text-slate-700">Coupon code</label>
          <div className="mt-2 flex gap-2">
            <input
              value={couponCode}
              onChange={(event) => setCouponCode(event.target.value.toUpperCase())}
              placeholder="Enter coupon"
              disabled={Boolean(appliedCoupon)}
              className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
            />
            {appliedCoupon ? (
              <button type="button" onClick={handleRemoveCoupon} className="rounded-full border border-maroon bg-white px-4 py-2 text-xs font-semibold text-maroon">
                Remove
              </button>
            ) : (
              <button type="button" onClick={handleApplyCoupon} disabled={couponLoading || cartItems.length === 0} className="rounded-full bg-maroon px-4 py-2 text-xs font-semibold text-secondary disabled:cursor-not-allowed disabled:opacity-60">
                {couponLoading ? 'Checking' : 'Apply'}
              </button>
            )}
          </div>
          {couponMessage && <p className="mt-2 text-xs font-semibold text-maroon/80">{couponMessage}</p>}
        </div>
        {discountAmount > 0 && (
          <div className="mt-3 flex items-center justify-between text-sm font-semibold text-green-700">
            <span>Coupon discount</span>
            <span>- Rs. {discountAmount.toFixed(0)}</span>
          </div>
        )}
        <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-4 text-base sm:text-lg font-semibold text-slate-900">
          <span>Total</span>
          <span>Rs. {total.toFixed(0)}</span>
        </div>
      </aside>

      <div className="rounded-2xl sm:rounded-3xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm">
        <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900">Checkout</h1>
        {message && <p className="mt-4 sm:mt-6 rounded-2xl bg-green-100 px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-green-700">{message}</p>}
        {error && <p className="mt-4 sm:mt-6 rounded-2xl bg-red-100 px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-red-700">{error}</p>}

        <form onSubmit={handleSubmit} className="mt-6 space-y-3 sm:space-y-5">
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
            {['fullName', 'city', 'postalCode', 'country'].map((field) => (
              <div key={field}>
                <label className="text-xs sm:text-sm font-semibold text-slate-700">{field === 'fullName' ? 'Full Name' : field.charAt(0).toUpperCase() + field.slice(1)}</label>
                <input
                  name={field}
                  value={(shipping as any)[field]}
                  onChange={handleChange}
                  required
                  className="mt-2 w-full p-2 sm:p-3 border border-slate-300 rounded-lg text-sm"
                />
              </div>
            ))}
            <div className="sm:col-span-2">
              <label className="text-xs sm:text-sm font-semibold text-slate-700">Address</label>
              <input name="address" value={shipping.address} onChange={handleChange} required className="mt-2 w-full p-2 sm:p-3 border border-slate-300 rounded-lg text-sm" />
            </div>
          </div>
          <button
            type="submit"
            disabled={paymentLoading || cartItems.length === 0}
            className="w-full rounded-full bg-maroon px-4 sm:px-5 py-3 sm:py-4 text-xs sm:text-sm font-semibold text-white shadow hover:bg-maroon/90 disabled:cursor-not-allowed disabled:opacity-60 transition"
          >
            {paymentLoading ? 'Opening Razorpay...' : `Place Order - Rs. ${total.toFixed(0)}`}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CheckoutPage;
