import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import type { AgentConfig } from '../../shared/types';

interface Props {
  config: AgentConfig | null;
  onNavigate: (page: any) => void;
  onLogout: () => void;
}

interface SystemInfo {
  hostname: string;
  username: string;
  platform: string;
  version: string;
  freeMemory: number;
  totalMemory: number;
}

export default function DashboardPage({ config, onNavigate, onLogout }: Props) {
  const [sysInfo, setSysInfo] = useState<SystemInfo | null>(null);
  const [updateInfo, setUpdateInfo] = useState<{ currentVersion: string } | null>(null);

  useEffect(() => {
    window.electronAPI.getSystemInfo().then(setSysInfo);
    window.electronAPI.checkForUpdates().then(setUpdateInfo);
  }, []);

  const memUsed = sysInfo
    ? Math.round(((sysInfo.totalMemory - sysInfo.freeMemory) / sysInfo.totalMemory) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      {/* Top bar */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
            </svg>
          </div>
          <span className="font-semibold text-white">LARO Desktop</span>
        </div>

        <nav className="flex items-center gap-2">
          <NavBtn label="Dashboard" active onClick={() => {}} />
          <NavBtn label="New Scan" onClick={() => onNavigate('scan')} />
          <NavBtn label="Settings" onClick={() => onNavigate('settings')} />
          <button
            onClick={onLogout}
            className="ml-4 text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            Sign out
          </button>
        </nav>
      </header>

      {/* Content */}
      <main className="flex-1 p-6 space-y-6">
        {/* Welcome */}
        <div>
          <h1 className="text-xl font-bold">
            Welcome, {sysInfo?.username ?? 'Agent'}
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            {sysInfo?.hostname} · {sysInfo?.platform} · v{updateInfo?.currentVersion ?? '…'}
          </p>
        </div>

        {/* Quick action cards */}
        <div className="grid grid-cols-3 gap-4">
          <ActionCard
            icon="🔍"
            title="Scan for evidence"
            description="Scan your computer for legal documents, emails, and files relevant to your case."
            action="Start scan"
            onClick={() => onNavigate('scan')}
            primary
          />
          <ActionCard
            icon="☁️"
            title="Open LARO web app"
            description="Access the full LARO dashboard, cases, lawyers, and outreach in your browser."
            action="Open web app"
            onClick={() => window.electronAPI.openExternal(config?.apiUrl ?? 'http://localhost:3000')}
          />
          <ActionCard
            icon="⚙️"
            title="Settings"
            description="Configure your API connection, scan preferences, and agent options."
            action="Open settings"
            onClick={() => onNavigate('settings')}
          />
        </div>

        {/* System info */}
        <div className="bg-slate-900 rounded-xl p-5 border border-slate-800">
          <h2 className="text-sm font-semibold text-slate-300 mb-4">System status</h2>
          <div className="grid grid-cols-2 gap-x-8 gap-y-3">
            <InfoRow label="Server URL" value={config?.apiUrl ?? '—'} />
            <InfoRow label="Device" value={sysInfo?.hostname ?? '—'} />
            <InfoRow label="Memory used" value={sysInfo ? `${memUsed}%` : '—'} />
            <InfoRow label="Connected" value={config?.token ? '✅ Yes' : '❌ No'} />
          </div>
        </div>

        {/* How it works */}
        <div className="bg-slate-900 rounded-xl p-5 border border-slate-800">
          <h2 className="text-sm font-semibold text-slate-300 mb-4">How it works</h2>
          <ol className="space-y-2">
            {[
              'Click "Start scan" and select folders to search',
              'LARO finds documents, emails, and files relevant to your legal case',
              'Review the found files and select which ones to upload',
              'Files are uploaded securely to your LARO case dashboard',
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-slate-400">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-900 text-blue-300 text-xs flex items-center justify-center font-bold">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </div>
      </main>
    </div>
  );
}

function NavBtn({ label, onClick, active }: { label: string; onClick: () => void; active?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
        active ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
      }`}
    >
      {label}
    </button>
  );
}

function ActionCard({ icon, title, description, action, onClick, primary }: {
  icon: string; title: string; description: string; action: string;
  onClick: () => void; primary?: boolean;
}) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col gap-3 hover:border-slate-700 transition-colors">
      <span className="text-2xl">{icon}</span>
      <div>
        <h3 className="font-semibold text-sm text-white">{title}</h3>
        <p className="text-xs text-slate-400 mt-1 leading-relaxed">{description}</p>
      </div>
      <button
        onClick={onClick}
        className={`mt-auto w-full py-2 rounded-lg text-sm font-medium transition-colors ${
          primary
            ? 'bg-blue-600 hover:bg-blue-700 text-white'
            : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
        }`}
      >
        {action}
      </button>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-slate-500">{label}</span>
      <span className="text-xs text-slate-300 font-mono">{value}</span>
    </div>
  );
}