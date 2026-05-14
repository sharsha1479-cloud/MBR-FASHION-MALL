import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { fetchProducts, getProductImageUrl } from '../services/product';
import { fetchCategories } from '../services/category';
import { fetchCombos, getComboImageUrl } from '../services/combo';
import ProductCard from '../components/ProductCard';
import ComboCard from '../components/ComboCard';
import { categories as defaultCategories } from '../constants/categories';

const ProductListPage = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [comboProducts, setComboProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>(defaultCategories);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [minPrice, setMinPrice] = useState('0');
  const [maxPrice, setMaxPrice] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [searchParams, setSearchParams] = useSearchParams();

  const loadProducts = useCallback(async (categoryOverride?: string, searchOverride?: string) => {
    const filters: Record<string, string | number> = {};
    const finalSearch = searchOverride !== undefined ? searchOverride : search;
    if (finalSearch) filters.search = finalSearch;
    const finalCategory = categoryOverride !== undefined ? categoryOverride : category;
    if (finalCategory && finalCategory !== 'combos') filters.category = finalCategory;
    if (minPrice !== '') filters.minPrice = minPrice;
    if (maxPrice !== '') filters.maxPrice = maxPrice;
    
    const [data, combos] = await Promise.all([
      finalCategory === 'combos' ? Promise.resolve([]) : fetchProducts(filters),
      fetchCombos(),
    ]);
    setProducts(data);
    setComboProducts(Array.isArray(combos) ? combos : []);
  }, [category, search, minPrice, maxPrice]);

  const filteredComboProducts = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const min = minPrice !== '' ? Number(minPrice) : 0;
    const max = maxPrice !== '' ? Number(maxPrice) : Number.POSITIVE_INFINITY;

    if (category && category !== 'combos') return [];

    return comboProducts.filter((combo) => {
      const price = Number(combo.offerPrice ?? 0);
      const text = [combo.name, combo.description].join(' ').toLowerCase();
      return (!normalizedSearch || text.includes(normalizedSearch)) && price >= min && price <= max;
    });
  }, [category, comboProducts, maxPrice, minPrice, search]);

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
    const searchParam = (searchParams.get('search') || '').trim();
    setCategory(categoryParam);
    setSearch(searchParam);
    loadProducts(categoryParam, searchParam);
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

  const filterControls = (
    <div className="grid grid-cols-2 gap-2.5 sm:block sm:space-y-4">
      <div className="col-span-2">
        <label className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-600 sm:text-sm sm:normal-case sm:tracking-normal">Search</label>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          type="text"
          placeholder="Search by name or category"
          className="mt-1.5 w-full rounded-full border border-slate-300 px-4 py-2.5 text-sm sm:mt-2 sm:rounded-lg sm:p-3"
        />
      </div>
      <div>
        <label className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-600 sm:text-sm sm:normal-case sm:tracking-normal">Category</label>
        <select
          value={category}
          onChange={(event) => {
            const nextCategory = event.target.value.trim().toLowerCase();
            setCategory(nextCategory);
            updateCategoryQuery(nextCategory);
          }}
          className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm sm:mt-2 sm:rounded-lg sm:p-3"
        >
          <option value="">All</option>
          <option value="combos">Combo Offers</option>
          {categories.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <div className="col-span-2 sm:col-span-1">
        <label className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-600 sm:text-sm sm:normal-case sm:tracking-normal">Price range</label>
        <div className="mt-1.5 grid grid-cols-2 gap-2 sm:mt-2">
          <input
            value={minPrice}
            onChange={(event) => setMinPrice(event.target.value.replace(/\D/g, ''))}
            className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm sm:rounded-lg sm:p-3"
            type="number"
            inputMode="numeric"
            min="0"
            step="1"
            placeholder="0"
          />
          <input
            value={maxPrice}
            onChange={(event) => setMaxPrice(event.target.value.replace(/\D/g, ''))}
            className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm sm:rounded-lg sm:p-3"
            type="number"
            inputMode="numeric"
            min="0"
            step="1"
            placeholder="Max"
          />
        </div>
      </div>
      <button onClick={() => loadProducts()} className="col-span-2 w-full rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 sm:py-3">
        Apply filters
      </button>
    </div>
  );

  return (
    <div className="space-y-3 px-3 py-3 sm:space-y-6 sm:px-0 sm:py-0 md:space-y-8">
      <header className="rounded-xl border border-maroon/10 bg-white p-3 shadow-sm sm:rounded-3xl sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-maroon sm:text-sm sm:tracking-[0.3em]">Shop</p>
            <h1 className="mt-1 text-lg font-semibold leading-6 text-slate-950 sm:mt-2 sm:text-2xl md:text-3xl">Browse the collection</h1>
            {category ? (
              <p className="mt-0.5 truncate text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 sm:mt-2 sm:text-sm sm:tracking-[0.3em]">{category.replace(/-/g, ' ')} collection</p>
            ) : (
              <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 sm:mt-2 sm:text-sm sm:tracking-[0.3em]">All products</p>
            )}
          </div>
          <button onClick={() => loadProducts()} className="shrink-0 rounded-full bg-maroon px-3 py-2 text-xs font-semibold text-white shadow hover:bg-maroon/90 sm:px-5 sm:py-3 sm:text-sm">
            Refresh
          </button>
        </div>
      </header>

      <div className="lg:hidden">
        <button
          type="button"
          onClick={() => setFiltersOpen((current) => !current)}
          aria-expanded={filtersOpen}
          className="flex w-full items-center justify-between rounded-full border border-maroon/20 bg-white px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-sm"
        >
          <span className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-maroon/10 text-maroon">
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 5h18" />
                <path d="M7 12h10" />
                <path d="M10 19h4" />
              </svg>
            </span>
            Filters & search
          </span>
          <span className="text-xs uppercase tracking-[0.18em] text-slate-500">{filtersOpen ? 'Hide' : 'Show'}</span>
        </button>
        {filtersOpen && (
          <div className="mt-2 rounded-xl border border-maroon/10 bg-white p-3 shadow-sm">
            {filterControls}
          </div>
        )}
      </div>

      <section className="grid grid-cols-1 gap-3 sm:gap-6 md:gap-8 lg:grid-cols-[280px_1fr]">
        <aside className="hidden h-fit rounded-3xl border border-maroon/10 bg-white p-6 shadow-sm lg:sticky lg:top-28 lg:block">
          {filterControls}
        </aside>

        <div className="grid grid-cols-2 gap-2.5 sm:gap-4 md:grid-cols-2 md:gap-6 xl:grid-cols-3">
          {products.length > 0 || filteredComboProducts.length > 0 ? (
            <>
              {products.map((product) => (
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
              ))}
              {filteredComboProducts.map((combo) => (
                <ComboCard
                  key={combo.id}
                  name={combo.name}
                  description={combo.description}
                  mrp={combo.mrp}
                  offerPrice={combo.offerPrice}
                  image={getComboImageUrl(combo.image)}
                  stock={combo.stock}
                  link={`/combo/${combo.id}`}
                />
              ))}
            </>
          ) : (
            <p className="col-span-2 rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500 shadow-sm xl:col-span-3">
              No products match these filters.
            </p>
          )}
        </div>
      </section>
    </div>
  );
};

export default ProductListPage;
