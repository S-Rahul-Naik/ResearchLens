import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';

export default function SignUpPage() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.name || !form.email || !form.password) {
      setError('Please fill in all fields.');
      return;
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (form.password !== form.confirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    const result = await signup(form.name, form.email, form.password);
    setLoading(false);
    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.error || 'Signup failed');
    }
  };

  const passwordStrength = () => {
    const p = form.password;
    if (!p) return null;
    if (p.length < 6) return { label: 'Weak', color: 'bg-rose-400', width: 'w-1/4' };
    if (p.length < 10) return { label: 'Fair', color: 'bg-amber-400', width: 'w-2/4' };
    if (p.length < 14) return { label: 'Good', color: 'bg-teal-400', width: 'w-3/4' };
    return { label: 'Strong', color: 'bg-green-500', width: 'w-full' };
  };
  const strength = passwordStrength();

  return (
    <div className="min-h-screen flex bg-[#f8f9fb]">
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between w-[480px] flex-shrink-0 bg-[#0a1628] p-10 relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-20"
          style={{ backgroundImage: "url('https://readdy.ai/api/search-image?query=abstract%20dark%20scientific%20network%20visualization%20glowing%20research%20nodes%20connections%20deep%20space%20teal%20colors%20minimal%20elegant&width=480&height=900&seq=auth-bg-04&orientation=portrait')" }}
        />
        <div className="relative z-10">
          <Link to="/" className="flex items-center gap-3">
            <img src="https://public.readdy.ai/ai/img_res/c3ba04c3-362e-4eb4-b5f2-b15a59a83c21.png" alt="ResearchLens" className="h-9 w-9 object-contain" />
            <span className="text-xl font-bold text-white">ResearchLens</span>
          </Link>
        </div>
        <div className="relative z-10 space-y-5">
          {[
            { icon: 'ri-brain-line', title: 'Real AI, not simulations', desc: 'Sentence Transformers + BERTopic process your actual papers.' },
            { icon: 'ri-shield-check-line', title: 'Your data stays private', desc: 'Papers are processed securely and never shared.' },
            { icon: 'ri-lightbulb-flash-line', title: 'Explainable gaps', desc: 'Every detected gap comes with evidence, citations, and reasoning.' },
          ].map((f) => (
            <div key={f.title} className="flex items-start gap-4">
              <div className="w-9 h-9 flex items-center justify-center rounded-lg bg-teal-900/60 text-teal-400 flex-shrink-0 mt-0.5">
                <i className={`${f.icon} text-base`} />
              </div>
              <div>
                <div className="text-white text-sm font-medium">{f.title}</div>
                <div className="text-white/50 text-xs mt-0.5">{f.desc}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="relative z-10">
          <p className="text-white/40 text-xs">Join 1,200+ researchers already using ResearchLens</p>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-[420px]">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <img src="https://public.readdy.ai/ai/img_res/c3ba04c3-362e-4eb4-b5f2-b15a59a83c21.png" alt="ResearchLens" className="h-8 w-8 object-contain" />
            <span className="text-lg font-bold text-gray-900">ResearchLens</span>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">Create your account</h1>
          <p className="text-sm text-gray-500 mb-8">Start discovering research gaps today</p>

          {error && (
            <div className="mb-5 p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2">
              <i className="ri-error-warning-line text-rose-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-rose-600">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Full name</label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Dr. Jane Smith"
                className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 bg-white transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Email address</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="you@institution.edu"
                className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 bg-white transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Password</label>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="At least 8 characters"
                className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 bg-white transition-colors"
              />
              {strength && (
                <div className="mt-2">
                  <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${strength.color} ${strength.width}`} />
                  </div>
                  <span className="text-xs text-gray-400 mt-1 block">{strength.label}</span>
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Confirm password</label>
              <input
                type="password"
                name="confirm"
                value={form.confirm}
                onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                placeholder="Repeat your password"
                className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 bg-white transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="whitespace-nowrap w-full py-2.5 bg-[#0f766e] text-white text-sm font-semibold rounded-lg hover:bg-[#0d6b62] transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <>
                  <i className="ri-loader-4-line animate-spin" />
                  Creating account...
                </>
              ) : (
                'Create account'
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-gray-400">
            By signing up, you agree to our{' '}
            <span className="text-teal-600 cursor-pointer hover:underline">Terms of Service</span>
            {' '}and{' '}
            <span className="text-teal-600 cursor-pointer hover:underline">Privacy Policy</span>.
          </p>

          <p className="mt-4 text-center text-sm text-gray-500">
            Already have an account?{' '}
            <Link to="/signin" className="text-teal-600 font-medium hover:underline cursor-pointer">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
