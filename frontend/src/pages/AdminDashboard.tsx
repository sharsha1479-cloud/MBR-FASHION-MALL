import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { fetchAdminOrders, fetchAdminUsers } from '../services/admin';
import { createProduct, deleteProduct, fetchProducts } from '../services/product';

type AdminSection = 'users' | 'orders' | 'categories' | 'products';

const sections: Array<{ group: string; items: Array<{ key: AdminSection; label: string }> }> = [
  { group: 'Authentication and Authorization', items: [{ key: 'users', label: 'Users' }] },
  { group: 'Orders', items: [{ key: 'orders', label: 'Orders' }] },
  { group: 'Products', items: [{ key: 'categories', label: 'Categories' }, { key: 'products', label: 'Products' }] },
];

const AdminDashboard = () => {
  const [activeSection, setActiveSection] = useState<AdminSection>('orders');
  const [products, setProducts] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    category: 'shirts',
    sizes: 'S,M,L',
    stock: '',
  });
  const [image, setImage] = useState<File | null>(null);

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const [productData, userData, orderData] = await Promise.all([
        fetchProducts(),
        fetchAdminUsers(),
        fetchAdminOrders(),
      ]);
      setProducts(productData);
      setUsers(userData);
      setOrders(orderData);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const categories = useMemo(() => {
    const byName = new Map<string, { name: string; products: number; stock: number }>();
    products.forEach((product) => {
      const current = byName.get(product.category) || { name: product.category, products: 0, stock: 0 };
      current.products += 1;
      current.stock += product.stock || 0;
      byName.set(product.category, current);
    });
    return Array.from(byName.values());
  }, [products]);

  const filteredProducts = products.filter((product) =>
    [product.name, product.category].join(' ').toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this product?')) return;
    await deleteProduct(id);
    await loadAdminData();
  };

  const handleAddProduct = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage('');

    const formData = new FormData();
    Object.entries(form).forEach(([key, value]) => formData.append(key, value));
    if (image) formData.append('image', image);

    try {
      await createProduct(formData);
      setForm({ name: '', description: '', price: '', category: 'shirts', sizes: 'S,M,L', stock: '' });
      setImage(null);
      setMessage('The product was added successfully.');
      await loadAdminData();
    } catch (error: any) {
      setMessage(error.response?.data?.message || 'Could not add product.');
    }
  };

  const sectionTitle = {
    users: 'Select user to change',
    orders: 'Select order to change',
    categories: 'Select category to change',
    products: 'Select product to change',
  }[activeSection];

  return (
    <div className="min-h-[calc(100vh-164px)] bg-white text-[#333]">
      <div className="border-b border-[#2f6f8f] bg-[#417690] px-5 py-4 text-white">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <h1 className="text-2xl font-normal text-[#f5dd5d]">Mens Fashion administration</h1>
          <p className="text-xs uppercase tracking-wide">Welcome, Admin. View site / Change password / Log out</p>
        </div>
      </div>

      <div className="bg-[#79aec8] px-5 py-2 text-xs text-white">Home › Administration</div>

      {message && (
        <div className="border-b border-green-200 bg-green-100 px-8 py-3 text-sm text-green-800">
          {message}
        </div>
      )}

      <div className="grid min-h-[620px] grid-cols-1 md:grid-cols-[230px_1fr]">
        <aside className="border-r border-[#ddd] bg-[#f8f8f8] p-4">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Start typing to filter..."
            className="mb-3 w-full rounded-none border border-[#ccc] px-2 py-1 text-xs"
          />

          {sections.map((section) => (
            <div key={section.group} className="mb-6">
              <div className="bg-[#79aec8] px-3 py-2 text-xs font-semibold uppercase text-white">{section.group}</div>
              {section.items.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setActiveSection(item.key)}
                  className={`flex w-full items-center justify-between rounded-none border-x border-b border-[#eee] px-3 py-2 text-left text-xs ${
                    activeSection === item.key ? 'bg-[#ffffcc] text-[#333]' : 'bg-white text-[#447e9b]'
                  }`}
                >
                  <span>{item.label}</span>
                  <span className="text-[#70bf2b]">+ Add</span>
                </button>
              ))}
            </div>
          ))}
        </aside>

        <main className="p-8">
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <h2 className="text-xl font-light text-[#666]">{sectionTitle}</h2>
            {activeSection === 'products' && (
              <Link to="/admin/product/new" className="rounded-full bg-[#999] px-4 py-2 text-xs font-bold uppercase text-white">
                Add product +
              </Link>
            )}
          </div>

          {activeSection === 'products' && (
            <>
              <form onSubmit={handleAddProduct} className="mb-7 border border-[#ddd] bg-[#f8f8f8] p-4">
                <div className="grid gap-3 md:grid-cols-3">
                  <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required placeholder="Name" className="rounded-none border-[#ccc] px-2 py-2 text-sm" />
                  <input value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} required type="number" min={0} placeholder="Price" className="rounded-none border-[#ccc] px-2 py-2 text-sm" />
                  <input value={form.stock} onChange={(event) => setForm({ ...form, stock: event.target.value })} required type="number" min={0} placeholder="Stock" className="rounded-none border-[#ccc] px-2 py-2 text-sm" />
                  <select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} className="rounded-none border-[#ccc] px-2 py-2 text-sm">
                    <option value="shirts">shirts</option>
                    <option value="t-shirts">t-shirts</option>
                    <option value="jeans">jeans</option>
                  </select>
                  <input value={form.sizes} onChange={(event) => setForm({ ...form, sizes: event.target.value })} required placeholder="Sizes" className="rounded-none border-[#ccc] px-2 py-2 text-sm" />
                  <input onChange={(event) => setImage(event.target.files?.[0] || null)} required type="file" accept="image/*" className="rounded-none border-[#ccc] bg-white px-2 py-2 text-sm" />
                  <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} required placeholder="Description" rows={3} className="rounded-none border-[#ccc] px-2 py-2 text-sm md:col-span-3" />
                </div>
                <button type="submit" className="mt-3 rounded bg-[#417690] px-4 py-2 text-xs font-bold uppercase text-white">Save product</button>
              </form>

              <ActionBar count={filteredProducts.length} />
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-y border-[#ddd] bg-[#f8f8f8] text-left text-xs uppercase text-[#666]">
                    <th className="w-10 px-2 py-2"><input type="checkbox" /></th>
                    <th className="px-2 py-2">Name</th>
                    <th className="px-2 py-2">Category</th>
                    <th className="px-2 py-2">Price</th>
                    <th className="px-2 py-2">Stock</th>
                    <th className="px-2 py-2">Is Active</th>
                    <th className="px-2 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((product) => (
                    <tr key={product.id} className="border-b border-[#eee]">
                      <td className="px-2 py-2"><input type="checkbox" /></td>
                      <td className="px-2 py-2"><Link to={`/admin/product/${product.id}`} className="text-[#447e9b]">{product.name}</Link></td>
                      <td className="px-2 py-2">{product.category}</td>
                      <td className="px-2 py-2">{Number(product.price).toFixed(2)}</td>
                      <td className="px-2 py-2">{product.stock}</td>
                      <td className="px-2 py-2 text-[#70bf2b]">✓</td>
                      <td className="px-2 py-2"><button onClick={() => handleDelete(product.id)} className="text-red-700">Delete</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {activeSection === 'categories' && (
            <AdminTable
              headers={['Name', 'Products', 'Total Stock', 'Is Active']}
              rows={categories.map((category) => [category.name, category.products, category.stock, '✓'])}
            />
          )}

          {activeSection === 'users' && (
            <AdminTable
              headers={['Name', 'Email', 'Role', 'Joined']}
              rows={users.map((user) => [user.name, user.email, user.role, new Date(user.createdAt).toLocaleDateString()])}
            />
          )}

          {activeSection === 'orders' && (
            <AdminTable
              headers={['Order ID', 'User', 'Products', 'Total', 'Payment', 'Order status', 'Created']}
              rows={orders.map((order) => [
                order.id,
                `${order.user?.name || 'Unknown'} (${order.user?.email || 'unknown'})`,
                order.items
                  ?.map((item: any) => `${item.product?.name || 'Item'} x${item.quantity}`)
                  .join(', '),
                `Rs. ${Number(order.totalAmount).toFixed(2)}`,
                order.paymentStatus || 'pending',
                order.status,
                new Date(order.createdAt).toLocaleDateString(),
              ])}
            />
          )}

          {loading && <p className="mt-5 text-sm text-[#666]">Loading admin data...</p>}
        </main>
      </div>
    </div>
  );
};

