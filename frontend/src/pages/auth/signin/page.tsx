import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';

export default function SignInPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.email || !form.password) {
      setError('Please fill in all fields.');
      return;
    }
    setLoading(true);
    const result = await login(form.email, form.password);
    setLoading(false);
    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.error || 'Login failed');
    }
  };

  return (
    <div className="min-h-screen flex bg-[#f8f9fb]">
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between w-[480px] flex-shrink-0 bg-[#0a1628] p-10 relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-20"
          style={{ backgroundImage: "url('https://readdy.ai/api/search-image?query=abstract%20dark%20scientific%20network%20visualization%20glowing%20research%20nodes%20connections%20deep%20space%20teal%20colors%20minimal%20elegant&width=480&height=900&seq=auth-bg-03&orientation=portrait')" }}
        />
        <div className="relative z-10">
          <Link to="/" className="flex items-center gap-3">
            <img
              src="https://public.readdy.ai/ai/img_res/c3ba04c3-362e-4eb4-b5f2-b15a59a83c21.png"
              alt="ResearchLens"
              className="h-9 w-9 object-contain"
            />
            <span className="text-xl font-bold text-white">ResearchLens</span>
          </Link>
        </div>
        <div className="relative z-10">
          <blockquote className="text-white/80 text-base leading-relaxed italic mb-6">
            &quot;ResearchLens identified a gap in my field that I had been circling around for months. The explainability panel made the gap immediately obvious.&quot;
          </blockquote>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-teal-600 flex items-center justify-center text-white font-bold text-sm">
              DR
            </div>
            <div>
              <div className="text-white text-sm font-medium">Dr. Rachel Kim</div>
              <div className="text-white/50 text-xs">ML Researcher, MIT CSAIL</div>
            </div>
          </div>
        </div>
        <div className="relative z-10 grid grid-cols-3 gap-4">
          {[
            { value: '20K+', label: 'Papers analyzed' },
            { value: '1.2K', label: 'Gaps detected' },
            { value: '98%', label: 'Accuracy rate' },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-xl font-bold text-[#2dd4bf]">{s.value}</div>
              <div className="text-xs text-white/50 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-[420px]">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <img src="https://public.readdy.ai/ai/img_res/c3ba04c3-362e-4eb4-b5f2-b15a59a83c21.png" alt="ResearchLens" className="h-8 w-8 object-contain" />
            <span className="text-lg font-bold text-gray-900">ResearchLens</span>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome back</h1>
          <p className="text-sm text-gray-500 mb-8">Sign in to your ResearchLens account</p>

          {error && (
            <div className="mb-5 p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2">
              <i className="ri-error-warning-line text-rose-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-rose-600">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Email address</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="you@example.com"
                className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 bg-white transition-colors"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-gray-700">Password</label>
                <span className="text-xs text-teal-600 cursor-pointer hover:underline">Forgot password?</span>
              </div>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Enter your password"
                className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 bg-white transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="whitespace-nowrap w-full py-2.5 bg-[#0f766e] text-white text-sm font-semibold rounded-lg hover:bg-[#0d6b62] transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <i className="ri-loader-4-line animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          <div className="mt-6 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-xs text-amber-700">
              <strong>Demo credentials:</strong> alex@researchlens.ai / password123
            </p>
          </div>

          <p className="mt-6 text-center text-sm text-gray-500">
            Don&apos;t have an account?{' '}
            <Link to="/signup" className="text-teal-600 font-medium hover:underline cursor-pointer">
              Sign up free
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
