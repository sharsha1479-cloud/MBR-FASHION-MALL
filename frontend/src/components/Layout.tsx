import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fetchCart } from '../services/cart';
import { fetchWishlist } from '../services/wishlist';

const Layout = ({ children }: { children: ReactNode }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [wishlistCount, setWishlistCount] = useState(0);

  const loadCounts = async () => {
    if (!user) {
      setCartCount(0);
      setWishlistCount(0);
      return;
    }

    const [cartResult, wishlistResult] = await Promise.allSettled([
      fetchCart(),
      fetchWishlist(),
    ]);

    if (cartResult.status === 'fulfilled') {
      const items = cartResult.value.items || [];
      setCartCount(items.reduce((sum: number, item: any) => sum + Number(item.quantity || 1), 0));
    }

    if (wishlistResult.status === 'fulfilled') {
      setWishlistCount((wishlistResult.value.items || []).length);
    }
  };

  useEffect(() => {
    loadCounts();

    const handleCartChange = () => loadCounts();
    const handleWishlistChange = () => loadCounts();

    window.addEventListener('cart-count-changed', handleCartChange);
    window.addEventListener('wishlist-count-changed', handleWishlistChange);

    return () => {
      window.removeEventListener('cart-count-changed', handleCartChange);
      window.removeEventListener('wishlist-count-changed', handleWishlistChange);
    };
  }, [user]);

  const handleLogout = () => {
    setProfileOpen(false);
    logout();
    navigate('/login');
  };

  const CountBadge = ({ count }: { count: number }) => (
    count > 0 ? (
      <span className="ml-2 inline-flex min-w-5 items-center justify-center rounded-full bg-accent px-1.5 py-0.5 text-[11px] font-bold leading-none text-primary">
        {count > 99 ? '99+' : count}
      </span>
    ) : null
  );

  const closeMobile = () => {
    setMobileOpen(false);
    setProfileOpen(false);
  };

  const navLinks = (
    <>
      <Link to="/products" className="block hover:text-accent transition-colors duration-300" onClick={closeMobile}>
        Shop
      </Link>
      <Link to="/cart" className="flex items-center hover:text-accent transition-colors duration-300" onClick={closeMobile}>
        <span>Cart</span>
        <CountBadge count={cartCount} />
      </Link>
      {user && (
        <>
          <Link to="/wishlist" className="flex items-center hover:text-accent transition-colors duration-300" onClick={closeMobile}>
            <span>Wishlist</span>
            <CountBadge count={wishlistCount} />
          </Link>
          <Link to="/orders" className="block hover:text-accent transition-colors duration-300" onClick={closeMobile}>
            My Orders
          </Link>
        </>
      )}
      {user?.role === 'admin' && (
        <Link to="/admin" className="block hover:text-accent transition-colors duration-300" onClick={closeMobile}>
          Admin
        </Link>
      )}
    </>
  );

  return (
    <div className="min-h-screen bg-secondary text-primary flex flex-col">
      <header className="sticky top-0 z-50 bg-primary text-secondary shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4">
          <Link to="/" className="text-xl sm:text-2xl font-bold truncate">
            Men's Fashion
          </Link>

          <nav className="hidden md:flex items-center space-x-6 sm:space-x-8">
            {navLinks}
          </nav>

          <div className="hidden md:flex items-center gap-3 sm:gap-4 relative">
            {user ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setProfileOpen((current) => !current)}
                  className="flex items-center gap-2 sm:gap-3 rounded-full border border-secondary/20 bg-secondary/10 px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold transition hover:bg-secondary/20"
                >
                  <span className="hidden sm:inline">{user.name ?? 'Profile'}</span>
                  <span className="inline-flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-primary/20 text-primary text-xs sm:text-sm">
                    {user.name?.charAt(0).toUpperCase() ?? 'U'}
                  </span>
                </button>
                {profileOpen && (
                  <div className="absolute right-0 top-full mt-2 sm:mt-3 w-64 sm:w-72 rounded-2xl sm:rounded-3xl border border-secondary/20 bg-primary p-3 sm:p-4 text-left shadow-2xl shadow-slate-950/10">
                    <p className="text-xs uppercase tracking-[0.24em] text-secondary/70">Profile Details</p>
                    <h3 className="mt-2 sm:mt-3 text-base sm:text-lg font-semibold text-secondary">{user.name ?? 'User'}</h3>
                    <p className="text-xs sm:text-sm text-secondary/80">{user.email}</p>
                    <div className="mt-3 sm:mt-4 space-y-2 sm:space-y-3 text-xs sm:text-sm text-secondary/90">
                      <div className="flex items-center justify-between rounded-2xl bg-slate-950/5 px-2 sm:px-3 py-2">
                        <span className="text-slate-500">Role</span>
                        <span className="font-semibold">{user.role}</span>
                      </div>
                      <div className="flex items-center justify-between rounded-2xl bg-slate-950/5 px-2 sm:px-3 py-2">
                        <span className="text-slate-500">Token</span>
                        <span className="truncate text-xs">{user.token.slice(0, 12)}...</span>
                      </div>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="mt-3 sm:mt-4 w-full rounded-full bg-accent px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-primary transition hover:bg-accent/90"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/login" className="rounded-full border border-secondary/20 bg-secondary/10 px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold transition hover:bg-secondary/20">
                Login
              </Link>
            )}
          </div>

          <div className="md:hidden flex items-center gap-2">
            <button
              onClick={() => {
                setMobileOpen((current) => !current);
                setProfileOpen(false);
              }}
              className="rounded-full border border-secondary px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold"
            >
              {mobileOpen ? 'Close' : 'Menu'}
            </button>
          </div>
        </div>
        {mobileOpen && (
          <div className="md:hidden border-t border-primary/20 bg-primary/95 px-4 sm:px-6 py-3 sm:py-4 text-secondary space-y-2 sm:space-y-3">
            {navLinks}
            <div className="mt-4 border-t border-secondary/10 pt-4">
              {user ? (
                <button
                  onClick={() => {
                    handleLogout();
                    setMobileOpen(false);
                  }}
                  className="w-full rounded-full bg-accent px-4 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-primary transition hover:bg-accent/90"
                >
                  Logout
                </button>
              ) : (
                <Link
                  to="/login"
                  className="block rounded-full border border-secondary/20 bg-secondary/10 px-4 py-2 sm:py-3 text-center text-xs sm:text-sm font-semibold transition hover:bg-secondary/20"
                  onClick={closeMobile}
                >
                  Login
                </Link>
              )}
            </div>
          </div>
        )}
      </header>
      <main className="flex-1">{children}</main>
      <footer className="bg-primary text-secondary py-6 sm:py-8 md:py-10 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center text-xs sm:text-sm">
          <p>© 2026 Men's Fashion. Crafted for modern wardrobes.</p>
        </div>
      </footer>
    </div>
  );
};

export default Layout;

