import { useState, useEffect } from 'react';
import { useAuth } from '@/_core/hooks/useAuth';
import { APP_TITLE } from '@/const';
import { trpc } from '@/lib/trpc';

export default function AgentDownload() {
  const { user, isAuthenticated } = useAuth();
  const [platform, setPlatform] = useState<'windows' | 'macos' | 'linux'>('windows');
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false);
  const [devices, setDevices] = useState<any[]>([]);

  const listDevices = trpc.agent.listDevices.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const revokeDevice = trpc.agent.revokeDevice.useMutation({
    onSuccess: () => {
      listDevices.refetch();
    },
  });

  useEffect(() => {
    // Detect user's platform
    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.includes('win')) {
      setPlatform('windows');
    } else if (userAgent.includes('mac')) {
      setPlatform('macos');
    } else if (userAgent.includes('linux')) {
      setPlatform('linux');
    }
  }, []);

  useEffect(() => {
    if (listDevices.data) {
      setDevices(listDevices.data.devices);
    }
  }, [listDevices.data]);

  const handleRevokeDevice = async (deviceId: string) => {
    if (!confirm('Are you sure you want to revoke access for this device?')) {
      return;
    }

    try {
      await revokeDevice.mutateAsync({ deviceId });
    } catch (error) {
      console.error('Failed to revoke device:', error);
      alert('Failed to revoke device access');
    }
  };

  const getDownloadUrl = () => {
    // In production, these would be actual download URLs
    // For now, return placeholder URLs
    switch (platform) {
      case 'windows':
        return '/downloads/laro-evidence-agent-setup.exe';
      case 'macos':
        return '/downloads/laro-evidence-agent.dmg';
      case 'linux':
        return '/downloads/laro-evidence-agent.AppImage';
      default:
        return '#';
    }
  };

  const getPlatformName = () => {
    switch (platform) {
      case 'windows':
        return 'Windows';
      case 'macos':
        return 'macOS';
      case 'linux':
        return 'Linux';
      default:
        return '';
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Authentication Required</h2>
          <p className="text-gray-600 mb-6">
            You must be logged in to download the Evidence Collection Agent.
          </p>
          <a
            href="/"
            className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
          >
            Go to Home
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Evidence Collection Agent</h1>
          <p className="text-xl text-gray-600">
            Automatically scan your device for evidence files and upload them to {APP_TITLE}
          </p>
        </div>

        {/* Consent & Terms */}
        {!hasAcceptedTerms ? (
          <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Terms & Consent</h2>
            
            <div className="prose prose-sm max-w-none mb-8 space-y-4 text-gray-700">
              <p className="font-semibold text-lg">Please read and accept the following terms before downloading:</p>
              
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                <p className="font-semibold text-yellow-800">Important Notice</p>
                <p className="text-yellow-700 mt-2">
                  The Evidence Collection Agent will scan your entire device, including personal files and folders. 
                  Only files relevant to your legal case should be uploaded.
                </p>
              </div>

              <h3 className="font-semibold text-gray-900 mt-6">What the Agent Does:</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Scans all accessible files and folders on your device</li>
                <li>Excludes operating system files automatically</li>
                <li>Allows you to exclude specific folders (e.g., personal photos)</li>
                <li>Uploads files to secure cloud storage</li>
                <li>Links uploaded files to your selected legal case</li>
              </ul>

              <h3 className="font-semibold text-gray-900 mt-6">Your Rights:</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>You can pause or stop the scan at any time</li>
                <li>You can review files before uploading (disable auto-upload)</li>
                <li>You can exclude sensitive folders from scanning</li>
                <li>You can revoke device access at any time</li>
                <li>All uploads are encrypted in transit (HTTPS/TLS)</li>
              </ul>

              <h3 className="font-semibold text-gray-900 mt-6">Privacy & GDPR Compliance:</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Files are only accessible to you and authorized legal professionals</li>
                <li>You can request deletion of uploaded files at any time</li>
                <li>We comply with GDPR and Dutch privacy laws</li>
                <li>Audit logs track all file access</li>
              </ul>

              <div className="bg-red-50 border-l-4 border-red-400 p-4 mt-6">
                <p className="font-semibold text-red-800">Legal Disclaimer</p>
                <p className="text-red-700 mt-2">
                  By using this agent, you consent to the scanning and uploading of files from your device. 
                  You are responsible for ensuring that uploaded files are relevant to your legal case and 
                  do not contain privileged or confidential information belonging to others.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 mb-6">
              <input
                type="checkbox"
                id="acceptTerms"
                checked={hasAcceptedTerms}
                onChange={(e) => setHasAcceptedTerms(e.target.checked)}
                className="mt-1 h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="acceptTerms" className="text-gray-700 cursor-pointer">
                I have read and accept the terms above. I consent to the scanning and uploading of files from my device 
                for evidence collection purposes.
              </label>
            </div>

            <button
              onClick={() => setHasAcceptedTerms(true)}
              disabled={!hasAcceptedTerms}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors"
            >
              Accept & Continue
            </button>
          </div>
        ) : (
          <>
            {/* Download Section */}
            <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Download Agent</h2>
              
              {/* Platform Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Select Your Platform:
                </label>
                <div className="grid grid-cols-3 gap-4">
                  {(['windows', 'macos', 'linux'] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPlatform(p)}
                      className={`p-4 rounded-lg border-2 transition-colors ${
                        platform === p
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-center">
                        <div className="text-3xl mb-2">
                          {p === 'windows' && '🪟'}
                          {p === 'macos' && '🍎'}
                          {p === 'linux' && '🐧'}
                        </div>
                        <div className="font-semibold text-gray-900">
                          {p === 'windows' && 'Windows'}
                          {p === 'macos' && 'macOS'}
                          {p === 'linux' && 'Linux'}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Download Button */}
              <a
                href={getDownloadUrl()}
                download
                className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-6 rounded-lg transition-colors text-lg"
              >
                Download for {getPlatformName()}
              </a>

              <p className="text-sm text-gray-600 mt-4 text-center">
                Version 1.0.0 | {platform === 'windows' ? '.exe installer' : platform === 'macos' ? '.dmg disk image' : '.AppImage'}
              </p>
            </div>

            {/* Installation Instructions */}
            <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Installation Instructions</h2>
              
              {platform === 'windows' && (
                <ol className="list-decimal pl-6 space-y-3 text-gray-700">
                  <li>Download the .exe installer file</li>
                  <li>Run the installer (you may see a Windows Defender warning - click "More info" then "Run anyway")</li>
                  <li>Follow the installation wizard</li>
                  <li>Launch the LARO Evidence Agent from your Start menu</li>
                  <li>The agent will prompt you to register your device</li>
                </ol>
              )}

              {platform === 'macos' && (
                <ol className="list-decimal pl-6 space-y-3 text-gray-700">
                  <li>Download the .dmg disk image</li>
                  <li>Open the .dmg file</li>
                  <li>Drag the LARO Evidence Agent to your Applications folder</li>
                  <li>Launch the app from Applications (you may need to right-click and select "Open" for the first launch)</li>
                  <li>The agent will prompt you to register your device</li>
                </ol>
              )}

              {platform === 'linux' && (
                <ol className="list-decimal pl-6 space-y-3 text-gray-700">
                  <li>Download the .AppImage file</li>
                  <li>Make it executable: <code className="bg-gray-100 px-2 py-1 rounded">chmod +x laro-evidence-agent.AppImage</code></li>
                  <li>Run the AppImage: <code className="bg-gray-100 px-2 py-1 rounded">./laro-evidence-agent.AppImage</code></li>
                  <li>The agent will prompt you to register your device</li>
                </ol>
              )}
            </div>

            {/* Registered Devices */}
            <div className="bg-white rounded-lg shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Registered Devices</h2>
              
              {listDevices.isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-gray-600 mt-2">Loading devices...</p>
                </div>
              ) : devices.length === 0 ? (
                <p className="text-gray-600 text-center py-8">
                  No devices registered yet. Install and launch the agent to register your first device.
                </p>
              ) : (
                <div className="space-y-4">
                  {devices.map((device) => (
                    <div key={device.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div>
                        <h3 className="font-semibold text-gray-900">{device.deviceName}</h3>
                        <p className="text-sm text-gray-600">
                          {device.platform} • Version {device.agentVersion}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Last seen: {new Date(device.lastSeenAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          device.status === 'active' ? 'bg-green-100 text-green-700' :
                          device.status === 'inactive' ? 'bg-gray-100 text-gray-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {device.status}
                        </span>
                        {device.status !== 'revoked' && (
                          <button
                            onClick={() => handleRevokeDevice(device.id)}
                            className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            Revoke
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
