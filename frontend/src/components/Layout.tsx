import { useEffect, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { changePassword, requestPasswordOtp, resetPasswordWithOtp } from '../services/auth';
import { fetchCart } from '../services/cart';
import { fetchWishlist } from '../services/wishlist';

const Layout = ({ children }: { children: ReactNode }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const headerRef = useRef<HTMLElement | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [headerSearch, setHeaderSearch] = useState('');
  const [cartCount, setCartCount] = useState(0);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [showBottomNav, setShowBottomNav] = useState(false);
  const [mobileSettingsOpen, setMobileSettingsOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [forgotForm, setForgotForm] = useState({ email: '', otp: '', newPassword: '', confirmPassword: '' });
  const [forgotMessage, setForgotMessage] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

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

  useEffect(() => {
    let lastScrollY = window.scrollY;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const scrollingDown = currentScrollY > lastScrollY;

      setShowBottomNav(scrollingDown && currentScrollY > 80);
      lastScrollY = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node) || headerRef.current?.contains(target)) return;

      setSearchOpen(false);
      setProfileOpen(false);
      setMobileOpen(false);
      setMobileSettingsOpen(false);
      setForgotOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, []);

  const handleLogout = () => {
    setProfileOpen(false);
    setMobileOpen(false);
    setSearchOpen(false);
    setMobileSettingsOpen(false);
    logout();
    navigate('/login');
  };

  const CountBadge = ({ count }: { count: number }) => (
    count > 0 ? (
      <span className="ml-2 inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-[11px] font-bold leading-none text-secondary">
        {count > 99 ? '99+' : count}
      </span>
    ) : null
  );

  const closeMobile = () => {
    setMobileOpen(false);
    setProfileOpen(false);
    setSearchOpen(false);
    setMobileSettingsOpen(false);
    setForgotOpen(false);
  };

  const promptLogin = () => {
    setMobileOpen(false);
    setProfileOpen(false);
    setSearchOpen(false);
    setMobileSettingsOpen(false);
    setForgotOpen(false);
    navigate('/login', {
      state: {
        from: location,
        message: 'Please login first to continue',
      },
    });
  };

  const handleHeaderSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = headerSearch.trim();
    if (!query) return;

    setSearchOpen(false);
    setMobileOpen(false);
    setProfileOpen(false);
    navigate(`/products?search=${encodeURIComponent(query)}`);
  };

  const handlePasswordChange = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPasswordMessage('');
    setPasswordError('');

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }

    setPasswordLoading(true);
    try {
      await changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordMessage('Password updated successfully.');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      setPasswordError(error.response?.data?.message || 'Could not update password.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleRequestOtp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setForgotMessage('');
    setForgotError('');
    setForgotLoading(true);

    try {
      await requestPasswordOtp({ email: forgotForm.email });
      setOtpSent(true);
      setForgotMessage('OTP sent to registered email.');
    } catch (error: any) {
      setForgotError(error.response?.data?.message || 'Could not send OTP.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setForgotMessage('');
    setForgotError('');

    if (forgotForm.newPassword !== forgotForm.confirmPassword) {
      setForgotError('New passwords do not match.');
      return;
    }

    setForgotLoading(true);
    try {
      await resetPasswordWithOtp({
        email: forgotForm.email,
        otp: forgotForm.otp,
        newPassword: forgotForm.newPassword,
      });
      setForgotMessage('Password reset successfully.');
      setForgotForm((current) => ({ ...current, otp: '', newPassword: '', confirmPassword: '' }));
      setOtpSent(false);
    } catch (error: any) {
      setForgotError(error.response?.data?.message || 'Could not reset password.');
    } finally {
      setForgotLoading(false);
    }
  };

  const isActivePath = (path: string) => (
    path === '/products'
      ? location.pathname === '/products' || location.pathname.startsWith('/product/')
      : location.pathname.startsWith(path)
  );

  const BottomNavBadge = ({ count }: { count: number }) => (
    count > 0 ? (
      <span className="absolute -right-2 -top-1 inline-flex min-w-4 items-center justify-center rounded-full bg-maroon px-1 text-[9px] font-bold leading-4 text-white ring-2 ring-white">
        {count > 99 ? '99+' : count}
      </span>
    ) : null
  );

  const navLinks = (
    <>
      <Link to="/products" className="block text-primary transition-colors duration-300 hover:text-primary hover:border-b-2 hover:border-primary md:text-lg md:font-bold" onClick={closeMobile}>
        Shop
      </Link>
      <Link to="/cart" className="flex items-center text-primary transition-colors duration-300 hover:text-primary hover:border-b-2 hover:border-primary md:text-lg md:font-bold" onClick={closeMobile}>
        <span>Cart</span>
        <CountBadge count={cartCount} />
      </Link>
      <Link to="/wishlist" className="flex items-center text-primary transition-colors duration-300 hover:text-primary hover:border-b-2 hover:border-primary md:text-lg md:font-bold" onClick={closeMobile}>
        <span>Wishlist</span>
        <CountBadge count={wishlistCount} />
      </Link>
      <Link to="/orders" className="block text-primary transition-colors duration-300 hover:text-primary hover:border-b-2 hover:border-primary md:text-lg md:font-bold" onClick={closeMobile}>
        My Orders
      </Link>
      {user?.role === 'admin' && (
        <Link to="/admin" className="block text-primary transition-colors duration-300 hover:text-primary hover:border-b-2 hover:border-primary md:text-lg md:font-bold" onClick={closeMobile}>
          Admin
        </Link>
      )}
    </>
  );

  return (
    <div className="min-h-screen overflow-x-hidden bg-secondary text-primary flex flex-col">
      <header ref={headerRef} className="sticky top-0 z-50 bg-secondary text-primary border-b-4 border-maroon shadow-[0_6px_20px_rgba(0,0,0,0.08)]">
        <div className="relative flex min-h-14 w-full min-w-0 items-center justify-end gap-2 py-2 pl-0 pr-3 sm:pr-6 md:grid md:min-h-0 md:grid-cols-[320px_1fr_260px] md:justify-between md:py-2.5 md:pl-3 md:pr-6 lg:grid-cols-[420px_1fr_320px] lg:pl-4 lg:pr-8">
          <Link to="/" className="absolute left-4 top-1/2 flex min-w-0 -translate-y-1/2 items-center justify-start md:static md:translate-y-0 md:flex-none" aria-label="MBR The Fashion Hub home">
            <img
              src="/mbrlogo.png"
              alt="MBR The Fashion Hub"
              className="h-12 w-auto object-contain sm:h-16 md:h-auto md:w-[320px] md:max-h-16 lg:w-[400px] lg:max-h-20"
            />
          </Link>

          <nav className="hidden md:flex items-center justify-center space-x-6 lg:space-x-8">
            {navLinks}
          </nav>

          <div className="hidden md:flex items-center justify-end gap-3 sm:gap-4 relative">
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setSearchOpen((current) => !current);
                  setProfileOpen(false);
                }}
                aria-label="Search products"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-maroon bg-cream text-primary transition hover:bg-soft"
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
              </button>
              {searchOpen && (
                <form onSubmit={handleHeaderSearch} className="absolute right-0 top-full mt-3 flex w-80 gap-2 rounded-2xl border border-maroon/20 bg-white p-3 shadow-2xl shadow-maroon/10">
                  <input
                    value={headerSearch}
                    onChange={(event) => setHeaderSearch(event.target.value)}
                    autoFocus
                    type="search"
                    placeholder="Search products"
                    className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                  <button type="submit" className="rounded-xl bg-maroon px-4 py-2 text-sm font-semibold text-white">
                    Search
                  </button>
                </form>
              )}
            </div>
            <div className="relative">
              {user ? (
                <button
                  type="button"
                  onClick={() => {
                    setProfileOpen((current) => !current);
                    setSearchOpen(false);
                  }}
                  className="flex items-center gap-2 sm:gap-3 rounded-full border border-maroon bg-cream px-3 sm:px-4 py-2 text-sm font-semibold text-primary transition hover:bg-soft"
                >
                  <span className="hidden sm:inline">{user.name ?? 'Profile'}</span>
                  <span className="inline-flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-maroon/10 text-maroon text-sm font-bold">
                    {user.name?.charAt(0).toUpperCase() ?? 'U'}
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={promptLogin}
                  className="rounded-full border border-maroon bg-cream px-4 py-2 text-sm font-semibold text-primary transition hover:bg-soft"
                >
                  Login
                </button>
              )}
              {user && profileOpen && (
                <div className="absolute right-0 top-full mt-2 sm:mt-3 w-80 rounded-2xl sm:rounded-3xl border border-maroon/20 bg-secondary p-3 sm:p-4 text-left shadow-2xl shadow-maroon/10">
                  <p className="text-xs uppercase tracking-[0.24em] text-maroon/70">Profile Details</p>
                  <h3 className="mt-2 sm:mt-3 text-base sm:text-lg font-semibold text-primary">{user.name ?? 'User'}</h3>
                  <p className="text-xs sm:text-sm text-maroon/70">{user.email}</p>
                  <div className="mt-3 sm:mt-4 space-y-2 sm:space-y-3 text-sm text-primary">
                    <div className="flex items-center justify-between rounded-2xl bg-cream px-2 sm:px-3 py-2">
                      <span className="text-maroon/80">Role</span>
                      <span className="font-semibold">{user.role}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileSettingsOpen((current) => !current);
                      setPasswordMessage('');
                      setPasswordError('');
                      setForgotOpen(false);
                    }}
                    className="mt-3 w-full rounded-full bg-maroon px-3 sm:px-4 py-2 text-sm font-semibold text-secondary transition hover:bg-maroon/90"
                  >
                    {mobileSettingsOpen ? 'Hide profile settings' : 'Profile settings'}
                  </button>
                  {mobileSettingsOpen && (
                    <>
                      {!forgotOpen ? (
                        <form onSubmit={handlePasswordChange} className="mt-3 space-y-3">
                          <div>
                            <label className="text-xs font-semibold text-slate-700">Current password</label>
                            <input
                              type="password"
                              value={passwordForm.currentPassword}
                              onChange={(event) => setPasswordForm((current) => ({ ...current, currentPassword: event.target.value }))}
                              className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                              required
                            />
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-slate-700">New password</label>
                            <input
                              type="password"
                              value={passwordForm.newPassword}
                              onChange={(event) => setPasswordForm((current) => ({ ...current, newPassword: event.target.value }))}
                              className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                              minLength={6}
                              required
                            />
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-slate-700">Confirm password</label>
                            <input
                              type="password"
                              value={passwordForm.confirmPassword}
                              onChange={(event) => setPasswordForm((current) => ({ ...current, confirmPassword: event.target.value }))}
                              className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                              minLength={6}
                              required
                            />
                          </div>
                          {passwordMessage && <p className="rounded-xl bg-green-100 px-3 py-2 text-xs font-semibold text-green-700">{passwordMessage}</p>}
                          {passwordError && <p className="rounded-xl bg-red-100 px-3 py-2 text-xs font-semibold text-red-700">{passwordError}</p>}
                          <button
                            type="submit"
                            disabled={passwordLoading}
                            className="w-full rounded-full bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {passwordLoading ? 'Updating...' : 'Change password'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setForgotOpen(true);
                              setForgotForm({ email: user.email || '', otp: '', newPassword: '', confirmPassword: '' });
                              setForgotMessage('');
                              setForgotError('');
                              setPasswordMessage('');
                              setPasswordError('');
                              setOtpSent(false);
                            }}
                            className="w-full rounded-full border border-maroon bg-white px-4 py-3 text-sm font-semibold text-maroon transition hover:bg-maroon/10"
                          >
                            Forgot password?
                          </button>
                        </form>
                      ) : (
                        <div className="mt-3 rounded-2xl border border-maroon/10 bg-cream p-3">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-xs font-semibold text-maroon/80">Reset with email OTP</p>
                            <button
                              type="button"
                              onClick={() => {
                                setForgotOpen(false);
                                setForgotMessage('');
                                setForgotError('');
                                setOtpSent(false);
                              }}
                              className="border-0 bg-transparent p-0 text-xs font-bold text-maroon shadow-none"
                            >
                              Back
                            </button>
                          </div>
                          {!otpSent ? (
                            <form onSubmit={handleRequestOtp} className="mt-3 space-y-3">
                              <input
                                type="email"
                                value={forgotForm.email}
                                onChange={(event) => setForgotForm((current) => ({ ...current, email: event.target.value }))}
                                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                                placeholder="Registered email"
                                required
                              />
                              <button
                                type="submit"
                                disabled={forgotLoading}
                                className="w-full rounded-full bg-maroon px-4 py-3 text-sm font-semibold text-secondary disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {forgotLoading ? 'Sending...' : 'Send OTP'}
                              </button>
                            </form>
                          ) : (
                            <form onSubmit={handleResetPassword} className="mt-3 space-y-3">
                              <input
                                value={forgotForm.otp}
                                onChange={(event) => setForgotForm((current) => ({ ...current, otp: event.target.value.replace(/\D/g, '').slice(0, 6) }))}
                                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                                inputMode="numeric"
                                placeholder="Enter OTP"
                                required
                              />
                              <input
                                type="password"
                                value={forgotForm.newPassword}
                                onChange={(event) => setForgotForm((current) => ({ ...current, newPassword: event.target.value }))}
                                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                                minLength={6}
                                placeholder="New password"
                                required
                              />
                              <input
                                type="password"
                                value={forgotForm.confirmPassword}
                                onChange={(event) => setForgotForm((current) => ({ ...current, confirmPassword: event.target.value }))}
                                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                                minLength={6}
                                placeholder="Confirm password"
                                required
                              />
                              <button
                                type="submit"
                                disabled={forgotLoading}
                                className="w-full rounded-full bg-maroon px-4 py-3 text-sm font-semibold text-secondary disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {forgotLoading ? 'Resetting...' : 'Reset password'}
                              </button>
                            </form>
                          )}
                          {forgotMessage && <p className="mt-3 rounded-xl bg-green-100 px-3 py-2 text-xs font-semibold text-green-700">{forgotMessage}</p>}
                          {forgotError && <p className="mt-3 rounded-xl bg-red-100 px-3 py-2 text-xs font-semibold text-red-700">{forgotError}</p>}
                        </div>
                      )}
                    </>
                  )}
                  <button
                    onClick={handleLogout}
                    className="mt-3 sm:mt-4 w-full rounded-full bg-maroon px-3 sm:px-4 py-2 text-sm font-semibold text-secondary transition hover:bg-maroon/90"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="md:hidden flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setSearchOpen((current) => !current);
                setMobileOpen(false);
              }}
              aria-label="Search products"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-maroon bg-cream text-primary"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
            </button>
            {user ? (
              <button
                type="button"
                onClick={() => {
                  setMobileOpen((current) => !current);
                  setProfileOpen(false);
                  setSearchOpen(false);
                }}
                aria-label="Open profile menu"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-maroon bg-cream text-xs font-semibold text-primary"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-maroon text-xs font-bold text-secondary">
                  {user.name?.charAt(0).toUpperCase() ?? 'U'}
                </span>
              </button>
            ) : (
              <button
                type="button"
                onClick={promptLogin}
                className="rounded-full border border-maroon bg-cream px-4 py-1.5 text-xs font-semibold text-primary"
              >
                Login
              </button>
            )}
          </div>
        </div>
        {searchOpen && (
          <form onSubmit={handleHeaderSearch} className="md:hidden border-t border-maroon/15 bg-white px-3 py-3">
            <div className="flex gap-2">
              <input
                value={headerSearch}
                onChange={(event) => setHeaderSearch(event.target.value)}
                autoFocus
                type="search"
                placeholder="Search products"
                className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
              />
              <button type="submit" className="rounded-xl bg-maroon px-4 py-2.5 text-sm font-semibold text-white">
                Search
              </button>
            </div>
          </form>
        )}
        {mobileOpen && (
          <div className="md:hidden border-t border-maroon/15 bg-secondary/95 px-4 py-4 text-primary shadow-lg">
            {user && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 rounded-2xl bg-cream p-3">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-maroon text-base font-bold text-secondary">
                    {user.name?.charAt(0).toUpperCase() ?? 'U'}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-primary">Account</p>
                    <p className="truncate text-xs text-maroon/70">{user.email}</p>
                  </div>
                </div>

                <section className="rounded-2xl border border-maroon/15 bg-white p-3">
                  <button
                    type="button"
                    onClick={() => {
                      setMobileSettingsOpen((current) => !current);
                      setPasswordMessage('');
                      setPasswordError('');
                      setForgotOpen(false);
                    }}
                    className="flex w-full items-center justify-between rounded-full bg-maroon px-4 py-3 text-sm font-semibold text-secondary transition hover:bg-maroon/90"
                  >
                    <span>Profile settings</span>
                    <span className="text-xs">{mobileSettingsOpen ? 'Hide' : 'Open'}</span>
                  </button>

                  {mobileSettingsOpen && (
                    <>
                      {!forgotOpen ? (
                        <form onSubmit={handlePasswordChange} className="mt-3 space-y-3">
                          <div className="rounded-xl bg-cream px-3 py-2 text-sm">
                            <div className="flex items-center justify-between">
                              <span className="text-maroon/75">Account type</span>
                              <span className="font-semibold capitalize text-primary">{user.role}</span>
                            </div>
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-slate-700">Current password</label>
                            <input
                              type="password"
                              value={passwordForm.currentPassword}
                              onChange={(event) => setPasswordForm((current) => ({ ...current, currentPassword: event.target.value }))}
                              className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                              required
                            />
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-slate-700">New password</label>
                            <input
                              type="password"
                              value={passwordForm.newPassword}
                              onChange={(event) => setPasswordForm((current) => ({ ...current, newPassword: event.target.value }))}
                              className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                              minLength={6}
                              required
                            />
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-slate-700">Confirm password</label>
                            <input
                              type="password"
                              value={passwordForm.confirmPassword}
                              onChange={(event) => setPasswordForm((current) => ({ ...current, confirmPassword: event.target.value }))}
                              className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                              minLength={6}
                              required
                            />
                          </div>
                          {passwordMessage && <p className="rounded-xl bg-green-100 px-3 py-2 text-xs font-semibold text-green-700">{passwordMessage}</p>}
                          {passwordError && <p className="rounded-xl bg-red-100 px-3 py-2 text-xs font-semibold text-red-700">{passwordError}</p>}
                          <button
                            type="submit"
                            disabled={passwordLoading}
                            className="w-full rounded-full bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {passwordLoading ? 'Updating...' : 'Change password'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setForgotOpen(true);
                              setForgotForm({ email: user.email || '', otp: '', newPassword: '', confirmPassword: '' });
                              setForgotMessage('');
                              setForgotError('');
                              setPasswordMessage('');
                              setPasswordError('');
                              setOtpSent(false);
                            }}
                            className="w-full rounded-full border border-maroon bg-white px-4 py-3 text-sm font-semibold text-maroon transition hover:bg-maroon/10"
                          >
                            Forgot password?
                          </button>
                        </form>
                      ) : (
                        <div className="mt-3 rounded-2xl border border-maroon/10 bg-cream p-3">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-xs font-semibold text-maroon/80">Reset with email OTP</p>
                            <button
                              type="button"
                              onClick={() => {
                                setForgotOpen(false);
                                setForgotMessage('');
                                setForgotError('');
                                setOtpSent(false);
                              }}
                              className="border-0 bg-transparent p-0 text-xs font-bold text-maroon shadow-none"
                            >
                              Back
                            </button>
                          </div>
                          {!otpSent ? (
                            <form onSubmit={handleRequestOtp} className="mt-3 space-y-3">
                          <input
                            type="email"
                            value={forgotForm.email}
                            onChange={(event) => setForgotForm((current) => ({ ...current, email: event.target.value }))}
                            className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                            placeholder="Registered email"
                            required
                          />
                          <button
                            type="submit"
                            disabled={forgotLoading}
                            className="w-full rounded-full bg-maroon px-4 py-3 text-sm font-semibold text-secondary disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {forgotLoading ? 'Sending...' : 'Send OTP'}
                          </button>
                        </form>
                          ) : (
                            <form onSubmit={handleResetPassword} className="mt-3 space-y-3">
                          <input
                            value={forgotForm.otp}
                            onChange={(event) => setForgotForm((current) => ({ ...current, otp: event.target.value.replace(/\D/g, '').slice(0, 6) }))}
                            className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                            inputMode="numeric"
                            placeholder="Enter OTP"
                            required
                          />
                          <input
                            type="password"
                            value={forgotForm.newPassword}
                            onChange={(event) => setForgotForm((current) => ({ ...current, newPassword: event.target.value }))}
                            className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                            minLength={6}
                            placeholder="New password"
                            required
                          />
                          <input
                            type="password"
                            value={forgotForm.confirmPassword}
                            onChange={(event) => setForgotForm((current) => ({ ...current, confirmPassword: event.target.value }))}
                            className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                            minLength={6}
                            placeholder="Confirm password"
                            required
                          />
                          <button
                            type="submit"
                            disabled={forgotLoading}
                            className="w-full rounded-full bg-maroon px-4 py-3 text-sm font-semibold text-secondary disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {forgotLoading ? 'Resetting...' : 'Reset password'}
                          </button>
                        </form>
                          )}
                          {forgotMessage && <p className="mt-3 rounded-xl bg-green-100 px-3 py-2 text-xs font-semibold text-green-700">{forgotMessage}</p>}
                          {forgotError && <p className="mt-3 rounded-xl bg-red-100 px-3 py-2 text-xs font-semibold text-red-700">{forgotError}</p>}
                        </div>
                      )}
                    </>
                  )}
                </section>

                <section className="rounded-2xl border border-maroon/15 bg-white p-3">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-maroon/70">Logout section</p>
                  <button
                    onClick={() => {
                      handleLogout();
                      setMobileOpen(false);
                    }}
                    className="mt-3 w-full rounded-full bg-maroon px-4 py-3 text-sm font-semibold text-secondary transition hover:bg-maroon/90"
                  >
                    Logout
                  </button>
                </section>
              </div>
            )}
          </div>
        )}
      </header>
      <main className="flex-1">{children}</main>
      <section className="bg-slate-950 px-4 py-2 text-center text-white">
        <div className="mx-auto max-w-7xl text-sm font-bold text-white sm:text-base">
          <span>Contact For Any Queries : </span>
          <a
            href="https://wa.me/918186981479?text=Hello"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm underline underline-offset-4 transition hover:text-white/80 sm:text-base"
          >
            Click Here
          </a>
        </div>
      </section>
      <footer className="mb-24 mt-auto bg-primary px-4 py-9 text-secondary shadow-[0_-10px_30px_rgba(0,0,0,0.08)] sm:py-8 md:mb-0 md:py-10">
        <div className="mx-auto max-w-7xl text-center text-[11px] font-semibold leading-5 sm:px-6 sm:text-sm">
          <p>© 2026 MBR Fashion Hub. Crafted for modern wardrobes.</p>
        </div>
      </footer>
      <nav className={`pointer-events-none fixed inset-x-0 bottom-0 z-50 px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] transition duration-300 md:hidden ${showBottomNav ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}`}>
        <div className="pointer-events-auto mx-auto grid max-w-[390px] grid-cols-4 gap-1.5 rounded-full border border-white/70 bg-white/82 p-1.5 shadow-[0_12px_40px_rgba(35,20,20,0.2)] backdrop-blur-2xl backdrop-saturate-150">
          <Link
            to="/products"
            aria-current={isActivePath('/products') ? 'page' : undefined}
            className={`relative flex min-h-[52px] flex-col items-center justify-center rounded-full px-1 text-[10px] font-bold transition ${
              isActivePath('/products') ? 'bg-maroon text-white shadow-md shadow-maroon/20' : 'text-maroon hover:bg-maroon/10'
            }`}
          >
            <span className="relative mb-0.5 flex h-5 w-5 items-center justify-center">
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
                <path d="M3 6h18" />
                <path d="M16 10a4 4 0 0 1-8 0" />
              </svg>
            </span>
            <span>Shop</span>
          </Link>

          <Link
            to="/wishlist"
            aria-current={isActivePath('/wishlist') ? 'page' : undefined}
            className={`relative flex min-h-[52px] flex-col items-center justify-center rounded-full px-1 text-[10px] font-bold transition ${
              isActivePath('/wishlist') ? 'bg-maroon text-white shadow-md shadow-maroon/20' : 'text-maroon hover:bg-maroon/10'
            }`}
          >
            <span className="relative mb-0.5 flex h-5 w-5 items-center justify-center">
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z" />
              </svg>
              <BottomNavBadge count={wishlistCount} />
            </span>
            <span>Wishlist</span>
          </Link>

          <Link
            to="/cart"
            aria-current={isActivePath('/cart') ? 'page' : undefined}
            className={`relative flex min-h-[52px] flex-col items-center justify-center rounded-full px-1 text-[10px] font-bold transition ${
              isActivePath('/cart') ? 'bg-maroon text-white shadow-md shadow-maroon/20' : 'text-maroon hover:bg-maroon/10'
            }`}
          >
            <span className="relative mb-0.5 flex h-5 w-5 items-center justify-center">
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="8" cy="21" r="1" />
                <circle cx="19" cy="21" r="1" />
                <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h8.72a2 2 0 0 0 2-1.61L21 7H5.12" />
              </svg>
              <BottomNavBadge count={cartCount} />
            </span>
            <span>Cart</span>
          </Link>

          <Link
            to="/orders"
            aria-current={isActivePath('/orders') ? 'page' : undefined}
            className={`relative flex min-h-[52px] flex-col items-center justify-center rounded-full px-1 text-[10px] font-bold transition ${
              isActivePath('/orders') ? 'bg-maroon text-white shadow-md shadow-maroon/20' : 'text-maroon hover:bg-maroon/10'
            }`}
          >
            <span className="relative mb-0.5 flex h-5 w-5 items-center justify-center">
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
                <path d="m3.3 7 8.7 5 8.7-5" />
                <path d="M12 22V12" />
              </svg>
            </span>
            <span>Orders</span>
          </Link>
        </div>
      </nav>
    </div>
  );
};

export default Layout;

