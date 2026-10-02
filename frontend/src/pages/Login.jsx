import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Lock, Mail, Eye, EyeOff, ShieldAlert, ArrowRight, UserCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import logoImg from '../assets/logo.png';

export const Login = () => {
  const [email, setEmail] = useState('admin@goldenswan.com');
  const [password, setPassword] = useState('Admin@12345');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await login(email, password);
      if (res.success) {
        navigate('/dashboard');
      } else {
        setError(res.message || 'Authentication failed. Please check credentials.');
      }
    } catch (err) {
      if (err.code === 'ECONNABORTED' || !err.response) {
        setError('Cloud server is waking up from standby. Retrying automatically...');
        try {
          // Wait 2 seconds and retry once
          await new Promise((r) => setTimeout(r, 2000));
          const retryRes = await login(email, password);
          if (retryRes.success) {
            navigate('/dashboard');
            return;
          }
        } catch {
          setError('Cloud server is finishing its startup. Please click "Sign In to Dashboard" again now.');
        }
      } else {
        const msg = err.response?.data?.message || 'Unable to connect to GoldenSwan API service. Please try again.';
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const setDemoCredentials = (demoEmail, demoPw) => {
    setEmail(demoEmail);
    setPassword(demoPw);
    setError('');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background ambient gold/navy glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-amber-600/10 via-gold-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Brand Treatment */}
        <div className="text-center mb-8">
          <div className="inline-block p-1.5 rounded-3xl bg-slate-900 border border-amber-500/30 shadow-2xl shadow-amber-500/10 mb-4">
            <img 
              src={logoImg} 
              alt="GoldenSwan Hotel Official Logo" 
              className="w-32 h-auto object-contain mx-auto rounded-2xl"
            />
          </div>
          <h2 className="text-2xl font-bold tracking-wider bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-300 bg-clip-text text-transparent font-serif">
            GOLDENSWAN HOTEL
          </h2>
          <p className="text-xs tracking-widest text-slate-400 uppercase font-medium mt-1">
            Luxury Management Terminal
          </p>
        </div>

        {/* Card */}
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl">
          {error && (
            <div className="mb-6 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center gap-3">
              <ShieldAlert className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Work Email Address
              </label>
              <div className="relative">
                <Mail className="w-5 h-5 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@goldenswan.com"
                  className="w-full pl-11 pr-4 py-3 bg-slate-950/70 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500 text-sm transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="w-5 h-5 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-11 pr-11 py-3 bg-slate-950/70 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500 text-sm transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-600 hover:to-gold-700 text-slate-950 font-bold rounded-xl shadow-lg shadow-gold-500/20 hover:shadow-gold-500/30 transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In to Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Credentials */}
          <div className="mt-8 pt-6 border-t border-slate-800/80">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-gold-400" />
              <span>Quick Login (Development Accounts)</span>
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDemoCredentials('admin@goldenswan.com', 'Admin@12345')}
                className="p-2 text-left bg-slate-950/60 border border-slate-800 rounded-lg hover:border-gold-500/50 text-xs transition-colors"
              >
                <div className="font-semibold text-slate-200">Super Admin</div>
                <div className="text-[10px] text-slate-500">Full Access</div>
              </button>
              <button
                type="button"
                onClick={() => setDemoCredentials('reception@goldenswan.com', 'Reception@12345')}
                className="p-2 text-left bg-slate-950/60 border border-slate-800 rounded-lg hover:border-gold-500/50 text-xs transition-colors"
              >
                <div className="font-semibold text-slate-200">Receptionist</div>
                <div className="text-[10px] text-slate-500">Front Desk</div>
              </button>
              <button
                type="button"
                onClick={() => setDemoCredentials('accounts@goldenswan.com', 'Accounts@12345')}
                className="p-2 text-left bg-slate-950/60 border border-slate-800 rounded-lg hover:border-gold-500/50 text-xs transition-colors"
              >
                <div className="font-semibold text-slate-200">Accountant</div>
                <div className="text-[10px] text-slate-500">Finance & Payroll</div>
              </button>
              <button
                type="button"
                onClick={() => setDemoCredentials('manager@goldenswan.com', 'Manager@12345')}
                className="p-2 text-left bg-slate-950/60 border border-slate-800 rounded-lg hover:border-gold-500/50 text-xs transition-colors"
              >
                <div className="font-semibold text-slate-200">Hotel Manager</div>
                <div className="text-[10px] text-slate-500">Operations</div>
              </button>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-slate-600 mt-6">
          GoldenSwan Hotel Management Software &bull; Protected & Encrypted
        </p>
      </div>
    </div>
  );
};
