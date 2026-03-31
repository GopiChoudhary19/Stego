'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import Navbar from '@/components/Navbar';
import { Mail, Lock, User, Phone, ArrowRight, ArrowLeft, UtensilsCrossed, AlertCircle, KeyRound } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const { register, verifyOtp, isLoading, authStep, setAuthStep } = useAuthStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('USER');
  const [otpCode, setOtpCode] = useState('');
  const [error, setError] = useState('');

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await register(name, email, password, phone, role);
      // registration success in store sets authStep to 'otp'
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(axiosErr.response?.data?.message || 'Registration failed');
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await verifyOtp(email, otpCode);
      const currentUser = useAuthStore.getState().user;
      router.push(currentUser?.role === 'ROLE_RESTAURANT_OWNER' ? '/dashboard' : '/restaurants');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(axiosErr.response?.data?.message || 'Invalid or expired OTP code');
    }
  };

  const handleBackToRegister = () => {
    setAuthStep('form');
    setError('');
    setOtpCode('');
  };

  return (
    <>
      <Navbar />
      <main className="min-h-screen flex items-center justify-center px-4 pt-20 pb-10">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-14 h-14 gradient-brand rounded-2xl flex items-center justify-center mx-auto mb-4
                          shadow-lg shadow-orange-500/20">
              <UtensilsCrossed className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-3xl font-bold mb-2">
              {authStep === 'otp' ? 'Check your email' : 'Create account'}
            </h1>
            <p className="text-text-secondary">
              {authStep === 'otp' 
                ? `Enter the 6-digit code sent to ${email}`
                : 'Join Stego and start ordering smarter'}
            </p>
          </div>

          <div className="card p-8">
            {authStep === 'form' ? (
              <>
                {/* Role Toggle */}
                <div className="flex rounded-xl bg-surface-elevated p-1 mb-6">
                  {[
                    { value: 'USER', label: 'Customer' },
                    { value: 'RESTAURANT_OWNER', label: 'Restaurant Owner' },
                  ].map((r) => (
                    <button key={r.value} onClick={() => setRole(r.value)}
                      className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all duration-200
                        ${role === r.value ? 'gradient-brand text-white shadow-md' : 'text-text-secondary hover:text-text-primary'}`}>
                      {r.label}
                    </button>
                  ))}
                </div>

                <form onSubmit={handleRegisterSubmit} className="space-y-4">
                  {error && (
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      {error}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1.5">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                      <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                             className="input-field !pl-11" placeholder="John Doe" required />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1.5">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                             className="input-field !pl-11" placeholder="you@example.com" required />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1.5">Phone</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                      <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                             className="input-field !pl-11" placeholder="+91 9876543210" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1.5">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                             className="input-field !pl-11" placeholder="Min 8 characters" required minLength={8} />
                    </div>
                  </div>

                  <button type="submit" disabled={isLoading}
                          className="btn-primary w-full !py-3.5 !rounded-xl disabled:opacity-50">
                    {isLoading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>Create Account <ArrowRight className="w-4 h-4" /></>
                    )}
                  </button>
                </form>

                <p className="text-center text-text-secondary text-sm mt-6">
                  Already have an account?{' '}
                  <Link href="/login" className="text-brand font-medium hover:underline">Sign in</Link>
                </p>
              </>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-5">
                {error && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">Verification Code</label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                    <input type="text" value={otpCode} onChange={(e) => setOtpCode(e.target.value)}
                           className="input-field !pl-11 text-center tracking-[0.5em] font-bold text-xl" 
                           placeholder="••••••" maxLength={6} required />
                  </div>
                </div>

                <button type="submit" disabled={isLoading}
                        className="btn-primary w-full !py-3.5 !rounded-xl disabled:opacity-50">
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>Verify & Join <ArrowRight className="w-4 h-4" /></>
                  )}
                </button>

                <button type="button" onClick={handleBackToRegister}
                        className="w-full flex items-center justify-center gap-2 text-text-secondary text-sm hover:text-brand transition-colors">
                  <ArrowLeft className="w-4 h-4" /> Back to registration
                </button>
              </form>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
