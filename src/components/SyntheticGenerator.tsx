import React, { useState, useRef } from 'react';
import { Sparkles, Image as ImageIcon, Mic, MicOff, Copy, Check, Download, RefreshCw, Maximize2, FileText, Layers, UploadCloud, ExternalLink } from 'lucide-react';

interface SyntheticGeneratorProps {
  onExportToHf?: (actionType: 'synthetic_dataset', title: string, payload: any, defaultRepo?: string) => void;
}

export const SyntheticGenerator: React.FC<SyntheticGeneratorProps> = ({ onExportToHf }) => {
  const [activeTab, setActiveTab] = useState<'text' | 'vision' | 'audio'>('text');

  // Text state
  const [textTopic, setTextTopic] = useState('Python AsyncIO concurrency & deadlock prevention');
  const [textNumSamples, setTextNumSamples] = useState(3);
  const [textHighThinking, setTextHighThinking] = useState(true);
  const [textFormat, setTextFormat] = useState('alpaca');
  const [textLoading, setTextLoading] = useState(false);
  const [textSamples, setTextSamples] = useState<any[]>([]);

  // Vision state
  const [visionPrompt, setVisionPrompt] = useState('Isometric 3D PCB circuit board with glowing AI accelerator chips and copper traces');
  const [visionAspectRatio, setVisionAspectRatio] = useState('1:1');
  const [visionHighQuality, setVisionHighQuality] = useState(false);
  const [visionLoading, setVisionLoading] = useState(false);
  const [visionResult, setVisionResult] = useState<any | null>(null);

  // Audio state
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioLoading, setAudioLoading] = useState(false);
  const [audioTranscription, setAudioTranscription] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Text Synthetic Generation
  const handleGenerateText = async () => {
    setTextLoading(true);
    try {
      const res = await fetch('/api/synthetic/text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: textTopic,
          num_samples: textNumSamples,
          format: textFormat,
          high_thinking: textHighThinking
        })
      });
      const data = await res.json();
      setTextSamples(data.samples || []);
    } catch (err: any) {
      alert('Failed to generate synthetic text: ' + err.message);
    } finally {
      setTextLoading(false);
    }
  };

  // Vision Synthetic Generation
  const handleGenerateVision = async () => {
    setVisionLoading(true);
    try {
      const res = await fetch('/api/synthetic/vision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: visionPrompt,
          aspectRatio: visionAspectRatio,
          highQuality: visionHighQuality
        })
      });
      const data = await res.json();
      setVisionResult(data);
    } catch (err: any) {
      alert('Failed to generate synthetic vision sample: ' + err.message);
    } finally {
      setVisionLoading(false);
    }
  };

  // Audio Recording & Gemini 3.5 Transcribe
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      alert('Microphone access required for audio dataset transcription.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleTranscribeAudio = async () => {
    if (!audioBlob) return;
    setAudioLoading(true);

    const reader = new FileReader();
    reader.readAsDataURL(audioBlob);
    reader.onloadend = async () => {
      const base64Audio = reader.result as string;
      try {
        const res = await fetch('/api/synthetic/audio-transcribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            base64Audio,
            mimeType: 'audio/webm'
          })
        });
        const data = await res.json();
        setAudioTranscription(data.transcription || 'Transcription completed');
      } catch (err: any) {
        alert('Audio transcription error: ' + err.message);
      } finally {
        setAudioLoading(false);
      }
    };
  };

  const aspectRatios = ['1:1', '2:3', '3:2', '3:4', '4:3', '9:16', '16:9', '21:9'];

  return (
    <div className="space-y-6">
      {/* Sub-Tabs */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            Multimodal Synthetic Data Generator
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Synthesize training samples across text reasoning, vision language datasets, and voice audio speech.
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('text')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'text'
                ? 'bg-amber-500 text-slate-950'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Text & Reasoning</span>
          </button>
          <button
            onClick={() => setActiveTab('vision')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'vision'
                ? 'bg-amber-500 text-slate-950'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Vision Samples</span>
          </button>
          <button
            onClick={() => setActiveTab('audio')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'audio'
                ? 'bg-amber-500 text-slate-950'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Mic className="w-3.5 h-3.5" />
            <span>Audio Speech</span>
          </button>
        </div>
      </div>

      {/* TAB 1: TEXT & REASONING */}
      {activeTab === 'text' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-semibold text-slate-100">Text Synthetic Controls</h3>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">Domain / Instruction Topic:</label>
              <textarea
                value={textTopic}
                onChange={(e) => setTextTopic(e.target.value)}
                rows={3}
                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500/50"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">Schema Format:</label>
                <select
                  value={textFormat}
                  onChange={(e) => setTextFormat(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200"
                >
                  <option value="alpaca">Alpaca</option>
                  <option value="chatml">ChatML</option>
                  <option value="dpo">DPO Preference</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">Sample Count:</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={textNumSamples}
                  onChange={(e) => setTextNumSamples(parseInt(e.target.value, 10) || 1)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 font-mono"
                />
              </div>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-amber-400" />
                Gemini 3.1 Pro High Thinking
              </span>
              <input
                type="checkbox"
                checked={textHighThinking}
                onChange={(e) => setTextHighThinking(e.target.checked)}
                className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
              />
            </div>

            <button
              onClick={handleGenerateText}
              disabled={textLoading}
              className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-colors shadow-lg shadow-amber-500/10 flex items-center justify-center gap-2"
            >
              {textLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Synthesizing Training Samples...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Generate Synthetic Samples</span>
                </>
              )}
            </button>
          </div>

          <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-semibold text-slate-100">
                Synthesized Records ({textSamples.length})
              </h3>
              {textSamples.length > 0 && onExportToHf && (
                <button
                  onClick={() => onExportToHf('synthetic_dataset', `Synthetic Reasoning Batch: ${textTopic.slice(0, 30)}...`, textSamples, 'ouroboroscollective/evidence-bound-css')}
                  className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 shadow-sm"
                >
                  <UploadCloud className="w-3 h-3" />
                  <span>Export Batch to HF Dataset</span>
                </button>
              )}
            </div>

            {textSamples.length > 0 ? (
              <div className="space-y-4 pt-4 max-h-[500px] overflow-y-auto pr-1">
                {textSamples.map((sample, idx) => (
                  <div key={idx} className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-2">
                    <div className="flex items-center justify-between text-slate-400 border-b border-slate-800/60 pb-1">
                      <span className="font-mono text-amber-400 font-semibold">Record #{idx + 1}</span>
                      <span className="font-mono text-[10px] text-slate-500">{textFormat.toUpperCase()}</span>
                    </div>
                    <pre className="font-mono text-slate-300 whitespace-pre-wrap leading-relaxed">
                      {JSON.stringify(sample, null, 2)}
                    </pre>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-16 text-center text-slate-500 text-xs font-mono">
                Click "Generate Synthetic Samples" to produce high-reasoning training data.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: VISION DATASET */}
      {activeTab === 'vision' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-semibold text-slate-100">Vision Sample Controls</h3>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">Visual Scene Description:</label>
              <textarea
                value={visionPrompt}
                onChange={(e) => setVisionPrompt(e.target.value)}
                rows={3}
                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500/50"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-300 block">
                Aspect Ratio Selector:
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {aspectRatios.map((ratio) => (
                  <button
                    key={ratio}
                    onClick={() => setVisionAspectRatio(ratio)}
                    className={`py-1.5 text-xs font-mono rounded-lg transition-colors border ${
                      visionAspectRatio === ratio
                        ? 'bg-amber-500 text-slate-950 font-bold border-amber-400'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    {ratio}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleGenerateVision}
              disabled={visionLoading}
              className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-colors shadow-lg shadow-amber-500/10 flex items-center justify-center gap-2"
            >
              {visionLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Generating Image & VLM Data...</span>
                </>
              ) : (
                <>
                  <ImageIcon className="w-4 h-4" />
                  <span>Generate Vision Training Sample</span>
                </>
              )}
            </button>
          </div>

          <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-semibold text-slate-100">
                Generated Vision Pair
              </h3>
              {visionResult && onExportToHf && (
                <button
                  onClick={() => onExportToHf('synthetic_dataset', `VLM Sample: ${visionPrompt.slice(0, 30)}...`, visionResult, 'ouroboroscollective/evidence-bound-css')}
                  className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 shadow-sm"
                >
                  <UploadCloud className="w-3 h-3" />
                  <span>Export VLM to HF Dataset</span>
                </button>
              )}
            </div>

            {visionResult ? (
              <div className="space-y-4">
                {visionResult.imageUrl ? (
                  <img
                    src={visionResult.imageUrl}
                    alt={visionPrompt}
                    className="w-full max-h-80 object-contain bg-slate-950 rounded-xl border border-slate-800"
                  />
                ) : (
                  <div className="p-8 bg-slate-950 rounded-xl border border-slate-800 text-center text-xs text-amber-300/80">
                    Image generation quota limit reached — showing VLM visual prompt pair below:
                  </div>
                )}

                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-2">
                  <span className="font-mono text-amber-400 font-semibold block">VLM Q&A Pair:</span>
                  <p className="text-slate-300 font-semibold">Q: {visionResult.vision_qa?.question}</p>
                  <p className="text-slate-400">A: {visionResult.vision_qa?.answer}</p>
                </div>
              </div>
            ) : (
              <div className="p-16 text-center text-slate-500 text-xs font-mono">
                Select aspect ratio and click "Generate Vision Training Sample".
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: AUDIO SPEECH TRANSCRIBER */}
      {activeTab === 'audio' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-semibold text-slate-100">Voice Audio Dataset Recording</h3>

            <p className="text-xs text-slate-400 leading-relaxed">
              Record voice instructions or audio samples using your microphone, then transcribe with <strong className="text-slate-200">gemini-3.5-transcribe</strong> to generate word-for-word speech dataset annotations.
            </p>

            <div className="p-6 bg-slate-950 rounded-2xl border border-slate-800 text-center space-y-4">
              <button
                onClick={isRecording ? stopRecording : startRecording}
                className={`p-5 rounded-full transition-all shadow-xl ${
                  isRecording
                    ? 'bg-rose-500 text-white animate-pulse'
                    : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                }`}
              >
                {isRecording ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
              </button>

              <p className="text-xs font-medium text-slate-300">
                {isRecording ? 'Recording audio... Click to stop' : audioBlob ? 'Audio captured! Ready to transcribe' : 'Click microphone to start recording'}
              </p>
            </div>

            {audioBlob && (
              <button
                onClick={handleTranscribeAudio}
                disabled={audioLoading}
                className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-colors shadow-lg flex items-center justify-center gap-2"
              >
                {audioLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Transcribing with Gemini 3.5 Transcribe...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Transcribe Audio with Gemini 3.5</span>
                  </>
                )}
              </button>
            )}
          </div>

          <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-semibold text-slate-100">
                Verbatim Speech Transcript
              </h3>
              {audioTranscription && onExportToHf && (
                <button
                  onClick={() => onExportToHf('synthetic_dataset', 'Audio ASR Speech Transcript Sample', { transcript: audioTranscription, modality: 'audio', task: 'speech-recognition' }, 'ouroboroscollective/evidence-bound-css')}
                  className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 shadow-sm"
                >
                  <UploadCloud className="w-3 h-3" />
                  <span>Export ASR to HF Dataset</span>
                </button>
              )}
            </div>

            {audioTranscription ? (
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono text-amber-200/90 whitespace-pre-wrap leading-relaxed">
                {audioTranscription}
              </div>
            ) : (
              <div className="p-16 text-center text-slate-500 text-xs font-mono">
                Capture voice audio on the left panel to run gemini-3.5-transcribe.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
