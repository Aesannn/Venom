import React, { useState, useRef, useEffect } from 'react';
import { store, useSystemState } from '../../store/systemStore';
import { playSound } from '../../utils/audio';
import { 
  Send, 
  Bot, 
  Cpu, 
  Mic, 
  Brain, 
  PlayCircle, 
  Activity, 
  Sparkles, 
  X,
  FileCode,
  FolderSync
} from 'lucide-react';

export const AIChatCenter: React.FC = () => {
  const state = useSystemState();
  const [input, setInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Initialize browser speech recognition dictation loops
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'en-US';

      rec.onstart = () => {
        setIsListening(true);
        playSound.success();
      };

      rec.onresult = (e: any) => {
        const transcript = e.results[0][0].transcript;
        setInput(transcript);
        playSound.click();
      };

      rec.onerror = () => {
        setIsListening(false);
        playSound.warning();
      };

      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
    }
  }, []);

  const handleVoiceToggle = () => {
    if (!recognitionRef.current) {
      store.addNotification('Voice Engine Offline', 'Browser Speech Recognition API unresolvable.', 'Just now');
      return;
    }
    
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      playSound.click();
      setInput('');
      recognitionRef.current.start();
    }
  };

  // Auto scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state.aiMessages, state.isAiThinking]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || state.isAiThinking) return;
    
    playSound.keypress();
    const query = input;
    setInput('');
    store.sendAiMessage(query);
  };

  const handleSuggestionClick = (prompt: string) => {
    if (state.isAiThinking) return;
    playSound.click();
    store.sendAiMessage(prompt);
  };

  const triggerWorkflow = (wfId: string) => {
    playSound.success();
    store.sendAiMessage(`run ${wfId}`);
  };

  const deleteMemoryFact = (key: string, e: React.MouseEvent) => {
    e.stopPropagation();
    playSound.warning();
    store.sendAiMessage(`forget ${key}`);
  };

  // Dynamic context recommendations based on active system telemetry/state parameters
  const getContextRecommendations = () => {
    const list = [];
    
    // Telemetry recommendations
    if (state.cpuUsage > 45 || state.ramUsage > 45) {
      list.push({ label: 'De-congest CPU/RAM Load', prompt: 'clear memory' });
    }
    
    // VFS activity checks
    if (state.recentFiles.length > 0) {
      list.push({ label: 'Analyze Workspace History', prompt: 'recent files' });
    }

    // Default cognitive lookups
    list.push({ label: 'Show Neural Cognitive Facts', prompt: 'show cognitive facts' });
    
    // Config audit
    if (state.theme !== 'green') {
      list.push({ label: 'SecOps Telemetry Audit', prompt: 'run sec-audit' });
    } else {
      list.push({ label: 'Ambient Zen Composer', prompt: 'run zen-composer' });
    }

    return list;
  };

  const recommendations = getContextRecommendations();

  // Futuristic system styles
  const textTheme = 
    state.theme === 'purple' ? 'text-purple-400 border-purple-500/20' :
    state.theme === 'green' ? 'text-emerald-400 border-emerald-500/20' :
    state.theme === 'orange' ? 'text-orange-400 border-orange-500/20' :
    'text-cyan-400 border-cyan-500/20';


  const buttonActive = 
    state.theme === 'purple' ? 'bg-purple-500/10 text-purple-300 border-purple-500/35 hover:bg-purple-500/25' :
    state.theme === 'green' ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/35 hover:bg-emerald-500/25' :
    state.theme === 'orange' ? 'bg-orange-500/10 text-orange-300 border-orange-500/35 hover:bg-orange-500/25' :
    'bg-cyan-500/10 text-cyan-300 border-cyan-500/35 hover:bg-cyan-500/25';

  return (
    <div className={`flex-1 flex bg-[#050709]/95 text-xs font-mono h-full relative theme-${state.theme} select-none`}>
      
      {/* ================= LEFT COLUMN: NEURAL CORE CORE COGNITIONS ================= */}
      <div className="w-64 border-r border-white/5 bg-[#080b0e]/60 flex flex-col justify-between select-none">
        <div className="p-3.5 space-y-5 overflow-y-auto scrollbar-none h-full">
          
          {/* Section 1: Cognitive Memory Matrix */}
          <div className="space-y-2">
            <div className="flex items-center space-x-1.5 border-b border-white/5 pb-2 text-[10px] text-white/40 uppercase tracking-widest font-bold">
              <Brain className="w-3.5 h-3.5 text-white/50" />
              <span>Cognitive Memory Core</span>
            </div>

            {state.aiMemory.length === 0 ? (
              <p className="text-[10px] text-white/20 italic pl-1.5 py-1">Cognitive index empty</p>
            ) : (
              <div className="space-y-1.5">
                {state.aiMemory.map(mem => (
                  <div
                    key={mem.key}
                    className="p-2.5 rounded-xl bg-[#040608]/45 border border-white/5 hover:border-white/10 group transition-all flex flex-col space-y-1 relative"
                  >
                    {/* Delete action overlay */}
                    <button
                      onClick={(e) => deleteMemoryFact(mem.key, e)}
                      className="absolute top-1.5 right-1.5 p-0.5 rounded text-white/0 group-hover:text-rose-500/60 hover:!text-rose-500 hover:bg-rose-500/10 transition"
                      title="Purge cognition"
                    >
                      <X className="w-3 h-3" />
                    </button>

                    <span className="text-[8.5px] uppercase font-bold tracking-wider text-white/30 truncate pr-3">{mem.key.replace(/_/g, ' ')}</span>
                    <span className="text-[10.5px] text-white/80 group-hover:text-white font-medium break-all pr-2">"{mem.value}"</span>
                    <span className="text-[7px] text-white/20 font-mono self-end pt-0.5">{mem.timestamp}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 2: Autonomous Workflows Supervisor */}
          <div className="space-y-2 border-t border-white/5 pt-3.5">
            <div className="flex items-center space-x-1.5 border-b border-white/5 pb-2 text-[10px] text-white/40 uppercase tracking-widest font-bold">
              <Activity className="w-3.5 h-3.5 text-white/50" />
              <span>Workflow Orchestration</span>
            </div>
            
            <div className="space-y-1.5">
              {[
                { id: 'dev-setup', label: 'Developer Init', desc: 'Touch logs, shell, neofetch, editor.' },
                { id: 'sec-audit', label: 'SecOps Audit', desc: 'Scan config, audit PIDs, theme green.' },
                { id: 'zen-composer', label: 'Zen Focus Ambient', desc: 'Play ambient synth, stars, declutter.' }
              ].map(workflow => (
                <button
                  key={workflow.id}
                  onClick={() => triggerWorkflow(workflow.id)}
                  className={`w-full p-2.5 rounded-xl border bg-white/[0.01] border-white/5 hover:border-white/15 hover:bg-white/[0.03] transition-all text-left flex flex-col space-y-0.5 group`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-[10px] text-white/80 font-bold tracking-wide group-hover:text-white transition-colors">{workflow.label}</span>
                    <PlayCircle className={`w-3.5 h-3.5 text-white/30 group-hover:${textTheme.split(' ')[0]} transition-colors`} />
                  </div>
                  <span className="text-[8.5px] text-white/30 group-hover:text-white/50 leading-snug transition-colors">{workflow.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Section 3: Autonomous AI Agents */}
          <div className="space-y-2 border-t border-white/5 pt-3.5">
            <div className="flex items-center space-x-1.5 border-b border-white/5 pb-2 text-[10px] text-white/40 uppercase tracking-widest font-bold">
              <Bot className="w-3.5 h-3.5 text-white/50" />
              <span>Autonomous AI Agents</span>
            </div>
            
            <div className="space-y-1.5">
              {[
                { id: 'agent-coding', label: 'Coding Agent', desc: 'Auto-write code and launch IDE.', icon: 'FileCode' },
                { id: 'agent-optimization', label: 'Optimization Agent', desc: 'Audit thermals, clean caches.', icon: 'Cpu' },
                { id: 'agent-organization', label: 'Organization Agent', desc: 'Scan VFS & re-index directory.', icon: 'FolderSync' },
                { id: 'agent-monitoring', label: 'Monitoring Agent', desc: 'Supervise system telemetry streams.', icon: 'Activity' }
              ].map(agent => {
                const AgentIcon = agent.id === 'agent-coding' ? FileCode
                  : agent.id === 'agent-optimization' ? Cpu
                  : agent.id === 'agent-organization' ? FolderSync
                  : Activity;
                return (
                  <button
                    key={agent.id}
                    onClick={() => triggerWorkflow(agent.id)}
                    className="w-full p-2.5 rounded-xl border bg-white/[0.01] border-white/5 hover:border-white/15 hover:bg-white/[0.03] transition-all text-left flex flex-col space-y-0.5 group"
                    data-magnetic
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center space-x-1.5">
                        <AgentIcon className="w-3 h-3 text-white/40 group-hover:text-white transition-colors" />
                        <span className="text-[10px] text-white/80 font-bold tracking-wide group-hover:text-white transition-colors">{agent.label}</span>
                      </div>
                      <Sparkles className={`w-3 h-3 text-white/20 group-hover:${textTheme.split(' ')[0]} transition-colors`} />
                    </div>
                    <span className="text-[8.5px] text-white/30 group-hover:text-white/50 leading-snug transition-colors">{agent.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

        </div>

        {/* HUD Stats */}
        <div className="p-3 border-t border-white/5 bg-[#05070a] text-[9.5px] text-white/35 font-sans space-y-1">
          <div className="flex justify-between">
            <span className="text-white/20">MEM COGNITIONS</span>
            <span className="font-mono text-cyan-400 font-bold">{state.aiMemory.length} NODES</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/20">VFS RECENT FILE</span>
            <span className="font-mono text-white/60">{state.recentFiles.length} FILES</span>
          </div>
        </div>
      </div>

      {/* ================= RIGHT COLUMN: MAIN CHAT INTERACTION WORKSPACE ================= */}
      <div className="flex-1 flex flex-col justify-between bg-[#040608]/40 select-none">
        
        {/* HUD Info bar */}
        <div className="px-4 py-2.5 bg-[#07090d] border-b border-white/5 flex items-center justify-between text-[10px] text-white/40">
          <div className="flex items-center space-x-2">
            <Cpu className={`w-3.5 h-3.5 ${textTheme.split(' ')[0]} animate-pulse`} />
            <span className="font-bold uppercase tracking-wider">Aether Core Orchestrator</span>
          </div>
          <div className="flex items-center space-x-3 font-mono">
            <span>MEM: {state.ramUsage}%</span>
            <span>CPU: {state.cpuUsage}%</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          </div>
        </div>

        {/* Messages List Container */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 select-text scrollbar-thin">
          {state.aiMessages.map((msg, index) => {
            const isUser = msg.sender === 'user';
            return (
              <div 
                key={index}
                className={`flex items-start space-x-3 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className={`p-1.5 rounded-xl bg-white/5 border ${textTheme} flex-shrink-0 shadow-inner`}>
                    <Bot className="w-4 h-4" />
                  </div>
                )}
                
                <div className={`max-w-[75%] rounded-2xl p-3.5 relative leading-relaxed ${
                  isUser 
                    ? 'bg-white/5 border border-white/10 text-white rounded-tr-none shadow-md' 
                    : 'bg-black/30 border border-white/5 text-gray-200 rounded-tl-none shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]'
                }`}>
                  <p className="leading-relaxed text-[11px] whitespace-pre-line font-mono">{msg.text}</p>
                  
                  <span className="text-[7.5px] text-white/20 block text-right mt-2 select-none">
                    {msg.timestamp}
                  </span>
                </div>
              </div>
            );
          })}

          {/* AI Thinking indicator */}
          {state.isAiThinking && (
            <div className="flex items-start space-x-3 justify-start animate-pulse">
              <div className={`p-1.5 rounded-xl bg-white/5 border ${textTheme} flex-shrink-0`}>
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-black/30 border border-white/5 rounded-2xl rounded-tl-none p-3.5 max-w-[75%] shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
                <div className="flex items-center space-x-1.5">
                  <span className="text-white/40 font-bold uppercase tracking-wider text-[9.5px]">Synthesizing OS State...</span>
                  <span className="w-1 h-1 rounded-full bg-current animate-bounce delay-700" />
                  <span className="w-1 h-1 rounded-full bg-current animate-bounce delay-1000" />
                  <span className="w-1 h-1 rounded-full bg-current animate-bounce delay-1300" />
                </div>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Suggested Prompts / Environmental recommendations panel */}
        <div className="p-3 border-t border-white/5 bg-[#06080b]/90 space-y-2">
          <h5 className="text-[8.5px] text-white/30 uppercase tracking-widest pl-1 font-bold">Predictive Action Recommendations</h5>
          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
            {recommendations.map((rec, idx) => (
              <button
                key={idx}
                onClick={() => handleSuggestionClick(rec.prompt)}
                className={`px-2.5 py-1 rounded-xl border text-[9px] font-semibold transition flex items-center space-x-1.5 active:scale-95 ${buttonActive}`}
              >
                <Sparkles className="w-3 h-3 text-cyan-400" />
                <span>{rec.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Input Controls form */}
        <form 
          onSubmit={handleSubmit}
          className="p-3 bg-[#07090c] border-t border-white/5 flex items-center space-x-2"
        >
          <button
            type="button"
            onClick={handleVoiceToggle}
            disabled={state.isAiThinking}
            className={`p-2.5 rounded-xl border transition active:scale-95 ${
              isListening 
                ? 'bg-rose-500/20 border-rose-500/40 text-rose-400 animate-pulse' 
                : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white'
            }`}
            title={isListening ? "Listening... click to stop" : "Voice input (Dictation)"}
          >
            <Mic className="w-4 h-4" />
          </button>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={state.isAiThinking}
            placeholder={state.isAiThinking ? "AI resolving query..." : "Send command (e.g. 'open terminal and change theme to purple')..."}
            className="flex-1 bg-black/45 border border-white/5 hover:border-white/10 focus:border-white/15 rounded-xl px-3.5 py-2.5 text-white outline-none focus:ring-1 focus:ring-current transition placeholder:text-white/15 text-xs font-mono"
          />
          <button
            type="submit"
            disabled={state.isAiThinking || !input.trim()}
            className={`p-2.5 rounded-xl border transition text-black bg-current hover:opacity-90 active:scale-95 disabled:opacity-30 disabled:scale-100 font-bold ${textTheme}`}
          >
            <Send className="w-4 h-4" />
          </button>
        </form>

      </div>
      
    </div>
  );
};
