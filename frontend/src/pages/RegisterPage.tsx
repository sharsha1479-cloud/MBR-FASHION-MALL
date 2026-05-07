import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const RegisterPage = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { signup } = useAuth();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      await signup({ name, email, password });
      navigate('/');
    } catch (err) {
      setError('Failed to create account.');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-200px)] px-4 py-8">
      <div className="mx-auto w-full max-w-sm sm:max-w-md rounded-2xl sm:rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
        <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900">Sign up</h1>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4 sm:space-y-5">
          {error && <p className="rounded-2xl bg-red-100 px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-red-700">{error}</p>}
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-slate-700">Name</label>
            <input value={name} onChange={(event) => setName(event.target.value)} type="text" required className="mt-2 w-full p-2 sm:p-3 border border-slate-300 rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-slate-700">Email</label>
            <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required className="mt-2 w-full p-2 sm:p-3 border border-slate-300 rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-slate-700">Password</label>
            <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" required className="mt-2 w-full p-2 sm:p-3 border border-slate-300 rounded-lg text-sm" />
          </div>
          <button type="submit" className="w-full rounded-full bg-orange-600 px-4 sm:px-5 py-3 sm:py-4 text-xs sm:text-sm font-semibold text-white shadow hover:bg-orange-700 transition mt-6">
            Create account
          </button>
        </form>
        <p className="mt-6 text-xs sm:text-sm text-slate-500">
          Already have an account? <Link to="/login" className="text-orange-600 hover:text-orange-700 font-semibold">Login.</Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
