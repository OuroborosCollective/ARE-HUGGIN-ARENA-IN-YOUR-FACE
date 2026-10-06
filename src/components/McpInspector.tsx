import React, { useState } from 'react';
import { Terminal, Play, Cpu, Check, Copy, RefreshCw, Server, Send, Sparkles, Layers } from 'lucide-react';

export const McpInspector: React.FC = () => {
  const [selectedMethod, setSelectedMethod] = useState<'initialize' | 'tools/list' | 'resources/list' | 'tools/call'>('tools/list');
  const [selectedTool, setSelectedTool] = useState<string>('search_datasets');
  const [toolArgs, setToolArgs] = useState<string>(
    JSON.stringify({ query: 'fineweb', task: 'instruction-tuning' }, null, 2)
  );
  const [loading, setLoading] = useState(false);
  const [jsonResponse, setJsonResponse] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleExecuteMcp = async () => {
    setLoading(true);
    try {
      let body: any = {
        jsonrpc: '2.0',
        id: Date.now(),
        method: selectedMethod
      };

      if (selectedMethod === 'tools/call') {
        let parsedArgs = {};
        try {
          parsedArgs = JSON.parse(toolArgs);
        } catch (e) {
          alert('Invalid JSON in tool arguments');
          setLoading(false);
          return;
        }

        body.params = {
          name: selectedTool,
          arguments: parsedArgs
        };
      }

      const res = await fetch('/api/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      setJsonResponse(JSON.stringify(data, null, 2));
    } catch (err: any) {
      setJsonResponse(JSON.stringify({ error: err.message || 'Failed to call MCP endpoint' }, null, 2));
    } finally {
      setLoading(false);
    }
  };

  const handleToolPreset = (toolName: string) => {
    setSelectedMethod('tools/call');
    setSelectedTool(toolName);
    if (toolName === 'search_datasets') {
      setToolArgs(JSON.stringify({ query: 'alpaca', task: 'instruction-tuning' }, null, 2));
    } else if (toolName === 'get_dataset_info') {
      setToolArgs(JSON.stringify({ dataset_id: 'HuggingFaceFW/fineweb-edu' }, null, 2));
    } else if (toolName === 'load_dataset_stream') {
      setToolArgs(JSON.stringify({ dataset_id: 'tatsu-lab/alpaca', num_rows: 3 }, null, 2));
    } else if (toolName === 'generate_synthetic_samples') {
      setToolArgs(JSON.stringify({ topic: 'Quantum Computing Algorithms', num_samples: 2, high_thinking: true }, null, 2));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400">
              <Server className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                MCP Protocol Live Inspector & Tester
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Model Context Protocol (JSON-RPC 2.0) interface connecting Hugging Face Datasets with AI clients.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs text-emerald-400 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Endpoint: /api/mcp</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Controls Panel */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-amber-400" />
              1. Select Method
            </h3>

            <div className="grid grid-cols-2 gap-2">
              {(['initialize', 'tools/list', 'resources/list', 'tools/call'] as const).map((method) => (
                <button
                  key={method}
                  onClick={() => setSelectedMethod(method)}
                  className={`p-3 text-left rounded-xl border text-xs font-mono transition-all ${
                    selectedMethod === method
                      ? 'bg-amber-500/10 border-amber-500/50 text-amber-300 font-semibold'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {method}
                </button>
              ))}
            </div>

            {selectedMethod === 'tools/call' && (
              <div className="space-y-3 pt-3 border-t border-slate-800">
                <label className="text-xs font-semibold text-slate-300 block">
                  Select MCP Tool:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'search_datasets',
                    'get_dataset_info',
                    'load_dataset_stream',
                    'generate_synthetic_samples'
                  ].map((t) => (
                    <button
                      key={t}
                      onClick={() => handleToolPreset(t)}
                      className={`px-2.5 py-1 text-[11px] font-mono rounded-lg transition-colors ${
                        selectedTool === t
                          ? 'bg-amber-500 text-slate-950 font-semibold'
                          : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>

                <div className="space-y-1 pt-1">
                  <label className="text-xs font-mono text-slate-400 block">
                    Tool Arguments (JSON):
                  </label>
                  <textarea
                    value={toolArgs}
                    onChange={(e) => setToolArgs(e.target.value)}
                    rows={6}
                    className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-amber-200/90 focus:outline-none focus:border-amber-500/50"
                  />
                </div>
              </div>
            )}

            <button
              onClick={handleExecuteMcp}
              disabled={loading}
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs rounded-xl transition-colors shadow-lg shadow-amber-500/10 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Sending JSON-RPC Request...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Execute MCP Method</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Console Payload Response Display */}
        <div className="lg:col-span-7">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-3 sticky top-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-semibold text-slate-100">JSON-RPC 2.0 Response Stream</h3>
              </div>

              {jsonResponse && (
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(jsonResponse);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg border border-slate-700 transition-colors"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-400" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {jsonResponse ? (
              <pre className="p-4 bg-slate-950 rounded-xl border border-slate-800 font-mono text-xs text-amber-300/90 max-h-[500px] overflow-auto leading-relaxed">
                {jsonResponse}
              </pre>
            ) : (
              <div className="p-16 text-center text-slate-500 text-xs font-mono bg-slate-950 rounded-xl border border-slate-800">
                Click "Execute MCP Method" to send JSON-RPC protocol requests to the server.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
