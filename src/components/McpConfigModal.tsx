import React, { useState } from 'react';
import { X, Copy, Check, Terminal, Cpu, Globe, CheckCircle2 } from 'lucide-react';

interface McpConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const McpConfigModal: React.FC<McpConfigModalProps> = ({ isOpen, onClose }) => {
  const [copiedTab, setCopiedTab] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'claude' | 'cursor' | 'python' | 'node'>('claude');
  const [useLiveDomain, setUseLiveDomain] = useState<boolean>(true);

  if (!isOpen) return null;

  const liveDomain = 'https://aredatasetarenahugginface.ai.studio';
  const localDomain = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  const appUrl = useLiveDomain ? liveDomain : localDomain;
  const mcpEndpoint = `${appUrl}/api/mcp`;

  const configs = {
    claude: JSON.stringify(
      {
        mcpServers: {
          "hf-datasets-studio": {
            url: mcpEndpoint,
            headers: {
              "Content-Type": "application/json"
            }
          }
        }
      },
      null,
      2
    ),
    cursor: JSON.stringify(
      {
        mcpServers: {
          "hf-datasets-studio": {
            command: "node",
            args: ["-e", `fetch('${mcpEndpoint}', {method:'POST', body: JSON.stringify({jsonrpc:'2.0', id:1, method:'tools/list'})})`]
          }
        }
      },
      null,
      2
    ),
    python: `import requests

mcp_url = "${mcpEndpoint}"

# List tools from Hugging Face MCP Server
response = requests.post(
    mcp_url,
    json={"jsonrpc": "2.0", "id": 1, "method": "tools/list"}
)
print("Available MCP Tools:", response.json()["result"]["tools"])

# Search Hugging Face Datasets
search_res = requests.post(
    mcp_url,
    json={
        "jsonrpc": "2.0",
        "id": 2,
        "method": "tools/call",
        "params": {
            "name": "search_datasets",
            "arguments": {"task": "instruction-tuning"}
        }
    }
)
print("Datasets found:", search_res.json()["result"]["content"][0]["text"])`,
    node: `const response = await fetch("${mcpEndpoint}", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method: "tools/call",
    params: {
      name: "generate_synthetic_samples",
      arguments: { topic: "Python AsyncIO", high_thinking: true }
    }
  })
});
const data = await response.json();
console.log(data.result.content[0].text);`
  };

  const handleCopy = (tabKey: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedTab(tabKey);
    setTimeout(() => setCopiedTab(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="text-base font-semibold text-slate-100">MCP Server Integration Kit</h3>
              <p className="text-xs text-slate-400">Connect Cursor, Claude Desktop, Python or Node to HF MCP Server</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Domain Target Switcher */}
          <div className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-amber-400" />
              <span className="text-slate-300 font-medium">Target MCP Domain:</span>
              <code className="text-amber-300 font-mono font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                {mcpEndpoint}
              </code>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setUseLiveDomain(true)}
                className={`px-2.5 py-1 rounded-lg font-mono text-[11px] transition-colors ${
                  useLiveDomain
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                }`}
              >
                Production URL
              </button>
              <button
                onClick={() => setUseLiveDomain(false)}
                className={`px-2.5 py-1 rounded-lg font-mono text-[11px] transition-colors ${
                  !useLiveDomain
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                }`}
              >
                Local URL
              </button>
            </div>
          </div>

          {/* Client Tab Switcher */}
          <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
            <button
              onClick={() => setActiveTab('claude')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                activeTab === 'claude'
                  ? 'bg-slate-800 text-amber-300 border border-amber-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Claude Desktop
            </button>
            <button
              onClick={() => setActiveTab('cursor')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                activeTab === 'cursor'
                  ? 'bg-slate-800 text-amber-300 border border-amber-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Cursor IDE
            </button>
            <button
              onClick={() => setActiveTab('python')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                activeTab === 'python'
                  ? 'bg-slate-800 text-amber-300 border border-amber-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Python Client
            </button>
            <button
              onClick={() => setActiveTab('node')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                activeTab === 'node'
                  ? 'bg-slate-800 text-amber-300 border border-amber-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Node.js / TS
            </button>
          </div>

          <div className="relative group">
            <pre className="p-4 bg-slate-950 rounded-xl border border-slate-800 font-mono text-xs text-amber-200/90 overflow-x-auto max-h-72 leading-relaxed">
              {configs[activeTab]}
            </pre>
            <button
              onClick={() => handleCopy(activeTab, configs[activeTab])}
              className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 transition-colors"
            >
              {copiedTab === activeTab ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-slate-400" />
              <span>Correct Live Endpoint: <code className="text-amber-300 font-mono font-bold">https://aredatasetarenahugginface.ai.studio/api/mcp</code></span>
            </div>
            <span>JSON-RPC 2.0</span>
          </div>
        </div>
      </div>
    </div>
  );
};
