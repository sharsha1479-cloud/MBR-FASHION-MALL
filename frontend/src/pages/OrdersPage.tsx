import { useEffect, useState } from 'react';
import { fetchUserOrders } from '../services/order';
import { getProductImageUrl } from '../services/product';

const OrdersPage = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadOrders = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchUserOrders();
      setOrders(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Could not load your orders.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="rounded-2xl sm:rounded-3xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm">
        <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900">My Orders</h1>
        {error && <p className="mt-3 sm:mt-4 rounded-2xl bg-red-100 px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-red-700">{error}</p>}
        {loading ? (
          <p className="mt-6 text-xs sm:text-sm text-slate-500">Loading your orders...</p>
        ) : orders.length === 0 ? (
          <div className="mt-6 text-xs sm:text-sm text-slate-500">You have not placed any orders yet.</div>
        ) : (
          <div className="mt-4 sm:mt-6 space-y-4 sm:space-y-6">
            {orders.map((order) => (
              <div key={order.id} className="rounded-2xl sm:rounded-3xl border border-slate-200 bg-slate-50 p-4 sm:p-6 shadow-sm">
                <div className="flex flex-col gap-3 sm:gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-orange-500">Order ID</p>
                    <p className="mt-2 font-semibold text-slate-900 text-sm sm:text-base">{order.id}</p>
                  </div>
                  <div className="grid gap-2 text-xs sm:text-sm text-slate-600 md:grid-cols-3">
                    <div>
                      <p className="font-semibold text-slate-900">Status</p>
                      <p className="text-xs">{order.status}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">Payment</p>
                      <p className="text-xs">{order.paymentStatus}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">Total</p>
                      <p className="text-xs">Rs. {Number(order.totalAmount).toFixed(0)}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 sm:mt-6 space-y-3 sm:space-y-4">
                  {order.items.map((item: any) => (
                    <div key={item.id} className="grid gap-3 sm:gap-4 rounded-2xl sm:rounded-3xl border border-slate-200 bg-white p-3 sm:p-4 md:grid-cols-[100px_1fr] md:items-center">
                      <img src={getProductImageUrl(item.product.images)} alt={item.product.name} className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl sm:rounded-3xl object-cover" />
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 text-sm sm:text-base truncate">{item.product.name}</p>
                        <p className="text-xs sm:text-sm text-slate-500">Qty: {item.quantity}</p>
                        <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-slate-600">Rs. {Number(item.price).toFixed(0)} each</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default OrdersPage;
