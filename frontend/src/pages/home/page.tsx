import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import DemoModal from './components/DemoModal';

export default function HomePage() {
  const { isAuthenticated } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [showDemo, setShowDemo] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 20);
      setShowScrollTop(window.scrollY > 400);
    };
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/80 backdrop-blur-md border-b border-gray-100 shadow-sm' : 'bg-transparent'}`}>
        <div className="w-full px-6 lg:px-12">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-3">
              <img
                src="https://public.readdy.ai/ai/img_res/12556d95-4452-404b-af67-e4ec8f0d7e14.png"
                alt="ResearchLens"
                className="w-8 h-8 object-contain"
              />
              <span className="text-lg font-semibold text-gray-900">ResearchLens</span>
            </Link>
            <div className="flex items-center gap-4">
              {isAuthenticated ? (
                <Link
                  to="/dashboard"
                  className="whitespace-nowrap px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors cursor-pointer"
                >
                  Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    to="/signin"
                    className="whitespace-nowrap px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors cursor-pointer"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/signup"
                    className="whitespace-nowrap px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors cursor-pointer"
                  >
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/50 via-white to-teal-50/30" />
        <div className="relative w-full px-6 lg:px-12">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 mb-8 text-sm font-medium text-emerald-700 bg-emerald-50 rounded-full border border-emerald-100">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              AI-Powered Research Intelligence
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6">
              Discover Research Gaps
              <span className="block text-emerald-600">Before Anyone Else</span>
            </h1>
            <p className="text-lg md:text-xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
              ResearchLens uses advanced AI to analyze your literature, detect unexplored research areas, and provide explainable insights about where the next breakthrough might happen.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to={isAuthenticated ? '/dashboard' : '/signup'}
                className="whitespace-nowrap w-full sm:w-auto px-8 py-4 text-base font-semibold text-white bg-gray-900 rounded-xl hover:bg-gray-800 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                Start Free Trial
                <i className="ri-arrow-right-line" />
              </Link>
              <button
                onClick={() => setShowDemo(true)}
                className="whitespace-nowrap w-full sm:w-auto px-8 py-4 text-base font-semibold text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <i className="ri-play-circle-line text-emerald-600" />
                See Live Demo
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="py-16 border-y border-gray-100 bg-gray-50/50">
        <div className="w-full px-6 lg:px-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
            {[
              { value: '10K+', label: 'Papers Analyzed' },
              { value: '500+', label: 'Gaps Detected' },
              { value: '95%', label: 'Accuracy Rate' },
              { value: '50+', label: 'Research Institutions' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">{stat.value}</div>
                <div className="text-sm text-gray-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 lg:py-32">
        <div className="w-full px-6 lg:px-12">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Everything You Need for Research Intelligence
            </h2>
            <p className="text-lg text-gray-600">
              A complete toolkit for discovering, analyzing, and understanding research landscapes.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {[
              {
                icon: 'ri-file-upload-line',
                title: 'Smart Paper Upload',
                desc: 'Upload PDFs and automatically extract metadata, abstracts, and content for analysis.',
              },
              {
                icon: 'ri-radar-line',
                title: 'AI-Powered Gap Detection',
                desc: 'Detect research gaps using semantic similarity and co-occurrence analysis.',
              },
              {
                icon: 'ri-lightbulb-flash-line',
                title: 'Explainable Insights',
                desc: 'Understand why gaps exist with detailed evidence from supporting papers.',
              },
              {
                icon: 'ri-map-2-line',
                title: 'Research Landscape Map',
                desc: 'Visualize topic clusters and relationships in an interactive 2D map.',
              },
              {
                icon: 'ri-line-chart-line',
                title: 'Trend Analysis',
                desc: 'Track research trends over time and identify rising or declining topics.',
              },
              {
                icon: 'ri-chat-3-line',
                title: 'RAG Chatbot',
                desc: 'Ask questions about your papers and get answers with citations.',
              },
            ].map((feat) => (
              <div
                key={feat.title}
                className="group p-8 bg-white rounded-2xl border border-gray-100 hover:border-emerald-200 hover:shadow-lg hover:shadow-emerald-50/50 transition-all duration-300 cursor-default"
              >
                <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center mb-6 group-hover:bg-emerald-100 transition-colors">
                  <i className={`${feat.icon} text-emerald-600 text-xl`} />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">{feat.title}</h3>
                <p className="text-gray-600 leading-relaxed">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 lg:py-32 bg-gray-50">
        <div className="w-full px-6 lg:px-12">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">How ResearchLens Works</h2>
            <p className="text-lg text-gray-600">From paper upload to gap detection in four simple steps.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
            {[
              {
                step: '01',
                title: 'Upload Papers',
                desc: 'Upload your research papers in PDF format. We extract text and metadata automatically.',
              },
              {
                step: '02',
                title: 'AI Processing',
                desc: 'Our AI analyzes papers, creates embeddings, and clusters them into topics using BERTopic.',
              },
              {
                step: '03',
                title: 'Gap Detection',
                desc: 'The system identifies gaps where topics are semantically similar but rarely co-occur.',
              },
              {
                step: '04',
                title: 'Explore Insights',
                desc: 'Review detected gaps with explainability, explore topics, and query via chatbot.',
              },
            ].map((item, i) => (
              <div key={item.step} className="relative">
                {i < 3 && (
                  <div className="hidden lg:block absolute top-8 left-full w-full h-px bg-gradient-to-r from-emerald-200 to-transparent z-0" />
                )}
                <div>
                  <div className="text-5xl font-bold text-emerald-100 mb-4">{item.step}</div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">{item.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What is a Research Gap */}
      <section className="py-20 lg:py-32">
        <div className="w-full px-6 lg:px-12">
          <div className="max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                  What is a Research Gap?
                </h2>
                <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                  A research gap exists when two topics are semantically similar (they discuss related concepts) but rarely appear together in existing literature. This suggests an unexplored connection that could lead to novel research directions.
                </p>
                <div className="space-y-4">
                  {[
                    'High semantic similarity between topics',
                    'Low co-occurrence in existing papers',
                    'Potential for novel research connections',
                    'Explainable with supporting evidence',
                  ].map((point) => (
                    <div key={point} className="flex items-start gap-3">
                      <div className="w-5 h-5 flex items-center justify-center mt-0.5 flex-shrink-0">
                        <i className="ri-checkbox-circle-fill text-emerald-500 text-lg" />
                      </div>
                      <span className="text-gray-700">{point}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-3xl p-8">
                <div className="bg-white rounded-2xl p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-sm font-medium text-gray-500">Gap Score Calculation</span>
                    <span className="px-3 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 rounded-full">Formula</span>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-6 mb-6">
                    <code className="text-lg font-mono text-gray-800">
                      gap_score = similarity &times; (1 /&nbsp;(co_occurrence + 1))
                    </code>
                  </div>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between items-start gap-4">
                      <span className="text-gray-600 flex-shrink-0">Similarity</span>
                      <span className="font-medium text-gray-900 text-right">Cosine similarity between topic centroids</span>
                    </div>
                    <div className="flex justify-between items-start gap-4">
                      <span className="text-gray-600 flex-shrink-0">Co-occurrence</span>
                      <span className="font-medium text-gray-900 text-right">Papers containing both topics</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 lg:py-32 bg-gray-900">
        <div className="w-full px-6 lg:px-12">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              Ready to Discover Your Next Research Direction?
            </h2>
            <p className="text-lg text-gray-400 mb-10">
              Join researchers worldwide who are using ResearchLens to find unexplored territories in their fields.
            </p>
            <Link
              to={isAuthenticated ? '/dashboard' : '/signup'}
              className="whitespace-nowrap px-8 py-4 text-base font-semibold text-gray-900 bg-white rounded-xl hover:bg-gray-100 transition-colors inline-flex items-center gap-2 cursor-pointer"
            >
              Get Started Free
              <i className="ri-arrow-right-line" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-gray-800 bg-gray-900">
        <div className="w-full px-6 lg:px-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img
                src="https://public.readdy.ai/ai/img_res/12556d95-4452-404b-af67-e4ec8f0d7e14.png"
                alt="ResearchLens"
                className="w-6 h-6 object-contain"
              />
              <span className="text-gray-400 text-sm">&copy; 2026 ResearchLens. All rights reserved.</span>
            </div>
            <div className="flex items-center gap-6">
              <a href="#" className="text-gray-400 hover:text-white transition-colors text-sm cursor-pointer">Privacy</a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors text-sm cursor-pointer">Terms</a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors text-sm cursor-pointer">Contact</a>
            </div>
          </div>
        </div>
      </footer>

      {/* Scroll-to-top FAB */}
      <button
        onClick={scrollToTop}
        className={`whitespace-nowrap fixed bottom-8 right-8 z-50 w-11 h-11 flex items-center justify-center bg-gray-900 text-white rounded-full cursor-pointer transition-all duration-300 hover:bg-gray-700 ${
          showScrollTop ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
        aria-label="Scroll to top"
      >
        <i className="ri-arrow-up-line text-lg" />
      </button>

      {/* Demo Modal */}
      {showDemo && <DemoModal onClose={() => setShowDemo(false)} />}
    </div>
  );
}
