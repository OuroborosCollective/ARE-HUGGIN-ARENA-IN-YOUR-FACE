import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, Sparkles, ExternalLink, Bot, User, RefreshCw } from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: { title: string; uri: string }[];
}

export const CopilotChat: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Hello! I am your Hugging Face MCP Data Copilot. I can help you locate datasets on Hugging Face Hub, suggest fine-tuning formats (Alpaca, ChatML, DPO, RLHF), recommend cleaning strategies, and draft PyTorch / TRL training code. What are you building today?'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (textToSend?: string) => {
    const query = textToSend || input;
    if (!query.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: query
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const history = [...messages, userMsg].map(m => ({
        role: m.role,
        content: m.content
      }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history,
          enableGrounding: true
        })
      });

      const data = await res.json();
      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.reply || 'Sorry, I could not generate a response.',
        sources: data.searchSources || []
      };

      setMessages(prev => [...prev, botMsg]);
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'Error communicating with Gemini Copilot: ' + (err.message || 'Server error')
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const presets = [
    'Which dataset is best for fine-tuning a Python coding model?',
    'How do I reformat FineWeb-Edu for DPO preference training in TRL?',
    'Compare FineWeb-Edu vs Cosmopedia for pre-training',
    'Write a PyTorch SFTTrainer code snippet for Llama-3.1-8B'
  ];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden flex flex-col h-[650px]">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100">Hugging Face Data Copilot</h3>
            <p className="text-[11px] text-slate-400">Powered by Gemini 3.5 Flash with Google Search Grounding</p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[11px] font-mono text-emerald-400 bg-slate-950 px-3 py-1 rounded-lg border border-slate-800">
          <Sparkles className="w-3 h-3" />
          <span>Live Grounding</span>
        </div>
      </div>

      {/* Messages Scroll Thread */}
      <div className="flex-1 p-6 overflow-y-auto space-y-4">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex items-start gap-3 ${
              m.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {m.role === 'assistant' && (
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4" />
              </div>
            )}

            <div
              className={`max-w-2xl p-4 rounded-2xl text-xs leading-relaxed ${
                m.role === 'user'
                  ? 'bg-amber-500 text-slate-950 font-medium rounded-tr-none'
                  : 'bg-slate-950 text-slate-200 border border-slate-800 rounded-tl-none'
              }`}
            >
              <div className="whitespace-pre-wrap font-sans">{m.content}</div>

              {/* Grounding Search Sources */}
              {m.sources && m.sources.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-800 space-y-1">
                  <span className="text-[10px] font-mono text-slate-500 block">Verified Search Grounding Sources:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {m.sources.map((s, idx) => (
                      <a
                        key={idx}
                        href={s.uri}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 text-[10px] bg-slate-900 border border-slate-800 hover:border-amber-500/50 text-amber-300 px-2 py-0.5 rounded-md transition-colors"
                      >
                        <span className="truncate max-w-[150px]">{s.title || s.uri}</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {m.role === 'user' && (
              <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 flex items-center justify-center shrink-0">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-xs text-slate-400 font-mono p-3 bg-slate-950/60 rounded-xl max-w-xs border border-slate-800/80">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
            <span>Consulting Hugging Face Hub & Search...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Preset Chips */}
      <div className="px-6 py-2 bg-slate-950/80 border-t border-slate-800/80 flex items-center gap-2 overflow-x-auto">
        <span className="text-[10px] font-mono text-slate-500 whitespace-nowrap">Suggested:</span>
        {presets.map((p, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(p)}
            className="text-[11px] bg-slate-900 hover:bg-slate-800 text-slate-300 px-2.5 py-1 rounded-lg border border-slate-800 whitespace-nowrap transition-colors shrink-0"
          >
            {p}
          </button>
        ))}
      </div>

      {/* Input Box */}
      <div className="p-4 bg-slate-950 border-t border-slate-800">
        <div className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask Copilot about Hugging Face datasets, cleaning pipelines, or fine-tuning code..."
            className="w-full pl-4 pr-12 py-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
          />
          <button
            onClick={() => handleSend()}
            disabled={loading || !input.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg transition-colors disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