const ActionBar = ({ count }: { count: number }) => (
  <div className="mb-3 border border-[#eee] bg-[#f8f8f8] px-3 py-2 text-xs text-[#666]">
    <label className="mr-2">Action:</label>
    <select className="mr-2 rounded-none border-[#ccc] px-8 py-1">
      <option>---------</option>
    </select>
    <button className="rounded border border-[#aaa] bg-white px-2 py-1">Go</button>
    <span className="ml-2">0 of {count} selected</span>
  </div>
);

const AdminTable = ({ headers, rows }: { headers: string[]; rows: Array<Array<string | number>> }) => (
  <>
    <ActionBar count={rows.length} />
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr className="border-y border-[#ddd] bg-[#f8f8f8] text-left text-xs uppercase text-[#666]">
          <th className="w-10 px-2 py-2"><input type="checkbox" /></th>
          {headers.map((header) => <th key={header} className="px-2 py-2">{header}</th>)}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, rowIndex) => (
          <tr key={rowIndex} className="border-b border-[#eee]">
            <td className="px-2 py-2"><input type="checkbox" /></td>
            {row.map((cell, cellIndex) => (
              <td key={cellIndex} className={`px-2 py-2 ${cell === '✓' ? 'text-[#70bf2b]' : ''}`}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
    <p className="mt-3 text-xs text-[#666]">{rows.length} records</p>
  </>
);

export default AdminDashboard;
