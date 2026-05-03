import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import Sidebar, { type DashboardSection } from './components/Sidebar';
import TopBar from './components/TopBar';
import OverviewSection from './sections/OverviewSection';
import DatasetsSection from './sections/DatasetsSection';
import GapsSection from './sections/GapsSection';
import TopicsSection from './sections/TopicsSection';
import TrendsSection from './sections/TrendsSection';
import MapSection from './sections/MapSection';
import ChatbotSection from './sections/ChatbotSection';
import EvaluationSection from './sections/EvaluationSection';
import ResultsSection from './sections/ResultsSection';
import AnalysisHistoryPanel from './components/AnalysisHistoryPanel';
import { useAnalysisHistory, type AnalysisRun } from '../../hooks/useAnalysisHistory';
import type { RunAllResult, BackendPaper } from '../../lib/api';

export default function DashboardPage() {
  const { isAuthenticated, isAuthInitializing } = useAuth();
  const [section, setSection] = useState<DashboardSection>('overview');
  const [showResultsOverlay, setShowResultsOverlay] = useState(false);
  const [historyPanelOpen, setHistoryPanelOpen] = useState(false);
  const [currentRun, setCurrentRun] = useState<AnalysisRun | null>(null);
  const [currentBackendResult, setCurrentBackendResult] = useState<RunAllResult | null>(null);
  const [currentPapers, setCurrentPapers] = useState<BackendPaper[]>([]);

  const { runs, addRun, removeRun, clearAll, sessionRunCount } = useAnalysisHistory();
  const latestRun = runs[0] ?? null;

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

  const handleShowResults = (runData: Omit<AnalysisRun, 'id' | 'timestamp'>, backendResult: RunAllResult | null, papers: BackendPaper[] = []) => {
    const saved = addRun(runData);
    setCurrentRun(saved);
    setCurrentBackendResult(backendResult);
    setCurrentPapers(papers);
    setShowResultsOverlay(true);
  };

  const handleViewHistoryRun = (run: AnalysisRun) => {
    setCurrentRun(run);
    setShowResultsOverlay(true);
    setHistoryPanelOpen(false);
  };

  const renderSection = () => {
    switch (section) {
      case 'overview': return <OverviewSection onNavigate={setSection} latestRun={latestRun} />;
      case 'datasets': return <DatasetsSection onShowResults={handleShowResults} />;
      case 'gaps': return <GapsSection backendResult={currentBackendResult} papers={currentPapers} />;
      case 'topics': return <TopicsSection backendResult={currentBackendResult} papers={currentPapers} />;
      case 'trends': return <TrendsSection backendResult={currentBackendResult} papers={currentPapers} />;
      case 'map': return <MapSection backendResult={currentBackendResult} papers={currentPapers} />;
      case 'chatbot': return <ChatbotSection papers={currentPapers} backendResult={currentBackendResult} />;
      case 'evaluation': return <EvaluationSection backendResult={currentBackendResult} papers={currentPapers} />;
      default: return <OverviewSection onNavigate={setSection} latestRun={latestRun} />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#f8f9fb]">
      <Sidebar
        active={section}
        onNavigate={setSection}
        onOpenHistory={() => setHistoryPanelOpen(true)}
        sessionRunCount={sessionRunCount}
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
            latestRun={currentRun}
            backendResult={currentBackendResult}
          />
        </div>
      )}

      <AnalysisHistoryPanel
        open={historyPanelOpen}
        onClose={() => setHistoryPanelOpen(false)}
        onViewRun={handleViewHistoryRun}
        runs={runs}
        removeRun={removeRun}
        clearAll={clearAll}
      />
    </div>
  );
}
