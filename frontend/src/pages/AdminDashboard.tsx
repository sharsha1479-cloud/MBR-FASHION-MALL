import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchAdminOrders, fetchAdminUsers } from '../services/admin';
import { createProduct, deleteProduct, fetchProducts, getProductImageUrl, updateProduct } from '../services/product';
import { fetchCategories, createCategory, updateCategory, deleteCategory } from '../services/category';
import { createBanner, deleteBanner, fetchBanners, getBannerImageUrl, updateBanner } from '../services/banner';
import { categories as defaultCategories } from '../constants/categories';

type AdminSection = 'users' | 'orders' | 'categories' | 'products' | 'trending' | 'banners';

const sections: Array<{ group: string; items: Array<{ key: AdminSection; label: string }> }> = [
  { group: 'Management', items: [{ key: 'orders', label: 'Orders' }, { key: 'users', label: 'Users' }] },
  { group: 'Catalog', items: [{ key: 'categories', label: 'Categories' }, { key: 'products', label: 'Products' }, { key: 'trending', label: 'Trending' }, { key: 'banners', label: 'Banners' }] },
];

const AdminDashboard = () => {
  const [activeSection, setActiveSection] = useState<AdminSection>('orders');
  const [products, setProducts] = useState<any[]>([]);
  const [banners, setBanners] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({
    name: '',
    description: '',
    mrp: '',
    offerPrice: '',
    category: 'shirts',
    sizes: 'S,M,L',
    stock: '',
    isTrending: false,
  });
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<{ file: File; url: string }[]>([]);
  const [categories, setCategories] = useState<any[]>(defaultCategories);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryImage, setNewCategoryImage] = useState<File | null>(null);
  const [editingCategory, setEditingCategory] = useState<any | null>(null);
  const [editCategoryImage, setEditCategoryImage] = useState<File | null>(null);
  const [showAddCategoryForm, setShowAddCategoryForm] = useState(false);
  const [categoryMessage, setCategoryMessage] = useState('');
  const [bannerMessage, setBannerMessage] = useState('');
  const [editingBanner, setEditingBanner] = useState<any | null>(null);
  const [bannerForm, setBannerForm] = useState({
    link: '',
    sortOrder: '0',
    isActive: true,
  });
  const [bannerImage, setBannerImage] = useState<File | null>(null);
  const [viewingProductImage, setViewingProductImage] = useState<{ imageUrl: string; productName: string } | null>(null);
  const navigate = useNavigate();

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const [productData, userData, orderData, bannerData] = await Promise.all([
        fetchProducts(),
        fetchAdminUsers(),
        fetchAdminOrders(),
        fetchBanners(true),
      ]);
      setProducts(productData);
      setUsers(userData);
      setOrders(orderData);
      setBanners(Array.isArray(bannerData) ? bannerData : []);

      try {
        const categoryData = await fetchCategories();
        if (Array.isArray(categoryData) && categoryData.length > 0) {
          const mergedCategories = [...categoryData];
          defaultCategories.forEach((defaultCategory) => {
            if (!mergedCategories.some((item) => item.value === defaultCategory.value)) {
              mergedCategories.push(defaultCategory);
            }
          });
          setCategories(mergedCategories);
        } else {
          setCategoryMessage('No categories returned from server. Showing default categories.');
          setCategories(defaultCategories);
        }
      } catch (error) {
        console.error('Failed to load categories', error);
        setCategoryMessage('Some category data failed to load. Showing default categories.');
        setCategories(defaultCategories);
      }
    } catch (error) {
      console.error('Failed to load admin data', error);
      setMessage('Could not load admin dashboard data. Please ensure you are logged in and the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  useEffect(() => {
    return () => {
      imagePreviews.forEach(({ url }) => URL.revokeObjectURL(url));
    };
  }, [imagePreviews]);

  const categoriesWithCounts = useMemo(() => {
    return categories.map((category) => {
      const categoryProducts = products.filter((product) => product.category === category.value);
      const totalStock = categoryProducts.reduce((sum, product) => sum + (product.stock || 0), 0);
      return {
        ...category,
        products: categoryProducts.length,
        stock: totalStock,
      };
    });
  }, [categories, products]);

  const filteredProducts = useMemo(
    () => products.filter((product) =>
      [product.name, product.category].join(' ').toLowerCase().includes(search.toLowerCase())
    ),
    [products, search]
  );

  const filteredTrendingProducts = useMemo(
    () => filteredProducts,
    [filteredProducts]
  );

  const filteredUsers = useMemo(
    () => users.filter((user) =>
      [user.name, user.email, user.role].join(' ').toLowerCase().includes(search.toLowerCase())
    ),
    [users, search]
  );

  const filteredOrders = useMemo(
    () => orders.filter((order) =>
      [order.id, order.user?.name, order.user?.email, order.status, order.paymentStatus]
        .join(' ')
        .toLowerCase()
        .includes(search.toLowerCase())
    ),
    [orders, search]
  );

  const filteredCategories = useMemo(
    () => categoriesWithCounts.filter((category) =>
      [category.label, category.value].join(' ').toLowerCase().includes(search.toLowerCase())
    ),
    [categoriesWithCounts, search]
  );

  const filteredBanners = useMemo(
    () => banners.filter((banner) =>
      [banner.link, banner.isActive ? 'active' : 'hidden'].join(' ').toLowerCase().includes(search.toLowerCase())
    ),
    [banners, search]
  );

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this product?')) return;
    await deleteProduct(id);
    await loadAdminData();
  };

  const handleAddCategory = () => {
    setCategoryMessage('');
    setShowAddCategoryForm((visible) => !visible);
  };

  const handleSubmitCategory = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCategoryMessage('');

    if (!newCategoryName.trim()) {
      setCategoryMessage('Category name is required.');
      return;
    }

    if (!newCategoryImage) {
      setCategoryMessage('Category image is required.');
      return;
    }

    const formData = new FormData();
    formData.append('label', newCategoryName);
    formData.append('image', newCategoryImage);

    try {
      await createCategory(formData);
      setNewCategoryName('');
      setNewCategoryImage(null);
      setShowAddCategoryForm(false);
      setCategoryMessage('Category added successfully.');
      await loadAdminData();
    } catch (error) {
      setCategoryMessage('Failed to add category.');
    }
  };

  const handleEditCategory = (category: any) => {
    setCategoryMessage('');
    setEditingCategory(category);
    setEditCategoryImage(null);
    setShowAddCategoryForm(false);
  };

  const handleCancelEdit = () => {
    setEditingCategory(null);
    setEditCategoryImage(null);
    setCategoryMessage('');
  };

  const handleUpdateCategory = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCategoryMessage('');

    if (!editingCategory?.id) {
      setCategoryMessage('This category cannot be updated from the default list.');
      return;
    }

    if (!editCategoryImage) {
      setCategoryMessage('Please choose a new photo to upload.');
      return;
    }

    const formData = new FormData();
    formData.append('image', editCategoryImage);

    try {
      await updateCategory(editingCategory.id, formData);
      setEditingCategory(null);
      setEditCategoryImage(null);
      setCategoryMessage('Category photo updated successfully.');
      await loadAdminData();
    } catch (error) {
      setCategoryMessage('Failed to update category photo.');
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!window.confirm('Delete this category? This cannot be undone.')) return;
    try {
      await deleteCategory(id);
      setCategoryMessage('Category deleted successfully.');
      await loadAdminData();
    } catch (error) {
      setCategoryMessage('Failed to delete category.');
    }
  };

  const handleTrendingChange = async (productId: string, isTrending: boolean) => {
    const currentProducts = products;
    setProducts((items) =>
      items.map((product) => (product.id === productId ? { ...product, isTrending } : product))
    );

    const formData = new FormData();
    formData.append('isTrending', isTrending ? 'true' : 'false');

    try {
      await updateProduct(productId, formData);
    } catch (error: any) {
      setProducts(currentProducts);
      setMessage(error.response?.data?.message || 'Could not update trending status.');
    }
  };

  const handleAddProduct = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage('');

    const formData = new FormData();
    Object.entries(form).forEach(([key, value]) => formData.append(key, String(value)));
    formData.append('price', form.offerPrice);
    images.slice(0, 4).forEach((file) => formData.append('images', file));

    try {
      await createProduct(formData);
      setForm({ name: '', description: '', mrp: '', offerPrice: '', category: 'shirts', sizes: 'S,M,L', stock: '', isTrending: false });
      setImages([]);
      setImagePreviews((current) => {
        current.forEach(({ url }) => URL.revokeObjectURL(url));
        return [];
      });
      setMessage('The product was added successfully.');
      await loadAdminData();
    } catch (error: any) {
      setMessage(error.response?.data?.message || 'Could not add product.');
    }
  };

  const resetBannerForm = () => {
    setEditingBanner(null);
    setBannerForm({ link: '', sortOrder: '0', isActive: true });
    setBannerImage(null);
  };

  const handleEditBanner = (banner: any) => {
    setBannerMessage('');
    setEditingBanner(banner);
    setBannerForm({
      link: banner.link || '',
      sortOrder: String(banner.sortOrder ?? 0),
      isActive: Boolean(banner.isActive),
    });
    setBannerImage(null);
  };

  const handleSubmitBanner = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBannerMessage('');

    if (!editingBanner && banners.length >= 3) {
      setBannerMessage('You can add up to 3 homepage banners.');
      return;
    }

    if (!editingBanner && !bannerImage) {
      setBannerMessage('Banner image is required.');
      return;
    }

    const formData = new FormData();
    Object.entries(bannerForm).forEach(([key, value]) => formData.append(key, String(value)));
    if (bannerImage) {
      formData.append('image', bannerImage);
    }

    try {
      if (editingBanner) {
        await updateBanner(editingBanner.id, formData);
        setBannerMessage('Banner updated successfully.');
      } else {
        await createBanner(formData);
        setBannerMessage('Banner added successfully.');
      }
      resetBannerForm();
      await loadAdminData();
    } catch (error: any) {
      setBannerMessage(error.response?.data?.message || 'Could not save banner.');
    }
  };

  const handleDeleteBanner = async (id: string) => {
    if (!window.confirm('Delete this banner?')) return;

    try {
      await deleteBanner(id);
      setBannerMessage('Banner deleted successfully.');
      if (editingBanner?.id === id) resetBannerForm();
      await loadAdminData();
    } catch (error: any) {
      setBannerMessage(error.response?.data?.message || 'Could not delete banner.');
    }
  };

  const stats = {
    orders: orders.length,
    users: users.length,
    categories: categories.length,
    products: products.length,
    trending: products.filter((product) => product.isTrending).length,
    banners: banners.length,
  };

  const sectionTitle = {
    users: 'Manage users and permissions',
    orders: 'Review recent orders',
    categories: 'Browse categories',
    products: 'Manage product catalog',
    trending: 'Choose trending products',
    banners: 'Manage homepage banners',
  }[activeSection];

  return (
    <div className="min-h-screen w-full bg-slate-100 text-slate-900">
      <div className="w-full px-0 py-3 sm:py-4">
        <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="rounded-3xl bg-slate-950 p-5 text-slate-100 shadow-lg ring-1 ring-slate-200/10">
            <div className="mb-8">
              <p className="text-sm uppercase tracking-[0.32em] text-orange-200">Men&apos;s Fashion</p>
              <h1 className="mt-3 text-3xl font-semibold text-white">Admin Panel</h1>
              <p className="mt-3 text-sm text-slate-300">Powerful insights for orders, inventory, users, and catalog.</p>
            </div>

            <div className="space-y-4">
              {sections.map((group) => (
                <div key={group.group}>
                  <p className="mb-2 text-xs uppercase tracking-[0.28em] text-slate-400">{group.group}</p>
                  <div className="space-y-2 rounded-3xl bg-slate-900/80 p-3">
                    {group.items.map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => setActiveSection(item.key)}
                        className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-medium transition ${
                          activeSection === item.key
                            ? 'bg-orange-500 text-slate-950 shadow-inner'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        <span>{item.label}</span>
                        <span className="rounded-full bg-slate-950/70 px-3 py-1 text-xs font-semibold text-slate-200">
                          {stats[item.key] ?? 0}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </aside>

          <main className="space-y-5 min-w-0">
            {activeSection !== 'products' && (
              <section className="rounded-3xl bg-gradient-to-r from-orange-600 via-orange-500 to-rose-500 p-5 text-white shadow-lg">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm uppercase tracking-[0.28em] text-orange-100/90">Men&apos;s Fashion Admin Panel</p>
                    <h2 className="mt-2 text-3xl font-semibold">Stylish operations with fast access</h2>
                  </div>
                  <div className="inline-flex items-center gap-3 rounded-3xl bg-white/10 px-4 py-3 text-sm font-semibold text-white shadow">
                    <span className="rounded-xl bg-white/15 px-3 py-1">{orders.length} orders</span>
                    <span className="rounded-xl bg-white/15 px-3 py-1">{users.length} users</span>
                  </div>
                </div>
              </section>
            )}

            <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80 sm:p-5">
              <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                {activeSection !== 'products' && (
                  <div>
                    <p className="text-sm uppercase tracking-[0.28em] text-slate-500">Current section</p>
                    <h3 className="mt-2 text-2xl font-semibold text-slate-900">{sectionTitle}</h3>
                  </div>
                )}

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  {activeSection !== 'products' && (
                    <input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Search in this section"
                      className="w-full rounded-3xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200 sm:w-72"
                    />
                  )}
                  {activeSection === 'products' && (
                    <Link
                      to="/admin/product/new"
                      className="inline-flex items-center justify-center rounded-3xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow hover:bg-slate-800"
                    >
                      Add Product
                    </Link>
                  )}
                  {activeSection === 'categories' && (
                    <button
                      type="button"
                      onClick={() => handleAddCategory()}
                      className="inline-flex items-center justify-center rounded-3xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow hover:bg-slate-800"
                    >
                      Add Category
                    </button>
                  )}
                </div>
              </div>

              {message && (
                <p className="mb-5 rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700">
                  {message}
                </p>
              )}

              {activeSection === 'products' && (
                <div className="mb-5 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <form onSubmit={handleAddProduct} className="grid gap-4 md:grid-cols-3">
                    <input
                      value={form.name}
                      onChange={(event) => setForm({ ...form, name: event.target.value })}
                      required
                      placeholder="Name"
                      className="rounded-3xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm"
                    />
                    <input
                      value={form.mrp}
                      onChange={(event) => setForm({ ...form, mrp: event.target.value })}
                      required
                      type="number"
                      min={0}
                      placeholder="MRP"
                      className="rounded-3xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm"
                    />
                    <input
                      value={form.offerPrice}
                      onChange={(event) => setForm({ ...form, offerPrice: event.target.value })}
                      required
                      type="number"
                      min={0}
                      placeholder="Offer price"
                      className="rounded-3xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm"
                    />
                    <input
                      value={form.stock}
                      onChange={(event) => setForm({ ...form, stock: event.target.value })}
                      required
                      type="number"
                      min={0}
                      placeholder="Stock"
                      className="rounded-3xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm"
                    />
                    <select
                      value={form.category}
                      onChange={(event) => setForm({ ...form, category: event.target.value })}
                      className="rounded-3xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm"
                    >
                      {categories.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <input
                      value={form.sizes}
                      onChange={(event) => setForm({ ...form, sizes: event.target.value })}
                      required
                      placeholder="Sizes"
                      className="rounded-3xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm"
                    />
                    <input
                      name="images"
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(event) => {
                        const files = event.target.files;
                        if (!files) return;

                        const newFiles = Array.from(files);
                        const combinedFiles = [...images, ...newFiles];
                        if (combinedFiles.length > 4) {
                          setMessage('Please select up to 4 images.');
                          return;
                        }

                        const newPreviews = newFiles.map((file) => ({
                          file,
                          url: URL.createObjectURL(file),
                        }));

                        setImages(combinedFiles);
                        setImagePreviews((current) => [...current, ...newPreviews]);
                        setMessage('');
                      }}
                      required={images.length === 0}
                      className="rounded-3xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm"
                    />
                    <div className="mt-3 grid gap-2 sm:grid-cols-4">
                      {imagePreviews.map(({ file, url }) => (
                        <div key={file.name + file.size} className="relative overflow-hidden rounded-2xl border border-slate-200">
                          <img src={url} alt={file.name} className="h-20 w-full object-cover" />
                          <button
                            type="button"
                            onClick={() => {
                              setImages((current) => current.filter((item) => item !== file));
                              setImagePreviews((current) => {
                                URL.revokeObjectURL(url);
                                return current.filter((item) => item.file !== file);
                              });
                            }}
                            className="absolute right-1 top-1 rounded-full bg-white/90 p-1 text-xs text-slate-900 shadow"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                    <label className="flex items-center gap-3 rounded-3xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm">
                      <input
                        type="checkbox"
                        checked={form.isTrending}
                        onChange={(event) => setForm({ ...form, isTrending: event.target.checked })}
                        className="h-5 w-5 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                      />
                      Trending product
                    </label>
                    <textarea
                      value={form.description}
                      onChange={(event) => setForm({ ...form, description: event.target.value })}
                      required
                      placeholder="Description"
                      rows={3}
                      className="col-span-full rounded-3xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm"
                    />
                    <button
                      type="submit"
                      className="col-span-full rounded-3xl bg-orange-600 px-6 py-3 text-sm font-semibold text-white shadow hover:bg-orange-700"
                    >
                      Save product
                    </button>
                  </form>
                </div>
              )}

              {activeSection === 'products' && (
                <AdminTable
                  headers={['Name', 'Category', 'MRP', 'Offer Price', 'Stock', 'Trending', 'Status', 'Actions']}
                  rows={filteredProducts.map((product) => [
                    product.name,
                    product.category,
                    `Rs. ${Number(product.mrp ?? product.price).toFixed(2)}`,
                    `Rs. ${Number(product.offerPrice ?? product.price).toFixed(2)}`,
                    product.stock,
                    <TrendingSelect
                      value={!!product.isTrending}
                      onChange={(value) => handleTrendingChange(product.id, value)}
                    />,
                    'Active',
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                          onClick={() => setViewingProductImage({ imageUrl: getProductImageUrl(product.images), productName: product.name })}
                        className="rounded-full border border-blue-500 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
                      >
                        View
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate(`/admin/product/${product.id}`)}
                        className="rounded-full border border-orange-500 bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700 transition hover:bg-orange-100"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(product.id)}
                        className="rounded-full border border-slate-300 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-200"
                      >
                        Delete
                      </button>
                    </div>,
                  ])}
                />
              )}

              {activeSection === 'trending' && (
                <AdminTable
                  headers={['Name', 'Category', 'MRP', 'Offer Price', 'Stock', 'Trending', 'Actions']}
                  rows={filteredTrendingProducts.map((product) => [
                    product.name,
                    product.category,
                    `Rs. ${Number(product.mrp ?? product.price).toFixed(2)}`,
                    `Rs. ${Number(product.offerPrice ?? product.price).toFixed(2)}`,
                    product.stock,
                    <TrendingSelect
                      value={!!product.isTrending}
                      onChange={(value) => handleTrendingChange(product.id, value)}
                    />,
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setViewingProductImage({ imageUrl: getProductImageUrl(product.images), productName: product.name })}
                        className="rounded-full border border-blue-500 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
                      >
                        View
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate(`/admin/product/${product.id}`)}
                        className="rounded-full border border-orange-500 bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700 transition hover:bg-orange-100"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(product.id)}
                        className="rounded-full border border-slate-300 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-200"
                      >
                        Delete
                      </button>
                    </div>,
                  ])}
                />
              )}

              {activeSection === 'categories' && (
                <>
                  {showAddCategoryForm && (
                    <div className="mb-5 rounded-3xl border border-slate-200 bg-slate-50 p-5">
                      <h4 className="mb-4 text-lg font-semibold text-slate-900">Add New Category</h4>
                      {categoryMessage && (
                        <p className="mb-4 rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-700">
                          {categoryMessage}
                        </p>
                      )}
                      <form onSubmit={handleSubmitCategory} className="grid gap-4 md:grid-cols-3">
                        <input
                          value={newCategoryName}
                          onChange={(event) => setNewCategoryName(event.target.value)}
                          required
                          placeholder="Category name"
                          className="rounded-3xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm"
                        />
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(event) => setNewCategoryImage(event.target.files?.[0] || null)}
                          className="rounded-3xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm"
                        />
                        <button
                          type="submit"
                          className="rounded-3xl bg-orange-600 px-6 py-3 text-sm font-semibold text-white shadow hover:bg-orange-700"
                        >
                          Save category
                        </button>
                      </form>
                    </div>
                  )}

                  {editingCategory && (
                    <div className="mb-5 rounded-3xl border border-slate-200 bg-slate-50 p-5">
                      <h4 className="mb-4 text-lg font-semibold text-slate-900">Update Category Photo</h4>
                      <p className="mb-4 text-sm text-slate-600">Editing: <span className="font-semibold">{editingCategory.label}</span></p>
                      {categoryMessage && (
                        <p className="mb-4 rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-700">
                          {categoryMessage}
                        </p>
                      )}
                      <form onSubmit={handleUpdateCategory} className="grid gap-4 md:grid-cols-3">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(event) => setEditCategoryImage(event.target.files?.[0] || null)}
                          className="rounded-3xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm"
                        />
                        <div className="flex items-center gap-3">
                          <button
                            type="submit"
                            className="rounded-3xl bg-orange-600 px-6 py-3 text-sm font-semibold text-white shadow hover:bg-orange-700"
                          >
                            Update photo
                          </button>
                          <button
                            type="button"
                            onClick={handleCancelEdit}
                            className="rounded-3xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 shadow hover:bg-slate-100"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  {categoryMessage && !showAddCategoryForm && !editingCategory && (
                    <p className="mb-5 rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-700">
                      {categoryMessage}
                    </p>
                  )}
                  <AdminTable
                    headers={['Category', 'Products', 'Stock', 'Status', 'Actions']}
                    rows={filteredCategories.map((category) => [
                      <span className="font-medium">{category.label}</span>,
                      category.products,
                      category.stock,
                      'Active',
                      category.id ? (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleEditCategory(category)}
                            className="rounded-full border border-orange-500 bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700 transition hover:bg-orange-100"
                          >
                            Edit photo
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCategory(category.id)}
                            className="rounded-full border border-slate-300 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-200"
                          >
                            Delete
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-400">N/A</span>
                      ),
                    ])}
                  />
                </>
              )}

              {activeSection === 'banners' && (
                <>
                  <div className="mb-5 rounded-3xl border border-slate-200 bg-slate-50 p-5">
                    <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h4 className="text-lg font-semibold text-slate-900">
                          {editingBanner ? 'Edit Homepage Banner' : 'Add Homepage Banner'}
                        </h4>
                        <p className="mt-1 text-sm text-slate-500">{banners.length}/3 banners configured</p>
                      </div>
                      {editingBanner && (
                        <button
                          type="button"
                          onClick={resetBannerForm}
                          className="rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow hover:bg-slate-100"
                        >
                          Cancel edit
                        </button>
                      )}
                    </div>
                    {bannerMessage && (
                      <p className="mb-4 rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-700">
                        {bannerMessage}
                      </p>
                    )}
                    <form onSubmit={handleSubmitBanner} className="grid gap-4 md:grid-cols-3">
                      <input
                        value={bannerForm.link}
                        onChange={(event) => setBannerForm({ ...bannerForm, link: event.target.value })}
                        placeholder="/products or /products?category=shirts"
                        className="rounded-3xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm"
                      />
                      <input
                        value={bannerForm.sortOrder}
                        onChange={(event) => setBannerForm({ ...bannerForm, sortOrder: event.target.value })}
                        type="number"
                        placeholder="Sort order"
                        className="rounded-3xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm"
                      />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(event) => setBannerImage(event.target.files?.[0] || null)}
                        required={!editingBanner}
                        className="rounded-3xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm"
                      />
                      <label className="flex items-center gap-3 rounded-3xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm">
                        <input
                          type="checkbox"
                          checked={bannerForm.isActive}
                          onChange={(event) => setBannerForm({ ...bannerForm, isActive: event.target.checked })}
                          className="h-5 w-5 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                        />
                        Active on homepage
                      </label>
                      <button
                        type="submit"
                        disabled={!editingBanner && banners.length >= 3}
                        className="col-span-full rounded-3xl bg-orange-600 px-6 py-3 text-sm font-semibold text-white shadow hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {editingBanner ? 'Update banner' : 'Save banner'}
                      </button>
                    </form>
                  </div>

                  <AdminTable
                    headers={['Preview', 'Link', 'Order', 'Status', 'Actions']}
                    rows={filteredBanners.map((banner) => [
                      <img
                        src={getBannerImageUrl(banner.image)}
                        alt="Homepage banner"
                        className="h-16 w-28 rounded-2xl object-cover"
                      />,
                      banner.link || 'No link',
                      banner.sortOrder,
                      banner.isActive ? 'Active' : 'Hidden',
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleEditBanner(banner)}
                          className="rounded-full border border-orange-500 bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700 transition hover:bg-orange-100"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteBanner(banner.id)}
                          className="rounded-full border border-slate-300 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-200"
                        >
                          Delete
                        </button>
                      </div>,
                    ])}
                  />
                </>
              )}

              {activeSection === 'users' && (
                <AdminTable
                  headers={['Name', 'Email', 'Role', 'Joined']}
                  rows={filteredUsers.map((user) => [
                    user.name,
                    user.email,
                    user.role,
                    new Date(user.createdAt).toLocaleDateString(),
                  ])}
                />
              )}

              {activeSection === 'orders' && (
                <AdminTable
                  headers={['Order ID', 'User', 'Products', 'Total', 'Payment', 'Status', 'Created']}
                  rows={filteredOrders.map((order) => [
                    order.id,
                    `${order.user?.name || 'Unknown'} (${order.user?.email || 'unknown'})`,
                    order.items?.map((item: any) => `${item.product?.name || 'Item'} x${item.quantity}`).join(', '),
                    `Rs. ${Number(order.totalAmount).toFixed(2)}`,
                    order.paymentStatus || 'pending',
                    order.status,
                    new Date(order.createdAt).toLocaleDateString(),
                  ])}
                />
              )}

              {loading && <p className="mt-5 text-sm text-slate-500">Loading admin data...</p>}
            </div>
          </main>
        </div>
      </div>

      {viewingProductImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="relative max-h-[90vh] w-full max-w-2xl overflow-auto rounded-3xl bg-white shadow-2xl">
            <button
              type="button"
              onClick={() => setViewingProductImage(null)}
              className="absolute right-4 top-4 z-10 rounded-full bg-slate-100 p-2 text-slate-700 hover:bg-slate-200"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="flex flex-col items-center justify-center gap-4 p-6">
              <h3 className="text-2xl font-semibold text-slate-900">{viewingProductImage.productName}</h3>
              <img
                src={viewingProductImage.imageUrl}
                alt={viewingProductImage.productName}
                className="max-h-[70vh] w-auto object-contain rounded-2xl shadow-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const AdminTable = ({ headers, rows }: { headers: string[]; rows: Array<Array<string | number | ReactNode>> }) => (
  <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
    <div className="border-b border-slate-200 bg-slate-50 px-6 py-4 text-sm font-semibold text-slate-700">Records</div>
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse text-sm">
        <thead>
          <tr className="bg-slate-100 text-left text-xs uppercase tracking-[0.16em] text-slate-500">
            <th className="w-10 px-4 py-3"><input type="checkbox" /></th>
            {headers.map((header) => (
              <th key={header} className="px-4 py-3">{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={headers.length + 1} className="px-4 py-10 text-center text-sm text-slate-500">
                No records found.
              </td>
            </tr>
          ) : (
            rows.map((row, rowIndex) => (
              <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                <td className="px-4 py-4"><input type="checkbox" /></td>
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} className="px-4 py-4 text-slate-700">
                    {cell}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
    <div className="border-t border-slate-200 bg-slate-50 px-6 py-3 text-xs text-slate-500">
      {rows.length} record{rows.length === 1 ? '' : 's'}
    </div>
  </div>
);

const TrendingSelect = ({ value, onChange }: { value: boolean; onChange: (value: boolean) => void }) => (
  <select
    value={value ? 'true' : 'false'}
    onChange={(event) => onChange(event.target.value === 'true')}
    className={`rounded-full border px-3 py-2 text-xs font-semibold shadow-sm focus:outline-none focus:ring-2 ${
      value
        ? 'border-orange-500 bg-orange-50 text-orange-700 focus:ring-orange-200'
        : 'border-slate-300 bg-slate-100 text-slate-700 focus:ring-slate-200'
    }`}
  >
    <option value="true">Trending</option>
    <option value="false">Not trending</option>
  </select>
);

export default AdminDashboard;
