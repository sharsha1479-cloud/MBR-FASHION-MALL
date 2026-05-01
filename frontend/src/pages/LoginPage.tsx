import { useState, type FormEvent } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const from = (location.state as any)?.from?.pathname || '/';

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      await login({ email, password });
      navigate(from, { replace: true });
    } catch (err) {
      setError('Failed to login. Check credentials.');
    }
  };

  return (
    <div className="mx-auto max-w-xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
      <h1 className="text-3xl font-semibold text-slate-900">Login</h1>
      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        {error && <p className="rounded-2xl bg-red-100 px-4 py-3 text-sm text-red-700">{error}</p>}
        <div>
          <label className="block text-sm font-semibold text-slate-700">Email</label>
          <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required className="mt-2 w-full p-3" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700">Password</label>
          <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" required className="mt-2 w-full p-3" />
        </div>
        <button type="submit" className="w-full rounded-full bg-orange-600 px-5 py-4 text-sm font-semibold text-white shadow hover:bg-orange-700">
          Sign In
        </button>
      </form>
      <p className="mt-6 text-sm text-slate-500">
        Don’t have an account? <Link to="/signup" className="text-orange-600 hover:text-orange-700">Create one.</Link>
      </p>
    </div>
  );
};

export default LoginPage;
