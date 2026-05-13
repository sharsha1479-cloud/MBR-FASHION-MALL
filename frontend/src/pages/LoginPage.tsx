import { useState, type FormEvent } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { requestPasswordOtp, resetPasswordWithOtp } from '../services/auth';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [forgotOpen, setForgotOpen] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [forgotForm, setForgotForm] = useState({ email: '', otp: '', newPassword: '', confirmPassword: '' });
  const [forgotMessage, setForgotMessage] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const loginMessage = (location.state as any)?.message || '';
  const fromLocation = (location.state as any)?.from;

  const from = fromLocation
    ? `${fromLocation.pathname || '/'}${fromLocation.search || ''}${fromLocation.hash || ''}`
    : '/';

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      await login({ email, password });
      navigate(from, { replace: true });
    } catch (err) {
      setError('Failed to login. Check credentials.');
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
      setForgotMessage('OTP sent to your registered email.');
    } catch (err: any) {
      setForgotError(err.response?.data?.message || 'Could not send OTP.');
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
      setForgotMessage('Password reset successfully. You can login now.');
      setOtpSent(false);
      setForgotForm({ email: forgotForm.email, otp: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      setForgotError(err.response?.data?.message || 'Could not reset password.');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-200px)] px-4 py-8">
      <div className="mx-auto w-full max-w-sm sm:max-w-md rounded-2xl sm:rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
      {!forgotOpen ? (
        <>
          <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900">Login</h1>
          <form onSubmit={handleSubmit} className="mt-6 space-y-4 sm:space-y-5">
            {loginMessage && <p className="rounded-2xl bg-maroon/10 px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-maroon">{loginMessage}</p>}
            {error && <p className="rounded-2xl bg-red-100 px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-red-700">{error}</p>}
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-slate-700">Email</label>
              <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required className="mt-2 w-full p-2 sm:p-3 border border-slate-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-slate-700">Password</label>
              <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" required className="mt-2 w-full p-2 sm:p-3 border border-slate-300 rounded-lg text-sm" />
            </div>
            <button
              type="button"
              onClick={() => {
                setForgotOpen(true);
                setForgotForm((current) => ({ ...current, email }));
                setForgotMessage('');
                setForgotError('');
              }}
              className="border-0 bg-transparent p-0 text-xs font-semibold text-maroon shadow-none hover:text-maroon/80"
            >
              Forgot password?
            </button>
            <button type="submit" className="w-full rounded-full bg-maroon px-4 sm:px-5 py-3 sm:py-4 text-xs sm:text-sm font-semibold text-white shadow hover:bg-maroon/90 transition mt-6">
              Sign In
            </button>
          </form>
        </>
      ) : (
        <div className="rounded-2xl border border-maroon/15 bg-cream p-4">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-xl sm:text-2xl font-semibold text-slate-900">Reset password</h1>
            <button
              type="button"
              onClick={() => {
                setForgotOpen(false);
                setOtpSent(false);
                setForgotMessage('');
                setForgotError('');
              }}
              className="border-0 bg-transparent p-0 text-xs font-bold text-maroon shadow-none hover:text-maroon/80"
            >
              Back to login
            </button>
          </div>
          {!otpSent ? (
            <form onSubmit={handleRequestOtp} className="mt-4 space-y-3">
              <input
                type="email"
                value={forgotForm.email}
                onChange={(event) => setForgotForm((current) => ({ ...current, email: event.target.value }))}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                placeholder="Registered email"
                required
              />
              <button type="submit" disabled={forgotLoading} className="w-full rounded-full bg-maroon px-4 py-3 text-sm font-semibold text-secondary disabled:cursor-not-allowed disabled:opacity-60">
                {forgotLoading ? 'Sending...' : 'Send OTP'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="mt-4 space-y-3">
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
              <button type="submit" disabled={forgotLoading} className="w-full rounded-full bg-maroon px-4 py-3 text-sm font-semibold text-secondary disabled:cursor-not-allowed disabled:opacity-60">
                {forgotLoading ? 'Resetting...' : 'Reset password'}
              </button>
            </form>
          )}
          {forgotMessage && <p className="mt-3 rounded-xl bg-green-100 px-3 py-2 text-xs font-semibold text-green-700">{forgotMessage}</p>}
          {forgotError && <p className="mt-3 rounded-xl bg-red-100 px-3 py-2 text-xs font-semibold text-red-700">{forgotError}</p>}
        </div>
      )}
      <p className="mt-6 text-xs sm:text-sm text-slate-500">
        Don't have an account? <Link to="/signup" className="text-maroon hover:text-maroon/80 font-semibold">Create one.</Link>
      </p>
    </div>
    </div>
  );
};

export default LoginPage;
