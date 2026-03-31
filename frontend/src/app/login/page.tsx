'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import Navbar from '@/components/Navbar';
import { Mail, Lock, ArrowRight, ArrowLeft, UtensilsCrossed, AlertCircle, KeyRound } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login, verifyOtp, isLoading, authStep, setAuthStep } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [error, setError] = useState('');

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await login(email, password);
      // login success in store sets authStep to 'otp'
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(axiosErr.response?.data?.message || 'Invalid email or password');
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await verifyOtp(email, otpCode);
      router.push('/restaurants');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(axiosErr.response?.data?.message || 'Invalid or expired OTP code');
    }
  };

  const handleBackToLogin = () => {
    setAuthStep('form');
    setError('');
    setOtpCode('');
  };

  return (
    <>
      <Navbar />
      <main className="min-h-screen flex items-center justify-center px-4 pt-20 pb-10">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-14 h-14 gradient-brand rounded-2xl flex items-center justify-center mx-auto mb-4
                          shadow-lg shadow-orange-500/20">
              <UtensilsCrossed className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-3xl font-bold mb-2">
              {authStep === 'otp' ? 'Check your email' : 'Welcome back'}
            </h1>
            <p className="text-text-secondary">
              {authStep === 'otp' 
                ? `Enter the 6-digit code sent to ${email}`
                : 'Sign in to continue ordering'}
            </p>
          </div>

          {/* Form */}
          <div className="card p-8">
            {authStep === 'form' ? (
              <form onSubmit={handleLoginSubmit} className="space-y-5">
                {error && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">Email address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                           className="input-field !pl-11" placeholder="you@example.com" required />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                           className="input-field !pl-11" placeholder="••••••••" required />
                  </div>
                </div>

                <button type="submit" disabled={isLoading}
                        className="btn-primary w-full !py-3.5 !rounded-xl disabled:opacity-50">
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>Sign In <ArrowRight className="w-4 h-4" /></>
                  )}
                </button>
                
                <p className="text-center text-text-secondary text-sm mt-6">
                  Don&apos;t have an account?{' '}
                  <Link href="/register" className="text-brand font-medium hover:underline">
                    Create one
                  </Link>
                </p>
              </form>
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
                    <>Verify & Sign In <ArrowRight className="w-4 h-4" /></>
                  )}
                </button>

                <button type="button" onClick={handleBackToLogin}
                        className="w-full flex items-center justify-center gap-2 text-text-secondary text-sm hover:text-brand transition-colors">
                  <ArrowLeft className="w-4 h-4" /> Back to login
                </button>
              </form>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
