import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Layout = ({ children }: { children: ReactNode }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-secondary text-primary">
      <header className="sticky top-0 z-50 bg-primary text-secondary shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
          <Link to="/" className="text-2xl font-bold">
            Men's Fashion
          </Link>
          <nav className="hidden md:flex items-center space-x-8">
            <Link to="/products" className="hover:text-accent transition-colors duration-300">
              Shop
            </Link>
            <Link to="/cart" className="hover:text-accent transition-colors duration-300">
              Cart
            </Link>
            {user ? (
              <>
                {user.role === 'admin' && (
                  <Link to="/admin" className="hover:text-accent transition-colors duration-300">
                    Admin
                  </Link>
                )}
                <button onClick={handleLogout} className="hover:text-accent transition-colors duration-300">
                  Logout
                </button>
              </>
            ) : (
              <Link to="/login" className="hover:text-accent transition-colors duration-300">
                Login
              </Link>
            )}
          </nav>
          <div className="md:hidden">
            {/* Mobile menu button */}
            <button className="text-secondary">Menu</button>
          </div>
        </div>
      </header>
      <main>{children}</main>
      <footer className="bg-primary text-secondary py-10">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p>© 2026 Men's Fashion. Crafted for modern wardrobes.</p>
        </div>
      </footer>
    </div>
  );
};

export default Layout;

