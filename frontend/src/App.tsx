import React, { useState, useEffect } from 'react';
import { Sidebar, NavTab } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { DashboardPage } from './pages/DashboardPage';
import { ImageDetectionPage } from './pages/ImageDetectionPage';
import { VideoTrackingPage } from './pages/VideoTrackingPage';
import { LiveAnalysisPage } from './pages/LiveAnalysisPage';
import { HistoryPage } from './pages/HistoryPage';
import { AboutPage } from './pages/AboutPage';
import { SettingsPage } from './pages/SettingsPage';
import { api, BackendHealth } from './services/api';
import { historyStorage } from './services/historyStorage';
import { HistoryItem } from './types';
import { SAMPLE_ROAD_IMAGES, SampleMedia } from './services/demoData';

export function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [backendHealth, setBackendHealth] = useState<BackendHealth>({ status: 'checking' });
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [selectedSampleImage, setSelectedSampleImage] = useState<SampleMedia | null>(null);
  const [selectedSampleVideo, setSelectedSampleVideo] = useState<SampleMedia | null>(null);

  // Load initial detection history and backend health on mount
  useEffect(() => {
    setHistory(historyStorage.getAll());
    checkHealth();

    const interval = setInterval(() => {
      checkHealth();
    }, 15000); // Check health periodically

    return () => clearInterval(interval);
  }, []);

  const checkHealth = async () => {
    const health = await api.checkHealth();
    setBackendHealth(health);
  };

  const handleRefreshHistory = () => {
    setHistory(historyStorage.getAll());
  };

  const handleQuickDemo = () => {
    // Pick the first road sample image and open detection tab
    const demoSample = SAMPLE_ROAD_IMAGES[0];
    setSelectedSampleImage(demoSample);
    setActiveTab('detection');
  };

  return (
    <div className="flex min-h-screen bg-[#070b14] text-slate-100 antialiased selection:bg-cyan-500 selection:text-black">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        backendHealth={backendHealth}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Navbar */}
        <Navbar
          backendHealth={backendHealth}
          onRefreshHealth={checkHealth}
          onQuickDemo={handleQuickDemo}
        />

        {/* Dynamic Page Router */}
        <main className="flex-1 overflow-y-auto hud-grid">
          {activeTab === 'dashboard' && (
            <DashboardPage
              onNavigate={setActiveTab}
              onSelectSampleImage={(sample) => {
                setSelectedSampleImage(sample);
                setActiveTab('detection');
              }}
              onSelectSampleVideo={(sample) => {
                setSelectedSampleVideo(sample);
                setActiveTab('tracking');
              }}
              history={history}
              backendHealth={backendHealth}
            />
          )}

          {activeTab === 'detection' && (
            <ImageDetectionPage
              initialSample={selectedSampleImage}
              onClearInitialSample={() => setSelectedSampleImage(null)}
              onSaveToHistory={handleRefreshHistory}
            />
          )}

          {activeTab === 'tracking' && (
            <VideoTrackingPage
              initialSample={selectedSampleVideo}
              onClearInitialSample={() => setSelectedSampleVideo(null)}
            />
          )}

          {activeTab === 'live' && <LiveAnalysisPage />}

          {activeTab === 'history' && (
            <HistoryPage
              history={history}
              onRefreshHistory={handleRefreshHistory}
            />
          )}

          {activeTab === 'about' && <AboutPage />}

          {activeTab === 'settings' && (
            <SettingsPage
              backendHealth={backendHealth}
              onRefreshHealth={checkHealth}
            />
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
