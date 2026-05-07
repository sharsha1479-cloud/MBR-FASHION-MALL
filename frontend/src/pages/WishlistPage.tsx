import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchWishlist, removeWishlistItem } from '../services/wishlist';
import { addCartItem } from '../services/cart';
import { getProductImageUrl } from '../services/product';
import { ProductPrice } from '../utils/pricing';

const WishlistPage = () => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const loadWishlist = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchWishlist();
      setItems(data.items || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Could not load wishlist.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWishlist();
  }, []);

  const handleRemove = async (id: string) => {
    await removeWishlistItem(id);
    await loadWishlist();
  };

  const handleMoveToCart = async (productId: string, wishlistItemId: string) => {
    try {
      await addCartItem(productId, 1);
      await handleRemove(wishlistItemId);
      setMessage('Moved item to cart.');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Could not move item to cart.');
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="rounded-2xl sm:rounded-3xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm">
        <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900">Your Wishlist</h1>
        {message && <p className="mt-3 sm:mt-4 rounded-2xl bg-green-100 px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-green-700">{message}</p>}
        {error && <p className="mt-3 sm:mt-4 rounded-2xl bg-red-100 px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-red-700">{error}</p>}

        {loading ? (
          <p className="mt-6 text-xs sm:text-sm text-slate-500">Loading wishlist...</p>
        ) : items.length === 0 ? (
          <div className="mt-6 text-xs sm:text-sm text-slate-500">
            Your wishlist is empty. <button onClick={() => navigate('/products')} className="text-orange-600 hover:text-orange-700 font-semibold">Continue shopping.</button>
          </div>
        ) : (
          <div className="mt-4 sm:mt-6 space-y-3 sm:space-y-4">
            {items.map((item) => {
              const product = item.product;
              const imageUrl = getProductImageUrl(product.images);
              return (
                <div key={item.id} className="grid gap-3 sm:gap-4 rounded-2xl sm:rounded-3xl border border-slate-200 bg-slate-50 p-3 sm:p-4 md:grid-cols-[100px_1fr_auto] md:items-center">
                  <img src={imageUrl} alt={product.name} className="h-24 w-24 sm:h-28 sm:w-28 rounded-2xl sm:rounded-3xl object-cover" />
                  <div className="min-w-0">
                    <p className="text-base sm:text-lg font-semibold text-slate-900 truncate">{product.name}</p>
                    <p className="text-xs sm:text-sm text-slate-500">{product.category}</p>
                    <div className="mt-2">
                      <ProductPrice product={product} />
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 sm:gap-3 md:items-end">
                    <button onClick={() => navigate(`/product/${product.id}`)} className="rounded-full bg-white px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-slate-900 ring-1 ring-slate-200 hover:bg-slate-100 w-full md:w-auto">
                      View
                    </button>
                    <button onClick={() => handleMoveToCart(product.id, item.id)} className="rounded-full bg-orange-600 px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-white hover:bg-orange-700 w-full md:w-auto">
                      Move to cart
                    </button>
                    <button onClick={() => handleRemove(item.id)} className="rounded-full bg-red-100 px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-red-700 hover:bg-red-200 w-full md:w-auto">
                      Remove
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default WishlistPage;
