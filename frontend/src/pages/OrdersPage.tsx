import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchUserOrders } from '../services/order';
import { getProductImageUrl } from '../services/product';
import { getComboImageUrl } from '../services/combo';
import { formatPrice } from '../utils/pricing';

const statusClasses: Record<string, string> = {
  placed: 'bg-blue-50 text-blue-700 ring-blue-200',
  shipped: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  delivered: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  cancelled: 'bg-red-50 text-red-700 ring-red-200',
  pending: 'bg-amber-50 text-amber-700 ring-amber-200',
  paid: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  failed: 'bg-red-50 text-red-700 ring-red-200',
};

const formatStatus = (value?: string) => (
  value ? value.charAt(0).toUpperCase() + value.slice(1).replace(/-/g, ' ') : 'Unknown'
);

const formatDate = (value?: string) => (
  value ? new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recent'
);

const shortOrderId = (id: string) => `#${id.slice(-8).toUpperCase()}`;

const getItemProduct = (item: any) => item.product || item.comboProduct || {};

const getItemImage = (item: any) => (
  item.comboProduct ? getComboImageUrl(item.comboProduct.image) : getProductImageUrl(item.image || item.variant?.images || item.product?.images)
);

const getItemLink = (item: any) => {
  if (item.comboProduct?.id) return `/combo/${item.comboProduct.id}`;
  if (item.product?.id) return `/product/${item.product.id}`;
  return '';
};

const getOrderItemCount = (order: any) => (
  (order.items || []).reduce((sum: number, item: any) => sum + Number(item.quantity || 1), 0)
);

