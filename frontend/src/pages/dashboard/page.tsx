import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import Sidebar, { type DashboardSection } from './components/Sidebar';
import TopBar from './components/TopBar';
import OverviewSection from './sections/OverviewSection';
import DatasetsSection from './sections/DatasetsSection';
import GapsSection from './sections/GapsSection';
import HistorySection from './sections/HistorySection';
import TrendsSection from './sections/TrendsSection';
import MapSection from './sections/MapSection';
import ChatbotSection from './sections/ChatbotSection';
import EvaluationSection from './sections/EvaluationSection';
import ResultsSection from './sections/ResultsSection';
import { useAnalysisHistory, type AnalysisRun } from '../../hooks/useAnalysisHistory';
import type { RunAllResult, BackendPaper } from '../../lib/api';

export default function DashboardPage() {
  const { isAuthenticated, isAuthInitializing } = useAuth();
  const [section, setSection] = useState<DashboardSection>('overview');
  const [showResultsOverlay, setShowResultsOverlay] = useState(false);
  const [currentRun, setCurrentRun] = useState<AnalysisRun | null>(null);

  const { runs, addRun } = useAnalysisHistory();
  const latestRun = runs[0] ?? null;

  // On initial load, set currentRun to latestRun if available
  useEffect(() => {
    if (!currentRun && latestRun) {
      setCurrentRun(latestRun);
    }
  }, [latestRun, currentRun]);

  if (isAuthInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8f9fb] text-gray-500">
        <div className="flex items-center gap-2 text-sm">
          <i className="ri-loader-4-line animate-spin" />
          Restoring your session...
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/signin" replace />;
  }

  const handleShowResults = (runData: Omit<AnalysisRun, 'id' | 'timestamp'>) => {
    const saved = addRun(runData);
    setCurrentRun(saved);
    setShowResultsOverlay(true);
  };

  const handleViewHistoryRun = (run: AnalysisRun) => {
    setCurrentRun(run);
    setShowResultsOverlay(true);
  };

  const renderSection = () => {
    switch (section) {
      case 'overview': return <OverviewSection onNavigate={setSection} latestRun={latestRun} />;
      case 'datasets': return <DatasetsSection onShowResults={handleShowResults} />;
      case 'gaps': return <GapsSection backendResult={currentRun?.backendResult} papers={currentRun?.backendPapers ?? []} />;
      case 'history': return <HistorySection runs={runs} onViewRun={handleViewHistoryRun} />;
      case 'topics': return <TopicsSection backendResult={currentRun?.backendResult} papers={currentRun?.backendPapers ?? []} />;
      case 'trends': return <TrendsSection backendResult={currentRun?.backendResult} papers={currentRun?.backendPapers ?? []} />;
      case 'map': return <MapSection backendResult={currentRun?.backendResult} papers={currentRun?.backendPapers ?? []} />;
      case 'chatbot': return <ChatbotSection papers={currentRun?.backendPapers ?? []} backendResult={currentRun?.backendResult} />;
      case 'evaluation': return <EvaluationSection backendResult={currentRun?.backendResult} papers={currentRun?.backendPapers ?? []} />;
      default: return <OverviewSection onNavigate={setSection} latestRun={latestRun} />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#f8f9fb]">
      <Sidebar
        active={section}
        onNavigate={setSection}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar section={section} />
        <main className={`flex-1 overflow-y-auto ${section === 'chatbot' || section === 'map' ? 'overflow-hidden' : ''}`}>
          {renderSection()}
        </main>
      </div>

      {/* Full-screen Results overlay */}
      {showResultsOverlay && (
        <div className="fixed inset-0 z-50 bg-[#f8f9fb] overflow-y-auto">
          <ResultsSection
            onClose={() => setShowResultsOverlay(false)}
            run={currentRun}
          />
        </div>
      )}

    </div>
  );
}
