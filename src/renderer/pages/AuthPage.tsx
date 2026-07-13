import { getElectronAPI } from "@/lib/electronApiShim";
import { useState } from 'react';
import { toast } from 'sonner';

interface Props {
  onLogin: (token: string, deviceId: string, userId: string) => void;
}

export default function AuthPage({ onLogin }: Props) {
  const electronAPI = getElectronAPI();
  const [apiUrl, setApiUrl] = useState('http://localhost:3000');
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);

  // Phase 007: resolve the per-install desktop agent token from the Electron
  // main process. Falls back to the legacy constant only when running outside
  // Electron (dev browser), where the server accepts it in development only.
  const resolveLocalToken = async (): Promise<string> => {
    try {
      const injected = await (electronAPI as any).getAgentToken?.();
      if (injected && typeof injected === 'string') return injected;
    } catch {
      /* not running in Electron */
    }
    return 'local-default';
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const effectiveToken = token.trim() || (await resolveLocalToken());

    setLoading(true);
    try {
      // Verify token/connection against LARO API
      const res = await fetch(`${apiUrl}/api/trpc/system.health`, {
        headers: { Authorization: `Bearer ${effectiveToken}` },
      });

      if (res.ok || res.status === 401) {
        // Save API url too
        await electronAPI.setConfig({ apiUrl });
        onLogin(effectiveToken, 'user-' + Date.now(), 'user-' + Date.now());
        toast.success('Connected to LARO');
      } else {
        toast.error('Could not reach LARO server. Check the URL.');
      }
    } catch {
      // Allow offline login
      await electronAPI.setConfig({ apiUrl });
      onLogin(effectiveToken, 'user-offline', 'user-offline');
      toast.warning('Connected in offline mode');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 mb-4">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">LARO Desktop</h1>
          <p className="text-slate-400 mt-1 text-sm">Legal AI Evidence Agent</p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="bg-slate-900 rounded-2xl p-6 space-y-4 border border-slate-800">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              LARO Server URL
            </label>
            <input
              type="url"
              value={apiUrl}
              onChange={e => setApiUrl(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="http://localhost:3000"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-medium text-slate-300">
                API Token (Optional for Local)
              </label>
              {apiUrl.includes('localhost') && (
                <button
                  type="button"
                  onClick={async () => setToken(await resolveLocalToken())}
                  className="text-[10px] text-blue-400 hover:text-blue-300 uppercase tracking-wider font-bold"
                >
                  Skip for Local
                </button>
              )}
            </div>
            <input
              type="password"
              value={token}
              onChange={e => setToken(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Paste token or use local skip"
            />
            <p className="text-xs text-slate-500 mt-1.5">
              Token is only required for remote servers.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg transition-colors text-sm"
          >
            {loading ? 'Connecting…' : 'Connect to LARO'}
          </button>
        </form>

        <p className="text-center text-xs text-slate-600 mt-6">
          Your files never leave your computer without your approval.
        </p>
      </div>
    </div>
  );
}