const OrdersPage = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  const loadOrders = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchUserOrders();
      setOrders(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Could not load your orders.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const summary = useMemo(() => {
    const totalSpent = orders.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0);
    const totalItems = orders.reduce((sum, order) => sum + getOrderItemCount(order), 0);
    return { totalSpent, totalItems };
  }, [orders]);

  return (
    <div className="mx-auto max-w-6xl space-y-4 px-3 py-3 sm:space-y-6 sm:px-0 sm:py-0">
      <header className="rounded-2xl border border-maroon/10 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-maroon sm:text-sm">Order history</p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-950 sm:text-4xl">My Orders</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
              Track your purchases, payment status, and ordered items from MBR Fashion Hub.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:min-w-[360px]">
            <div className="rounded-2xl bg-cream px-3 py-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-maroon/70">Orders</p>
              <p className="mt-1 text-xl font-bold text-maroon">{orders.length}</p>
            </div>
            <div className="rounded-2xl bg-slate-100 px-3 py-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Items</p>
              <p className="mt-1 text-xl font-bold text-slate-950">{summary.totalItems}</p>
            </div>
            <div className="rounded-2xl bg-maroon px-3 py-3 text-white">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/70">Spent</p>
              <p className="mt-1 break-words text-[clamp(1rem,4.2vw,1.25rem)] font-bold leading-tight">{formatPrice(summary.totalSpent)}</p>
            </div>
          </div>
        </div>
      </header>

      {error && <p className="rounded-2xl bg-red-50 px-3 py-3 text-xs font-bold text-red-700">{error}</p>}

      {loading ? (
        <div className="grid gap-3">
          {[0, 1, 2].map((item) => (
            <div key={item} className="animate-pulse rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="h-5 w-40 rounded-full bg-slate-200" />
              <div className="mt-4 grid grid-cols-3 gap-2">
                <div className="h-16 rounded-2xl bg-slate-100" />
                <div className="h-16 rounded-2xl bg-slate-100" />
                <div className="h-16 rounded-2xl bg-slate-100" />
              </div>
            </div>
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-maroon/20 bg-white px-6 py-12 text-center shadow-sm">
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-maroon/70">Nothing here yet</p>
          <h2 className="mt-2 text-2xl font-black text-slate-950">No orders placed</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">When you checkout, your purchases and tracking details will appear here.</p>
          <Link to="/products" className="mt-5 inline-flex rounded-full bg-maroon px-5 py-3 text-sm font-bold text-white shadow-md shadow-maroon/20">
            Start shopping
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const visibleItems = expandedOrderId === order.id ? order.items : (order.items || []).slice(0, 2);

            return (
              <article key={order.id} className="overflow-hidden rounded-3xl border border-maroon/10 bg-white shadow-sm">
                <div className="p-4 sm:p-5">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-xl font-black text-slate-950 sm:text-2xl">{shortOrderId(order.id)}</h2>
                        <span className={`rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] ring-1 ${statusClasses[order.status] || 'bg-slate-50 text-slate-700 ring-slate-200'}`}>
                          {formatStatus(order.status)}
                        </span>
                        <span className={`rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] ring-1 ${statusClasses[order.paymentStatus] || 'bg-slate-50 text-slate-700 ring-slate-200'}`}>
                          Payment {formatStatus(order.paymentStatus)}
                        </span>
                      </div>
                      <p className="mt-1 text-xs font-semibold text-slate-400">{formatDate(order.createdAt)} - {getOrderItemCount(order)} item{getOrderItemCount(order) === 1 ? '' : 's'}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-950 px-4 py-3 text-white lg:text-right">
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/55">Order total</p>
                      <p className="mt-1 text-xl font-black">{formatPrice(Number(order.totalAmount || 0))}</p>
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-100 bg-slate-50/70 p-3 sm:p-4">
                  <div className="space-y-2">
                    {visibleItems.map((item: any) => {
                      const product = getItemProduct(item);
                      const itemLink = getItemLink(item);
                      const quantity = Number(item.quantity || 1);
                      const itemPrice = Number(item.price || 0);
                      const isCombo = Boolean(item.comboProduct);
                      const itemContent = (
                        <>
                          <img src={getItemImage(item)} alt={product.name || 'Ordered item'} className="h-20 w-20 shrink-0 rounded-2xl object-cover sm:h-24 sm:w-24" />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                              <div className="min-w-0">
                                <p className="line-clamp-2 text-sm font-black leading-5 text-slate-950 sm:text-base">{product.name || 'Product unavailable'}</p>
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                  <span className="rounded-full bg-cream px-2.5 py-1 text-[11px] font-bold text-maroon">{isCombo ? 'Combo offer' : product.category || 'Product'}</span>
                                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">Qty {quantity}</span>
                                  {item.colorName && <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">Color {item.colorName}</span>}
                                  {item.size && <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">Size {item.size}</span>}
                                </div>
                              </div>
                              <div className="shrink-0 sm:text-right">
                                <p className="text-[11px] font-bold text-slate-400">{formatPrice(itemPrice)} each</p>
                                <p className="mt-0.5 text-sm font-black text-slate-950">{formatPrice(itemPrice * quantity)}</p>
                              </div>
                            </div>
                          </div>
                        </>
                      );

                      return itemLink ? (
                        <Link
                          key={item.id}
                          to={itemLink}
                          className="flex gap-3 rounded-2xl bg-white p-2.5 shadow-sm ring-1 ring-slate-100 transition hover:-translate-y-0.5 hover:shadow-md hover:ring-maroon/20 sm:items-center sm:p-3"
                        >
                          {itemContent}
                        </Link>
                      ) : (
                        <div key={item.id} className="flex gap-3 rounded-2xl bg-white p-2.5 shadow-sm ring-1 ring-slate-100 sm:items-center sm:p-3">
                          {itemContent}
                        </div>
                      );
                    })}
                  </div>

                  {(order.items || []).length > 2 && (
                    <button
                      type="button"
                      onClick={() => setExpandedOrderId(expandedOrderId === order.id ? null : order.id)}
                      className="mt-3 w-full rounded-full border border-maroon/20 bg-white px-4 py-2.5 text-xs font-black uppercase tracking-[0.12em] text-maroon transition hover:bg-maroon/10"
                    >
                      {expandedOrderId === order.id ? 'Show fewer items' : `View all ${order.items.length} items`}
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default OrdersPage;
