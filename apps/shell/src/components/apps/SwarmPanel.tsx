import React, { useEffect, useState } from 'react';
import { store, useSystemState } from '../../store/systemStore';
import { playSound } from '../../utils/audio';
import { Users, Play, Plus, Cpu, ShieldCheck, Terminal, Bot, Settings, Activity } from 'lucide-react';

interface SwarmAgent {
    id: string;
    name: string;
    role: string;
    instructions: String;
    current_task: string | null;
    status: string;
    logs: string[];
    last_active: number;
}

export const SwarmPanel: React.FC = () => {
  const state = useSystemState();
  const [agents, setAgents] = useState<SwarmAgent[]>([]);
  const [activeTab, setActiveTab] = useState<'monitor' | 'spawn' | 'logs'>('monitor');
  const [taskInput, setTaskInput] = useState('');
  
  // Spawning form states
  const [name, setName] = useState('');
  const [role, setRole] = useState('Architect');
  const [instructions, setInstructions] = useState('');

  const fetchSwarmState = async () => {
    if (typeof window !== 'undefined' && (window as any).__TAURI__) {
      try {
        const res = await (window as any).__TAURI__.invoke('aether_swarm_get_agents');
        if (res) {
          setAgents(JSON.parse(res));
        }
      } catch (e) {
        console.warn('Tauri Swarm fetch bypassed:', e);
      }
    } else {
      // Fallback: mock state stored in window
      if (!(window as any)._mockSwarmAgents) {
        (window as any)._mockSwarmAgents = [
          {
            id: 'agent-arch',
            name: 'Ivar-Architect',
            role: 'Architect',
            instructions: 'Write clean modular backend code and optimize performance.',
            current_task: null,
            status: 'IDLE',
            logs: ['[SYSTEM] Architect node initialized and standing by.'],
            last_active: Math.floor(Date.now() / 1000)
          },
          {
            id: 'agent-test',
            name: 'Ivar-Tester',
            role: 'Tester',
            instructions: 'Audit implementations for security, circular imports, and run test suites.',
            current_task: null,
            status: 'IDLE',
            logs: ['[SYSTEM] Tester node initialized and standing by.'],
            last_active: Math.floor(Date.now() / 1000)
          }
        ];
      }
      setAgents((window as any)._mockSwarmAgents);
    }
  };

  useEffect(() => {
    fetchSwarmState();
    const interval = setInterval(fetchSwarmState, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleSpawnAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !instructions) return;
    
    playSound.success();
    const id = `agent-${role.toLowerCase()}-${Math.random().toString(36).substring(2, 6)}`;
    
    if (typeof window !== 'undefined' && (window as any).__TAURI__) {
      try {
        await (window as any).__TAURI__.invoke('aether_swarm_spawn_agent', { id, name, role, instructions });
        store.addNotification('Swarm Node Spawned', `Local Rust thread registered agent '${name}' successfully.`, 'Just now');
      } catch (e) {
        console.error(e);
      }
    } else {
      // Fallback simulation
      const newAgent = {
        id,
        name,
        role,
        instructions,
        current_task: null,
        status: 'IDLE',
        logs: [`[SYSTEM] Custom '${role}' thread spawned organically in sandbox.`],
        last_active: Math.floor(Date.now() / 1000)
      };
      (window as any)._mockSwarmAgents = [...(window as any)._mockSwarmAgents, newAgent];
      store.addNotification('Swarm Node Spawned', `Simulated background agent '${name}' successfully spawned.`, 'Just now');
    }

    setName('');
    setInstructions('');
    setActiveTab('monitor');
    fetchSwarmState();
  };

  const handleTriggerTask = async () => {
    if (!taskInput.trim()) return;
    playSound.success();
    const task = taskInput;
    setTaskInput('');

    if (typeof window !== 'undefined' && (window as any).__TAURI__) {
      try {
        await (window as any).__TAURI__.invoke('aether_swarm_trigger_task', { task });
        store.addNotification('Swarm Pipeline Activated', `Dispatched collaborative tasks to active nodes.`, 'Just now');
      } catch (e) {
        console.error(e);
      }
    } else {
      // Sandbox fallback execution simulation
      store.addNotification('Swarm Pipeline Activated', `Dispatched task: '${task}' to simulated agents.`, 'Just now');
      
      const agentsList = (window as any)._mockSwarmAgents || [];
      // Set to working status
      agentsList.forEach((a: any) => {
        a.status = 'WORKING';
        a.current_task = task;
        a.logs.push(`[TASK RECEIVED] Spun worker loop: '${task}'`);
      });
      fetchSwarmState();

      // Step 1: Architect compiles
      setTimeout(() => {
        const active = (window as any)._mockSwarmAgents || [];
        const arch = active.find((a: any) => a.role === 'Architect');
        if (arch) {
          arch.status = 'COMPILING';
          arch.logs.push('[ARCHITECT] Structured authentic endpoints and verified interface declarations.');
          arch.logs.push('[ARCHITECT] Saving preliminary updates to sandbox cache...');
          fetchSwarmState();
        }
      }, 4000);

      // Step 2: Tester Audits
      setTimeout(() => {
        const active = (window as any)._mockSwarmAgents || [];
        const tester = active.find((a: any) => a.role === 'Tester');
        if (tester) {
          tester.status = 'WORKING';
          tester.logs.push('[TESTER] Intercepted files from Architect cache.');
          tester.logs.push('[TESTER] Audited dependencies: zero circular references found.');
          tester.logs.push('[TESTER] Running semantic sanitization check. No leaks detected.');
          fetchSwarmState();
        }
      }, 8000);

      // Step 3: Success
      setTimeout(() => {
        const active = (window as any)._mockSwarmAgents || [];
        active.forEach((a: any) => {
          a.status = 'SUCCESS';
          a.current_task = null;
          a.logs.push('[SWARM SUCCESS] Collaborative loop terminated. Test suite passes with 100% stability.');
        });
        store.addNotification('Swarm Loop Finished', 'Pipeline verified with 100% stability.', 'Just now');
        fetchSwarmState();
      }, 12000);
    }
  };

  const textActive = 
    state.theme === 'purple' ? 'text-purple-400 border-purple-500' :
    state.theme === 'green' ? 'text-emerald-400 border-emerald-500' :
    state.theme === 'orange' ? 'text-orange-400 border-orange-500' :
    'text-cyan-400 border-cyan-500';

  const textTheme = 
    state.theme === 'purple' ? 'text-purple-400' :
    state.theme === 'green' ? 'text-emerald-400' :
    state.theme === 'orange' ? 'text-orange-400' :
    'text-cyan-400';

  const bgActive = 
    state.theme === 'purple' ? 'bg-purple-500/10 border-purple-500/20' :
    state.theme === 'green' ? 'bg-emerald-500/10 border-emerald-500/20' :
    state.theme === 'orange' ? 'bg-orange-500/10 border-orange-500/20' :
    'bg-cyan-500/10 border-cyan-500/20';

  const buttonActive = 
    state.theme === 'purple' ? 'from-purple-600/30 to-fuchsia-600/30 border-purple-500/50 hover:border-purple-400 hover:shadow-[0_0_15px_rgba(217,70,239,0.2)]' :
    state.theme === 'green' ? 'from-emerald-600/30 to-teal-600/30 border-emerald-500/50 hover:border-emerald-400 hover:shadow-[0_0_15px_rgba(16,185,129,0.2)]' :
    state.theme === 'orange' ? 'from-orange-600/30 to-amber-600/30 border-orange-500/50 hover:border-orange-400 hover:shadow-[0_0_15px_rgba(249,115,22,0.2)]' :
    'from-cyan-600/30 to-blue-600/30 border-cyan-500/50 hover:border-cyan-400 hover:shadow-[0_0_15px_rgba(6,182,212,0.2)]';

  return (
    <div className="flex-1 bg-[#06080b]/95 text-xs font-mono h-full flex flex-col select-none overflow-hidden text-left">
      {/* Navigation Headers */}
      <div className="border-b border-white/5 bg-white/[0.01] px-5 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <Users className={`w-4 h-4 ${textTheme} animate-pulse`} />
          <span className="font-semibold uppercase tracking-wider text-[11px] text-white">Autonomous Background Swarm Command</span>
        </div>
        
        <div className="flex space-x-2">
          {(['monitor', 'spawn', 'logs'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => { playSound.click(); setActiveTab(tab); }}
              className={`px-3 py-1 rounded-lg border text-[10px] uppercase font-semibold transition ${
                activeTab === tab 
                  ? `${bgActive} ${textTheme}` 
                  : 'border-transparent text-white/40 hover:text-white/70'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Main Panel Content */}
      <div className="flex-1 overflow-y-auto p-5 scrollbar-thin">
        {activeTab === 'monitor' && (
          <div className="space-y-6">
            
            {/* Swarm Command Dispatches Input */}
            <div className="border border-white/5 bg-white/[0.02] p-4 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-white/40 font-bold uppercase tracking-wider">Deploy Collaborative Swarm Goal</span>
                <span className="text-[9px] text-white/20">Pool size: {agents.length} Threads</span>
              </div>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={taskInput}
                  onChange={(e) => setTaskInput(e.target.value)}
                  placeholder="e.g. Build modular backend auth files, verify leaks, and audit each other's loops..."
                  className="flex-1 bg-black/60 border border-white/10 rounded-xl px-4 py-2 text-white outline-none focus:border-white/20 text-xs"
                />
                <button
                  onClick={handleTriggerTask}
                  className={`bg-gradient-to-r ${buttonActive} border px-4 rounded-xl flex items-center space-x-1.5 transition active:scale-95`}
                >
                  <Play className="w-3.5 h-3.5 text-white" />
                  <span className="text-[10px] font-bold text-white uppercase tracking-wider">Execute Goal</span>
                </button>
              </div>
            </div>

            {/* Active Swarm Threads Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {agents.map((agent) => {
                const isWorking = agent.status === 'WORKING' || agent.status === 'COMPILING';
                const isSuccess = agent.status === 'SUCCESS';
                
                return (
                  <div
                    key={agent.id}
                    className="border border-white/5 bg-[#0b0e14]/50 backdrop-blur-md rounded-xl p-4 space-y-4 flex flex-col justify-between hover:border-white/10 transition group"
                  >
                    <div className="space-y-2">
                      {/* Agent details */}
                      <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-2">
                          <div className={`p-1.5 rounded-lg bg-white/5 border border-white/5`}>
                            {agent.role === 'Architect' ? <Cpu className="w-4 h-4 text-cyan-400" /> : <ShieldCheck className="w-4 h-4 text-emerald-400" />}
                          </div>
                          <div>
                            <h4 className="font-bold text-white uppercase text-[10.5px] leading-normal">{agent.name}</h4>
                            <p className="text-[9px] text-white/40 uppercase tracking-widest leading-none">{agent.role}</p>
                          </div>
                        </div>
                        
                        {/* Status Label */}
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[8.5px] font-semibold tracking-wider uppercase ${
                          isWorking ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 animate-pulse' :
                          isSuccess ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                          'bg-white/5 text-white/40 border border-white/5'
                        }`}>
                          {agent.status}
                        </span>
                      </div>

                      {/* Instructions */}
                      <p className="text-[9px] text-white/50 font-sans leading-relaxed text-left">{agent.instructions}</p>
                    </div>

                    {/* Thread details */}
                    <div className="border-t border-white/5 pt-3 space-y-2 text-left">
                      <div className="flex justify-between text-[8px] uppercase text-white/30 font-semibold tracking-wider">
                        <span>Background Process</span>
                        <span className="text-white/60">PID {agent.id === 'agent-arch' ? 201 : 202}</span>
                      </div>
                      
                      {agent.current_task && (
                        <div className="space-y-1.5">
                          <span className="text-[8px] text-cyan-400 uppercase tracking-wider font-bold">Active Thread Focus:</span>
                          <p className="text-[9px] text-white/70 italic truncate">"{agent.current_task}"</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        )}

        {activeTab === 'spawn' && (
          <form onSubmit={handleSpawnAgent} className="max-w-xl mx-auto space-y-5 border border-white/5 bg-white/[0.01] p-6 rounded-xl text-left shadow-2xl">
            <h3 className="text-[11px] font-bold text-white uppercase tracking-wider border-b border-white/5 pb-2">Configure Cognitive Swarm Thread</h3>
            
            <div className="space-y-1">
              <label className="text-[9px] text-white/40 uppercase tracking-wider font-bold">Agent Thread Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Ivar-Reviewer"
                className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-white/20 text-xs"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[9px] text-white/40 uppercase tracking-wider font-bold">Cognitive Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-white/20 text-xs"
              >
                <option value="Architect">Architect (Code Architecture & Synthesis)</option>
                <option value="Tester">Tester (Dependency Scanning & Auditing)</option>
                <option value="Reviewer">Reviewer (Logical Audits & Code Quality)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] text-white/40 uppercase tracking-wider font-bold">Role Directives & Instructions</label>
              <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="e.g. You are an autonomous reviewer thread. Carefully inspect code written by the Architect, scan for edge cases, VRAM allocations..."
                className="w-full h-24 bg-black/60 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-white/20 text-xs resize-none"
                required
              />
            </div>

            <button
              type="submit"
              className={`w-full bg-gradient-to-r ${buttonActive} border py-3 rounded-xl flex items-center justify-center space-x-2 transition active:scale-95 font-bold uppercase tracking-widest text-[9.5px] text-white`}
            >
              <Plus className="w-4 h-4 text-white" />
              <span>Register Swarm Node Thread</span>
            </button>
          </form>
        )}

        {activeTab === 'logs' && (
          <div className="space-y-4">
            <span className="text-[10px] text-white/40 font-bold uppercase tracking-wider pl-1">Live Inter-Agent Communications</span>
            <div className="border border-white/5 bg-black/60 rounded-xl p-4 font-mono text-[10px] text-white/70 h-80 overflow-y-auto scrollbar-thin space-y-2 select-text text-left">
              {agents.flatMap(a => a.logs.map(log => ({ name: a.name, log }))).length === 0 ? (
                <div className="h-full flex items-center justify-center text-white/20 uppercase tracking-widest">No active communications logged</div>
              ) : (
                agents.flatMap(a => a.logs.map(log => ({ name: a.name, log }))).map((entry, index) => {
                  let isSystem = entry.log.startsWith('[SYSTEM]') || entry.log.startsWith('[TASK');
                  return (
                    <div key={index} className="flex space-x-2 leading-relaxed">
                      <span className="text-white/20 select-none">[{new Date().toLocaleTimeString([], { hour12: false })}]</span>
                      {isSystem ? (
                        <span className="text-white/40 italic">{entry.log}</span>
                      ) : (
                        <p>
                          <span className={`font-bold ${textTheme}`}>{entry.name}: </span>
                          <span className="text-white/80">{entry.log}</span>
                        </p>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

    </div>
  );
};
