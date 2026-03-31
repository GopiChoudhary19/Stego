'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { useAuthStore } from '@/stores/authStore';
import { User, Mail, Phone, Shield, Calendar, LogOut } from 'lucide-react';

export default function ProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, logout, loadUser } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) { router.push('/login'); return; }
    loadUser();
  }, [isAuthenticated]);

  if (!user) return null;

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-20 pb-10">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold mb-8">My <span className="gradient-text">Profile</span></h1>

          {/* Avatar Card */}
          <div className="card p-8 text-center mb-6">
            <div className="w-20 h-20 gradient-brand rounded-2xl flex items-center justify-center mx-auto mb-4
                          shadow-lg shadow-orange-500/20">
              <User className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold">{user.name}</h2>
            <span className="badge badge-brand mt-2">{user.role?.replace('ROLE_', '').replace('_', ' ')}</span>
          </div>

          {/* Info Cards */}
          <div className="space-y-3">
            {[
              { icon: Mail, label: 'Email', value: user.email },
              { icon: Phone, label: 'Phone', value: user.phone || 'Not provided' },
              { icon: Shield, label: 'Role', value: user.role?.replace('ROLE_', '').replace('_', ' ') },
              { icon: Calendar, label: 'Joined', value: user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A' },
            ].map((item) => (
              <div key={item.label} className="card p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-surface-elevated flex items-center justify-center shrink-0">
                  <item.icon className="w-5 h-5 text-brand" />
                </div>
                <div>
                  <p className="text-text-muted text-xs">{item.label}</p>
                  <p className="font-medium">{item.value}</p>
                </div>
              </div>
            ))}
          </div>

          <button onClick={handleLogout}
                  className="btn-secondary w-full !py-3.5 !rounded-xl !border-red-500/20 !text-red-400
                           hover:!bg-red-500/10 mt-8">
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </main>
    </>
  );
}
