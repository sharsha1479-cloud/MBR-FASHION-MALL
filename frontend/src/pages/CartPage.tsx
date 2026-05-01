import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchCart, removeCartItem, updateCartItem } from '../services/cart';
import { getProductImageUrl } from '../services/product';
import { useAuth } from '../context/AuthContext';

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

  const total = useMemo(() => items.reduce((sum, item) => sum + item.product.price * item.quantity, 0), [items]);

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
    <div className="space-y-8">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-3xl font-semibold text-slate-900">Shopping Cart</h1>
        {error && <p className="mt-6 rounded-2xl bg-red-100 px-4 py-3 text-sm text-red-700">{error}</p>}
        {items.length === 0 ? (
          <div className="mt-6 text-slate-500">
            Your cart is empty. <Link to="/products" className="text-orange-600 hover:text-orange-700">Shop now.</Link>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {items.map((item) => {
              const imageUrl = getProductImageUrl(item.product.images?.[0]);
              return (
                <div key={item.id} className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-4">
                    <img src={imageUrl} alt={item.product.name} className="h-24 w-24 rounded-3xl object-cover" />
                    <div>
                      <p className="font-semibold text-slate-900">{item.product.name}</p>
                      <p className="text-sm text-slate-500">{item.product.category}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(event) => updateQuantity(item.id, Number(event.target.value))}
                      className="w-20 rounded-xl border border-slate-300 bg-white p-2 text-center"
                    />
                    <p className="text-lg font-semibold text-slate-900">Rs. {(item.product.price * item.quantity).toFixed(0)}</p>
                    <button onClick={() => removeItem(item.id)} className="text-sm text-orange-600 hover:text-orange-700">Remove</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {items.length > 0 && (
        <aside className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between text-slate-700">
            <span className="text-lg font-medium">Subtotal</span>
            <span className="text-2xl font-semibold">Rs. {total.toFixed(0)}</span>
          </div>
          <button onClick={() => navigate('/checkout')} className="mt-6 w-full rounded-full bg-slate-900 px-5 py-4 text-sm font-semibold text-white shadow hover:bg-slate-800">
            Proceed to Checkout
          </button>
        </aside>
      )}
    </div>
  );
};

export default CartPage;
