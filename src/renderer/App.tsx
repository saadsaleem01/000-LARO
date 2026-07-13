import { useState, useEffect } from 'react';
import AuthPage from '../renderer/pages/AuthPage';
import HomePage from '../renderer/pages/HomePage';
import ScanPage from '../renderer/pages/ScanPage';
import SettingsPage from '../renderer/pages/SettingsPage';
import { getElectronApi } from '../../lib/electronApiShim';
import type { AgentConfig } from '../../shared/types';
import { Page } from '../../shared/types';

export default function App() {
  const electronAPI = getElectronApi();
  const [currentPage, setCurrentPage] = useState<Page>('auth');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [config, setConfig] = useState<any>(null);

  useEffect(() => {
    // Load configuration on startup
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const cfg = await electronAPI.getConfig();
      setConfig(cfg);
      
      // Check if already authenticated
      if (cfg.token && cfg.deviceId) {
        setIsAuthenticated(true);
        setCurrentPage('home');
      }
    } catch (error) {
      console.error('Failed to load config:', error);
    }
  };

  const handleLogin = async (token: string, deviceId: string, userId: string) => {
    // Update config
    const updatedConfig = await electronAPI.setConfig({
      token,
      deviceId,
      userId,
    });
    
    setConfig(updatedConfig);
    setIsAuthenticated(true);
    setCurrentPage('home');
  };

  const handleAgentSettingsSave = async (updates: Partial<AgentConfig>) => {
    const updated = await electronAPI.setConfig(updates);
    setConfig(updated);
  };

  const handleLogout = async () => {
    // Clear authentication
    const updatedConfig = await electronAPI.setConfig({
      token: null,
      deviceId: null,
      userId: null,
    });
    
    setConfig(updatedConfig);
    setIsAuthenticated(false);
    setCurrentPage('auth');
  };

  const renderPage = () => {
    if (!isAuthenticated) {
      return <AuthPage onLogin={handleLogin} />;
    }

    switch (currentPage) {
      case 'home':
        return <HomePage onNavigate={(page) => setCurrentPage(page as Page)} config={config} />;
      case 'scan':
        return <ScanPage onNavigate={(page) => setCurrentPage(page as Page)} onLogout={handleLogout} config={config} />;
      case 'settings':
        return (
          <SettingsPage
            config={config}
            onNavigate={(page) => setCurrentPage(page as Page)}
            onSave={handleAgentSettingsSave}
          />
        );
      default:
        return <HomePage onNavigate={(page) => setCurrentPage(page as Page)} config={config} />;
    }
  };

  return (
    <div className="w-full h-full bg-gray-50">
      {renderPage()}
    </div>
  );
}
