import { useEffect, useState } from 'react';
import { fetchProducts, getProductImageUrl } from '../services/product';
import ProductCard from '../components/ProductCard';

const categories = ['shirts', 't-shirts', 'jeans'];

const ProductListPage = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [minPrice, setMinPrice] = useState('0');
  const [maxPrice, setMaxPrice] = useState('10000');

  const loadProducts = async () => {
    const filters: Record<string, string | number> = {};
    if (search) filters.search = search;
    if (category) filters.category = category;
    if (minPrice) filters.minPrice = minPrice;
    if (maxPrice) filters.maxPrice = maxPrice;
    const data = await fetchProducts(filters);
    setProducts(data);
  };

  useEffect(() => {
    loadProducts();
  }, []);

  return (
    <div className="space-y-8">
      <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-orange-500">Shop</p>
            <h1 className="text-3xl font-semibold text-slate-900">Browse the collection</h1>
          </div>
          <button onClick={loadProducts} className="rounded-full bg-orange-600 px-5 py-3 text-sm font-semibold text-white shadow hover:bg-orange-700">
            Refresh
          </button>
        </div>
      </header>

      <section className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <label className="text-sm font-semibold text-slate-700">Search</label>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              type="text"
              placeholder="Search by name"
              className="mt-2 w-full p-3"
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700">Category</label>
            <select value={category} onChange={(event) => setCategory(event.target.value)} className="mt-2 w-full p-3">
              <option value="">All</option>
              {categories.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700">Price range</label>
            <div className="mt-2 flex gap-2">
              <input value={minPrice} onChange={(event) => setMinPrice(event.target.value)} className="w-1/2 p-3" type="number" placeholder="Min" />
              <input value={maxPrice} onChange={(event) => setMaxPrice(event.target.value)} className="w-1/2 p-3" type="number" placeholder="Max" />
            </div>
          </div>
          <button onClick={loadProducts} className="w-full rounded-full bg-slate-900 px-4 py-3 text-white hover:bg-slate-800">
            Apply filters
          </button>
        </aside>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {products.length > 0 ? (
            products.map((product) => (
              <ProductCard
                key={product.id}
                id={product.id}
                name={product.name}
                price={product.price}
                image={getProductImageUrl(product.images?.[0])}
                category={product.category}
              />
            ))
          ) : (
            <p className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-slate-500 shadow-sm">
              No products match these filters.
            </p>
          )}
        </div>
      </section>
    </div>
  );
};

export default ProductListPage;
