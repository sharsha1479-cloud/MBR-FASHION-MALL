import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchAdminOrders, fetchAdminUsers } from '../services/admin';
import { createProduct, deleteProduct, fetchProducts, getProductImageUrl, updateProduct } from '../services/product';
import { fetchCategories, createCategory, updateCategory, deleteCategory } from '../services/category';
import { createBanner, deleteBanner, fetchBanners, getBannerImageUrl, updateBanner } from '../services/banner';
import { createCombo, deleteCombo, fetchCombos, getComboImageUrl, updateCombo } from '../services/combo';
import { createCoupon, deleteCoupon, fetchCoupons, updateCoupon } from '../services/coupon';
import { createStoreInventoryRecord, deleteStoreInventoryRecord, fetchStoreInventory, updateStoreInventoryRecord } from '../services/storeInventory';
import { categories as defaultCategories } from '../constants/categories';

type AdminSection = 'dashboard' | 'notifications' | 'users' | 'orders' | 'storeInventory' | 'categories' | 'products' | 'trending' | 'combos' | 'banners' | 'coupons';

type AdminNotification = {
  id: string;
  title: string;
  message: string;
  orderId?: string;
  createdAt: string;
  read: boolean;
};

type ComboVariantForm = {
  id?: string;
  colorName: string;
  colorCode: string;
  mrp: number | '';
  offerPrice: number | '';
  sizeStocks: { size: string; stock: number | '' }[];
  existingImages: string[];
  images: File[];
  previews: { file: File; url: string }[];
};

const parseNumberInput = (value: string) => (value === '' ? '' : Number(value));
const toNumber = (value: number | '') => (value === '' ? 0 : Number(value));

const createEmptyComboVariant = (): ComboVariantForm => ({
  colorName: 'Default',
  colorCode: '#94a3b8',
  mrp: 0,
  offerPrice: 0,
  sizeStocks: [
    { size: 'S', stock: 0 },
    { size: 'M', stock: 0 },
    { size: 'L', stock: 0 },
  ],
  existingImages: [],
  images: [],
  previews: [],
});

const sections: Array<{ group: string; items: Array<{ key: AdminSection; label: string }> }> = [
  { group: 'Overview', items: [{ key: 'dashboard', label: 'Dashboard' }, { key: 'notifications', label: 'Notifications' }] },
  { group: 'Management', items: [{ key: 'orders', label: 'Orders' }, { key: 'storeInventory', label: 'Store Inventory' }, { key: 'users', label: 'Users' }] },
  { group: 'Catalog', items: [{ key: 'categories', label: 'Categories' }, { key: 'products', label: 'Products' }, { key: 'trending', label: 'Trending' }, { key: 'combos', label: 'Combos' }, { key: 'banners', label: 'Banners' }, { key: 'coupons', label: 'Coupons' }] },
];

