'use client';

import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { motion } from 'framer-motion';
import {
  Clock, MapPin, CreditCard, Star, ArrowRight,
  Zap, Shield, Smartphone, ChefHat, Timer, TrendingUp
} from 'lucide-react';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }
  }),
};

export default function Home() {
  return (
    <>
      <Navbar />
      <main className="bg-surface">
        {/* ── Hero Section ── */}
        <section className="relative min-h-[90vh] flex items-center pt-20 overflow-hidden">
          {/* Hero Image Background */}
          <div className="absolute inset-y-0 right-0 w-full lg:w-1/2 opacity-20 lg:opacity-100">
            <div className="absolute inset-0 bg-gradient-to-r from-surface via-surface/80 to-transparent z-10 lg:hidden" />
            <div className="absolute inset-0 bg-gradient-to-l from-transparent via-surface/40 to-surface z-10 hidden lg:block" />
            <img 
              src="/images/stego_hero.png" 
              alt="Delicious Gourmet Food" 
              className="w-full h-full object-cover"
            />
          </div>

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full z-20">
            <motion.div initial="hidden" animate="visible" className="max-w-2xl">
              {/* Badge */}
              <motion.div custom={0} variants={fadeUp}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full
                         bg-brand/10 text-brand-700 text-sm font-semibold mb-6">
                <Zap className="w-4 h-4" />
                Smart Food Pre-Ordering
              </motion.div>
              
              <motion.h1 custom={1} variants={fadeUp}
                className="text-6xl sm:text-7xl lg:text-8xl font-black tracking-tight leading-[0.9] text-text-primary mb-6">
                Skip the lines,
                <br />
                <span className="gradient-text">Just Eat & Go.</span>
              </motion.h1>

              <motion.p custom={2} variants={fadeUp}
                className="text-lg sm:text-xl text-text-secondary mb-10 leading-relaxed max-w-lg">
                Pre-order from your favorite local restaurants. Your food is prepared 
                exactly for your arrival time. No waiting, just premium dining.
              </motion.p>

              {/* CTA Buttons */}
              <motion.div custom={3} variants={fadeUp}
                className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/restaurants" className="btn-primary !py-4 !px-8 !text-base !rounded-2xl group">
                  Browse Restaurants
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link href="/register" className="btn-secondary !py-4 !px-8 !text-base !rounded-2xl">
                  Join as Owner
                </Link>
              </motion.div>

              {/* Stats */}
              <motion.div custom={4} variants={fadeUp}
                className="flex items-center justify-center gap-8 sm:gap-16 pt-8">
                {[
                  { value: '15min', label: 'Avg. Time Saved' },
                  { value: '500+', label: 'Restaurants' },
                  { value: '50K+', label: 'Happy Users' },
                ].map((stat) => (
                  <div key={stat.label} className="text-center">
                    <div className="text-2xl sm:text-3xl font-bold gradient-text">{stat.value}</div>
                    <div className="text-xs sm:text-sm text-text-muted mt-1">{stat.label}</div>
                  </div>
                ))}
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* ── How It Works ── */}
        <section className="py-24 sm:py-32 relative">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-brand/[0.02] to-transparent" />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
            <div className="text-center mb-16">
              <p className="text-brand font-semibold text-sm uppercase tracking-wider mb-3">How It Works</p>
              <h2 className="text-3xl sm:text-5xl font-bold">
                Three steps to <span className="gradient-text">skip the wait</span>
              </h2>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                { icon: MapPin, title: 'Find Restaurants', desc: 'Browse nearby restaurants and explore their menus with real-time availability.', step: '01' },
                { icon: Clock, title: 'Pre-Order & Pick Time', desc: 'Select your meals, choose a pickup time slot, and pay online or choose COD.', step: '02' },
                { icon: ChefHat, title: 'Arrive & Collect', desc: 'Your food is ready when you arrive. No waiting, no queues — just eat and go!', step: '03' },
              ].map((item) => (
                <div key={item.step} className="card p-8 relative group">
                  <div className="absolute top-6 right-6 text-5xl font-black text-surface-elevated
                                group-hover:text-brand/10 transition-colors duration-500">
                    {item.step}
                  </div>
                  <div className="w-14 h-14 rounded-2xl gradient-brand flex items-center justify-center mb-6
                                shadow-lg shadow-orange-500/20">
                    <item.icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                  <p className="text-text-secondary leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Features Grid ── */}
        <section className="py-24 sm:py-32">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <p className="text-brand font-semibold text-sm uppercase tracking-wider mb-3">Features</p>
              <h2 className="text-3xl sm:text-5xl font-bold">
                Everything you need to <span className="gradient-text">order smarter</span>
              </h2>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { icon: Timer, title: 'Live Order Tracking', desc: 'Real-time updates: Preparing → Ready → Completed' },
                { icon: CreditCard, title: 'Flexible Payments', desc: 'Pay online via UPI/Card or choose Cash on Delivery' },
                { icon: Star, title: 'Ratings & Reviews', desc: 'Rate restaurants and help others make great choices' },
                { icon: Zap, title: 'AI Time Prediction', desc: 'Smart estimates so your food is ready when you arrive' },
                { icon: Shield, title: 'Secure & Private', desc: 'JWT authentication and encrypted data at every step' },
                { icon: Smartphone, title: 'Mobile First', desc: 'Beautiful responsive design, works perfectly on any device' },
              ].map((feature) => (
                <div key={feature.title} className="card p-6 group cursor-default">
                  <div className="w-12 h-12 rounded-xl bg-brand/10 flex items-center justify-center mb-4
                                group-hover:bg-brand/20 transition-colors">
                    <feature.icon className="w-6 h-6 text-brand" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-text-secondary text-sm leading-relaxed">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Restaurant Owner CTA ── */}
        <section className="py-24 sm:py-32 relative overflow-hidden">
          <div className="absolute inset-0">
            <div className="absolute inset-0 bg-gradient-to-r from-brand/5 via-transparent to-brand/5" />
          </div>
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative text-center">
            <div className="glass rounded-3xl p-10 sm:p-16 glow-brand">
              <TrendingUp className="w-12 h-12 text-brand mx-auto mb-6" />
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                Own a Restaurant?
              </h2>
              <p className="text-text-secondary text-lg max-w-xl mx-auto mb-8">
                Join Stego and reduce wait times by 60%. Manage your orders, menu,
                and customer queue — all from one powerful dashboard.
              </p>
              <Link href="/register" className="btn-primary !py-4 !px-10 !text-base !rounded-2xl">
                Register Your Restaurant
              </Link>
            </div>
          </div>
        </section>

        {/* ── Footer ── */}
        <footer className="border-t border-border py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 gradient-brand rounded-lg flex items-center justify-center">
                  <ChefHat className="w-4 h-4 text-white" />
                </div>
                <span className="font-bold text-lg">Stego</span>
                <span className="text-text-muted text-sm ml-2">Save Time, Eat & Go</span>
              </div>
              <div className="flex items-center gap-6 text-sm text-text-muted">
                <Link href="/restaurants" className="hover:text-text-primary transition-colors">Restaurants</Link>
                <Link href="/login" className="hover:text-text-primary transition-colors">Login</Link>
                <Link href="/register" className="hover:text-text-primary transition-colors">Sign Up</Link>
              </div>
              <p className="text-text-muted text-sm">© 2026 Stego. All rights reserved.</p>
            </div>
          </div>
        </footer>
      </main>
    </>
  );
}
