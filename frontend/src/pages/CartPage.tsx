import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchCart, removeCartItem, updateCartItem } from '../services/cart';
import { getProductImageUrl } from '../services/product';
import { getComboImageUrl } from '../services/combo';
import { useAuth } from '../context/AuthContext';
import { ProductPrice, getEffectivePrice } from '../utils/pricing';

const CartPage = () => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const loadCart = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchCart();
      setItems(data.items || []);
    } catch (cartError: any) {
      if (cartError.response?.status === 401) {
        navigate('/login', { state: { from: { pathname: '/cart' } } });
        return;
      }
      setError(cartError.response?.data?.message || 'Could not load cart.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: { pathname: '/cart' } } });
      return;
    }
    loadCart();
  }, [isAuthenticated]);

  const total = useMemo(() => items.reduce((sum, item) => {
    const product = item.product || item.comboProduct;
    return sum + getEffectivePrice(product) * item.quantity;
  }, 0), [items]);

  const updateQuantity = async (id: string, quantity: number) => {
    await updateCartItem(id, quantity);
    await loadCart();
  };

  const removeItem = async (id: string) => {
    await removeCartItem(id);
    await loadCart();
  };

  if (loading) {
    return <p className="text-slate-500">Loading cart...</p>;
  }

  return (
    <div className="space-y-4 sm:space-y-6 md:space-y-8">
      <div className="rounded-2xl sm:rounded-3xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm">
        <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900">Shopping Cart</h1>
        {error && <p className="mt-4 sm:mt-6 rounded-2xl bg-red-100 px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-red-700">{error}</p>}
        {items.length === 0 ? (
          <div className="mt-4 sm:mt-6 text-slate-500 text-sm sm:text-base">
            Your cart is empty. <Link to="/products" className="text-maroon hover:text-maroon/80 font-semibold">Shop now.</Link>
          </div>
        ) : (
          <div className="mt-4 sm:mt-6 space-y-3 sm:space-y-4">
            {items.map((item) => {
              const product = item.product || item.comboProduct;
              const imageUrl = item.comboProduct ? getComboImageUrl(product.image) : getProductImageUrl(product.images);
              return (
                <div key={item.id} className="flex flex-col gap-3 sm:gap-4 rounded-2xl sm:rounded-3xl border border-slate-200 bg-slate-50 p-3 sm:p-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                    <img src={imageUrl} alt={product.name} className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl object-cover flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 text-sm sm:text-base truncate">{product.name}</p>
                      <p className="text-xs sm:text-sm text-slate-500">{item.comboProduct ? 'Combo offer' : product.category}</p>
                      {item.size && <p className="text-xs sm:text-sm text-slate-500">Size: {item.size}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3">
                    <input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(event) => updateQuantity(item.id, Number(event.target.value))}
                      className="w-16 sm:w-20 rounded-xl border border-slate-300 bg-white p-2 text-center text-sm"
                    />
                    <div className="w-24 sm:w-32">
                      <ProductPrice product={product} quantity={item.quantity} size="sm" align="right" />
                    </div>
                    <button onClick={() => removeItem(item.id)} className="text-xs sm:text-sm text-maroon hover:text-maroon/80 font-semibold whitespace-nowrap">Remove</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {items.length > 0 && (
        <aside className="rounded-2xl sm:rounded-3xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <span className="text-base sm:text-lg font-medium text-slate-700">Subtotal</span>
            <span className="text-2xl sm:text-3xl font-semibold text-slate-900">Rs. {total.toFixed(0)}</span>
          </div>
          <button onClick={() => navigate('/checkout')} className="mt-4 sm:mt-6 w-full rounded-full bg-slate-900 px-4 sm:px-5 py-3 sm:py-4 text-sm sm:text-base font-semibold text-white shadow hover:bg-slate-800 transition">
            Proceed to Checkout
          </button>
        </aside>
      )}
    </div>
  );
};

export default CartPage;