const AdminDashboard = () => {
  const [activeSection, setActiveSection] = useState<AdminSection>('dashboard');
  const [products, setProducts] = useState<any[]>([]);
  const [combos, setCombos] = useState<any[]>([]);
  const [banners, setBanners] = useState<any[]>([]);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [productPage, setProductPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [newOrderNotice, setNewOrderNotice] = useState('');
  const [notifications, setNotifications] = useState<AdminNotification[]>(() => {
    try {
      const stored = localStorage.getItem('adminNotifications');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const knownOrderIdsRef = useRef<Set<string>>(new Set());
  const hasLoadedOrdersRef = useRef(false);
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
  const [comboMessage, setComboMessage] = useState('');
  const [editingCombo, setEditingCombo] = useState<any | null>(null);
  const [comboForm, setComboForm] = useState({
    name: '',
    description: '',
    isActive: true,
  });
  const [comboVariants, setComboVariants] = useState<ComboVariantForm[]>([createEmptyComboVariant()]);
  const [couponMessage, setCouponMessage] = useState('');
  const [editingCoupon, setEditingCoupon] = useState<any | null>(null);
  const [couponForm, setCouponForm] = useState({
    code: '',
    discountType: 'percentage',
    discountValue: '',
    minOrderAmount: '',
    isActive: true,
  });
  const [activeStoreId, setActiveStoreId] = useState('');
  const [inventoryMessage, setInventoryMessage] = useState('');
  const [editingInventory, setEditingInventory] = useState<any | null>(null);
  const [inventoryForm, setInventoryForm] = useState({
    entryType: 'online',
    productId: '',
    customName: '',
    customCategory: '',
    customPrice: '',
    size: 'Default',
    availableStock: '',
    soldCount: '0',
  });
  const [viewingProductImage, setViewingProductImage] = useState<{ imageUrl: string; productName: string } | null>(null);
  const navigate = useNavigate();

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const [productData, userData, orderData, bannerData, couponData, storeData] = await Promise.all([
        fetchProducts(),
        fetchAdminUsers(),
        fetchAdminOrders(),
        fetchBanners(true),
        fetchCoupons(),
        fetchStoreInventory(),
      ]);
      setProducts(productData);
      setUsers(userData);
      setOrders(orderData);
      knownOrderIdsRef.current = new Set((Array.isArray(orderData) ? orderData : []).map((order: any) => order.id));
      hasLoadedOrdersRef.current = true;
      setBanners(Array.isArray(bannerData) ? bannerData : []);
      setCoupons(Array.isArray(couponData) ? couponData : []);
      const normalizedStores = Array.isArray(storeData) ? storeData : [];
      setStores(normalizedStores);
      setActiveStoreId((current) => current || normalizedStores[0]?.id || '');

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

    try {
      const comboData = await fetchCombos(true);
      setCombos(Array.isArray(comboData) ? comboData : []);
    } catch (error) {
      console.error('Failed to load combo products', error);
      setCombos([]);
      setComboMessage('Combo products need the backend migration before they can be managed.');
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  useEffect(() => {
    localStorage.setItem('adminNotifications', JSON.stringify(notifications.slice(0, 50)));
  }, [notifications]);

  useEffect(() => {
    const notifyNewOrder = (order: any) => {
      const total = Number(order.totalAmount || 0).toFixed(0);
      const text = `New order received - Rs. ${total}`;
      setNewOrderNotice(text);
      setNotifications((current) => {
        if (current.some((notification) => notification.orderId === order.id)) {
          return current;
        }

        return [
          {
            id: `order-${order.id}`,
            title: 'New order received',
            message: `Order ${order.id} was placed for Rs. ${total}.`,
            orderId: order.id,
            createdAt: new Date().toISOString(),
            read: false,
          },
          ...current,
        ].slice(0, 50);
      });

      if ('Notification' in window) {
        if (Notification.permission === 'granted') {
          new Notification('New order received', { body: text });
        } else if (Notification.permission === 'default') {
          Notification.requestPermission().then((permission) => {
            if (permission === 'granted') {
              new Notification('New order received', { body: text });
            }
          });
        }
      }
    };

    const checkForNewOrders = async () => {
      try {
        const latestOrders = await fetchAdminOrders();
        if (!Array.isArray(latestOrders)) return;

        if (!hasLoadedOrdersRef.current) {
          knownOrderIdsRef.current = new Set(latestOrders.map((order) => order.id));
          hasLoadedOrdersRef.current = true;
          setOrders(latestOrders);
          return;
        }

        const newOrders = latestOrders.filter((order) => !knownOrderIdsRef.current.has(order.id));
        if (newOrders.length > 0) {
          notifyNewOrder(newOrders[0]);
        }

        knownOrderIdsRef.current = new Set(latestOrders.map((order) => order.id));
        setOrders(latestOrders);
      } catch (error) {
        console.error('Failed to check new orders', error);
      }
    };

    const interval = window.setInterval(checkForNewOrders, 20000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!newOrderNotice) return;
    const timeout = window.setTimeout(() => setNewOrderNotice(''), 7000);
    return () => window.clearTimeout(timeout);
  }, [newOrderNotice]);

  useEffect(() => {
    setProductPage(1);
  }, [productSearch, products.length]);

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
      [
        product.name,
        product.category,
        product.mrp,
        product.offerPrice,
        product.price,
        product.stock,
        product.isTrending ? 'trending' : 'not trending',
      ].join(' ').toLowerCase().includes(productSearch.toLowerCase())
    ),
    [products, productSearch]
  );
  const productPageSize = 10;
  const productPageCount = Math.max(1, Math.ceil(filteredProducts.length / productPageSize));
  const currentProductPage = Math.min(productPage, productPageCount);
  const paginatedProducts = useMemo(
    () => filteredProducts.slice((currentProductPage - 1) * productPageSize, currentProductPage * productPageSize),
    [currentProductPage, filteredProducts]
  );

  const filteredTrendingProducts = useMemo(
    () => products.filter((product) =>
      [product.name, product.category].join(' ').toLowerCase().includes(search.toLowerCase())
    ),
    [products, search]
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

  const filteredCombos = useMemo(
    () => combos.filter((combo) =>
      [combo.name, combo.description, combo.isActive ? 'active' : 'hidden'].join(' ').toLowerCase().includes(search.toLowerCase())
    ),
    [combos, search]
  );

  const filteredCoupons = useMemo(
    () => coupons.filter((coupon) =>
      [coupon.code, coupon.discountType, coupon.isActive ? 'active' : 'hidden'].join(' ').toLowerCase().includes(search.toLowerCase())
    ),
    [coupons, search]
  );

  const activeStore = useMemo(
    () => stores.find((store) => store.id === activeStoreId) || stores[0],
    [activeStoreId, stores]
  );

  const activeStoreInventory = useMemo(
    () => (activeStore?.inventory || []).filter((record: any) =>
      [
        record.product?.name,
        record.product?.category,
        record.customName,
        record.customCategory,
        record.size,
        record.availableStock,
        record.soldCount,
        record.remainingStock,
      ].join(' ').toLowerCase().includes(search.toLowerCase())
    ),
    [activeStore, search]
  );

  const dashboardStats = useMemo(() => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);

    const recentOrders = orders.filter((order) => new Date(order.createdAt) >= thirtyDaysAgo);
    const paidRecentOrders = recentOrders.filter((order) => order.paymentStatus === 'paid');
    const revenueLast30Days = paidRecentOrders.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0);

    return {
      revenueLast30Days,
      newOrdersLast30Days: recentOrders.length,
      totalOrders: orders.length,
      totalUsers: users.length,
      recentOrders: orders.slice(0, 5),
    };
  }, [orders, users]);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this product?')) return;
    await deleteProduct(id);
    await loadAdminData();
  };

  const resetInventoryForm = () => {
    setEditingInventory(null);
    setInventoryForm({ entryType: 'online', productId: '', customName: '', customCategory: '', customPrice: '', size: 'Default', availableStock: '', soldCount: '0' });
  };

  const handleSubmitInventory = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setInventoryMessage('');

    if (!activeStore?.id) {
      setInventoryMessage('Choose a store first.');
      return;
    }

    try {
      if (editingInventory) {
        await updateStoreInventoryRecord(editingInventory.id, {
          availableStock: inventoryForm.availableStock,
          soldCount: inventoryForm.soldCount,
        });
        setInventoryMessage('Inventory record updated.');
      } else {
        await createStoreInventoryRecord({
          storeId: activeStore.id,
          productId: inventoryForm.entryType === 'online' ? inventoryForm.productId : undefined,
          customName: inventoryForm.entryType === 'offline' ? inventoryForm.customName : undefined,
          customCategory: inventoryForm.entryType === 'offline' ? inventoryForm.customCategory : undefined,
          customPrice: inventoryForm.entryType === 'offline' ? inventoryForm.customPrice : undefined,
          size: inventoryForm.size,
          availableStock: inventoryForm.availableStock,
          soldCount: inventoryForm.soldCount,
        });
        setInventoryMessage('Product added to store inventory.');
      }
      resetInventoryForm();
      await loadAdminData();
    } catch (error: any) {
      setInventoryMessage(error.response?.data?.message || 'Could not save inventory record.');
    }
  };

  const handleEditInventory = (record: any) => {
    setInventoryMessage('');
    setEditingInventory(record);
    setInventoryForm({
      entryType: record.productId ? 'online' : 'offline',
      productId: record.productId,
      customName: record.customName || '',
      customCategory: record.customCategory || '',
      customPrice: record.customPrice === null || record.customPrice === undefined ? '' : String(record.customPrice),
      size: record.size || 'Default',
      availableStock: String(record.availableStock ?? 0),
      soldCount: String(record.soldCount ?? 0),
    });
  };

  const handleDeleteInventory = async (id: string) => {
    if (!window.confirm('Delete this inventory record?')) return;
    try {
      await deleteStoreInventoryRecord(id);
      setInventoryMessage('Inventory record deleted.');
      if (editingInventory?.id === id) resetInventoryForm();
      await loadAdminData();
    } catch (error: any) {
      setInventoryMessage(error.response?.data?.message || 'Could not delete inventory record.');
    }
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

  const resetComboForm = () => {
    setEditingCombo(null);
    comboVariants.forEach((variant) => variant.previews.forEach(({ url }) => URL.revokeObjectURL(url)));
    setComboForm({
      name: '',
      description: '',
      isActive: true,
    });
    setComboVariants([createEmptyComboVariant()]);
  };

  const handleEditCombo = (combo: any) => {
    setComboMessage('');
    setEditingCombo(combo);
    comboVariants.forEach((variant) => variant.previews.forEach(({ url }) => URL.revokeObjectURL(url)));
    setComboForm({
      name: combo.name || '',
      description: combo.description || '',
      isActive: Boolean(combo.isActive),
    });
    setComboVariants((combo.variants?.length ? combo.variants : [combo]).map((variant: any) => ({
      id: variant.id,
      colorName: variant.colorName || 'Default',
      colorCode: variant.colorCode || '#94a3b8',
      mrp: Number(variant.mrp ?? combo.mrp ?? 0),
      offerPrice: Number(variant.offerPrice ?? combo.offerPrice ?? 0),
      sizeStocks: (variant.sizeStocks?.length
        ? variant.sizeStocks
        : (variant.sizes || combo.sizes || []).map((sizeOption: string) => ({
            size: sizeOption,
            stock: Number(variant.stock ?? combo.stock ?? 0),
          }))).map((item: any) => ({
            size: String(item.size || ''),
            stock: Number(item.stock || 0),
          })),
      existingImages: Array.isArray(variant.images) && variant.images.length > 0 ? variant.images : (combo.image ? [combo.image] : []),
      images: [],
      previews: [],
    })));
  };

  const updateComboVariant = (index: number, updates: Partial<ComboVariantForm>) => {
    setComboVariants((current) => current.map((variant, variantIndex) => (
      variantIndex === index ? { ...variant, ...updates } : variant
    )));
  };

  const updateComboVariantSize = (variantIndex: number, sizeIndex: number, updates: Partial<{ size: string; stock: number | '' }>) => {
    setComboVariants((current) => current.map((variant, index) => (
      index === variantIndex
        ? {
            ...variant,
            sizeStocks: variant.sizeStocks.map((sizeRow, rowIndex) => (
              rowIndex === sizeIndex ? { ...sizeRow, ...updates } : sizeRow
            )),
          }
        : variant
    )));
  };

  const addComboVariant = () => {
    setComboVariants((current) => [...current, { ...createEmptyComboVariant(), colorName: `Color ${current.length + 1}` }]);
  };

  const removeComboVariant = (index: number) => {
    if (comboVariants.length === 1) {
      setComboMessage('A combo must have at least one variant.');
      return;
    }
    setComboVariants((current) => {
      current[index].previews.forEach(({ url }) => URL.revokeObjectURL(url));
      return current.filter((_, variantIndex) => variantIndex !== index);
    });
  };

  const addComboVariantSize = (variantIndex: number) => {
    setComboVariants((current) => current.map((variant, index) => (
      index === variantIndex ? { ...variant, sizeStocks: [...variant.sizeStocks, { size: '', stock: 0 }] } : variant
    )));
  };

  const removeComboVariantSize = (variantIndex: number, sizeIndex: number) => {
    setComboVariants((current) => current.map((variant, index) => (
      index === variantIndex ? { ...variant, sizeStocks: variant.sizeStocks.filter((_, rowIndex) => rowIndex !== sizeIndex) } : variant
    )));
  };

  const handleSubmitCombo = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setComboMessage('');

    const missingImages = comboVariants.some((variant) => variant.existingImages.length + variant.images.length === 0);
    if (missingImages) {
      setComboMessage('Each combo variant needs at least one image.');
      return;
    }

    const missingSizes = comboVariants.some((variant) => variant.sizeStocks.length === 0 || variant.sizeStocks.some((item) => !item.size.trim()));
    if (missingSizes) {
      setComboMessage('Each combo variant needs at least one size with a size name.');
      return;
    }

    const formData = new FormData();
    Object.entries(comboForm).forEach(([key, value]) => formData.append(key, String(value)));
    formData.append('variants', JSON.stringify(comboVariants.map((variant) => ({
      id: variant.id,
      colorName: variant.colorName,
      colorCode: variant.colorCode,
      mrp: toNumber(variant.mrp),
      offerPrice: toNumber(variant.offerPrice),
      stock: variant.sizeStocks.reduce((sum, item) => sum + toNumber(item.stock), 0),
      sizes: variant.sizeStocks.map((item) => item.size).join(','),
      sizeStocks: variant.sizeStocks.map((item) => ({ ...item, stock: toNumber(item.stock) })),
      existingImages: variant.existingImages,
    }))));
    comboVariants.forEach((variant, index) => {
      variant.images.slice(0, 4).forEach((file) => formData.append(`comboVariantImages_${index}`, file));
    });

    try {
      if (editingCombo) {
        await updateCombo(editingCombo.id, formData);
        setComboMessage('Combo product updated successfully.');
      } else {
        await createCombo(formData);
        setComboMessage('Combo product added successfully.');
      }
      resetComboForm();
      await loadAdminData();
    } catch (error: any) {
      setComboMessage(error.response?.data?.message || 'Could not save combo product.');
    }
  };

  const handleDeleteCombo = async (id: string) => {
    if (!window.confirm('Delete this combo product?')) return;

    try {
      await deleteCombo(id);
      setComboMessage('Combo product deleted successfully.');
      if (editingCombo?.id === id) resetComboForm();
      await loadAdminData();
    } catch (error: any) {
      setComboMessage(error.response?.data?.message || 'Could not delete combo product.');
    }
  };

  const resetCouponForm = () => {
    setEditingCoupon(null);
    setCouponForm({
      code: '',
      discountType: 'percentage',
      discountValue: '',
      minOrderAmount: '',
      isActive: true,
    });
    setCouponMessage('');
  };

  const handleEditCoupon = (coupon: any) => {
    setEditingCoupon(coupon);
    setCouponForm({
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: String(coupon.discountValue ?? ''),
      minOrderAmount: coupon.minOrderAmount == null ? '' : String(coupon.minOrderAmount),
      isActive: Boolean(coupon.isActive),
    });
    setCouponMessage('');
  };

  const handleSubmitCoupon = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCouponMessage('');

    const payload = {
      code: couponForm.code,
      discountType: couponForm.discountType,
      discountValue: Number(couponForm.discountValue),
      minOrderAmount: couponForm.minOrderAmount,
      isActive: couponForm.isActive,
    };

    try {
      if (editingCoupon) {
        await updateCoupon(editingCoupon.id, payload);
        setCouponMessage('Coupon updated successfully.');
      } else {
        await createCoupon(payload);
        setCouponMessage('Coupon created successfully.');
      }
      resetCouponForm();
      await loadAdminData();
    } catch (error: any) {
      setCouponMessage(error.response?.data?.message || 'Could not save coupon.');
    }
  };

  const handleDeleteCoupon = async (id: string) => {
    if (!window.confirm('Delete this coupon?')) return;

    try {
      await deleteCoupon(id);
      setCouponMessage('Coupon deleted successfully.');
      if (editingCoupon?.id === id) resetCouponForm();
      await loadAdminData();
    } catch (error: any) {
      setCouponMessage(error.response?.data?.message || 'Could not delete coupon.');
    }
  };

  const markNotificationsRead = () => {
    setNotifications((current) => current.map((notification) => ({ ...notification, read: true })));
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  const stats = {
    dashboard: '',
    notifications: notifications.filter((notification) => !notification.read).length,
    orders: orders.length,
    storeInventory: stores.reduce((sum, store) => sum + (store.inventory?.length || 0), 0),
    users: users.length,
    categories: categories.length,
    products: products.length,
    trending: products.filter((product) => product.isTrending).length,
    combos: combos.length,
    banners: banners.length,
    coupons: coupons.length,
  };

  const sectionTitle = {
    dashboard: 'Business performance overview',
    notifications: 'Review admin notifications',
    users: 'Manage users and permissions',
    orders: 'Review recent orders',
    storeInventory: 'Manage inventory across store locations',
    categories: 'Browse categories',
    products: 'Manage product catalog',
    trending: 'Choose trending products',
    combos: 'Manage combo products',
    banners: 'Manage homepage banners',
    coupons: 'Manage checkout coupons',
  }[activeSection];

  return (
    <div className="min-h-screen w-full bg-slate-100 text-slate-900">
      {newOrderNotice && (
        <div className="fixed right-4 top-4 z-[60] w-[calc(100vw-2rem)] max-w-sm rounded-3xl border border-green-200 bg-white p-4 shadow-2xl shadow-slate-950/20">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-700">
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
                <path d="M3 6h18" />
                <path d="M16 10a4 4 0 0 1-8 0" />
              </svg>
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black text-slate-950">New order received</p>
              <p className="mt-1 text-xs font-semibold text-slate-500">{newOrderNotice}</p>
            </div>
            <button
              type="button"
              onClick={() => setNewOrderNotice('')}
              className="rounded-full border-0 bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600 shadow-none hover:bg-slate-200"
            >
              Close
            </button>
          </div>
        </div>
      )}
      <div className="w-full px-0 py-3 sm:py-4">
        <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="rounded-3xl bg-slate-950 p-5 text-slate-100 shadow-lg ring-1 ring-slate-200/10">
            <div className="mb-8">
              <p className="text-sm uppercase tracking-[0.32em] text-white/80">Men&apos;s Fashion</p>
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
                            ? 'bg-maroon text-white shadow-inner'
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
              <section className="rounded-3xl bg-maroon p-5 text-white shadow-lg shadow-maroon/20">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm uppercase tracking-[0.28em] text-white/80">Men&apos;s Fashion Admin Panel</p>
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
                  {activeSection !== 'products' && activeSection !== 'dashboard' && activeSection !== 'notifications' && (
                    <input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Search in this section"
                      className="w-full rounded-3xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-maroon focus:outline-none focus:ring-2 focus:ring-maroon/20 sm:w-72"
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

              {activeSection === 'dashboard' && (
                <div className="space-y-5">
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    {[
                      {
                        label: 'Revenue last 30 days',
                        value: `Rs. ${dashboardStats.revenueLast30Days.toFixed(0)}`,
                        detail: 'Paid orders only',
                        tone: 'bg-slate-950 text-white',
                      },
                      {
                        label: 'New orders',
                        value: dashboardStats.newOrdersLast30Days,
                        detail: 'Placed in last 30 days',
                        tone: 'bg-maroon/10 text-maroon',
                      },
                      {
                        label: 'Total orders',
                        value: dashboardStats.totalOrders,
                        detail: 'All-time platform orders',
                        tone: 'bg-blue-50 text-blue-700',
                      },
                      {
                        label: 'Total users',
                        value: dashboardStats.totalUsers,
                        detail: 'Registered accounts',
                        tone: 'bg-emerald-50 text-emerald-700',
                      },
                    ].map((card) => (
                      <div key={card.label} className={`rounded-3xl p-5 shadow-sm ring-1 ring-slate-200/70 ${card.tone}`}>
                        <p className="text-xs font-bold uppercase tracking-[0.2em] opacity-70">{card.label}</p>
                        <p className="mt-4 text-3xl font-black">{card.value}</p>
                        <p className="mt-2 text-sm font-semibold opacity-70">{card.detail}</p>
                      </div>
                    ))}
                  </div>

                  <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
                    <section className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-500">Latest activity</p>
                          <h4 className="mt-2 text-xl font-semibold text-slate-950">Recent orders</h4>
                        </div>
                        <button
                          type="button"
                          onClick={() => setActiveSection('orders')}
                          className="rounded-full bg-slate-950 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                        >
                          View all orders
                        </button>
                      </div>

                      {dashboardStats.recentOrders.length === 0 ? (
                        <p className="rounded-2xl bg-white px-4 py-4 text-sm text-slate-500">No orders have been placed yet.</p>
                      ) : (
                        <div className="space-y-3">
                          {dashboardStats.recentOrders.map((order) => (
                            <div key={order.id} className="grid gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70 md:grid-cols-[1fr_auto_auto] md:items-center">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-bold text-slate-950">{order.id}</p>
                                <p className="mt-1 text-xs text-slate-500">
                                  {order.user?.name || 'Unknown user'} • {new Date(order.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                              <span className="w-fit rounded-full bg-cream px-3 py-1 text-xs font-bold capitalize text-maroon">
                                {order.status}
                              </span>
                              <p className="text-sm font-black text-slate-950">Rs. {Number(order.totalAmount).toFixed(0)}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </section>

                    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                      <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-500">Snapshot</p>
                      <h4 className="mt-2 text-xl font-semibold text-slate-950">Store health</h4>
                      <div className="mt-5 space-y-3">
                        <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                          <span className="text-sm font-semibold text-slate-600">Products</span>
                          <span className="text-sm font-black text-slate-950">{products.length}</span>
                        </div>
                        <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                          <span className="text-sm font-semibold text-slate-600">Trending</span>
                          <span className="text-sm font-black text-slate-950">{products.filter((product) => product.isTrending).length}</span>
                        </div>
                        <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                          <span className="text-sm font-semibold text-slate-600">Active coupons</span>
                          <span className="text-sm font-black text-slate-950">{coupons.filter((coupon) => coupon.isActive).length}</span>
                        </div>
                        <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                          <span className="text-sm font-semibold text-slate-600">Combos</span>
                          <span className="text-sm font-black text-slate-950">{combos.length}</span>
                        </div>
                      </div>
                    </section>
                  </div>
                </div>
              )}

              {activeSection === 'notifications' && (
                <div className="space-y-5">
                  <div className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-5 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-500">Notifications</p>
                      <h4 className="mt-2 text-xl font-semibold text-slate-950">
                        {notifications.length} notification{notifications.length === 1 ? '' : 's'}
                      </h4>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={markNotificationsRead}
                        disabled={notifications.length === 0}
                        className="rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Mark all read
                      </button>
                      <button
                        type="button"
                        onClick={clearNotifications}
                        disabled={notifications.length === 0}
                        className="rounded-full bg-slate-950 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Clear all
                      </button>
                    </div>
                  </div>

                  {notifications.length === 0 ? (
                    <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center">
                      <h4 className="text-lg font-semibold text-slate-950">No notifications yet</h4>
                      <p className="mt-2 text-sm text-slate-500">New order alerts will appear here automatically.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {notifications.map((notification) => (
                        <div
                          key={notification.id}
                          className={`rounded-3xl border p-4 shadow-sm ${
                            notification.read
                              ? 'border-slate-200 bg-white'
                              : 'border-green-200 bg-green-50'
                          }`}
                        >
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-black text-slate-950">{notification.title}</p>
                                {!notification.read && (
                                  <span className="rounded-full bg-green-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-white">
                                    New
                                  </span>
                                )}
                              </div>
                              <p className="mt-1 text-sm text-slate-600">{notification.message}</p>
                              <p className="mt-2 text-xs font-semibold text-slate-400">
                                {new Date(notification.createdAt).toLocaleString()}
                              </p>
                            </div>
                            {notification.orderId && (
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveSection('orders');
                                  setSearch(notification.orderId || '');
                                  setNotifications((current) =>
                                    current.map((item) =>
                                      item.id === notification.id ? { ...item, read: true } : item
                                    )
                                  );
                                }}
                                className="w-full rounded-full bg-maroon px-4 py-2 text-xs font-semibold text-secondary shadow hover:bg-maroon/90 sm:w-auto"
                              >
                                View order
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeSection === 'storeInventory' && (
                <div className="space-y-5">
                  <div className="grid gap-3 sm:grid-cols-4">
                    {stores.map((store) => {
                      const active = activeStore?.id === store.id;
                      const available = (store.inventory || []).reduce((sum: number, record: any) => sum + Number(record.availableStock || 0), 0);
                      const remaining = (store.inventory || []).reduce((sum: number, record: any) => sum + Number(record.remainingStock || 0), 0);

                      return (
                        <button
                          key={store.id}
                          type="button"
                          onClick={() => {
                            setActiveStoreId(store.id);
                            resetInventoryForm();
                            setInventoryMessage('');
                          }}
                          className={`rounded-3xl p-4 text-left shadow-sm ring-1 transition ${
                            active
                              ? 'bg-maroon text-white ring-maroon'
                              : 'bg-white text-slate-950 ring-slate-200 hover:bg-maroon/5 hover:ring-maroon/20'
                          }`}
                        >
                          <p className={`text-xs font-black uppercase tracking-[0.18em] ${active ? 'text-white/70' : 'text-slate-400'}`}>{store.name}</p>
                          <p className="mt-3 text-2xl font-black">{store.inventory?.length || 0}</p>
                          <p className={`mt-1 text-xs font-semibold ${active ? 'text-white/70' : 'text-slate-500'}`}>
                            {remaining} remaining / {available} available
                          </p>
                        </button>
                      );
                    })}
                  </div>

                  <form onSubmit={handleSubmitInventory} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                    <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.24em] text-maroon">{activeStore?.name || 'Store inventory'}</p>
                        <h4 className="mt-1 text-xl font-semibold text-slate-950">{editingInventory ? 'Edit stock record' : 'Add product to store'}</h4>
                      </div>
                      {editingInventory && (
                        <button
                          type="button"
                          onClick={resetInventoryForm}
                          className="rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-100"
                        >
                          Cancel edit
                        </button>
                      )}
                    </div>
                    <div className="grid gap-3 md:grid-cols-6">
                      <select
                        value={inventoryForm.entryType}
                        onChange={(event) => setInventoryForm({
                          ...inventoryForm,
                          entryType: event.target.value,
                          productId: '',
                          customName: '',
                          customCategory: '',
                          customPrice: '',
                          size: 'Default',
                        })}
                        disabled={!!editingInventory}
                        className="rounded-3xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm disabled:bg-slate-100"
                      >
                        <option value="online">Online product</option>
                        <option value="offline">Offline product</option>
                      </select>
                      {inventoryForm.entryType === 'online' ? (
                        <select
                          value={inventoryForm.productId}
                          onChange={(event) => {
                            const product = products.find((item) => item.id === event.target.value);
                            setInventoryForm({
                              ...inventoryForm,
                              productId: event.target.value,
                              size: product?.sizes?.[0] || 'Default',
                            });
                          }}
                          disabled={!!editingInventory}
                          required={inventoryForm.entryType === 'online'}
                          className="rounded-3xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm disabled:bg-slate-100"
                        >
                          <option value="">Select product</option>
                          {products.map((product) => (
                            <option key={product.id} value={product.id}>{product.name}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          value={inventoryForm.customName}
                          onChange={(event) => setInventoryForm({ ...inventoryForm, customName: event.target.value })}
                          disabled={!!editingInventory}
                          required={inventoryForm.entryType === 'offline'}
                          placeholder="Offline product name"
                          className="rounded-3xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm disabled:bg-slate-100"
                        />
                      )}
                      <select
                        value={inventoryForm.size}
                        onChange={(event) => setInventoryForm({ ...inventoryForm, size: event.target.value })}
                        disabled={!!editingInventory}
                        className="rounded-3xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm disabled:bg-slate-100"
                      >
                        {(() => {
                          const selectedProduct = products.find((product) => product.id === inventoryForm.productId);
                          const sizes = inventoryForm.entryType === 'online' && selectedProduct?.sizes?.length ? selectedProduct.sizes : ['Default', 'S', 'M', 'L', 'XL', 'XXL'];
                          return sizes.map((size: string) => <option key={size} value={size}>{size}</option>);
                        })()}
                      </select>
                      {inventoryForm.entryType === 'offline' && (
                        <>
                          <input
                            value={inventoryForm.customCategory}
                            onChange={(event) => setInventoryForm({ ...inventoryForm, customCategory: event.target.value })}
                            disabled={!!editingInventory}
                            placeholder="Category"
                            className="rounded-3xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm disabled:bg-slate-100"
                          />
                          <input
                            value={inventoryForm.customPrice}
                            onChange={(event) => setInventoryForm({ ...inventoryForm, customPrice: event.target.value.replace(/[^\d.]/g, '') })}
                            disabled={!!editingInventory}
                            type="number"
                            min={0}
                            placeholder="Price"
                            className="rounded-3xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm disabled:bg-slate-100"
                          />
                        </>
                      )}
                      <input
                        value={inventoryForm.availableStock}
                        onChange={(event) => setInventoryForm({ ...inventoryForm, availableStock: event.target.value.replace(/\D/g, '') })}
                        required
                        type="number"
                        min={0}
                        placeholder="Available stock"
                        className="rounded-3xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm"
                      />
                      <input
                        value={inventoryForm.soldCount}
                        onChange={(event) => setInventoryForm({ ...inventoryForm, soldCount: event.target.value.replace(/\D/g, '') })}
                        required
                        type="number"
                        min={0}
                        placeholder="Sold count"
                        className="rounded-3xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm"
                      />
                      <button
                        type="submit"
                        className="rounded-3xl bg-maroon px-5 py-3 text-sm font-semibold text-white shadow hover:bg-maroon/90"
                      >
                        {editingInventory ? 'Update Stock' : 'Add Product'}
                      </button>
                    </div>
                    {inventoryMessage && <p className="mt-3 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-700">{inventoryMessage}</p>}
                  </form>

                  <AdminTable
                    headers={['Product Image', 'Product Name', 'Category', 'Size', 'Price', 'Available Stock', 'Sold Count', 'Remaining Stock', 'Actions']}
                    rows={activeStoreInventory.map((record: any) => [
                      <img src={getProductImageUrl(record.product?.images)} alt={record.product?.name || 'Product'} className="h-14 w-14 rounded-2xl object-cover" />,
                      record.product?.name || record.customName || 'Offline product',
                      record.product?.category || record.customCategory || 'Offline',
                      record.size || 'Default',
                      `Rs. ${Number(record.product?.offerPrice ?? record.product?.price ?? record.customPrice ?? 0).toFixed(0)}`,
                      record.availableStock,
                      record.soldCount,
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${record.remainingStock > 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                        {record.remainingStock}
                      </span>,
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleEditInventory(record)}
                          className="rounded-full border border-maroon bg-maroon/10 px-3 py-1 text-xs font-semibold text-maroon hover:bg-maroon/15"
                        >
                          Edit Stock
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEditInventory(record)}
                          className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                        >
                          Update Sold Count
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteInventory(record.id)}
                          className="rounded-full border border-slate-300 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                        >
                          Delete
                        </button>
                      </div>,
                    ])}
                  />
                </div>
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
                        className="h-5 w-5 rounded border-slate-300 text-maroon focus:ring-maroon/20"
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
                      className="col-span-full rounded-3xl bg-maroon px-6 py-3 text-sm font-semibold text-white shadow hover:bg-maroon/90"
                    >
                      Save product
                    </button>
                  </form>
                </div>
              )}

              {activeSection === 'products' && (
                <div className="space-y-3">
                  <AdminTable
                    headers={['Name', 'Category', 'MRP', 'Offer Price', 'Stock', 'Trending', 'Status', 'Actions']}
                    headerAction={(
                      <input
                        value={productSearch}
                        onChange={(event) => setProductSearch(event.target.value)}
                        placeholder="Search products"
                        className="w-full rounded-3xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm focus:border-maroon focus:outline-none focus:ring-2 focus:ring-maroon/20 sm:w-72"
                      />
                    )}
                    rows={paginatedProducts.map((product) => [
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
                          className="rounded-full border border-maroon bg-maroon/10 px-3 py-1 text-xs font-semibold text-maroon transition hover:bg-maroon/10"
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
                  <div className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                    <span>
                      Showing {filteredProducts.length === 0 ? 0 : (currentProductPage - 1) * productPageSize + 1}
                      -{Math.min(currentProductPage * productPageSize, filteredProducts.length)} of {filteredProducts.length} products
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setProductPage((page) => Math.max(1, page - 1))}
                        disabled={currentProductPage === 1}
                        className="rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Previous
                      </button>
                      <span className="rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700">
                        Page {currentProductPage} of {productPageCount}
                      </span>
                      <button
                        type="button"
                        onClick={() => setProductPage((page) => Math.min(productPageCount, page + 1))}
                        disabled={currentProductPage === productPageCount}
                        className="rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
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
                        className="rounded-full border border-maroon bg-maroon/10 px-3 py-1 text-xs font-semibold text-maroon transition hover:bg-maroon/10"
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
                          className="rounded-3xl bg-maroon px-6 py-3 text-sm font-semibold text-white shadow hover:bg-maroon/90"
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
                            className="rounded-3xl bg-maroon px-6 py-3 text-sm font-semibold text-white shadow hover:bg-maroon/90"
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
                            className="rounded-full border border-maroon bg-maroon/10 px-3 py-1 text-xs font-semibold text-maroon transition hover:bg-maroon/10"
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

              {activeSection === 'combos' && (
                <>
                  <div className="mb-5 rounded-3xl border border-slate-200 bg-slate-50 p-5">
                    <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h4 className="text-lg font-semibold text-slate-900">
                          {editingCombo ? 'Edit Combo Product' : 'Add Combo Product'}
                        </h4>
                        <p className="mt-1 text-sm text-slate-500">Upload bundle offers for the homepage combo section.</p>
                      </div>
                      {editingCombo && (
                        <button
                          type="button"
                          onClick={resetComboForm}
                          className="rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow hover:bg-slate-100"
                        >
                          Cancel edit
                        </button>
                      )}
                    </div>
                    {comboMessage && (
                      <p className="mb-4 rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-700">
                        {comboMessage}
                      </p>
                    )}
                    <form onSubmit={handleSubmitCombo} className="space-y-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <input
                          value={comboForm.name}
                          onChange={(event) => setComboForm({ ...comboForm, name: event.target.value })}
                          required
                          placeholder="Combo name"
                          className="rounded-3xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm"
                        />
                        <label className="flex items-center gap-3 rounded-3xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm">
                          <input
                            type="checkbox"
                            checked={comboForm.isActive}
                            onChange={(event) => setComboForm({ ...comboForm, isActive: event.target.checked })}
                            className="h-5 w-5 rounded border-slate-300 text-maroon focus:ring-maroon/20"
                          />
                          Active on homepage
                        </label>
                      </div>
                      <label className="flex items-center gap-3 rounded-3xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm">
                        <textarea
                          value={comboForm.description}
                          onChange={(event) => setComboForm({ ...comboForm, description: event.target.value })}
                          placeholder="Combo description"
                          rows={3}
                          className="w-full border-0 bg-transparent p-0 text-sm text-slate-900 shadow-none focus:ring-0"
                        />
                      </label>
                      <div className="flex items-center justify-between gap-3">
                        <h4 className="text-base font-semibold text-slate-900">Combo variants</h4>
                        <button type="button" onClick={addComboVariant} className="rounded-full border border-maroon bg-white px-4 py-2 text-xs font-semibold text-maroon hover:bg-maroon/10">
                          Add variant
                        </button>
                      </div>
                      <div className="space-y-4">
                        {comboVariants.map((variant, index) => (
                          <div key={variant.id || index} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <div className="mb-4 flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2">
                                <span className="h-6 w-6 rounded-full border border-slate-300" style={{ backgroundColor: variant.colorCode }} />
                                <p className="font-semibold text-slate-900">Variant {index + 1}</p>
                              </div>
                              <button type="button" onClick={() => removeComboVariant(index)} className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
                                Remove
                              </button>
                            </div>
                            <div className="grid gap-4 md:grid-cols-2">
                              <input value={variant.colorName} onChange={(event) => updateComboVariant(index, { colorName: event.target.value })} required placeholder="Color name" className="rounded-3xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm" />
                              <div className="flex gap-2">
                                <input type="color" value={variant.colorCode} onChange={(event) => updateComboVariant(index, { colorCode: event.target.value })} className="h-12 w-14 rounded-lg border border-slate-300 bg-white p-1" />
                                <input value={variant.colorCode} onChange={(event) => updateComboVariant(index, { colorCode: event.target.value })} className="w-full rounded-3xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm" />
                              </div>
                              <input type="number" min={0} value={variant.mrp} onChange={(event) => updateComboVariant(index, { mrp: parseNumberInput(event.target.value) })} required placeholder="MRP" className="rounded-3xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm" />
                              <input type="number" min={0} value={variant.offerPrice} onChange={(event) => updateComboVariant(index, { offerPrice: parseNumberInput(event.target.value) })} required placeholder="Offer price" className="rounded-3xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm" />
                              <div className="md:col-span-2 rounded-2xl border border-slate-200 bg-white p-4">
                                <div className="flex items-center justify-between gap-3">
                                  <div>
                                    <p className="text-sm font-semibold text-slate-700">Sizes and stock</p>
                                    <p className="mt-1 text-xs text-slate-500">Total stock: {variant.sizeStocks.reduce((sum, item) => sum + toNumber(item.stock), 0)}</p>
                                  </div>
                                  <button type="button" onClick={() => addComboVariantSize(index)} className="rounded-full border border-maroon px-3 py-2 text-xs font-semibold text-maroon">
                                    Add size
                                  </button>
                                </div>
                                <div className="mt-3 space-y-2">
                                  {variant.sizeStocks.map((sizeRow, sizeIndex) => (
                                    <div key={sizeIndex} className="grid grid-cols-[minmax(0,1fr)_120px_auto] gap-2">
                                      <input value={sizeRow.size} onChange={(event) => updateComboVariantSize(index, sizeIndex, { size: event.target.value })} required placeholder="Size" className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm" />
                                      <input type="number" min={0} value={sizeRow.stock} onChange={(event) => updateComboVariantSize(index, sizeIndex, { stock: parseNumberInput(event.target.value) })} required className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm" />
                                      <button type="button" onClick={() => removeComboVariantSize(index, sizeIndex)} className="rounded-full bg-red-100 px-3 py-2 text-xs font-semibold text-red-700">
                                        Delete
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                              <div className="md:col-span-2">
                                <label className="block text-sm font-semibold text-slate-700">Variant images</label>
                                <input
                                  type="file"
                                  accept="image/*"
                                  multiple
                                  onChange={(event) => {
                                    const files = event.target.files;
                                    if (!files) return;
                                    const newFiles = Array.from(files);
                                    const total = variant.existingImages.length + variant.images.length + newFiles.length;
                                    if (total > 4) {
                                      setComboMessage('Please select no more than 4 images per variant.');
                                      return;
                                    }
                                    updateComboVariant(index, {
                                      images: [...variant.images, ...newFiles],
                                      previews: [...variant.previews, ...newFiles.map((file) => ({ file, url: URL.createObjectURL(file) }))],
                                    });
                                  }}
                                  className="mt-2 w-full rounded-3xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm"
                                />
                                {(variant.previews.length > 0 || variant.existingImages.length > 0) && (
                                  <div className="mt-3 grid gap-2 sm:grid-cols-4">
                                    {variant.previews.map(({ file, url }) => (
                                      <div key={file.name + file.size} className="relative overflow-hidden rounded-2xl border border-slate-200">
                                        <img src={url} alt={file.name} className="h-20 w-full object-cover" />
                                        <button type="button" onClick={() => {
                                          URL.revokeObjectURL(url);
                                          updateComboVariant(index, {
                                            images: variant.images.filter((item) => item !== file),
                                            previews: variant.previews.filter((item) => item.file !== file),
                                          });
                                        }} className="absolute right-1 top-1 rounded-full bg-white/90 p-1 text-xs text-slate-900 shadow">
                                          x
                                        </button>
                                      </div>
                                    ))}
                                    {variant.existingImages.map((imageUrl) => (
                                      <div key={imageUrl} className="relative overflow-hidden rounded-2xl border border-slate-200">
                                        <img src={getComboImageUrl(imageUrl)} alt="Existing combo" className="h-20 w-full object-cover" />
                                        <button type="button" onClick={() => updateComboVariant(index, { existingImages: variant.existingImages.filter((item) => item !== imageUrl) })} className="absolute right-1 top-1 rounded-full bg-white/90 p-1 text-xs text-slate-900 shadow">
                                          x
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <button
                        type="submit"
                        className="w-full rounded-3xl bg-maroon px-6 py-3 text-sm font-semibold text-white shadow hover:bg-maroon/90"
                      >
                        {editingCombo ? 'Update combo' : 'Save combo'}
                      </button>
                    </form>
                  </div>

                  <AdminTable
                    headers={['Preview', 'Name', 'MRP', 'Offer Price', 'Stock', 'Status', 'Actions']}
                    rows={filteredCombos.map((combo) => [
                      <img
                        src={getComboImageUrl(combo.image)}
                        alt={combo.name}
                        className="h-16 w-24 rounded-2xl object-cover"
                      />,
                      combo.name,
                      combo.mrp ? `Rs. ${Number(combo.mrp).toFixed(2)}` : 'N/A',
                      `Rs. ${Number(combo.offerPrice).toFixed(2)}`,
                      combo.stock,
                      combo.isActive ? 'Active' : 'Hidden',
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleEditCombo(combo)}
                          className="rounded-full border border-maroon bg-maroon/10 px-3 py-1 text-xs font-semibold text-maroon transition hover:bg-maroon/10"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCombo(combo.id)}
                          className="rounded-full border border-slate-300 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-200"
                        >
                          Delete
                        </button>
                      </div>,
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
                          className="h-5 w-5 rounded border-slate-300 text-maroon focus:ring-maroon/20"
                        />
                        Active on homepage
                      </label>
                      <button
                        type="submit"
                        disabled={!editingBanner && banners.length >= 3}
                        className="col-span-full rounded-3xl bg-maroon px-6 py-3 text-sm font-semibold text-white shadow hover:bg-maroon/90 disabled:cursor-not-allowed disabled:opacity-60"
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
                          className="rounded-full border border-maroon bg-maroon/10 px-3 py-1 text-xs font-semibold text-maroon transition hover:bg-maroon/10"
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

              {activeSection === 'coupons' && (
                <>
                  <div className="mb-5 rounded-3xl border border-slate-200 bg-slate-50 p-5">
                    <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h4 className="text-lg font-semibold text-slate-900">
                          {editingCoupon ? 'Edit Coupon' : 'Add Coupon'}
                        </h4>
                        <p className="mt-1 text-sm text-slate-500">Create coupon codes customers can apply during checkout.</p>
                      </div>
                      {editingCoupon && (
                        <button
                          type="button"
                          onClick={resetCouponForm}
                          className="rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow hover:bg-slate-100"
                        >
                          Cancel edit
                        </button>
                      )}
                    </div>
                    {couponMessage && (
                      <p className="mb-4 rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-700">
                        {couponMessage}
                      </p>
                    )}
                    <form onSubmit={handleSubmitCoupon} className="grid gap-4 md:grid-cols-3">
                      <input
                        value={couponForm.code}
                        onChange={(event) => setCouponForm({ ...couponForm, code: event.target.value.toUpperCase() })}
                        required
                        placeholder="Coupon code"
                        className="rounded-3xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm"
                      />
                      <select
                        value={couponForm.discountType}
                        onChange={(event) => setCouponForm({ ...couponForm, discountType: event.target.value })}
                        className="rounded-3xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm"
                      >
                        <option value="percentage">Percentage discount</option>
                        <option value="fixed">Fixed amount discount</option>
                      </select>
                      <input
                        value={couponForm.discountValue}
                        onChange={(event) => setCouponForm({ ...couponForm, discountValue: event.target.value })}
                        required
                        type="number"
                        min={1}
                        max={couponForm.discountType === 'percentage' ? 100 : undefined}
                        placeholder={couponForm.discountType === 'percentage' ? 'Discount %' : 'Discount amount'}
                        className="rounded-3xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm"
                      />
                      <input
                        value={couponForm.minOrderAmount}
                        onChange={(event) => setCouponForm({ ...couponForm, minOrderAmount: event.target.value })}
                        type="number"
                        min={0}
                        placeholder="Minimum order amount"
                        className="rounded-3xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm"
                      />
                      <label className="flex items-center gap-3 rounded-3xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm">
                        <input
                          type="checkbox"
                          checked={couponForm.isActive}
                          onChange={(event) => setCouponForm({ ...couponForm, isActive: event.target.checked })}
                          className="h-5 w-5 rounded border-slate-300 text-maroon focus:ring-maroon/20"
                        />
                        Active coupon
                      </label>
                      <button
                        type="submit"
                        className="rounded-3xl bg-maroon px-6 py-3 text-sm font-semibold text-white shadow hover:bg-maroon/90"
                      >
                        {editingCoupon ? 'Update coupon' : 'Save coupon'}
                      </button>
                    </form>
                  </div>

                  <AdminTable
                    headers={['Code', 'Type', 'Value', 'Min Order', 'Status', 'Actions']}
                    rows={filteredCoupons.map((coupon) => [
                      <span className="font-bold">{coupon.code}</span>,
                      coupon.discountType === 'percentage' ? 'Percentage' : 'Fixed amount',
                      coupon.discountType === 'percentage'
                        ? `${Number(coupon.discountValue).toFixed(0)}%`
                        : `Rs. ${Number(coupon.discountValue).toFixed(0)}`,
                      coupon.minOrderAmount ? `Rs. ${Number(coupon.minOrderAmount).toFixed(0)}` : 'None',
                      coupon.isActive ? 'Active' : 'Hidden',
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleEditCoupon(coupon)}
                          className="rounded-full border border-maroon bg-maroon/10 px-3 py-1 text-xs font-semibold text-maroon transition hover:bg-maroon/10"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCoupon(coupon.id)}
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
                    order.items?.map((item: any) => {
                      const product = item.product || item.comboProduct;
                      const variantText = [item.colorName, item.size].filter(Boolean).join(', ');
                      return `${product?.name || 'Item'}${variantText ? ` (${variantText})` : ''} x${item.quantity}`;
                    }).join(', '),
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

const AdminTable = ({ headers, rows, headerAction }: { headers: string[]; rows: Array<Array<string | number | ReactNode>>; headerAction?: ReactNode }) => (
  <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
    <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 px-6 py-4 text-sm font-semibold text-slate-700 sm:flex-row sm:items-center sm:justify-between">
      <span>Records</span>
      {headerAction}
    </div>
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
        ? 'border-maroon bg-maroon/10 text-maroon focus:ring-maroon/20'
        : 'border-slate-300 bg-slate-100 text-slate-700 focus:ring-slate-200'
    }`}
  >
    <option value="true">Trending</option>
    <option value="false">Not trending</option>
  </select>
);

export default AdminDashboard;
