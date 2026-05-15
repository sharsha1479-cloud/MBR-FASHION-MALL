import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchCart, removeCartItem, updateCartItem } from '../services/cart';
import { getProductImageUrl } from '../services/product';
import { getComboImageUrl } from '../services/combo';
import { useAuth } from '../context/AuthContext';
import { ProductPrice, getEffectivePrice } from '../utils/pricing';

const getSizeStock = (variant: any, size?: string) => {
  if (!variant || !size) return Number.POSITIVE_INFINITY;
  const rows = Array.isArray(variant.sizeStocks) && variant.sizeStocks.length > 0
    ? variant.sizeStocks
    : (variant.sizes || []).map((sizeOption: string, index: number) => ({
        size: sizeOption,
        stock: Number(variant.stock || 0),
      }));
  const row = rows.find((item: any) => item.size === size);
  return row ? Number(row.stock || 0) : Number.POSITIVE_INFINITY;
};

const CartPage = () => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const loadCart = async (showLoading = true) => {
    if (showLoading) {
      setLoading(true);
    }
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
      if (showLoading) {
        setLoading(false);
      }
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
    const price = item.comboProduct ? Number(item.price ?? item.comboVariant?.offerPrice ?? getEffectivePrice(product)) : Number(item.price ?? item.variant?.offerPrice ?? item.variant?.price ?? getEffectivePrice(product));
    return sum + price * item.quantity;
  }, 0), [items]);

  const updateQuantity = async (id: string, quantity: number) => {
    const item = items.find((cartItem) => cartItem.id === id);
    const maxStock = getSizeStock(item?.comboVariant || item?.variant, item?.size);
    const maxQuantity = Number.isFinite(maxStock) ? Math.max(maxStock, 1) : Number.POSITIVE_INFINITY;
    const nextQuantity = Math.min(Math.max(quantity || 1, 1), maxQuantity);
    setItems((currentItems) => currentItems.map((cartItem) => (
      cartItem.id === id ? { ...cartItem, quantity: nextQuantity } : cartItem
    )));
    await updateCartItem(id, nextQuantity);
    await loadCart(false);
  };

  const removeItem = async (id: string) => {
    await removeCartItem(id);
    await loadCart(false);
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
              const variantProduct = item.comboProduct ? (item.comboVariant || product) : (item.variant || product);
              const maxStock = getSizeStock(item.comboVariant || item.variant, item.size);
              const maxQuantity = Number.isFinite(maxStock) ? Math.max(maxStock, 1) : Number.POSITIVE_INFINITY;
              const canDecrease = item.quantity > 1;
              const canIncrease = item.quantity < maxQuantity;
              const imageUrl = item.comboProduct ? getComboImageUrl(item.image || item.comboVariant?.images?.[0] || product.image) : getProductImageUrl(item.image || item.variant?.images || product.images);
              return (
                <div key={item.id} className="flex flex-col gap-3 sm:gap-4 rounded-2xl sm:rounded-3xl border border-slate-200 bg-slate-50 p-3 sm:p-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                    <img src={imageUrl} alt={product.name} className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl object-cover flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 text-sm sm:text-base truncate">{product.name}</p>
                      <p className="text-xs sm:text-sm text-slate-500">{item.comboProduct ? 'Combo offer' : product.category}</p>
                      {item.colorName && <p className="text-xs sm:text-sm text-slate-500">Color: {item.colorName}</p>}
                      {item.size && <p className="text-xs sm:text-sm text-slate-500">Size: {item.size}</p>}
                      {Number.isFinite(maxStock) && <p className="text-xs sm:text-sm text-slate-500">Available: {maxStock}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="flex h-10 overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        disabled={!canDecrease}
                        aria-label={`Decrease quantity for ${product.name}`}
                        className="flex w-10 items-center justify-center text-lg font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-white"
                      >
                        -
                      </button>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        min={1}
                        max={Number.isFinite(maxStock) ? Math.max(maxStock, 1) : undefined}
                        value={item.quantity}
                        onChange={(event) => {
                          const nextValue = event.target.value;
                          if (!/^\d*$/.test(nextValue)) return;
                          updateQuantity(item.id, Number(nextValue || 1));
                        }}
                        className="h-full w-12 border-x border-slate-200 bg-white text-center text-sm font-semibold text-slate-900 outline-none sm:w-14"
                        aria-label={`Quantity for ${product.name}`}
                      />
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        disabled={!canIncrease}
                        aria-label={`Increase quantity for ${product.name}`}
                        className="flex w-10 items-center justify-center text-lg font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-white"
                      >
                        +
                      </button>
                    </div>
                    <div className="w-24 sm:w-32">
                      <ProductPrice product={{ ...variantProduct, offerPrice: item.price ?? variantProduct.offerPrice }} quantity={item.quantity} size="sm" align="right" />
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
