import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import SplashScreen from './components/SplashScreen';
import PageLoader from './components/PageLoader';
import Seo from './components/Seo';

const HomePage = lazy(() => import('./pages/HomePage'));
const ProductListPage = lazy(() => import('./pages/ProductListPage'));
const ProductDetailPage = lazy(() => import('./pages/ProductDetailPage'));
const ComboDetailPage = lazy(() => import('./pages/ComboDetailPage'));
const CartPage = lazy(() => import('./pages/CartPage'));
const CheckoutPage = lazy(() => import('./pages/CheckoutPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const AdminProductForm = lazy(() => import('./pages/AdminProductForm'));
const WishlistPage = lazy(() => import('./pages/WishlistPage'));
const OrdersPage = lazy(() => import('./pages/OrdersPage'));

const ScrollToTop = () => {
  const { pathname, search } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [pathname, search]);

  return null;
};

function App() {
  const location = useLocation();
  const [showSplash, setShowSplash] = useState(() => sessionStorage.getItem('mbr_splash_seen') !== 'true');

  const seo = useMemo(() => {
    const path = location.pathname;
    if (path.startsWith('/products')) {
      return {
        title: 'Shop Men\'s Fashion Online | MBR Fashion Hub',
        description: 'Browse premium shirts, t-shirts, jeans, jackets, sneakers, and curated combo offers from MBR Fashion Hub.',
      };
    }
    if (path.startsWith('/combo')) {
      return {
        title: 'Combo Offers | MBR Fashion Hub',
        description: 'Discover ready-to-wear men\'s fashion combo offers with sharp pricing and easy checkout.',
      };
    }
    if (path.startsWith('/login') || path.startsWith('/signup')) {
      return {
        title: 'Account | MBR Fashion Hub',
        description: 'Sign in or create an account to manage orders, wishlist items, and checkout faster.',
      };
    }
    return {
      title: 'MBR Fashion Hub | Premium Men\'s Fashion',
      description: 'Shop contemporary men\'s fashion from MBR Fashion Hub, including shirts, tees, denim, sneakers, jackets, and combo offers.',
    };
  }, [location.pathname]);

  const handleSplashComplete = () => {
    sessionStorage.setItem('mbr_splash_seen', 'true');
    setShowSplash(false);
  };

  if (showSplash) {
    return <SplashScreen onComplete={handleSplashComplete} />;
  }

  return (
    <Layout>
      <Seo title={seo.title} description={seo.description} canonical={`${window.location.origin}${location.pathname}`} />
      <ScrollToTop />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/products" element={<ProductListPage />} />
          <Route path="/products/:id" element={<ProductDetailPage />} />
          <Route path="/product/:id" element={<ProductDetailPage />} />
          <Route path="/combo/:id" element={<ComboDetailPage />} />
          <Route path="/cart" element={<ProtectedRoute><CartPage /></ProtectedRoute>} />
          <Route path="/checkout" element={<ProtectedRoute><CheckoutPage /></ProtectedRoute>} />
          <Route path="/wishlist" element={<ProtectedRoute><WishlistPage /></ProtectedRoute>} />
          <Route path="/orders" element={<ProtectedRoute><OrdersPage /></ProtectedRoute>} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<RegisterPage />} />
          <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
          <Route path="/admin/product/:id" element={<AdminRoute><AdminProductForm /></AdminRoute>} />
          <Route path="/admin/product/new" element={<AdminRoute><AdminProductForm /></AdminRoute>} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Suspense>
    </Layout>
  );
}

export default App;
