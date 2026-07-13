import { useState, useEffect, useMemo } from "react";
import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import type { AppRouter } from "../../../server/routers";
import { getElectronAPI } from "@/lib/electronApiShim";

interface HomePageProps {
  onNavigate: (page: string) => void;
  config: any;
}

interface Case {
  id: string;
  clientName: string;
  caseType: string;
  urgency: string;
  status: string;
  createdAt: string;
}

function isPlaceholderAgentToken(token: string | null | undefined): boolean {
  const t = (token ?? "").trim();
  return !t || t === "local-default" || t === "local-dev-token";
}

export default function HomePage({ onNavigate, config }: HomePageProps) {
  const electronAPI = getElectronAPI();
  const [cases, setCases] = useState<Case[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [autoUpload, setAutoUpload] = useState(true);
  const [excludedFolders, setExcludedFolders] = useState<string[]>([]);

  const apiClient = useMemo(() => {
    const base = config?.apiUrl?.replace(/\/$/, "");
    if (!base) return null;

    return createTRPCProxyClient<AppRouter>({
      transformer: superjson,
      links: [
        httpBatchLink({
          url: `${base}/api/trpc`,
          fetch(url, options) {
            return fetch(url, {
              ...options,
              credentials: "include",
            });
          },
          headers() {
            const token = config?.token?.trim();
            if (isPlaceholderAgentToken(token)) return {};
            return { Authorization: `Bearer ${token}` };
          },
        }),
      ],
    });
  }, [config?.apiUrl, config?.token]);

  useEffect(() => {
    if (!apiClient) {
      setIsLoading(false);
      setCases([]);
      return;
    }

    let cancelled = false;
    (async () => {
      setIsLoading(true);
      setError("");
      try {
        const data = await apiClient.cases.list.query({ page: 1, limit: 100 });
        if (cancelled) return;
        setCases((data.cases ?? []) as Case[]);
      } catch (err: unknown) {
        console.error("Failed to load cases:", err);
        if (!cancelled) {
          const msg =
            err && typeof err === "object" && "message" in err
              ? String((err as { message: string }).message)
              : "Failed to load cases.";
          setError(
            msg.includes("UNAUTHORIZED") || msg.includes("Not authenticated")
              ? "Not signed in to LARO. Log in from the main window (same app), then reopen the scanner, or set a real API token in Scanner → Settings."
              : msg
          );
          setCases([]);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [apiClient]);

  const loadCases = () => {
    if (!apiClient) return;
    setIsLoading(true);
    setError("");
    void apiClient.cases.list
      .query({ page: 1, limit: 100 })
      .then((data) => {
        setCases((data.cases ?? []) as Case[]);
      })
      .catch((err: unknown) => {
        console.error("Failed to load cases:", err);
        const msg =
          err && typeof err === "object" && "message" in err
            ? String((err as { message: string }).message)
            : "Failed to load cases.";
        setError(msg);
        setCases([]);
      })
      .finally(() => setIsLoading(false));
  };

  const handleAddExcludedFolder = async () => {
    const folder = await electronAPI.selectFolder();
    if (folder && Array.isArray(folder)) {
      const next = [...excludedFolders];
      for (const f of folder) {
        if (f && !next.includes(f)) next.push(f);
      }
      setExcludedFolders(next);
    } else if (typeof folder === "string" && folder && !excludedFolders.includes(folder)) {
      setExcludedFolders([...excludedFolders, folder]);
    }
  };

  const handleRemoveExcludedFolder = (folder: string) => {
    setExcludedFolders(excludedFolders.filter((f) => f !== folder));
  };

  const handleStartScan = async () => {
    if (!selectedCase) {
      alert("Please select a case first");
      return;
    }

    try {
      await electronAPI.startScan({
        caseId: selectedCase.id,
        caseName: `${selectedCase.clientName} - ${selectedCase.caseType}`,
        autoUpload,
        excludedFolders,
        folders: [],
      });

      onNavigate("scan");
    } catch (err: unknown) {
      console.error("Failed to start scan:", err);
      alert("Failed to start scan: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  if (!config?.apiUrl) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-gray-600">
        Loading connection…
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col">
      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Evidence Collection</h1>
          <p className="text-sm text-gray-600">Select a case and configure scan settings</p>
        </div>
        <button
          type="button"
          onClick={() => onNavigate("settings")}
          className="rounded-lg px-4 py-2 text-gray-700 transition-colors hover:bg-gray-100"
        >
          Settings
        </button>
      </header>

      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-4xl space-y-6">
          <div className="rounded-lg bg-white p-6 shadow">
            <div className="mb-4 flex items-center justify-between gap-2">
              <h2 className="text-lg font-semibold text-gray-900">Select Case</h2>
              <button
                type="button"
                onClick={loadCases}
                className="text-sm font-medium text-blue-600 hover:text-blue-800"
              >
                Refresh
              </button>
            </div>

            {isLoading ? (
              <div className="py-8 text-center">
                <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
                <p className="mt-2 text-gray-600">Loading cases…</p>
              </div>
            ) : error ? (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                <p className="text-red-600">{error}</p>
                <button
                  type="button"
                  onClick={loadCases}
                  className="mt-2 text-sm font-medium text-red-700 hover:text-red-800"
                >
                  Try again
                </button>
              </div>
            ) : cases.length === 0 ? (
              <div className="py-8 text-center text-gray-600">
                <p>No cases found for your account.</p>
                <p className="mt-2 text-sm">
                  Create a case in the main LARO window while signed in, then click <strong>Refresh</strong> here.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {cases.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedCase(c)}
                    className={`w-full rounded-lg border-2 p-4 text-left transition-colors ${
                      selectedCase?.id === c.id
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900">{c.clientName}</h3>
                        <p className="text-sm text-gray-600">{c.caseType}</p>
                      </div>
                      <div className="text-right">
                        <span
                          className={`inline-block rounded px-2 py-1 text-xs font-medium ${
                            c.urgency === "High"
                              ? "bg-red-100 text-red-700"
                              : c.urgency === "Medium"
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-green-100 text-green-700"
                          }`}
                        >
                          {c.urgency}
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Scan Settings</h2>

            <div className="flex items-center justify-between border-b border-gray-200 py-3">
              <div>
                <h3 className="font-medium text-gray-900">Automatic Upload</h3>
                <p className="text-sm text-gray-600">Upload files immediately as they are found</p>
              </div>
              <button
                type="button"
                onClick={() => setAutoUpload(!autoUpload)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  autoUpload ? "bg-blue-600" : "bg-gray-200"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    autoUpload ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            <div className="mt-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-medium text-gray-900">Excluded Folders</h3>
                <button
                  type="button"
                  onClick={handleAddExcludedFolder}
                  className="rounded-lg bg-blue-600 px-3 py-1 text-sm text-white transition-colors hover:bg-blue-700"
                >
                  Add Folder
                </button>
              </div>

              {excludedFolders.length === 0 ? (
                <p className="text-sm text-gray-600">
                  No folders excluded. All accessible files will be scanned.
                </p>
              ) : (
                <div className="space-y-2">
                  {excludedFolders.map((folder) => (
                    <div key={folder} className="flex items-center justify-between rounded bg-gray-50 p-2">
                      <span className="flex-1 truncate text-sm text-gray-700">{folder}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveExcludedFolder(folder)}
                        className="ml-2 text-red-600 hover:text-red-700"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={handleStartScan}
            disabled={!selectedCase}
            className="w-full rounded-lg bg-blue-600 px-6 py-4 text-lg font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            {selectedCase ? "Start Evidence Scan" : "Select a Case to Continue"}
          </button>
        </div>
      </div>
    </div>
  );
}
