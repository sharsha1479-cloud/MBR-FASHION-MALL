import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { fetchProducts, getProductImageUrl } from '../services/product';
import { fetchCategories } from '../services/category';
import ProductCard from '../components/ProductCard';
import { categories as defaultCategories } from '../constants/categories';

const ProductListPage = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>(defaultCategories);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [minPrice, setMinPrice] = useState('0');
  const [maxPrice, setMaxPrice] = useState('');

  const [searchParams, setSearchParams] = useSearchParams();

  const loadProducts = useCallback(async (categoryOverride?: string) => {
    const filters: Record<string, string | number> = {};
    if (search) filters.search = search;
    const finalCategory = categoryOverride !== undefined ? categoryOverride : category;
    if (finalCategory) filters.category = finalCategory;
    if (minPrice !== '') filters.minPrice = minPrice;
    if (maxPrice !== '') filters.maxPrice = maxPrice;
    
    console.log('🔍 Loading products with filters:', filters);
    
    const data = await fetchProducts(filters);
    console.log('📦 Products returned:', data);
    setProducts(data);
  }, [category, search, minPrice, maxPrice]);

  const updateCategoryQuery = (selectedCategory: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (selectedCategory) {
      params.set('category', selectedCategory);
    } else {
      params.delete('category');
    }
    setSearchParams(params);
  };

  useEffect(() => {
    const categoryParam = (searchParams.get('category') || '').trim().toLowerCase();
    setCategory(categoryParam);
    loadProducts(categoryParam);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const result = await fetchCategories();
        if (Array.isArray(result) && result.length > 0) {
          const mergedCategories = [...defaultCategories];
          result.forEach((category) => {
            if (!mergedCategories.some((item) => item.value === category.value)) {
              mergedCategories.push(category);
            }
          });
          setCategories(mergedCategories);
        } else {
          setCategories(defaultCategories);
        }
      } catch (error) {
        console.error('Failed to load categories', error);
        setCategories(defaultCategories);
      }
    };

    loadCategories();
  }, []);

  return (
    <div className="space-y-4 sm:space-y-6 md:space-y-8">
      <header className="rounded-2xl sm:rounded-3xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:gap-4 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <p className="text-xs sm:text-sm uppercase tracking-[0.3em] text-orange-500">Shop</p>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-semibold text-slate-900 mt-1 sm:mt-2">Browse the collection</h1>
            {category ? (
              <p className="mt-1 sm:mt-2 text-xs sm:text-sm uppercase tracking-[0.3em] text-slate-500">{category.replace(/-/g, ' ')} collection</p>
            ) : (
              <p className="mt-1 sm:mt-2 text-xs sm:text-sm uppercase tracking-[0.3em] text-slate-500">All products</p>
            )}
          </div>
          <button onClick={() => loadProducts()} className="rounded-full bg-orange-600 px-4 sm:px-5 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-white shadow hover:bg-orange-700 w-full sm:w-auto">
            Refresh
          </button>
        </div>
      </header>

      <section className="grid gap-4 sm:gap-6 md:gap-8 grid-cols-1 lg:grid-cols-[280px_1fr]">
        <aside className="space-y-3 sm:space-y-4 rounded-2xl sm:rounded-3xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm order-1 lg:order-none h-fit">
          <div>
            <label className="text-xs sm:text-sm font-semibold text-slate-700">Search</label>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              type="text"
              placeholder="Search by name"
              className="mt-2 w-full p-2 sm:p-3 border border-slate-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="text-xs sm:text-sm font-semibold text-slate-700">Category</label>
            <select
              value={category}
              onChange={(event) => {
                const nextCategory = event.target.value.trim().toLowerCase();
                setCategory(nextCategory);
                updateCategoryQuery(nextCategory);
              }}
              className="mt-2 w-full p-2 sm:p-3 border border-slate-300 rounded-lg text-sm"
            >
              <option value="">All</option>
              {categories.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs sm:text-sm font-semibold text-slate-700">Price range</label>
            <div className="mt-2 flex gap-2">
              <input
                value={minPrice}
                onChange={(event) => setMinPrice(event.target.value.replace(/\D/g, ''))}
                className="w-1/2 p-2 sm:p-3 border border-slate-300 rounded-lg text-sm"
                type="number"
                inputMode="numeric"
                min="0"
                step="1"
                placeholder="0"
              />
              <input
                value={maxPrice}
                onChange={(event) => setMaxPrice(event.target.value.replace(/\D/g, ''))}
                className="w-1/2 p-2 sm:p-3 border border-slate-300 rounded-lg text-sm"
                type="number"
                inputMode="numeric"
                min="0"
                step="1"
                placeholder="Max"
              />
            </div>
          </div>
          <button onClick={() => loadProducts()} className="w-full rounded-full bg-slate-900 px-4 py-2 sm:py-3 text-xs sm:text-sm text-white hover:bg-slate-800 font-semibold">
            Apply filters
          </button>
        </aside>

        <div className="grid gap-3 sm:gap-4 md:gap-6 grid-cols-2 sm:grid-cols-2 md:grid-cols-2 xl:grid-cols-3">
          {products.length > 0 ? (
            products.map((product) => (
              <ProductCard
                key={product.id}
                id={product.id}
                name={product.name}
                price={product.price}
                mrp={product.mrp}
                offerPrice={product.offerPrice}
                image={getProductImageUrl(product.images)}
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
