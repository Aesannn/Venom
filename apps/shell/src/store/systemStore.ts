import { useSyncExternalStore } from 'react';
import { setSoundEnabled, playSound } from '../utils/audio';
import { GoogleGenAI } from '@google/genai';
import type { SwarmAgent, SwarmPipeline, SwarmMessage, SwarmTask, SwarmLogEntry, EscalationRequest, DeviceNode, TelemetryStream } from '../engine/SwarmOrchestrator';
import { AGENT_ROLE_CONFIG, PIPELINE_TEMPLATES, DEFAULT_DEVICE_NODES, generateId, callAgentAI, formatTimestamp } from '../engine/SwarmOrchestrator';
import type { AgentRole, AgentStatus } from '../engine/SwarmOrchestrator';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";
const ai = new GoogleGenAI({ apiKey: API_KEY });

export interface VFSFile {
  name: string;
  type: 'file';
  content: string;
  tags?: string[];
  category?: string;
}

export interface VFSDirectory {
  name: string;
  type: 'dir';
  children: { [key: string]: VFSNode };
}

export type VFSNode = VFSFile | VFSDirectory;

export interface AppWindow {
  id: string;
  title: string;
  icon: string;
  isOpen: boolean;
  isMinimized: boolean;
  isMaximized: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  minWidth: number;
  minHeight: number;
}

export interface SemanticNode {
  id: string;
  name: string;
  type: 'project' | 'file' | 'app' | 'workflow' | 'note' | 'session' | 'collaborator';
  description: string;
  tags: string[];
  metadata: string; // JSON metadata
}

export interface SemanticEdge {
  source: string;
  target: string;
  relationship: string;
  weight: number;
}

export interface ChatMessage {
  sender: 'user' | 'aether' | 'system';
  text: string;
  timestamp: string;
}

export interface SystemProcess {
  pid: number;
  name: string;
  cpu: number;
  mem: number;
  status: 'running' | 'sleeping' | 'zombie';
}

export interface AppManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  icon: string;
  permissions: Array<'fs:read' | 'fs:write' | 'ai:query' | 'ai:memory' | 'telemetry:read' | 'workspace:write' | 'notifications:write'>;
  capabilities: string[];
  renderingMode: 'glassmorphic' | 'depth-aware' | 'flat' | 'crt-shell';
  aiIntegrations?: {
    autoPrompt?: string;
    contextualTriggers?: string[];
  };
  developer: {
    name: string;
    signed: boolean;
    trustStatus: 'verified' | 'partner' | 'unverified';
  };
}

export const DEFAULT_MANIFESTS: AppManifest[] = [
  {
    id: 'ai-chat',
    name: 'Aether Assistant',
    version: '1.0.0',
    description: 'Sentient operating environment system configuration assistant.',
    icon: 'Bot',
    permissions: ['ai:query', 'ai:memory', 'notifications:write', 'workspace:write'],
    capabilities: ['Dynamic System Speech Synthesis', 'Workspace State Automation'],
    renderingMode: 'glassmorphic',
    developer: { name: 'AetherCorp', signed: true, trustStatus: 'verified' }
  },
  {
    id: 'terminal',
    name: 'Terminal',
    version: '1.0.0',
    description: 'Quantum ash shell client interface wrapper.',
    icon: 'Terminal',
    permissions: ['fs:read', 'fs:write', 'telemetry:read', 'notifications:write'],
    capabilities: ['Subshell Process Compilation', 'Hardware Port Binding'],
    renderingMode: 'crt-shell',
    developer: { name: 'AetherCorp', signed: true, trustStatus: 'verified' }
  },
  {
    id: 'explorer',
    name: 'Files',
    version: '1.0.0',
    description: 'Spatial local file browser with depth-aware viewports.',
    icon: 'FolderOpen',
    permissions: ['fs:read', 'fs:write', 'notifications:write'],
    capabilities: ['Local File Persistence', 'Workspace Graph Integration'],
    renderingMode: 'glassmorphic',
    developer: { name: 'AetherCorp', signed: true, trustStatus: 'verified' }
  },
  {
    id: 'telemetry',
    name: 'Activity Monitor',
    version: '1.0.0',
    description: 'Sentient system processes load indicator and thread visualizer.',
    icon: 'Activity',
    permissions: ['telemetry:read', 'notifications:write'],
    capabilities: ['Core Hardware Metrics Probe', 'Process Thread Supervisor'],
    renderingMode: 'depth-aware',
    developer: { name: 'AetherCorp', signed: true, trustStatus: 'verified' }
  },
  {
    id: 'notes',
    name: 'Notes',
    version: '1.0.0',
    description: 'Neural reference markdown logs editor library.',
    icon: 'BookOpen',
    permissions: ['fs:read', 'fs:write', 'notifications:write'],
    capabilities: ['Markdown Synthesis', 'Wiki Link Reference Resolver'],
    renderingMode: 'glassmorphic',
    developer: { name: 'AetherCorp', signed: true, trustStatus: 'partner' }
  },
  {
    id: 'settings',
    name: 'System Settings',
    version: '1.0.0',
    description: 'System configurations and spatial environmental customization panel.',
    icon: 'Settings',
    permissions: ['workspace:write', 'notifications:write'],
    capabilities: ['Theme Swapping', 'Telemetry Calibration'],
    renderingMode: 'flat',
    developer: { name: 'AetherCorp', signed: true, trustStatus: 'verified' }
  },
  {
    id: 'marketplace',
    name: 'Aether Marketplace',
    version: '1.0.0',
    description: 'Ecosystem distribution platform for signed developer modules and tools.',
    icon: 'ShoppingBag',
    permissions: ['workspace:write', 'notifications:write'],
    capabilities: ['Install Dynamic Modules', 'Daemon Hot-Swapping'],
    renderingMode: 'glassmorphic',
    developer: { name: 'AetherCorp', signed: true, trustStatus: 'verified' }
  },
  {
    id: 'docker-manager',
    name: 'Docker Manager',
    version: '1.0.4',
    description: 'Run micro-containers rendered securely to high-performance Wayland canvases.',
    icon: 'Container',
    permissions: ['fs:read', 'telemetry:read', 'notifications:write'],
    capabilities: ['Container Execution', 'Port Forwarding Map'],
    renderingMode: 'depth-aware',
    developer: { name: 'AetherCorp Partner', signed: true, trustStatus: 'partner' }
  },
  {
    id: 'git-integrator',
    name: 'Git Stager',
    version: '1.2.0',
    description: 'Secure local git staging sync controls and commit visualizations.',
    icon: 'GitBranch',
    permissions: ['fs:read', 'fs:write', 'ai:query'],
    capabilities: ['Git Repository Scan', 'Commit Push Sync'],
    renderingMode: 'glassmorphic',
    developer: { name: 'GitCommunity', signed: true, trustStatus: 'verified' }
  },
  {
    id: 'llama-tuner',
    name: 'Llama Weight Tuner',
    version: '2.1.0',
    description: 'Local Llama.cpp prompt weight tuning and tensor memory calibration.',
    icon: 'Cpu',
    permissions: ['ai:query', 'ai:memory', 'telemetry:read'],
    capabilities: ['GGUF Weight Calibration', 'Context Window Injection'],
    renderingMode: 'glassmorphic',
    developer: { name: 'DeepMind Labs', signed: true, trustStatus: 'partner' }
  },
  {
    id: 'cyber-terminal',
    name: 'CyberTerminal Pro',
    version: '4.2.1',
    description: 'Advanced automated red-team security probing subshell wrapper.',
    icon: 'ShieldAlert',
    permissions: ['fs:read', 'fs:write', 'telemetry:read', 'notifications:write'],
    capabilities: ['Dynamic Socket Bind', 'Raw Packet Injection'],
    renderingMode: 'crt-shell',
    developer: { name: 'Unknown Hacker', signed: false, trustStatus: 'unverified' }
  },
  {
    id: 'ai-compute-hub',
    name: 'AI Compute Hub',
    version: '1.0.0',
    description: 'Sentient AI compute orchestrator and distributed model routing engine.',
    icon: 'Cpu',
    permissions: ['telemetry:read', 'workspace:write', 'notifications:write', 'ai:query'],
    capabilities: ['Distributed Inference Routing', 'VRAM Calibrator Scheduler', 'Agent Core Thread Slicer'],
    renderingMode: 'depth-aware',
    developer: { name: 'AetherCorp', signed: true, trustStatus: 'verified' }
  },
  {
    id: 'swarm-command',
    name: 'Swarm Command',
    version: '1.0.0',
    description: 'Multi-agent swarm orchestrator with autonomous AI team pipelines and decision escalation.',
    icon: 'Users',
    permissions: ['ai:query', 'ai:memory', 'telemetry:read', 'workspace:write', 'notifications:write'],
    capabilities: ['Concurrent Agent Spawning', 'Inter-Agent Communication Bus', 'Human Escalation Protocol', 'Pipeline Topology Visualization'],
    renderingMode: 'depth-aware',
    developer: { name: 'AetherCorp', signed: true, trustStatus: 'verified' }
  },
  {
    id: 'device-mesh',
    name: 'Device Mesh',
    version: '1.0.0',
    description: 'Cross-device spatial telemetry dashboard with workload projection and mesh topology.',
    icon: 'Waypoints',
    permissions: ['telemetry:read', 'workspace:write', 'notifications:write'],
    capabilities: ['Multi-Device Telemetry Sync', 'Workload Projection Engine', 'Mesh Topology Mapping', 'Edge Node Discovery'],
    renderingMode: 'depth-aware',
    developer: { name: 'AetherCorp', signed: true, trustStatus: 'verified' }
  },
  {
    id: 'temporal-ledger',
    name: 'Temporal Ledger',
    version: '1.0.0',
    description: 'Semantic Temporal Ledger workspace auditing and time-travel rollbacks.',
    icon: 'Clock',
    permissions: ['telemetry:read', 'workspace:write', 'notifications:write', 'fs:read', 'fs:write'],
    capabilities: ['Semantic Workspace Snapshot differential tracking', 'State Rollbacks'],
    renderingMode: 'glassmorphic',
    developer: { name: 'AetherCorp', signed: true, trustStatus: 'verified' }
  }
];

export interface LocalModel {
  id: string;
  name: string;
  size: string;
  status: 'STANDBY' | 'LOADED' | 'LOADING';
  vram: number; // in MB
  gpuPriority: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface ComputeMetrics {
  cpuLoad: number;
  gpuLoad: number;
  vramUsage: number; // in MB
  localTokensPerSec: number;
  cloudTokensPerSec: number;
  latencyMs: number;
}

export interface RoutingStats {
  localCount: number;
  cloudCount: number;
  privacyShieldedCount: number;
}

export interface ComputeAgent {
  id: string;
  name: string;
  desc: string;
  status: 'IDLE' | 'BUSY' | 'PAUSED';
  priority: 'BACKGROUND' | 'NORMAL' | 'REALTIME';
  remoteNode: string;
}

export interface SystemState {
  isBooted: boolean;
  isLocked: boolean;
  theme: 'cyan' | 'purple' | 'green' | 'orange';
  soundEnabled: boolean;
  activeAppId: string | null;
  windows: AppWindow[];
  maxZIndex: number;
  vfs: VFSDirectory;
  currentDirPath: string; // absolute path in terminal
  terminalHistory: string[];
  aiMessages: ChatMessage[];
  isAiThinking: boolean;
  processes: SystemProcess[];
  cpuUsage: number;
  ramUsage: number;
  showQuickSettings: boolean;
  showSpotlight: boolean;
  spotlightQuery: string;
  notifications: Array<{ id: string; title: string; desc: string; time: string }>;
  wallpaper: 'particles' | 'matrix' | 'stars' | 'scanlines';
  isGlitched: boolean;
  activeWorkspace: 'dev' | 'media' | 'sys';
  autoRestart: boolean;
  recentFiles: string[];
  aiMemory: Array<{ key: string; value: string; timestamp: string }>;
  semanticNodes: SemanticNode[];
  semanticLinks: SemanticEdge[];
  manifests: AppManifest[];
  installedAppIds: string[];
  localModels: LocalModel[];
  computeMetrics: ComputeMetrics;
  routingStats: RoutingStats;
  computeAgents: ComputeAgent[];
  voiceState: 'IDLE' | 'WAKE_DETECTED' | 'LISTENING' | 'PROCESSING' | 'EXECUTING' | 'RESPONDING' | 'RETURN_TO_IDLE';
  voiceTranscript: string;
  voiceResponseText: string;
  isVoiceActive: boolean;
  micVolume: number;
  // Swarm Orchestration State
  swarmAgents: SwarmAgent[];
  swarmPipelines: SwarmPipeline[];
  swarmMessageBus: SwarmMessage[];
  swarmEscalations: EscalationRequest[];
  // Cross-Device Mesh State
  crossDeviceNodes: DeviceNode[];
  deviceTelemetryStreams: TelemetryStream[];
  isTheaterMode: boolean;
  isTilingLayoutActive: boolean;
}

const DEFAULT_VFS: VFSDirectory = {
  name: '/',
  type: 'dir',
  children: {
    home: {
      name: 'home',
      type: 'dir',
      children: {
        aether: {
          name: 'aether',
          type: 'dir',
          children: {
            'welcome.txt': {
              name: 'welcome.txt',
              type: 'file',
              content: 'AetherOS v1.0.0 // Developer Environment\n=========================================\nWelcome to AetherOS, a professional developer workspace with built-in productivity tools and assistant.\n\nTo operate the desktop with natural language commands, type directly in the Aether Assistant sidebar (e.g. "open terminal", "change theme to green", "play synthwave") or run standard shell commands in the Terminal.\n\nCreated for modern web engineers.',
              tags: ['system', 'readme'],
              category: 'documents'
            },
            'notes_readme.md': {
              name: 'notes_readme.md',
              type: 'file',
              content: '# Notes and Reference Library\n\n- Use the Notes application to keep markdown documents and study notes.\n- Reference items can be categorized using metadata tags.\n- Link documents to build a custom local wiki.',
              tags: ['notes', 'guide'],
              category: 'notes'
            },
            'utils.js': {
              name: 'utils.js',
              type: 'file',
              content: '// Workspace Utilities\nfunction calculateStats(items) {\n  if (!items || !items.length) return 0;\n  const total = items.reduce((acc, val) => acc + val, 0);\n  return total / items.length;\n}',
              tags: ['code', 'utility'],
              category: 'development'
            }
          }
        }
      }
    },
    sys: {
      name: 'sys',
      type: 'dir',
      children: {
        'settings.json': {
          name: 'settings.json',
          type: 'file',
          content: '{\n  "version": "1.0.0-release",\n  "audio_driver": "webaudio-native",\n  "gpu_acceleration": true,\n  "window_compositor": "standard",\n  "refresh_rate": "60Hz"\n}',
          tags: ['system', 'config']
        }
      }
    }
  }
};

const INITIAL_WINDOWS: AppWindow[] = [
  { id: 'ai-chat', title: 'Aether Assistant', icon: 'Bot', isOpen: true, isMinimized: false, isMaximized: false, x: 50, y: 70, width: 380, height: 580, zIndex: 10, minWidth: 320, minHeight: 250 },
  { id: 'terminal', title: 'Terminal', icon: 'Terminal', isOpen: true, isMinimized: false, isMaximized: false, x: 450, y: 60, width: 620, height: 420, zIndex: 1, minWidth: 320, minHeight: 200 },
  { id: 'explorer', title: 'Files', icon: 'FolderOpen', isOpen: false, isMinimized: false, isMaximized: false, x: 260, y: 150, width: 680, height: 460, zIndex: 1, minWidth: 320, minHeight: 200 },
  { id: 'telemetry', title: 'Activity Monitor', icon: 'Activity', isOpen: true, isMinimized: false, isMaximized: false, x: 300, y: 100, width: 600, height: 450, zIndex: 1, minWidth: 320, minHeight: 200 },
  { id: 'browser', title: 'Web Browser', icon: 'Globe', isOpen: false, isMinimized: false, isMaximized: false, x: 180, y: 90, width: 800, height: 500, zIndex: 1, minWidth: 320, minHeight: 250 },
  { id: 'notes', title: 'Notes', icon: 'BookOpen', isOpen: false, isMinimized: false, isMaximized: false, x: 120, y: 120, width: 750, height: 480, zIndex: 1, minWidth: 320, minHeight: 200 },
  { id: 'player', title: 'Audio Player', icon: 'Music', isOpen: false, isMinimized: false, isMaximized: false, x: 500, y: 70, width: 380, height: 500, zIndex: 1, minWidth: 320, minHeight: 200 },
  { id: 'game', title: 'Hex Debugger', icon: 'Cpu', isOpen: false, isMinimized: false, isMaximized: false, x: 400, y: 70, width: 440, height: 520, zIndex: 1, minWidth: 320, minHeight: 200 },
  { id: 'visualizer', title: 'Process Graph', icon: 'Network', isOpen: false, isMinimized: false, isMaximized: false, x: 200, y: 140, width: 720, height: 480, zIndex: 1, minWidth: 320, minHeight: 200 },
  { id: 'settings', title: 'System Settings', icon: 'Settings', isOpen: false, isMinimized: false, isMaximized: false, x: 220, y: 110, width: 620, height: 480, zIndex: 1, minWidth: 320, minHeight: 200 },
  { id: 'calculator', title: 'Calculator', icon: 'Calculator', isOpen: false, isMinimized: false, isMaximized: false, x: 520, y: 80, width: 340, height: 480, zIndex: 1, minWidth: 300, minHeight: 200 },
  { id: 'editor', title: 'Code Editor', icon: 'FileCode', isOpen: true, isMinimized: false, isMaximized: false, x: 280, y: 130, width: 720, height: 500, zIndex: 1, minWidth: 320, minHeight: 250 },
  { id: 'marketplace', title: 'Aether Marketplace', icon: 'ShoppingBag', isOpen: false, isMinimized: false, isMaximized: false, x: 240, y: 120, width: 750, height: 500, zIndex: 1, minWidth: 320, minHeight: 200 },
  { id: 'ai-compute-hub', title: 'AI Compute Hub', icon: 'Cpu', isOpen: false, isMinimized: false, isMaximized: false, x: 220, y: 80, width: 900, height: 600, zIndex: 1, minWidth: 400, minHeight: 300 },
  { id: 'swarm-command', title: 'Swarm Command', icon: 'Users', isOpen: false, isMinimized: false, isMaximized: false, x: 200, y: 70, width: 960, height: 640, zIndex: 1, minWidth: 500, minHeight: 350 },
  { id: 'device-mesh', title: 'Device Mesh', icon: 'Waypoints', isOpen: false, isMinimized: false, isMaximized: false, x: 240, y: 90, width: 880, height: 580, zIndex: 1, minWidth: 450, minHeight: 300 },
  { id: 'temporal-ledger', title: 'Temporal Ledger', icon: 'Clock', isOpen: false, isMinimized: false, isMaximized: false, x: 180, y: 100, width: 920, height: 580, zIndex: 1, minWidth: 450, minHeight: 300 }
];

const INITIAL_PROCESSES: SystemProcess[] = [
  { pid: 101, name: 'kernel', cpu: 0.8, mem: 42, status: 'running' },
  { pid: 102, name: 'aether_assistant', cpu: 2.1, mem: 184, status: 'running' },
  { pid: 103, name: 'display_compositor', cpu: 3.4, mem: 92, status: 'running' },
  { pid: 104, name: 'audio_sequencer', cpu: 0.1, mem: 14, status: 'sleeping' },
];

const loadVfs = (): VFSDirectory => {
  try {
    const saved = localStorage.getItem('aether_vfs');
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.error('Failed to load VFS from localStorage', e);
  }
  return DEFAULT_VFS;
};

const saveVfs = (vfs: VFSDirectory) => {
  localStorage.setItem('aether_vfs', JSON.stringify(vfs));
};

// Publisher-Subscriber Reactive Store
class SystemStore {
  private state: SystemState;
  private listeners = new Set<() => void>();

  constructor() {
    this.state = {
      isBooted: false,
      isLocked: true,
      theme: 'cyan',
      wallpaper: 'particles',
      soundEnabled: true,
      isGlitched: false,
      activeAppId: null,
      windows: INITIAL_WINDOWS,
      maxZIndex: 10,
      vfs: loadVfs(),
      currentDirPath: '/home/aether',
      terminalHistory: [
        'AetherOS [Version 1.0.0-release]',
        '(c) 2026 AetherCorp. All rights reserved.',
        'Type "help" for a list of system commands.',
        ''
      ],
      aiMessages: [
        { sender: 'aether', text: "Venom Core online, Ivar. Neural links verified. Ready to configure your workspace.", timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
      ],
      isAiThinking: false,
      processes: INITIAL_PROCESSES,
      cpuUsage: 8,
      ramUsage: 35,
      showQuickSettings: false,
      showSpotlight: false,
      spotlightQuery: '',
      notifications: [
        { id: 'notify-1', title: 'System Security Secure', desc: 'Secure shell connection successfully established.', time: 'Just now' },
        { id: 'notify-2', title: 'Aether Audio Sequencer', desc: 'Sequencer initialized. Audio output ready.', time: '1m ago' }
      ],
      activeWorkspace: 'dev',
      autoRestart: false,
      recentFiles: [],
      aiMemory: [],
      semanticNodes: [],
      semanticLinks: [],
      manifests: DEFAULT_MANIFESTS,
      installedAppIds: ['ai-chat', 'terminal', 'explorer', 'telemetry', 'notes', 'player', 'game', 'visualizer', 'settings', 'calculator', 'editor', 'marketplace', 'ai-compute-hub', 'swarm-command', 'device-mesh', 'temporal-ledger'],
      localModels: [
        { id: 'llama-3-8b', name: 'Llama 3 Instruct (8B)', size: '4.8 GB', status: 'STANDBY', vram: 0, gpuPriority: 'MEDIUM' },
        { id: 'phi-3-medium', name: 'Phi-3 Medium (14B)', size: '7.9 GB', status: 'STANDBY', vram: 0, gpuPriority: 'LOW' },
        { id: 'qwen-2.5-coder', name: 'Qwen 2.5 Coder (7B)', size: '4.4 GB', status: 'STANDBY', vram: 0, gpuPriority: 'HIGH' }
      ],
      computeMetrics: {
        cpuLoad: 8,
        gpuLoad: 0,
        vramUsage: 0,
        localTokensPerSec: 0,
        cloudTokensPerSec: 58,
        latencyMs: 120
      },
      routingStats: {
        localCount: 0,
        cloudCount: 14,
        privacyShieldedCount: 0
      },
      computeAgents: [
        { id: 'indexer', name: 'Indexing Agent', desc: 'Indexes local VFS documents.', status: 'IDLE', priority: 'BACKGROUND', remoteNode: 'localhost' },
        { id: 'optimization', name: 'Optimizer Agent', desc: 'Audits memory and CPU load allocations.', status: 'IDLE', priority: 'NORMAL', remoteNode: 'localhost' },
        { id: 'security', name: 'SecOps Agent', desc: 'Monitors platform API sandboxing compliance.', status: 'IDLE', priority: 'BACKGROUND', remoteNode: 'localhost' }
      ],
      voiceState: 'IDLE',
      voiceTranscript: '',
      voiceResponseText: '',
      isVoiceActive: false,
      micVolume: 0,
      // Swarm Orchestration
      swarmAgents: [],
      swarmPipelines: [],
      swarmMessageBus: [],
      swarmEscalations: [],
      // Cross-Device Mesh
      crossDeviceNodes: DEFAULT_DEVICE_NODES,
      deviceTelemetryStreams: DEFAULT_DEVICE_NODES.map(d => ({ deviceId: d.id, history: [d.telemetry], maxHistory: 30 })),
      isTheaterMode: false,
      isTilingLayoutActive: false
    };

    // Restore AI Memory from localStorage
    try {
      const savedMemory = localStorage.getItem('aether_ai_memory');
      if (savedMemory) {
        this.state.aiMemory = JSON.parse(savedMemory);
      } else {
        // Initialize high-tech defaults for beautiful visual logs
        this.state.aiMemory = [
          { key: 'name', value: 'Ivar', timestamp: 'Just now' },
          { key: 'developer_level', value: 'Level 5 (Admin)', timestamp: 'Just now' },
          { key: 'active_node', value: 'AETHER Sandbox Core', timestamp: 'Just now' },
          { key: 'ai_engine', value: 'Local DeepMind Native', timestamp: 'Just now' }
        ];
      }
    } catch (e) {
      console.error('Failed to restore AI memory', e);
    }

    // Restore recent files list from localStorage
    try {
      const savedRecent = localStorage.getItem('aether_recent_files');
      if (savedRecent) {
        this.state.recentFiles = JSON.parse(savedRecent);
      }
    } catch (e) {
      console.error('Failed to restore workspace recent files', e);
    }

    // Helper to apply workspace window layout mapping with safety boundary checks
    const applyWorkspaceLayout = (savedWindows: string) => {
      try {
        const parsed = JSON.parse(savedWindows);
        const loaded = this.state.windows.map(w => {
          const match = parsed.find((p: any) => p.id === w.id);
          if (match) {
            const winWidth = typeof window !== 'undefined' ? window.innerWidth : 1920;
            const winHeight = typeof window !== 'undefined' ? window.innerHeight : 1080;
            
            const maxAllowedHeight = winHeight - 140;
            
            // Force exact vertical fit: keep a 70px gap at top and 70px at bottom
            const targetH = maxAllowedHeight;
            const targetY = 70;

            return {
              ...w,
              isOpen: match.isOpen,
              isMinimized: match.isMinimized,
              isMaximized: match.isMaximized,
              x: match.x !== undefined ? match.x : Math.round((winWidth - w.width) / 2),
              y: targetY,
              width: match.width !== undefined ? match.width : w.width,
              height: targetH,
              zIndex: match.zIndex
            };
          }
          return w;
        });
        this.state.windows = loaded;
        this.emit();
      } catch (e) {
        console.error('Failed to parse workspace layout', e);
      }
    };

    // Restore workspace windows layout from localStorage on boot
    try {
      const savedWindows = localStorage.getItem('aether_workspace_windows');
      if (savedWindows) {
        applyWorkspaceLayout(savedWindows);
      }
    } catch (e) {
      console.error('Failed to restore windows session state', e);
    }

    // Hybrid IPC bridge: load workspace session directly from native Rust filesystem
    if (typeof window !== 'undefined' && (window as any).__TAURI__) {
      (window as any).__TAURI__.invoke('aether_load_workspace')
        .then((res: string) => {
          if (res) {
            applyWorkspaceLayout(res);
            this.logDiagnostic('Tauri Service: Workspace context loaded from Rust filesystem');
          }
        })
        .catch((e: any) => console.warn('Tauri persistence bypassed:', e));
    }

    // Load Semantic Graph from Rust persistence core
    const applySemanticGraph = (graphJson: string) => {
      try {
        const parsed = JSON.parse(graphJson);
        if (parsed.nodes && parsed.edges) {
          this.state.semanticNodes = parsed.nodes;
          this.state.semanticLinks = parsed.edges;
          this.emit();
        }
      } catch (e) {
        console.error('Failed to parse semantic graph', e);
      }
    };

    if (typeof window !== 'undefined' && (window as any).__TAURI__) {
      (window as any).__TAURI__.invoke('aether_semantic_get_graph')
        .then((res: string) => {
          if (res) {
            applySemanticGraph(res);
            this.logDiagnostic('Tauri Service: Semantic Memory Graph loaded from Rust filesystem');
          }
        })
        .catch((e: any) => console.warn('Tauri semantic graph bypassed:', e));
    } else {
      this.initDefaultSemanticGraph();
    }

    // EXPOSE NATIVE AETHER SDK BRIDGE (window.AetherSDK) FOR APPLICATION SANDBOXES
    if (typeof window !== 'undefined') {
      (window as any).AetherSDK = {
        fs: {
          read: async (fileName: string) => {
            this.logDiagnostic(`SDK API: fs.read requested for /home/aether/${fileName}`);
            await new Promise(resolve => setTimeout(resolve, 80)); // Simulate async IO latency
            const node = this.resolvePath(`/home/aether/${fileName}`);
            if (node && node.type === 'file') return node.content;
            return null;
          },
          write: async (fileName: string, content: string) => {
            this.logDiagnostic(`SDK API: fs.write requested for /home/aether/${fileName}`);
            await new Promise(resolve => setTimeout(resolve, 100));
            const success = this.createVfsNode(fileName, 'file', content);
            if (!success) {
              return this.writeVfsFile(`/home/aether/${fileName}`, content);
            }
            return true;
          },
          ls: async (pathStr: string = '/home/aether') => {
            this.logDiagnostic(`SDK API: fs.ls requested for ${pathStr}`);
            await new Promise(resolve => setTimeout(resolve, 60));
            const node = this.resolvePath(pathStr);
            if (node && node.type === 'dir') {
              return Object.keys(node.children);
            }
            return [];
          },
          delete: async (fileName: string) => {
            this.logDiagnostic(`SDK API: fs.delete requested for /home/aether/${fileName}`);
            await new Promise(resolve => setTimeout(resolve, 80));
            return this.deleteVfsNode(fileName);
          }
        },
        os: {
          launchApp: async (appName: string) => {
            this.logDiagnostic(`SDK API: os.launchApp requested for ${appName}`);
            if (typeof window !== 'undefined' && (window as any).__TAURI__) {
              try {
                const res = await (window as any).__TAURI__.invoke('aether_launch_app', { appName });
                this.logToTerminal(`\n[Aether OS] Launched native application: ${appName}`);
                this.addNotification(`App Launched`, `Successfully triggered native ${appName}`, 'Just now');
                return { success: true, message: res };
              } catch (e: any) {
                this.logToTerminal(`\n[Aether OS Error] Failed to launch ${appName}: ${e}`);
                return { success: false, error: e };
              }
            } else {
              this.logToTerminal(`\n[Aether Sandbox] Bypassed launching ${appName} (Running in browser sandbox)`);
              return { success: true, message: "Bypassed (Sandbox Mode)" };
            }
          },
          createFile: async (path: string, content: string) => {
            this.logDiagnostic(`SDK API: os.createFile requested for ${path}`);
            if (typeof window !== 'undefined' && (window as any).__TAURI__) {
              try {
                const res = await (window as any).__TAURI__.invoke('aether_create_workspace_file', { pathStr: path, content });
                this.logToTerminal(`\n[Aether OS] Wrote file to disk: ${path}`);
                this.addNotification(`File Created`, `Successfully wrote ${path} to workspace disk.`, 'Just now');
                return { success: true, message: res };
              } catch (e: any) {
                this.logToTerminal(`\n[Aether OS Error] Failed to write file ${path}: ${e}`);
                return { success: false, error: e };
              }
            } else {
              this.writeVfsFile(`/home/aether/${path}`, content);
              this.logToTerminal(`\n[Aether Sandbox] Redirected write for ${path} to virtual disk`);
              this.addNotification(`VFS File Created`, `Successfully wrote ${path} to virtual disk.`, 'Just now');
              return { success: true, message: "Written to Virtual VFS" };
            }
          }
        },
        vision: {
          captureScreen: async () => {
            this.logDiagnostic(`SDK API: vision.captureScreen requested`);
            if (typeof window !== 'undefined' && (window as any).__TAURI__) {
              try {
                const base64Bytes = await (window as any).__TAURI__.invoke('aether_capture_screen');
                this.logToTerminal(`\n[Aether OS] Native primary screen snapshot captured successfully.`);
                return { success: true, data: base64Bytes };
              } catch (e: any) {
                this.logToTerminal(`\n[Aether OS Error] Failed to capture screen: ${e}`);
                return { success: false, error: e };
              }
            } else {
              this.logToTerminal(`\n[Aether Sandbox] Screen capture bypassed (Sandbox Mode Simulation)`);
              return { success: true, data: "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" };
            }
          }
        },
        notifications: {
          post: async (title: string, desc: string, type: 'info' | 'warn' | 'success' = 'info') => {
            this.logDiagnostic(`SDK API: Notification post: ${title}`);
            this.addNotification(title, desc, 'Just now');
            if (type === 'success') playSound.success();
            if (type === 'warn') playSound.warning();
            return { sent: true };
          }
        },
        telemetry: {
          getMetrics: async () => {
            this.logDiagnostic(`SDK API: Telemetry metrics requested`);
            await new Promise(resolve => setTimeout(resolve, 50));
            return {
              cpu: this.state.cpuUsage,
              ram: this.state.ramUsage,
              activeProcesses: this.state.processes.filter(p => p.status === 'running').length,
              temperature: 42.8
            };
          },
          subscribe: (callback: (metrics: any) => void) => {
            this.logDiagnostic(`SDK API: Telemetry subscription established`);
            const interval = setInterval(() => {
              callback({
                cpu: this.state.cpuUsage,
                ram: this.state.ramUsage,
                activeProcesses: this.state.processes.filter(p => p.status === 'running').length,
                temperature: 42.8
              });
            }, 3000);
            return () => {
              this.logDiagnostic(`SDK API: Telemetry subscription cancelled`);
              clearInterval(interval);
            };
          }
        },
        ai: {
          query: async (prompt: string, context?: string) => {
            this.logDiagnostic(`SDK API: Dispatching prompt to Aether AI Core`);
            await new Promise(resolve => setTimeout(resolve, 150));
            const fullPrompt = context ? `[Context: ${context}] ${prompt}` : prompt;
            await this.sendAiMessage(fullPrompt);
            return { status: 'queued', message: 'Prompt dispatched to Aether Assistant shell.' };
          },
          remember: async (key: string, value: string) => {
            this.logDiagnostic(`SDK API: Recording memory registry key`);
            this.setAiMemory(key, value);
            return { saved: true };
          },
          getMemory: async () => {
            return this.state.aiMemory;
          }
        },
        workspace: {
          getCurrent: async () => {
            return this.state.activeWorkspace;
          },
          change: async (ws: 'dev' | 'media' | 'sys') => {
            this.logDiagnostic(`SDK API: Workspace switch requested to ${ws}`);
            this.setWorkspace(ws);
            return { active: ws };
          }
        },
        security: {
          requestCapability: async (permission: string) => {
            this.logDiagnostic(`SDK SECURITY AUDIT: App requested capability token: [${permission.toUpperCase()}]`);
            this.logToTerminal(`\n[Aether Security] Sandbox Capability Authorization Audit: Approved [${permission.toUpperCase()}] token for active app instance.`);
            return { authorized: true, token: `CAP_SIG_2026_${Math.random().toString(36).substring(2, 8).toUpperCase()}` };
          }
        },
        marketplace: {
          listPlugins: async () => {
            this.logDiagnostic(`SDK API: Marketplace plugin catalogue requested`);
            return [
              { name: 'GitIntegrator', desc: 'Secure local git staging sync controls.', version: '1.2.0', status: 'ACTIVE' },
              { name: 'DockerManager', desc: 'Run micro-containers rendered to Wayland.', version: '1.0.4', status: 'STANDBY' },
              { name: 'NeuralSynthesis', desc: 'Local Llama.cpp prompt weight tuning.', version: '2.1.0', status: 'ACTIVE' }
            ];
          }
        },
        semantic: {
          getGraph: async () => {
            return { nodes: this.state.semanticNodes, edges: this.state.semanticLinks };
          },
          addNode: async (id: string, name: string, type: any, description: string, tags: string[], metadata: any) => {
            this.addSemanticNode(id, name, type, description, tags, metadata);
            return { added: true };
          },
          addEdge: async (source: string, target: string, relationship: string, weight: number) => {
            this.addSemanticEdge(source, target, relationship, weight);
            return { added: true };
          },
          query: async (tag: string) => {
            return this.querySemanticGraph(tag);
          },
          reconstruct: async (metadataStr: string) => {
            this.reconstructEnvironment(metadataStr);
            return { success: true };
          }
        },
        compute: {
          getLocalModels: async () => this.state.localModels,
          loadModel: async (id: string) => this.loadLocalModel(id),
          unloadModel: async (id: string) => this.unloadLocalModel(id),
          setLocalModelPriority: async (id: string, priority: 'LOW' | 'MEDIUM' | 'HIGH') => this.setLocalModelPriority(id, priority),
          setAgentPriority: async (id: string, priority: 'BACKGROUND' | 'NORMAL' | 'REALTIME') => this.setAgentPriority(id, priority),
          routeWorkload: async (prompt: string, privacy: 'high' | 'standard', complexity: 'low' | 'high') => this.routeWorkload(prompt, privacy, complexity),
          getMetrics: async () => this.state.computeMetrics,
          getAgents: async () => this.state.computeAgents
        },
        voice: {
          getState: async () => this.state.voiceState,
          getTranscript: async () => this.state.voiceTranscript,
          getResponse: async () => this.state.voiceResponseText,
          isActive: async () => this.state.isVoiceActive,
          activate: async () => this.activateVoiceEngine(),
          deactivate: async () => this.deactivateVoiceEngine(),
          process: async (text: string) => this.processVoiceCommand(text)
        }
      };
    }

    // Periodically update system monitor mock values
    setInterval(() => {
      this.updateTelemetry();
    }, 2000);
  }

  getState = () => this.state;

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private emit() {
    this.listeners.forEach(l => l());
    
    // Auto-serialize active window session coordinates & configurations to localStorage
    try {
      const serializableWindows = this.state.windows.map(w => ({
        id: w.id,
        isOpen: w.isOpen,
        isMinimized: w.isMinimized,
        isMaximized: w.isMaximized,
        x: w.x,
        y: w.y,
        width: w.width,
        height: w.height,
        zIndex: w.zIndex
      }));
      const sessionStr = JSON.stringify(serializableWindows);
      localStorage.setItem('aether_workspace_windows', sessionStr);

      // Hybrid IPC bridge: write workspace session dynamically to native Rust filesystem
      if (typeof window !== 'undefined' && (window as any).__TAURI__) {
        (window as any).__TAURI__.invoke('aether_save_workspace', { stateJson: sessionStr })
          .then((r: string) => console.log('[Aether Rust Service]', r))
          .catch((e: any) => console.error(e));
      }
    } catch (e) {
      console.error('Failed to serialize windows state', e);
    }
  }

  private updateTelemetry() {
    const isPlaying = this.state.windows.find(w => w.id === 'player')?.isOpen && !this.state.windows.find(w => w.id === 'player')?.isMinimized;
    const isShellActive = this.state.windows.find(w => w.id === 'terminal')?.isOpen && !this.state.windows.find(w => w.id === 'terminal')?.isMinimized;
    
    const cpuBase = 5 + (isPlaying ? 8 : 0) + (isShellActive ? 4 : 0);
    const mockCpu = Math.min(99, Math.max(2, Math.round(cpuBase + Math.random() * 8)));
    const mockRam = Math.min(95, Math.max(10, Math.round(34 + Math.random() * 2 + (isPlaying ? 4 : 0))));
    
    // Update process values
    const updatedProcesses = this.state.processes.map(p => {
      if (p.name === 'kernel') return { ...p, cpu: Math.max(0.2, +(0.5 + Math.random() * 0.5).toFixed(1)) };
      if (p.name === 'display_compositor') return { ...p, cpu: Math.max(1, +(2 + Math.random() * 3).toFixed(1)) };
      if (p.name === 'aether_assistant') return { ...p, cpu: this.state.isAiThinking ? Math.max(15, +(20 + Math.random() * 15).toFixed(1)) : Math.max(0.5, +(1 + Math.random() * 2).toFixed(1)) };
      if (p.name === 'audio_sequencer') return { ...p, cpu: isPlaying ? Math.max(2, +(3 + Math.random() * 3).toFixed(1)) : 0.1, status: isPlaying ? 'running' as const : 'sleeping' as const };
      return p;
    });

    this.state = {
      ...this.state,
      cpuUsage: mockCpu,
      ramUsage: mockRam,
      processes: updatedProcesses
    };
    this.emit();

    // Hybrid IPC bridge: fetch native system telemetry dynamically from async Rust background loop
    if (typeof window !== 'undefined' && (window as any).__TAURI__) {
      (window as any).__TAURI__.invoke('get_system_telemetry')
        .then((res: string) => {
          try {
            const data = JSON.parse(res);
            // Dynamic telemetry synchronization
            this.state = {
              ...this.state,
              cpuUsage: data.cpu,
              ramUsage: data.ram
            };
            this.emit();
          } catch (e) {}
        })
        .catch((e: any) => console.warn('Tauri telemetry loop bypassed:', e));
    }
  }

  // BOOT & LOCK CONTROLS
  bootSystem = () => {
    this.state = { ...this.state, isBooted: true };
    this.emit();
  };

  unlockSystem = () => {
    this.state = { ...this.state, isLocked: false };
    this.emit();
  };

  lockSystem = () => {
    this.state = { ...this.state, isLocked: true, showQuickSettings: false };
    this.emit();
  };

  shutdownSystem = () => {
    setSoundEnabled(true);
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    this.state = {
      ...this.state,
      isBooted: false,
      isLocked: true,
      soundEnabled: true,
      autoRestart: false,
      windows: INITIAL_WINDOWS.map(w => ({ ...w, isOpen: false })),
      terminalHistory: [
        'AetherOS [Version 1.0.0-release]',
        '(c) 2026 AetherCorp. All rights reserved.',
        'Type "help" for a list of system commands.',
        ''
      ],
      showQuickSettings: false,
      isVoiceActive: false,
      voiceState: 'IDLE',
      voiceTranscript: '',
      voiceResponseText: '',
      micVolume: 0
    };
    this.emit();
  };

  restartSystem = () => {
    setSoundEnabled(true);
    this.state = {
      ...this.state,
      isBooted: false,
      isLocked: true,
      soundEnabled: true,
      autoRestart: true,
      windows: INITIAL_WINDOWS.map(w => ({ ...w, isOpen: false })),
      terminalHistory: [
        'AetherOS [Version 1.0.0-release]',
        '(c) 2026 AetherCorp. All rights reserved.',
        'Type "help" for a list of system commands.',
        ''
      ],
      showQuickSettings: false
    };
    this.emit();
  };

  clearAutoRestart = () => {
    this.state = { ...this.state, autoRestart: false };
    this.emit();
  };

  getTargetAppFromText = (text: string): string | null => {
    const appAliases: { [key: string]: string } = {
      'terminal': 'terminal', 'shell': 'terminal', 'bash': 'terminal',
      'editor': 'editor', 'code': 'editor', 'ide': 'editor',
      'file': 'explorer', 'files': 'explorer', 'explorer': 'explorer',
      'note': 'notes', 'notes': 'notes', 'notepad': 'notes',
      'telemetry': 'telemetry', 'monitor': 'telemetry', 'activity': 'telemetry',
      'browser': 'browser', 'web': 'browser',
      'player': 'player', 'music': 'player', 'audio': 'player',
      'game': 'game', 'debugger': 'game',
      'visualizer': 'visualizer', 'graph': 'visualizer', 'cognitive': 'visualizer',
      'settings': 'settings', 'preferences': 'settings',
      'calculator': 'calculator',
      'marketplace': 'marketplace', 'store': 'marketplace',
      'compute': 'ai-compute-hub',
      'swarm': 'swarm-command',
      'mesh': 'device-mesh',
      'ledger': 'temporal-ledger', 'temporal': 'temporal-ledger'
    };
    for (const [alias, id] of Object.entries(appAliases)) {
      if (text.includes(alias)) return id;
    }
    return null;
  };

  // WINDOW CONTROLS
  openWindow = (id: string) => {
    const nextZIndex = this.state.maxZIndex + 1;
    const category = ['ai-chat', 'terminal', 'explorer', 'notes', 'calculator', 'editor', 'git-integrator', 'llama-tuner', 'telemetry', 'temporal-ledger'].includes(id) ? 'dev' 
      : ['player', 'visualizer', 'browser', 'docker-manager', 'device-mesh'].includes(id) ? 'media'
      : 'sys';

    this.state = {
      ...this.state,
      activeAppId: id,
      activeWorkspace: category as 'dev' | 'media' | 'sys',
      maxZIndex: nextZIndex,
      windows: this.state.windows.map(w => {
        if (w.id === id) {
          const winWidth = typeof window !== 'undefined' ? window.innerWidth : 1920;
          const winHeight = typeof window !== 'undefined' ? window.innerHeight : 1080;
          
          // Force exact vertical fit: keep a 70px gap at top and 70px at bottom
          const targetHeight = winHeight - 140;
          const newY = 70;
          const newX = Math.max(20, Math.round((winWidth - w.width) / 2));

          return { 
            ...w, 
            isOpen: true, 
            isMinimized: false, 
            isMaximized: false, // ensure standard positioning is active
            x: newX, 
            y: newY, 
            height: targetHeight, 
            zIndex: nextZIndex 
          };
        }
        return w;
      })
    };
    this.logDiagnostic(`App activated & centered: ${id} (z-index elevated to ${nextZIndex})`);
    this.emit();
  };

  closeWindow = (id: string) => {
    this.state = {
      ...this.state,
      windows: this.state.windows.map(w => {
        if (w.id === id) {
          return { ...w, isOpen: false };
        }
        return w;
      }),
      activeAppId: this.state.activeAppId === id ? null : this.state.activeAppId
    };
    this.logDiagnostic(`App terminated: ${id}`);
    this.emit();
  };

  minimizeWindow = (id: string) => {
    this.state = {
      ...this.state,
      windows: this.state.windows.map(w => {
        if (w.id === id) {
          return { ...w, isMinimized: true };
        }
        return w;
      }),
      activeAppId: this.state.activeAppId === id ? null : this.state.activeAppId
    };
    this.logDiagnostic(`App suspended: ${id}`);
    this.emit();
  };

  maximizeWindow = (id: string) => {
    this.state = {
      ...this.state,
      windows: this.state.windows.map(w => {
        if (w.id === id) {
          return { ...w, isMaximized: !w.isMaximized, isMinimized: false };
        }
        return w;
      })
    };
    this.emit();
  };

  focusWindow = (id: string) => {
    if (this.state.activeAppId === id) return;
    const nextZIndex = this.state.maxZIndex + 1;
    this.state = {
      ...this.state,
      activeAppId: id,
      maxZIndex: nextZIndex,
      windows: this.state.windows.map(w => {
        if (w.id === id) {
          return { ...w, isMinimized: false, zIndex: nextZIndex };
        }
        return w;
      })
    };
    this.emit();
  };

  isolateWindow = (id: string) => {
    const nextZIndex = this.state.maxZIndex + 1;
    const getCategory = (winId: string) => {
      return ['ai-chat', 'terminal', 'explorer', 'notes', 'calculator', 'editor', 'git-integrator', 'llama-tuner', 'telemetry', 'temporal-ledger'].includes(winId) ? 'dev' 
        : ['player', 'visualizer', 'browser', 'docker-manager', 'device-mesh'].includes(winId) ? 'media'
        : 'sys';
    };
    
    const targetCategory = getCategory(id);
    this.state = {
      ...this.state,
      activeAppId: id,
      activeWorkspace: targetCategory,
      maxZIndex: nextZIndex,
      windows: this.state.windows.map(w => {
        if (w.id === id) {
          const winWidth = typeof window !== 'undefined' ? window.innerWidth : 1920;
          const winHeight = typeof window !== 'undefined' ? window.innerHeight : 1080;
          const targetHeight = winHeight - 140;
          const newY = 70;
          const newX = Math.max(20, Math.round((winWidth - w.width) / 2));
          return {
            ...w,
            isOpen: true,
            isMinimized: false,
            isMaximized: false,
            x: newX,
            y: newY,
            height: targetHeight,
            zIndex: nextZIndex
          };
        } else {
          // If it belongs to the target workspace category, minimize it
          if (getCategory(w.id) === targetCategory) {
            return { ...w, isMinimized: true };
          }
          return w;
        }
      })
    };
    this.logDiagnostic(`Workspace isolated to window: ${id}`);
    this.emit();
  };

  minimizeAllWindows = () => {
    const currentWorkspace = this.state.activeWorkspace || 'dev';
    const getCategory = (winId: string) => {
      return ['ai-chat', 'terminal', 'explorer', 'notes', 'calculator', 'editor', 'git-integrator', 'llama-tuner', 'telemetry', 'temporal-ledger'].includes(winId) ? 'dev' 
        : ['player', 'visualizer', 'browser', 'docker-manager', 'device-mesh'].includes(winId) ? 'media'
        : 'sys';
    };

    this.state = {
      ...this.state,
      windows: this.state.windows.map(w => {
        if (getCategory(w.id) === currentWorkspace) {
          return { ...w, isMinimized: true };
        }
        return w;
      }),
      activeAppId: null
    };
    this.logDiagnostic(`All windows on workspace ${currentWorkspace} minimized`);
    this.emit();
  };

  setTheaterMode = (enabled: boolean) => {
    this.state = {
      ...this.state,
      isTheaterMode: enabled
    };
    this.emit();
  };

  toggleTilingLayout = () => {
    const activeWS = this.state.activeWorkspace || 'dev';
    const isTilingActive = !this.state.isTilingLayoutActive;

    if (!isTilingActive) {
      // If turning off tiling, just reset
      this.state = {
        ...this.state,
        isTilingLayoutActive: false
      };
      this.resetWindowPositions();
      return;
    }

    const winWidth = typeof window !== 'undefined' ? window.innerWidth : 1920;
    const winHeight = typeof window !== 'undefined' ? window.innerHeight : 1080;
    const targetHeight = winHeight - 140; // 70px top, 70px bottom margins

    const getCategory = (winId: string) => {
      return ['ai-chat', 'terminal', 'explorer', 'notes', 'calculator', 'editor', 'git-integrator', 'llama-tuner', 'telemetry', 'temporal-ledger'].includes(winId) ? 'dev' 
        : ['player', 'visualizer', 'browser', 'docker-manager', 'device-mesh'].includes(winId) ? 'media'
        : 'sys';
    };

    // Filter open windows on the active workspace
    const openWins = this.state.windows.filter(w => w.isOpen && !w.isMinimized && getCategory(w.id) === activeWS);

    if (openWins.length === 0) {
      this.state = {
        ...this.state,
        isTilingLayoutActive: isTilingActive
      };
      this.emit();
      return;
    }

    // Grid layout arrangements:
    // Case 1: Active workspace is 'dev'
    if (activeWS === 'dev') {
      const editorOpen = openWins.some(w => w.id === 'editor');
      const terminalOpen = openWins.some(w => w.id === 'terminal');
      const telemetryOpen = openWins.some(w => w.id === 'telemetry');

      // Standard dev tiling: editor on left 50%, terminal top right, telemetry bottom right
      let index = 0;
      this.state.windows = this.state.windows.map(w => {
        if (!w.isOpen || w.isMinimized || getCategory(w.id) !== activeWS) return w;

        if (w.id === 'editor') {
          return {
            ...w,
            isMaximized: false,
            x: 20,
            y: 70,
            width: Math.round(winWidth * 0.5) - 30,
            height: targetHeight
          };
        } else if (w.id === 'terminal') {
          return {
            ...w,
            isMaximized: false,
            x: Math.round(winWidth * 0.5) + 10,
            y: 70,
            width: Math.round(winWidth * 0.5) - 30,
            height: Math.round(targetHeight * 0.5) - 10
          };
        } else if (w.id === 'telemetry') {
          return {
            ...w,
            isMaximized: false,
            x: Math.round(winWidth * 0.5) + 10,
            y: Math.round(targetHeight * 0.5) + 80,
            width: Math.round(winWidth * 0.5) - 30,
            height: Math.round(targetHeight * 0.5) - 10
          };
        } else {
          // General fallback tiling layout for any other open dev app
          index++;
          const colWidth = Math.round(winWidth / openWins.length);
          return {
            ...w,
            isMaximized: false,
            x: 20 + (index - 1) * colWidth,
            y: 70,
            width: colWidth - 30,
            height: targetHeight
          };
        }
      });
    } else {
      // General workspace horizontal split tiling
      const colWidth = Math.round((winWidth - 40) / openWins.length);
      let index = 0;
      this.state.windows = this.state.windows.map(w => {
        if (!w.isOpen || w.isMinimized || getCategory(w.id) !== activeWS) return w;
        const currentIdx = index;
        index++;
        return {
          ...w,
          isMaximized: false,
          x: 20 + currentIdx * colWidth,
          y: 70,
          width: colWidth - 20,
          height: targetHeight
        };
      });
    }

    this.state = {
      ...this.state,
      isTilingLayoutActive: isTilingActive
    };
    this.logDiagnostic(`Workspace window tiling layout activated: ${activeWS}`);
    this.emit();
  };

  updateWindowPosition = (id: string, x: number, y: number) => {
    this.state = {
      ...this.state,
      windows: this.state.windows.map(w => {
        if (w.id === id) {
          return { ...w, x, y };
        }
        return w;
      })
    };
    this.emit();
  };

  updateWindowSize = (id: string, width: number, height: number, x?: number, y?: number) => {
    this.state = {
      ...this.state,
      windows: this.state.windows.map(w => {
        if (w.id === id) {
          return {
            ...w,
            width,
            height,
            x: x !== undefined ? x : w.x,
            y: y !== undefined ? y : w.y
          };
        }
        return w;
      })
    };
    this.emit();
  };

  resetWindowPositions = () => {
    this.state = {
      ...this.state,
      windows: this.state.windows.map(w => {
        const init = INITIAL_WINDOWS.find(iw => iw.id === w.id);
        if (init) {
          const winWidth = typeof window !== 'undefined' ? window.innerWidth : 1920;
          const winHeight = typeof window !== 'undefined' ? window.innerHeight : 1080;
          const targetHeight = winHeight - 140;
          return {
            ...w,
            x: Math.max(20, Math.round((winWidth - init.width) / 2)),
            y: 70,
            width: init.width,
            height: targetHeight,
            isMinimized: false,
            isMaximized: false
          };
        }
        return w;
      })
    };
    this.logDiagnostic('All window spatial pointers reset to defaults');
    this.emit();
  };

  installAppManifest = (manifest: AppManifest) => {
    // Add to installed app IDs
    if (this.state.installedAppIds.includes(manifest.id)) return;
    
    // Create matching app window instance
    const newWindow: AppWindow = {
      id: manifest.id,
      title: manifest.name,
      icon: manifest.icon,
      isOpen: false,
      isMinimized: false,
      isMaximized: false,
      x: 300,
      y: 100,
      width: 720,
      height: 500,
      zIndex: this.state.maxZIndex + 1,
      minWidth: 320,
      minHeight: 200
    };

    this.state = {
      ...this.state,
      manifests: [...this.state.manifests.filter(m => m.id !== manifest.id), manifest],
      installedAppIds: [...this.state.installedAppIds, manifest.id],
      windows: [...this.state.windows.filter(w => w.id !== manifest.id), newWindow]
    };
    
    this.logDiagnostic(`Ecosystem: Installed and registered application manifest: ${manifest.name}`);
    this.addNotification('Application Installed', `Dynamic marketplace module "${manifest.name}" added to the workspace.`, 'Just now');
    this.emit();
  };

  uninstallApp = (id: string) => {
    this.state = {
      ...this.state,
      installedAppIds: this.state.installedAppIds.filter(appId => appId !== id),
      windows: this.state.windows.filter(w => w.id !== id)
    };
    this.logDiagnostic(`Ecosystem: Uninstalled application manifest: ${id}`);
    this.addNotification('Application Removed', `Marketplace module "${id}" uninstalled from system Dock.`, 'Just now');
    this.emit();
  };

  loadLocalModel = (id: string) => {
    playSound.click();
    this.state = {
      ...this.state,
      localModels: this.state.localModels.map(m => m.id === id ? { ...m, status: 'LOADING' } : m)
    };
    this.addNotification('Model Loading', `Loading model tensor parameters into VRAM...`, 'Just now');
    this.emit();

    setTimeout(() => {
      const targetModel = this.state.localModels.find(m => m.id === id);
      if (!targetModel) return;

      const vramAlloc = id === 'llama-3-8b' ? 4800 : id === 'phi-3-medium' ? 8000 : 4400;
      
      this.state = {
        ...this.state,
        localModels: this.state.localModels.map(m => m.id === id ? { ...m, status: 'LOADED', vram: vramAlloc } : m),
        computeMetrics: {
          ...this.state.computeMetrics,
          vramUsage: this.state.computeMetrics.vramUsage + vramAlloc,
          gpuLoad: Math.min(99, this.state.computeMetrics.gpuLoad + 25),
          localTokensPerSec: 32,
          cloudTokensPerSec: 0,
          latencyMs: 380
        }
      };
      
      playSound.success();
      this.addNotification('Model Loaded', `${targetModel.name} loaded into VRAM. GPU scheduling active.`, 'Just now');
      this.logToTerminal(`\n[Compute Orchestrator] Model loaded: ${targetModel.name} // GGUF Tensor VRAM allocation: ${vramAlloc}MB // Core affinity: GPU Cores 0-15`);
      this.emit();
    }, 1200);
  };

  unloadLocalModel = (id: string) => {
    playSound.warning();
    const targetModel = this.state.localModels.find(m => m.id === id);
    if (!targetModel) return;

    const vramFreed = targetModel.vram;

    this.state = {
      ...this.state,
      localModels: this.state.localModels.map(m => m.id === id ? { ...m, status: 'STANDBY', vram: 0 } : m),
      computeMetrics: {
        ...this.state.computeMetrics,
        vramUsage: Math.max(0, this.state.computeMetrics.vramUsage - vramFreed),
        gpuLoad: Math.max(0, this.state.computeMetrics.gpuLoad - 25),
        localTokensPerSec: 0,
        cloudTokensPerSec: 58,
        latencyMs: 120
      }
    };
    
    this.addNotification('Model Unloaded', `${targetModel.name} unloaded from VRAM. GPU cores idle.`, 'Just now');
    this.logToTerminal(`\n[Compute Orchestrator] Model unloaded: ${targetModel.name} // Released ${vramFreed}MB VRAM`);
    this.emit();
  };

  setLocalModelPriority = (id: string, gpuPriority: 'LOW' | 'MEDIUM' | 'HIGH') => {
    playSound.click();
    this.state = {
      ...this.state,
      localModels: this.state.localModels.map(m => m.id === id ? { ...m, gpuPriority } : m)
    };
    this.addNotification('GPU Priority Adjusted', `Set model ${id} GPU priority to ${gpuPriority}.`, 'Just now');
    this.logToTerminal(`\n[Compute Orchestrator] GPU Inference priority recalibrated: ${id} -> ${gpuPriority}`);
    this.emit();
  };

  setAgentPriority = (id: string, priority: 'BACKGROUND' | 'NORMAL' | 'REALTIME') => {
    playSound.click();
    
    const cpuDelta = priority === 'REALTIME' ? 12 : priority === 'NORMAL' ? 4 : 1;
    const gpuDelta = priority === 'REALTIME' ? 20 : priority === 'NORMAL' ? 5 : 0;

    this.state = {
      ...this.state,
      computeAgents: this.state.computeAgents.map(a => a.id === id ? { ...a, priority, status: 'BUSY' } : a),
      computeMetrics: {
        ...this.state.computeMetrics,
        cpuLoad: Math.min(99, 8 + cpuDelta),
        gpuLoad: Math.min(99, this.state.computeMetrics.gpuLoad + gpuDelta)
      }
    };

    setTimeout(() => {
      this.state = {
        ...this.state,
        computeAgents: this.state.computeAgents.map(a => a.id === id ? { ...a, status: 'IDLE' } : a)
      };
      this.emit();
    }, 1500);

    this.addNotification('Agent Priority Adjusted', `Set daemon ${id} priority to ${priority}.`, 'Just now');
    this.logToTerminal(`\n[Agent Scheduler] Thread scheduling modified: ${id} -> Priority: ${priority} // Thread affinity reallocated.`);
    this.emit();
  };

  routeWorkload = (prompt: string, privacyLevel: 'high' | 'standard', complexity: 'low' | 'high') => {
    playSound.success();
    const isPrivate = privacyLevel === 'high';
    const destination = isPrivate ? 'Local Inference' : (complexity === 'high' ? 'Cloud API' : 'Local Inference');
    
    const isLocal = destination === 'Local Inference';

    this.state = {
      ...this.state,
      routingStats: {
        localCount: this.state.routingStats.localCount + (isLocal ? 1 : 0),
        cloudCount: this.state.routingStats.cloudCount + (!isLocal ? 1 : 0),
        privacyShieldedCount: this.state.routingStats.privacyShieldedCount + (isPrivate ? 1 : 0)
      },
      computeMetrics: {
        ...this.state.computeMetrics,
        localTokensPerSec: isLocal ? 32 : 0,
        cloudTokensPerSec: !isLocal ? 58 : 0,
        latencyMs: isPrivate ? 380 : (complexity === 'high' ? 120 : 380)
      }
    };

    this.addNotification('Workload Routed', `Routed request to ${destination.toUpperCase()}.`, 'Just now');
    this.logToTerminal(`\n[Compute Route Engine] Request size: ${prompt.length} bytes // Privacy Level: ${privacyLevel.toUpperCase()} // Complexity: ${complexity.toUpperCase()} // Routed to -> ${destination.toUpperCase()}`);
    this.emit();
  };

  activateVoiceEngine = () => {
    playSound.unlock();
    this.state = {
      ...this.state,
      isVoiceActive: true,
      voiceState: 'WAKE_DETECTED',
      voiceTranscript: '',
      voiceResponseText: ''
    };
    this.logToTerminal('\n[Ambient Voice OS] Wake Trigger matched // Ambient dimming active');
    this.emit();

    setTimeout(() => {
      if (this.state.voiceState === 'WAKE_DETECTED') {
        this.state = {
          ...this.state,
          voiceState: 'LISTENING'
        };
        this.logToTerminal('[Ambient Voice OS] Capturing spoken speech stream...');
        this.emit();
      }
    }, 400);
  };

  deactivateVoiceEngine = () => {
    this.state = {
      ...this.state,
      voiceState: 'RETURN_TO_IDLE',
      micVolume: 0
    };
    this.logToTerminal('[Ambient Voice OS] Cleaning voice session state...');
    this.emit();

    setTimeout(() => {
      this.state = {
        ...this.state,
        isVoiceActive: false,
        voiceState: 'IDLE',
        voiceTranscript: '',
        voiceResponseText: ''
      };
      this.logToTerminal('[Ambient Voice OS] Passive listener thread restarted');
      this.emit();
    }, 400);
  };

  transitionBackToListening = () => {
    if (!this.state.isVoiceActive) return;
    this.state = {
      ...this.state,
      voiceState: 'LISTENING',
      voiceTranscript: '',
      voiceResponseText: ''
    };
    this.logToTerminal('[Ambient Voice OS] Resuming continuous listener...');
    this.emit();
  };

  setMicVolume = (micVolume: number) => {
    this.state = {
      ...this.state,
      micVolume
    };
    this.emit();
  };

  setVoiceState = (state: 'IDLE' | 'WAKE_DETECTED' | 'LISTENING' | 'PROCESSING' | 'EXECUTING' | 'RESPONDING' | 'RETURN_TO_IDLE') => {
    this.state = {
      ...this.state,
      voiceState: state
    };
    this.emit();
  };

  processVoiceCommand = (transcript: string) => {
    const clean = transcript.trim().toLowerCase();
    if (!clean) return;

    this.state = {
      ...this.state,
      voiceTranscript: transcript,
      voiceState: 'PROCESSING'
    };
    this.emit();
    this.logToTerminal(`\n[Ambient Voice OS] Parsing intent: "${transcript}"`);

    setTimeout(() => {
      this.state = {
        ...this.state,
        voiceState: 'EXECUTING'
      };
      this.emit();

      let response = '';
      let actionExecuted = false;

      // 1. Isolate Command Matcher
      if (clean.includes('isolate') || clean.includes('focus on')) {
        const appId = this.getTargetAppFromText(clean);
        if (appId) {
          const win = this.state.windows.find(w => w.id === appId);
          this.isolateWindow(appId);
          response = `Workspace isolated to ${win ? win.title : appId}.`;
          actionExecuted = true;
        }
      }
      // 2. Slate to Background Matcher
      else if (clean.includes('slate') && (clean.includes('background') || clean.includes('grid'))) {
        const appId = this.getTargetAppFromText(clean);
        if (appId) {
          const win = this.state.windows.find(w => w.id === appId);
          this.minimizeWindow(appId);
          response = `${win ? win.title : appId} slated to background.`;
          actionExecuted = true;
        }
      }
      // 3. Maximize/Expand Matcher
      else if (clean.includes('expand') || clean.includes('maximize')) {
        const appId = this.getTargetAppFromText(clean);
        if (appId) {
          const win = this.state.windows.find(w => w.id === appId);
          if (win) {
            if (!win.isOpen) {
              this.openWindow(appId);
            } else if (win.isMinimized) {
              this.focusWindow(appId);
            }
            if (!win.isMaximized) {
              this.maximizeWindow(appId);
            }
          }
          response = `${win ? win.title : appId} expanded.`;
          actionExecuted = true;
        }
      }
      // 4. Minimize/Hide Matcher
      else if (clean.includes('minimize') || clean.includes('hide')) {
        if (!clean.includes('minimize all')) {
          const appId = this.getTargetAppFromText(clean);
          if (appId) {
            const win = this.state.windows.find(w => w.id === appId);
            this.minimizeWindow(appId);
            response = `${win ? win.title : appId} minimized.`;
            actionExecuted = true;
          }
        }
      }

      // 5. Minimize All & Reset Matchers
      if (!actionExecuted && (clean.includes('minimize all') || clean.includes('clear screen') || clean.includes('slate everything'))) {
        this.minimizeAllWindows();
        response = 'All windows minimized.';
        actionExecuted = true;
      } else if (!actionExecuted && (clean.includes('reset layout') || clean.includes('reset positions') || clean.includes('reset windows'))) {
        this.resetWindowPositions();
        response = 'Workspace window positions reset.';
        actionExecuted = true;
      } else if (!actionExecuted && (clean.includes('theater mode') || clean.includes('dim lights') || clean.includes('theater dim'))) {
        const enable = !this.state.isTheaterMode;
        this.setTheaterMode(enable);
        response = enable ? 'Theater mode activated. Atmospheric dimming active.' : 'Theater mode deactivated.';
        actionExecuted = true;
      } else if (!actionExecuted && (clean.includes('tile windows') || clean.includes('tiling layout') || clean.includes('tiling grid'))) {
        this.toggleTilingLayout();
        response = this.state.isTilingLayoutActive ? 'Workspace window tiling layout activated.' : 'Tiling layout disabled.';
        actionExecuted = true;
      }

      // System Controls Matches
      if (!actionExecuted && clean.includes('terminal')) {
        this.openWindow('terminal');
        response = 'Terminal opened.';
        actionExecuted = true;
      } else if (clean.includes('settings')) {
        this.openWindow('settings');
        response = 'Settings opened.';
        actionExecuted = true;
      } else if (clean.includes('files') || clean.includes('explorer')) {
        this.openWindow('explorer');
        response = 'Files opened.';
        actionExecuted = true;
      } else if (clean.includes('browser')) {
        this.openWindow('browser');
        response = 'Browser launched.';
        actionExecuted = true;
      } else if (clean.includes('compute') || clean.includes('hub')) {
        this.openWindow('ai-compute-hub');
        response = 'Compute hub active.';
        actionExecuted = true;
      }

      // Workspace Restoration Matches
      if (clean.includes('backend') || clean.includes('unreal')) {
        this.setWorkspace('dev');
        this.openWindow('terminal');
        this.openWindow('editor');
        this.openWindow('telemetry');
        
        this.logToTerminal('\n[Compute Orchestrator] Spawning backend servers: "npm run dev"');
        this.logToTerminal('[Aether Dev Server] Listening on http://localhost:5173/');
        
        response = 'Workspace restored.';
        actionExecuted = true;
      } else if (clean.includes('gaming') || clean.includes('game') || clean.includes('media')) {
        this.setWorkspace('media');
        this.setTheme('orange');
        this.openWindow('game');
        this.openWindow('player');
        response = 'Gaming environment configured.';
        actionExecuted = true;
      }

      // Environmental / Core Performance Matches
      if (clean.includes('focus') || clean.includes('distractions')) {
        this.setTheme('cyan');
        this.setWallpaper('scanlines');
        
        this.state = {
          ...this.state,
          windows: this.state.windows.map(w => ['terminal', 'editor', 'notes'].includes(w.id) ? w : { ...w, isMinimized: true })
        };
        
        response = 'Focus mode enabled.';
        actionExecuted = true;
      } else if (clean.includes('optimize') || clean.includes('performance')) {
        // Clear VRAM
        this.state.localModels = this.state.localModels.map(m => m.status === 'LOADED' ? { ...m, status: 'STANDBY' as const, vram: 0 } : m);
        
        this.state.computeAgents = this.state.computeAgents.map(a => ({ ...a, priority: 'BACKGROUND' as const }));
        this.state.computeMetrics = {
          ...this.state.computeMetrics,
          vramUsage: 0,
          gpuLoad: 5,
          cpuLoad: 8
        };
        
        response = 'Performance optimized.';
        actionExecuted = true;
      } else if (clean.includes('cinematic')) {
        this.setTheme('purple');
        this.setWallpaper('stars');
        this.openWindow('player');
        response = 'Cinematic mode initialized.';
        actionExecuted = true;
      } else if (clean.includes('shutdown') || clean.includes('power off')) {
        // Immediate system shutdown and mic/voice session deactivation without reply speaking
        if (typeof window !== 'undefined' && window.speechSynthesis) {
          window.speechSynthesis.cancel();
        }
        this.state = {
          ...this.state,
          isVoiceActive: false,
          voiceState: 'IDLE',
          voiceTranscript: transcript,
          voiceResponseText: '',
          micVolume: 0
        };
        this.emit();
        this.logToTerminal('[Ambient Voice OS] Intent matched: SHUTDOWN. Immediate de-initialization.');
        setTimeout(() => {
          this.shutdownSystem();
        }, 200);
        return; // Return early to bypass the synthesis phase
      }

      // General fallback
      if (!actionExecuted) {
        this.sendAiMessage(transcript);
        
        // Go straight to PROCESSING state to show the neural thinking visually
        this.state = {
          ...this.state,
          voiceResponseText: '',
          voiceState: 'PROCESSING'
        };
        this.emit();
        return; // Return early to prevent double-speaking or double-transitioning!
      }

      // Response synthesis phase
      this.state = {
        ...this.state,
        voiceResponseText: response,
        voiceState: 'RESPONDING'
      };
      this.emit();

      this.logToTerminal(`[Ambient Voice OS] Confirming: "${response}"`);
      playSound.speakText(response, () => {
        // Transition back to LISTENING after speaking finishes (continuous loop)
        this.transitionBackToListening();
      });

      // Safety fallback to listener loop after 6 seconds in case TTS is blocked or has zero duration
      setTimeout(() => {
        if (this.state.voiceState === 'RESPONDING') {
          this.transitionBackToListening();
        }
      }, 6000);

    }, 600);
  };

  // ═══════════════════════════════════════════════════════════════════════
  // SWARM ORCHESTRATION ENGINE
  // ═══════════════════════════════════════════════════════════════════════

  spawnSwarmPipeline = async (goal: string, templateId?: string) => {
    const template = templateId 
      ? PIPELINE_TEMPLATES.find(t => t.id === templateId) 
      : this.inferPipelineTemplate(goal);
    
    if (!template) {
      this.logToTerminal(`\n[Swarm Orchestrator] ERROR: No suitable pipeline template found for goal: "${goal}"`);
      this.addNotification('Swarm Error', 'Could not match a pipeline template.', 'Just now');
      return;
    }

    const pipelineId = generateId('pipeline');
    playSound.success();

    this.logToTerminal('');
    this.logToTerminal('╔════════════════════════════════════════════════════════════╗');
    this.logToTerminal(`║  SWARM ORCHESTRATOR — Spawning Pipeline: ${template.name.substring(0, 18).padEnd(18, ' ')}║`);
    this.logToTerminal(`║  Goal: ${goal.substring(0, 52).padEnd(52, ' ')}║`);
    this.logToTerminal('╚════════════════════════════════════════════════════════════╝');
    this.logToTerminal('');

    // Create all agents
    const agentIds: string[] = [];
    const agents: SwarmAgent[] = [];

    for (let i = 0; i < template.agents.length; i++) {
      const agentDef = template.agents[i];
      const config = AGENT_ROLE_CONFIG[agentDef.role];
      const agentId = generateId('agent');
      agentIds.push(agentId);

      const agent: SwarmAgent = {
        id: agentId,
        name: `${agentDef.role} ${String.fromCharCode(65 + i)}`,
        role: agentDef.role,
        status: 'SPAWNING',
        pipelineId,
        taskQueue: [{
          id: generateId('task'),
          description: agentDef.taskDescription,
          priority: 'HIGH',
          status: 'QUEUED',
          assignedAgentId: agentId,
        }],
        currentTask: null,
        logs: [{
          timestamp: Date.now(),
          level: 'INFO',
          message: `Agent spawned with role ${agentDef.role} in pipeline ${pipelineId.substring(0, 12)}`
        }],
        progress: 0,
        parentId: agentDef.dependsOn !== undefined ? agentIds[agentDef.dependsOn] || null : null,
        childIds: [],
        resourceAllocation: {
          cpu: config.defaultCpu,
          ram: config.defaultRam,
          vram: 0,
          gpu: 0
        },
        autonomyLevel: 'FULL',
        totalTokensUsed: 0,
        spawnTime: Date.now(),
        avatar: config.avatar
      };

      agents.push(agent);
      this.logToTerminal(`[Swarm Orchestrator] ${config.avatar} Agent spawned: ${agent.name} (${agentDef.role}) // PID: ${agentId.substring(0, 12)}`);
    }

    // Wire parent-child relationships
    for (let i = 0; i < template.agents.length; i++) {
      const agentDef = template.agents[i];
      if (agentDef.dependsOn !== undefined && agentDef.dependsOn < agents.length) {
        agents[agentDef.dependsOn].childIds.push(agentIds[i]);
      }
    }

    const pipeline: SwarmPipeline = {
      id: pipelineId,
      goal,
      status: 'INITIALIZING',
      agents: agentIds,
      createdAt: Date.now(),
      totalProgress: 0,
      escalations: []
    };

    this.state = {
      ...this.state,
      swarmAgents: [...this.state.swarmAgents, ...agents],
      swarmPipelines: [...this.state.swarmPipelines, pipeline]
    };
    this.emit();

    this.addNotification('Swarm Pipeline Active', `Spawned ${agents.length} agents for: ${goal.substring(0, 50)}`, 'Just now');

    // Start running after a short delay
    setTimeout(() => {
      this.runSwarmPipeline(pipelineId, goal, template);
    }, 800);
  };

  private inferPipelineTemplate = (goal: string): typeof PIPELINE_TEMPLATES[0] | null => {
    const lower = goal.toLowerCase();
    if (lower.includes('research') || lower.includes('analyze') || lower.includes('investigate')) {
      return PIPELINE_TEMPLATES.find(t => t.id === 'research-team') || null;
    }
    if (lower.includes('code') || lower.includes('build') || lower.includes('develop') || lower.includes('review')) {
      return PIPELINE_TEMPLATES.find(t => t.id === 'code-review-swarm') || null;
    }
    if (lower.includes('audit') || lower.includes('security') || lower.includes('monitor') || lower.includes('health')) {
      return PIPELINE_TEMPLATES.find(t => t.id === 'system-audit') || null;
    }
    if (lower.includes('prototype') || lower.includes('rapid') || lower.includes('quick') || lower.includes('spike')) {
      return PIPELINE_TEMPLATES.find(t => t.id === 'rapid-prototype') || null;
    }
    // Default to research team
    return PIPELINE_TEMPLATES.find(t => t.id === 'research-team') || null;
  };

  private runSwarmPipeline = async (pipelineId: string, goal: string, template: typeof PIPELINE_TEMPLATES[0]) => {
    // Update pipeline status to RUNNING
    this.state = {
      ...this.state,
      swarmPipelines: this.state.swarmPipelines.map(p => 
        p.id === pipelineId ? { ...p, status: 'RUNNING' as const } : p
      )
    };
    this.emit();

    const agentIds = this.state.swarmPipelines.find(p => p.id === pipelineId)?.agents || [];
    let previousResult = '';

    for (let i = 0; i < template.agents.length; i++) {
      const agentDef = template.agents[i];
      const agentId = agentIds[i];
      if (!agentId) continue;

      // Check if pipeline was killed
      const currentPipeline = this.state.swarmPipelines.find(p => p.id === pipelineId);
      if (!currentPipeline || currentPipeline.status === 'KILLED' || currentPipeline.status === 'FAILED') break;

      // Wait for dependency if needed
      if (agentDef.dependsOn !== undefined) {
        const depAgentId = agentIds[agentDef.dependsOn];
        if (depAgentId) {
          // Wait until dependency is completed
          let waitCount = 0;
          while (waitCount < 60) {
            const depAgent = this.state.swarmAgents.find(a => a.id === depAgentId);
            if (depAgent && (depAgent.status === 'COMPLETED' || depAgent.status === 'FAILED' || depAgent.status === 'KILLED')) break;
            await new Promise(resolve => setTimeout(resolve, 500));
            waitCount++;
          }

          // Get the result from the dependency
          const depAgent = this.state.swarmAgents.find(a => a.id === depAgentId);
          if (depAgent?.currentTask?.result) {
            previousResult = depAgent.currentTask.result;
          }
        }
      }

      // Run this agent
      await this.executeSwarmAgent(agentId, pipelineId, agentDef.taskDescription, goal, previousResult, i, template.agents.length);
      
      // Get this agent's result for the next one
      const thisAgent = this.state.swarmAgents.find(a => a.id === agentId);
      if (thisAgent?.currentTask?.result) {
        previousResult = thisAgent.currentTask.result;
      }
    }

    // Complete pipeline
    this.state = {
      ...this.state,
      swarmPipelines: this.state.swarmPipelines.map(p => 
        p.id === pipelineId ? { ...p, status: 'COMPLETED' as const, completedAt: Date.now(), totalProgress: 100 } : p
      )
    };
    this.emit();

    playSound.success();
    this.logToTerminal(`\n[Swarm Orchestrator] ✅ Pipeline COMPLETED: "${goal.substring(0, 50)}"`);
    this.addNotification('Swarm Complete', `Pipeline finished: ${goal.substring(0, 40)}`, 'Just now');
  };

  private executeSwarmAgent = async (
    agentId: string,
    pipelineId: string,
    taskDescription: string,
    goal: string,
    previousContext: string,
    agentIndex: number,
    totalAgents: number
  ) => {
    const config = AGENT_ROLE_CONFIG[this.state.swarmAgents.find(a => a.id === agentId)?.role || 'RESEARCHER'];

    // Set agent to WORKING
    this.updateSwarmAgent(agentId, {
      status: 'WORKING' as AgentStatus,
      progress: 10,
      currentTask: {
        id: generateId('task'),
        description: taskDescription,
        priority: 'HIGH' as const,
        status: 'IN_PROGRESS' as const,
        assignedAgentId: agentId,
        startTime: Date.now()
      }
    });
    this.addSwarmLog(agentId, 'INFO', `Starting task: "${taskDescription.substring(0, 60)}..."`);
    this.logToTerminal(`[${config.avatar} Agent ${agentId.substring(0, 8)}] WORKING: ${taskDescription.substring(0, 60)}...`);

    // Broadcast to other agents
    this.broadcastSwarmMessage(agentId, 'BROADCAST', `Starting work on: ${taskDescription.substring(0, 40)}`, 'INFO');

    // Simulate progress phases
    await new Promise(resolve => setTimeout(resolve, 1200));
    this.updateSwarmAgent(agentId, { progress: 30 });
    this.addSwarmLog(agentId, 'DEBUG', 'Analyzing context and preparing inference call...');

    // Update system telemetry to reflect agent work
    this.state = {
      ...this.state,
      computeMetrics: {
        ...this.state.computeMetrics,
        cpuLoad: Math.min(95, this.state.computeMetrics.cpuLoad + config.defaultCpu),
        gpuLoad: Math.min(95, this.state.computeMetrics.gpuLoad + 5)
      }
    };
    this.emit();

    await new Promise(resolve => setTimeout(resolve, 800));
    this.updateSwarmAgent(agentId, { progress: 50 });
    this.addSwarmLog(agentId, 'INFO', 'Calling Gemini inference engine...');

    // ACTUAL AI CALL
    let result = '';
    try {
      result = await callAgentAI(
        this.state.swarmAgents.find(a => a.id === agentId)?.role || 'RESEARCHER',
        taskDescription,
        previousContext,
        goal
      );
      this.addSwarmLog(agentId, 'SUCCESS', `AI inference completed (${result.length} chars)`);
    } catch (err) {
      this.addSwarmLog(agentId, 'ERROR', `AI inference failed: ${err}`);
      result = `[Heuristic fallback] Task "${taskDescription}" processed with system defaults.`;
    }

    await new Promise(resolve => setTimeout(resolve, 600));
    this.updateSwarmAgent(agentId, { progress: 75 });
    this.addSwarmLog(agentId, 'INFO', 'Processing and formatting results...');

    // Generate VFS artifact for coder agents
    const role = this.state.swarmAgents.find(a => a.id === agentId)?.role;
    if (role === 'CODER') {
      const fileName = `swarm_output_${agentId.substring(0, 8)}.js`;
      this.writeVfsFile(`/home/aether/${fileName}`, `// Generated by Swarm Agent: ${agentId}\n// Pipeline Goal: ${goal}\n// Task: ${taskDescription}\n\n${result}`);
      this.addSwarmLog(agentId, 'SUCCESS', `Artifact written: /home/aether/${fileName}`);
      this.logToTerminal(`[${config.avatar} Agent] Artifact generated: ${fileName}`);
    }

    // Broadcast completion
    this.broadcastSwarmMessage(agentId, 'BROADCAST', `Completed: ${taskDescription.substring(0, 30)} — ${result.substring(0, 60)}...`, 'HANDOFF');

    await new Promise(resolve => setTimeout(resolve, 400));

    // Complete the agent
    this.updateSwarmAgent(agentId, {
      status: 'COMPLETED' as AgentStatus,
      progress: 100,
      completionTime: Date.now(),
      currentTask: {
        id: this.state.swarmAgents.find(a => a.id === agentId)?.currentTask?.id || generateId('task'),
        description: taskDescription,
        priority: 'HIGH' as const,
        status: 'COMPLETED' as const,
        assignedAgentId: agentId,
        startTime: this.state.swarmAgents.find(a => a.id === agentId)?.currentTask?.startTime,
        endTime: Date.now(),
        result
      }
    });
    this.addSwarmLog(agentId, 'SUCCESS', 'Task completed successfully.');

    // Release compute resources
    this.state = {
      ...this.state,
      computeMetrics: {
        ...this.state.computeMetrics,
        cpuLoad: Math.max(5, this.state.computeMetrics.cpuLoad - config.defaultCpu),
        gpuLoad: Math.max(0, this.state.computeMetrics.gpuLoad - 5)
      }
    };

    // Update pipeline progress
    const pipelineProgress = Math.round(((agentIndex + 1) / totalAgents) * 100);
    this.state = {
      ...this.state,
      swarmPipelines: this.state.swarmPipelines.map(p => 
        p.id === pipelineId ? { ...p, totalProgress: pipelineProgress } : p
      )
    };
    this.emit();

    this.logToTerminal(`[${config.avatar} Agent ${agentId.substring(0, 8)}] ✅ COMPLETED // Pipeline progress: ${pipelineProgress}%`);
  };

  private updateSwarmAgent = (agentId: string, updates: Partial<SwarmAgent>) => {
    this.state = {
      ...this.state,
      swarmAgents: this.state.swarmAgents.map(a => 
        a.id === agentId ? { ...a, ...updates } : a
      )
    };
    this.emit();
  };

  private addSwarmLog = (agentId: string, level: SwarmLogEntry['level'], message: string) => {
    const entry: SwarmLogEntry = { timestamp: Date.now(), level, message };
    this.state = {
      ...this.state,
      swarmAgents: this.state.swarmAgents.map(a => 
        a.id === agentId ? { ...a, logs: [...a.logs, entry] } : a
      )
    };
    this.emit();
  };

  broadcastSwarmMessage = (fromAgentId: string, toAgentId: string | 'BROADCAST' | 'HUMAN', content: string, type: SwarmMessage['type']) => {
    const msg: SwarmMessage = {
      id: generateId('msg'),
      fromAgentId,
      toAgentId,
      content,
      timestamp: Date.now(),
      type
    };
    this.state = {
      ...this.state,
      swarmMessageBus: [...this.state.swarmMessageBus.slice(-100), msg]  // Keep last 100 messages
    };
    this.emit();
  };

  pauseSwarmAgent = (agentId: string) => {
    playSound.click();
    this.updateSwarmAgent(agentId, { status: 'WAITING' as AgentStatus });
    this.addSwarmLog(agentId, 'WARN', 'Agent paused by operator.');
    this.logToTerminal(`[Swarm Orchestrator] Agent ${agentId.substring(0, 8)} PAUSED by operator.`);
  };

  resumeSwarmAgent = (agentId: string) => {
    playSound.click();
    this.updateSwarmAgent(agentId, { status: 'WORKING' as AgentStatus });
    this.addSwarmLog(agentId, 'INFO', 'Agent resumed by operator.');
    this.logToTerminal(`[Swarm Orchestrator] Agent ${agentId.substring(0, 8)} RESUMED by operator.`);
  };

  killSwarmPipeline = (pipelineId: string) => {
    playSound.warning();
    const pipeline = this.state.swarmPipelines.find(p => p.id === pipelineId);
    if (!pipeline) return;

    // Kill all agents in the pipeline
    this.state = {
      ...this.state,
      swarmAgents: this.state.swarmAgents.map(a => 
        a.pipelineId === pipelineId ? { ...a, status: 'KILLED' as AgentStatus, progress: 0 } : a
      ),
      swarmPipelines: this.state.swarmPipelines.map(p => 
        p.id === pipelineId ? { ...p, status: 'KILLED' as const } : p
      )
    };
    this.emit();

    this.logToTerminal(`\n[Swarm Orchestrator] ⛔ Pipeline KILLED: ${pipelineId.substring(0, 12)}`);
    this.addNotification('Pipeline Killed', `Terminated pipeline: ${pipeline.goal.substring(0, 40)}`, 'Just now');
  };

  clearCompletedSwarms = () => {
    playSound.click();
    this.state = {
      ...this.state,
      swarmAgents: this.state.swarmAgents.filter(a => a.status !== 'COMPLETED' && a.status !== 'KILLED' && a.status !== 'FAILED'),
      swarmPipelines: this.state.swarmPipelines.filter(p => p.status !== 'COMPLETED' && p.status !== 'KILLED' && p.status !== 'FAILED'),
      swarmMessageBus: []
    };
    this.emit();
    this.logToTerminal('[Swarm Orchestrator] Cleared completed/killed swarm data.');
  };

  resolveEscalation = (escalationId: string, resolution: string) => {
    playSound.success();
    this.state = {
      ...this.state,
      swarmEscalations: this.state.swarmEscalations.map(e => 
        e.id === escalationId ? { ...e, resolved: true, resolution } : e
      )
    };
    this.emit();
    this.logToTerminal(`[Swarm Orchestrator] Escalation resolved: ${resolution.substring(0, 50)}`);
  };

  // ═══════════════════════════════════════════════════════════════════════
  // CROSS-DEVICE MESH TELEMETRY
  // ═══════════════════════════════════════════════════════════════════════

  updateDeviceMeshTelemetry = () => {
    this.state = {
      ...this.state,
      crossDeviceNodes: this.state.crossDeviceNodes.map(device => {
        if (device.id === 'aether-main') {
          // Sync real telemetry from this machine
          return {
            ...device,
            telemetry: {
              ...device.telemetry,
              cpu: this.state.cpuUsage,
              ram: this.state.ramUsage,
              gpu: this.state.computeMetrics.gpuLoad,
              vram: this.state.computeMetrics.vramUsage,
              activeProcesses: this.state.processes.filter(p => p.status === 'running').length + this.state.swarmAgents.filter(a => a.status === 'WORKING').length
            },
            lastSeen: Date.now(),
            status: 'online' as const
          };
        }
        // Simulate fluctuations for remote devices
        const jitter = (val: number, range: number) => Math.max(0, Math.min(100, val + (Math.random() - 0.5) * range));
        return {
          ...device,
          telemetry: {
            ...device.telemetry,
            cpu: Math.round(jitter(device.telemetry.cpu, 8)),
            ram: Math.round(jitter(device.telemetry.ram, 4)),
            gpu: Math.round(jitter(device.telemetry.gpu, 10)),
            networkIn: Math.round(jitter(device.telemetry.networkIn, 20) * 10) / 10,
            networkOut: Math.round(jitter(device.telemetry.networkOut, 15) * 10) / 10,
            temperature: Math.round(jitter(device.telemetry.temperature, 3))
          },
          lastSeen: device.status === 'offline' ? device.lastSeen : Date.now()
        };
      }),
      deviceTelemetryStreams: this.state.deviceTelemetryStreams.map(stream => {
        const device = this.state.crossDeviceNodes.find(d => d.id === stream.deviceId);
        if (!device) return stream;
        return {
          ...stream,
          history: [...stream.history.slice(-(stream.maxHistory - 1)), device.telemetry]
        };
      })
    };
    this.emit();
  };

  projectWorkload = (taskDesc: string, targetDeviceId: string) => {
    playSound.success();
    const device = this.state.crossDeviceNodes.find(d => d.id === targetDeviceId);
    if (!device) return;

    this.logToTerminal(`\n[Device Mesh] ➤ Projecting workload to ${device.name}:`);
    this.logToTerminal(`[Device Mesh]   Task: "${taskDesc.substring(0, 50)}"`);
    this.logToTerminal(`[Device Mesh]   Target: ${device.name} (${device.ip})`);
    this.logToTerminal(`[Device Mesh]   Capabilities: ${device.capabilities.join(', ')}`);

    // Simulate remote device load increase
    this.state = {
      ...this.state,
      crossDeviceNodes: this.state.crossDeviceNodes.map(d => 
        d.id === targetDeviceId ? {
          ...d,
          status: 'busy' as const,
          telemetry: {
            ...d.telemetry,
            cpu: Math.min(95, d.telemetry.cpu + 15),
            gpu: Math.min(95, d.telemetry.gpu + 20)
          }
        } : d
      )
    };
    this.emit();

    this.addNotification('Workload Projected', `Task dispatched to ${device.name}`, 'Just now');

    // Simulate workload completion after delay
    setTimeout(() => {
      this.state = {
        ...this.state,
        crossDeviceNodes: this.state.crossDeviceNodes.map(d => 
          d.id === targetDeviceId ? {
            ...d,
            status: 'online' as const,
            telemetry: {
              ...d.telemetry,
              cpu: Math.max(5, d.telemetry.cpu - 15),
              gpu: Math.max(0, d.telemetry.gpu - 20)
            }
          } : d
        )
      };
      this.emit();
      this.logToTerminal(`[Device Mesh] ✅ Workload completed on ${device.name}`);
    }, 8000);
  };

  addSemanticNode = (
    id: string,
    name: string,
    type: 'project' | 'file' | 'app' | 'workflow' | 'note' | 'session' | 'collaborator',
    description: string,
    tags: string[],
    metadata: Record<string, any>
  ) => {
    const metaStr = typeof metadata === 'string' ? metadata : JSON.stringify(metadata);
    const newNode: SemanticNode = { id, name, type, description, tags, metadata: metaStr };
    
    const updated = this.state.semanticNodes.filter(n => n.id != id);
    updated.push(newNode);
    this.state.semanticNodes = updated;
    this.emit();

    if (typeof window !== 'undefined' && (window as any).__TAURI__) {
      (window as any).__TAURI__.invoke('aether_semantic_add_node', {
        id,
        name,
        nodeType: type,
        description,
        tags,
        metadata: metaStr,
      }).catch((e: any) => console.error(e));
    }
  };

  addSemanticEdge = (source: string, target: string, relationship: string, weight: number) => {
    const newEdge: SemanticEdge = { source, target, relationship, weight };
    
    const updated = this.state.semanticLinks.filter(e => !(e.source == source && e.target == target));
    updated.push(newEdge);
    this.state.semanticLinks = updated;
    this.emit();

    if (typeof window !== 'undefined' && (window as any).__TAURI__) {
      (window as any).__TAURI__.invoke('aether_semantic_add_edge', {
        source,
        target,
        relationship,
        weight,
      }).catch((e: any) => console.error(e));
    }
  };

  clearSemanticGraph = () => {
    this.state.semanticNodes = [];
    this.state.semanticLinks = [];
    this.emit();

    if (typeof window !== 'undefined' && (window as any).__TAURI__) {
      (window as any).__TAURI__.invoke('aether_semantic_clear_graph').catch((e: any) => console.error(e));
    }
  };

  querySemanticGraph = async (tag: string) => {
    if (typeof window !== 'undefined' && (window as any).__TAURI__) {
      try {
        const resStr = await (window as any).__TAURI__.invoke('aether_semantic_query', { tag });
        return JSON.parse(resStr);
      } catch (e) {
        console.error("Tauri semantic query failed, falling back to client filter", e);
      }
    }
    const query = tag.toLowerCase();
    return this.state.semanticNodes.filter(n => 
      n.tags.some(t => t.toLowerCase().includes(query)) 
      || n.name.toLowerCase().includes(query)
      || n.description.toLowerCase().includes(query)
    );
  };

  reconstructEnvironment = (metadataStr: string) => {
    try {
      const meta = JSON.parse(metadataStr);
      playSound.workspaceSweep();
      
      if (meta.layout) {
        this.setWorkspace(meta.layout);
      }
      
      if (meta.windows && Array.isArray(meta.windows)) {
        this.logToTerminal(`\n[Aether Memory Graph] Reconstructing workspace context...`);
        this.addNotification('Environment Reconstructed', `Successfully loaded session context.`, 'Just now');
        
        meta.windows.forEach((winId: string) => {
          setTimeout(() => {
            this.openWindow(winId);
          }, 150);
        });
      }

      if (meta.terminal_cmd) {
        setTimeout(() => {
          this.runCommandInternal(meta.terminal_cmd);
          this.logToTerminal(`\n[Aether Shell] Mapped deployment script executed: "${meta.terminal_cmd}"`);
        }, 600);
      }
      
      this.emit();
    } catch (e) {
      console.error('Failed to reconstruct environment context', e);
    }
  };

  private initDefaultSemanticGraph() {
    this.state.semanticNodes = [
      {
        id: "project-kernel",
        name: "Aether OS Core",
        type: "project",
        description: "Core native Rust operating environment system microkernel",
        tags: ["rust", "systems", "kernel"],
        metadata: JSON.stringify({ layout: "dev", windows: ["terminal", "explorer", "notes"], terminal_cmd: "help" }),
      },
      {
        id: "file-services",
        name: "services.rs",
        type: "file",
        description: "Native thread daemons and event bus persistence systems",
        tags: ["rust", "systems", "core"],
        metadata: JSON.stringify({ path: "core/tauri-runtime/src/services.rs" }),
      },
      {
        id: "app-terminal",
        name: "Quantum Terminal",
        type: "app",
        description: "Synthesized command shell client terminal wrapper",
        tags: ["utility", "shell", "tools"],
        metadata: JSON.stringify({ command: "help" }),
      },
      {
        id: "workflow-init",
        name: "Systems Bootup",
        type: "workflow",
        description: "Automated core monitors, telemetry, and shell stages sequence",
        tags: ["workflow", "init", "automation"],
        metadata: JSON.stringify({ sequence: ["open terminal", "open telemetry"] }),
      },
      {
        id: "session-dev-profile",
        name: "Developer Workspace",
        type: "session",
        description: "Spatial center bounds monitor layout mapping terminal, explorer, and notes",
        tags: ["session", "profile", "layout"],
        metadata: JSON.stringify({ layout: "dev", windows: ["terminal", "explorer", "notes"], terminal_cmd: "neofetch" }),
      },
      {
        id: "collaborator-agent",
        name: "Agent Optimization",
        type: "collaborator",
        description: "Autonomous supervisor watch thread purifying caches and prioritizing Hyper performance",
        tags: ["agent", "ai", "performance"],
        metadata: JSON.stringify({ agent_type: "optimization" }),
      }
    ];

    this.state.semanticLinks = [
      { source: "file-services", target: "project-kernel", relationship: "part_of", weight: 0.95 },
      { source: "workflow-init", target: "project-kernel", relationship: "deploys", weight: 0.85 },
      { source: "app-terminal", target: "workflow-init", relationship: "executed_in", weight: 0.9 },
      { source: "session-dev-profile", target: "project-kernel", relationship: "manages", weight: 0.8 },
      { source: "collaborator-agent", target: "project-kernel", relationship: "monitors", weight: 0.75 }
    ];
    this.emit();
  }

  setWorkspace = (workspace: 'dev' | 'media' | 'sys') => {
    const updatedWindows = this.state.windows.map(w => {
      const getCategory = (winId: string) => {
        return ['ai-chat', 'terminal', 'explorer', 'notes', 'calculator', 'editor', 'git-integrator', 'llama-tuner', 'telemetry', 'temporal-ledger'].includes(winId) ? 'dev' 
          : ['player', 'visualizer', 'browser', 'docker-manager', 'device-mesh'].includes(winId) ? 'media'
          : 'sys';
      };
      
      const cat = getCategory(w.id);
      if (cat === workspace) {
        // Core workspace apps to auto-open
        const shouldOpen = 
          workspace === 'dev' ? ['editor', 'terminal', 'telemetry', 'ai-chat'].includes(w.id)
          : workspace === 'media' ? ['player', 'game', 'visualizer'].includes(w.id)
          : ['ai-compute-hub', 'swarm-command', 'device-mesh', 'temporal-ledger'].includes(w.id);
        
        if (shouldOpen) {
          return { ...w, isOpen: true, isMinimized: false };
        }
      } else {
        // Automatically minimize or hide apps of other workspaces!
        return { ...w, isMinimized: true };
      }
      return w;
    });

    this.state = { 
      ...this.state, 
      activeWorkspace: workspace,
      windows: updatedWindows 
    };
    
    this.logDiagnostic(`Workspace changed to: ${workspace.toUpperCase()}`);
    this.addNotification('Workspace Changed', `Swapped to ${workspace.toUpperCase()} workspace. Core apps active.`, 'Just now');
    this.emit();
  };

  // SETTINGS & SYSTEM CONTROLS
  setTheme = (theme: 'cyan' | 'purple' | 'green' | 'orange') => {
    this.state = { ...this.state, theme };
    this.logDiagnostic(`Theme changed to: ${theme.toUpperCase()}`);
    this.addNotification('System Theme Changed', `Active accent color set to ${theme}.`, 'Just now');
    this.emit();
  };

  setWallpaper = (wallpaper: 'particles' | 'matrix' | 'stars' | 'scanlines') => {
    this.state = { ...this.state, wallpaper };
    this.logDiagnostic(`Wallpaper changed to: ${wallpaper.toUpperCase()}`);
    this.addNotification('Wallpaper Updated', `Desktop background updated.`, 'Just now');
    this.emit();
  };

  toggleSound = () => {
    const nextVal = !this.state.soundEnabled;
    this.state = { ...this.state, soundEnabled: nextVal };
    setSoundEnabled(nextVal);
    this.emit();
  };

  triggerGlitch = () => {
    this.state = { ...this.state, isGlitched: true };
    this.emit();
    setTimeout(() => {
      this.state = { ...this.state, isGlitched: false };
      this.emit();
    }, 280);
  };

  toggleQuickSettings = (val?: boolean) => {
    this.state = { ...this.state, showQuickSettings: val !== undefined ? val : !this.state.showQuickSettings };
    this.emit();
  };

  toggleSpotlight = (val?: boolean) => {
    this.state = {
      ...this.state,
      showSpotlight: val !== undefined ? val : !this.state.showSpotlight,
      spotlightQuery: ''
    };
    this.emit();
  };

  setSpotlightQuery = (query: string) => {
    this.state = { ...this.state, spotlightQuery: query };
    this.emit();
  };

  // NOTIFICATION UTILS
  addNotification = (title: string, desc: string, time: string = 'Just now') => {
    const newNotify = { id: `notify-${Math.random()}`, title, desc, time };
    this.state = {
      ...this.state,
      notifications: [newNotify, ...this.state.notifications.slice(0, 4)]
    };
    this.emit();

    const lowTitle = title.toLowerCase();
    const lowDesc = desc.toLowerCase();
    if (
      lowTitle.includes('breach') || 
      lowTitle.includes('alarm') || 
      lowTitle.includes('warning') || 
      lowTitle.includes('alert') || 
      lowDesc.includes('breach') ||
      lowDesc.includes('alarm') ||
      lowDesc.includes('warning') ||
      lowDesc.includes('alert') ||
      lowDesc.includes('unauthorized') ||
      lowDesc.includes('dissolved') ||
      lowDesc.includes('purged')
    ) {
      this.triggerGlitch();
    }
  };

  // HELPER: Convert string to highly polished cyberpunk hex dump
  private stringToHexDump(str: string): string {
    const clean = str.replace(/\r/g, '');
    let result = '';
    for (let i = 0; i < clean.length; i += 16) {
      const chunk = clean.slice(i, i + 16);
      const hex = Array.from(chunk).map(c => c.charCodeAt(0).toString(16).padStart(2, '0').toUpperCase()).join(' ');
      const ascii = Array.from(chunk).map(c => {
        const code = c.charCodeAt(0);
        return (code >= 32 && code <= 126) ? c : '.';
      }).join('');
      const offset = i.toString(16).padStart(4, '0').toUpperCase();
      result += `${offset}  ${hex.padEnd(47, ' ')}  |${ascii}|\n`;
    }
    return result.trim();
  }

  // TERMINAL SHELL SIMULATOR RUNNER
  logToTerminal = (text: string) => {
    this.state = {
      ...this.state,
      terminalHistory: [...this.state.terminalHistory, text]
    };
    this.emit();
  };

  runCommandInternal = (cmdStr: string, pipeInput?: string): string => {
    const trimmed = cmdStr.trim();
    if (!trimmed) return '';

    const parts = trimmed.split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);

    let output = '';

    switch (cmd) {
      case 'help':
        output = 'AetherOS Shell v1.0.0 - Available Commands:\n' +
                 '  help                      Display this help information\n' +
                 '  neofetch                  Display system information\n' +
                 '  ls                        List directory contents\n' +
                 '  cd [path]                 Change directory\n' +
                 '  cat [file]                Display file contents\n' +
                 '  mkdir [name]              Create directory\n' +
                 '  touch [name] [content]    Create file with optional content\n' +
                 '  rm [name]                 Delete file or directory\n' +
                 '  theme [cyan|purple|green|orange] Change accent color theme\n' +
                 '  clear                     Clear the terminal screen\n' +
                 '  kill [pid]                Terminate active process\n' +
                 '  grep [query]              Search for pattern in files\n' +
                 '  find [query]              Intelligent recursive search of VFS files/folders\n' +
                 '  wc                        Word and line count utility\n' +
                 '  hex                       Render hexadecimal view of file\n' +
                 '  sh [script]               Run shell script';
        break;

      case 'neofetch':
        output = `   ___   ___  _____  _   _  \n` +
                 `  / _ \\ / __\\|_   _|| |_| | \n` +
                 ` / /_\\ \\|  __   | |  |  _  | AetherOS Workspace v1.0.0\n` +
                 `/_/   \\_\\___/   |_|  |_| |_| Host: Aether Dev Sandbox\n` +
                 `--------------------------  Kernel: x86_64-1.0.0-aether\n` +
                 `  Shell: ash (aether shell)\n` +
                 `  Theme: ${this.state.theme.charAt(0).toUpperCase() + this.state.theme.slice(1)}\n` +
                 `  Wallpaper: ${this.state.wallpaper === 'particles' ? 'Mesh Gradient' : this.state.wallpaper === 'matrix' ? 'Dot Grid' : this.state.wallpaper === 'stars' ? 'Stars' : 'Horizon'}\n` +
                 `  Memory: ${this.state.ramUsage}% (${Math.round(this.state.ramUsage * 163.8)}MB / 16384MB)\n` +
                 `  Processor: Aether Custom ARM64 (16 Cores)\n` +
                 `  Display: 3840x2160 (Retina Display)`;
        break;

      case 'ls':
        const dir = this.resolvePath(this.state.currentDirPath);
        if (dir && dir.type === 'dir') {
          const keys = Object.keys(dir.children);
          output = keys.map(k => {
            const child = dir.children[k];
            return child.type === 'dir' ? `[DIR]  ${k}/` : `[FILE] ${k}`;
          }).join('\n');
          if (keys.length === 0) output = '(empty directory)';
        } else {
          output = 'Error: Directory path could not be resolved.';
        }
        break;

      case 'cd':
        if (!args[0]) {
          output = 'Usage: cd [directory_path]';
        } else {
          const target = args[0];
          let newPath = '';
          if (target.startsWith('/')) {
            newPath = target;
          } else {
            newPath = this.state.currentDirPath === '/' 
              ? `/${target}` 
              : `${this.state.currentDirPath}/${target}`;
          }
          newPath = newPath.replace(/\/+/g, '/').replace(/\/$/, '');
          if (!newPath) newPath = '/';

          const resolved = this.resolvePath(newPath);
          if (resolved && resolved.type === 'dir') {
            this.state.currentDirPath = newPath;
            output = '';
          } else {
            output = `Error: Path "${target}" does not exist or is not a directory.`;
          }
        }
        break;

      case 'cat':
        if (!args[0] && !pipeInput) {
          output = 'Usage: cat [filename]';
        } else if (args[0]) {
          const filePath = this.state.currentDirPath === '/' 
            ? `/${args[0]}` 
            : `${this.state.currentDirPath}/${args[0]}`;
          const fileNode = this.resolvePath(filePath);
          if (fileNode && fileNode.type === 'file') {
            output = fileNode.content;
          } else {
            output = `Error: File "${args[0]}" not found.`;
          }
        } else {
          output = pipeInput || '';
        }
        break;

      case 'mkdir':
        if (!args[0]) {
          output = 'Usage: mkdir [directory_name]';
        } else {
          const success = this.createVfsNode(args[0], 'dir');
          output = success 
            ? `Directory created: ${args[0]}`
            : `Error: Cannot create directory "${args[0]}". Path already exists.`;
        }
        break;

      case 'touch':
        if (!args[0]) {
          output = 'Usage: touch [filename] "[content]"';
        } else {
          const name = args[0];
          const content = args[1] || '';
          const success = this.createVfsNode(name, 'file', content);
          output = success 
            ? `File created: ${name}`
            : `Error: Cannot create file "${name}". File already exists.`;
        }
        break;

      case 'rm':
        if (!args[0]) {
          output = 'Usage: rm [node_name]';
        } else {
          const success = this.deleteVfsNode(args[0]);
          output = success 
            ? `Removed: ${args[0]}`
            : `Error: File or directory "${args[0]}" not found.`;
        }
        break;

      case 'theme':
        const targetTheme = args[0] as any;
        if (['cyan', 'purple', 'green', 'orange'].includes(targetTheme)) {
          this.setTheme(targetTheme);
          output = `System theme changed to ${targetTheme}.`;
        } else {
          output = 'Usage: theme [cyan|purple|green|orange]';
        }
        break;

      case 'matrix':
        output = 'Initializing system memory visualizer...';
        break;

      case 'hack':
        output = 'Error: Diagnostics and scanning utilities are locked in production.';
        break;

      case 'kill':
        const targetPid = parseInt(args[0], 10);
        if (isNaN(targetPid)) {
          output = 'Usage: kill [PID]';
        } else {
          const appMap: { [key: number]: string } = {
            102: 'ai-chat',
            104: 'player'
          };
          const appId = appMap[targetPid];
          if (appId) {
            this.closeWindow(appId);
            output = `Process ${targetPid} terminated successfully.`;
          } else {
            const foundWin = this.state.windows.find(w => w.id === args[0]);
            if (foundWin) {
              this.closeWindow(foundWin.id);
              output = `Process ${foundWin.id} terminated successfully.`;
            } else {
              output = `Process ${targetPid} is protected. Operation denied.`;
            }
          }
        }
        break;

      case 'grep':
        const searchVal = args[0] || '';
        let sourceContent = pipeInput;
        if (!sourceContent && args[1]) {
          const filePath = this.state.currentDirPath === '/' 
            ? `/${args[1]}` 
            : `${this.state.currentDirPath}/${args[1]}`;
          const fileNode = this.resolvePath(filePath);
          if (fileNode && fileNode.type === 'file') {
            sourceContent = fileNode.content;
          }
        }
        if (!sourceContent) {
          output = 'Usage: [command] | grep [query]  OR  grep [query] [filename]';
        } else {
          const lines = sourceContent.split('\n');
          const matchedLines = lines.filter(line => line.toLowerCase().includes(searchVal.toLowerCase()));
          output = matchedLines.length > 0 ? matchedLines.join('\n') : '(no matching entries)';
        }
        break;

      case 'find':
      case 'search':
        if (!args[0]) {
          output = 'Usage: find [query]  OR  search [query]';
        } else {
          const queryStr = args.join(' ');
          const searchRes = this.searchFiles(queryStr);
          if (searchRes.length === 0) {
            output = `No files or directories matching "${queryStr}" found.`;
          } else {
            output = `Search results for "${queryStr}" (indexed relevance score):\n` +
                     searchRes.map(res => {
                       const node = res.node;
                       const typeStr = node.type === 'dir' ? '[DIR] ' : '[FILE]';
                       const tagsStr = node.type === 'file' && (node as VFSFile).tags 
                         ? ` (tags: ${(node as VFSFile).tags?.join(', ')})` 
                         : '';
                       const catStr = node.type === 'file' && (node as VFSFile).category 
                         ? ` [cat: ${(node as VFSFile).category}]` 
                         : '';
                       return `  ${res.score.toString().padStart(3, ' ')}pts | ${typeStr}  ${res.path}${tagsStr}${catStr}`;
                     }).join('\n');
          }
        }
        break;

      case 'wc':
        let wcInput = pipeInput;
        if (!wcInput && args[0]) {
          const filePath = this.state.currentDirPath === '/' 
            ? `/${args[0]}` 
            : `${this.state.currentDirPath}/${args[0]}`;
          const fileNode = this.resolvePath(filePath);
          if (fileNode && fileNode.type === 'file') {
            wcInput = fileNode.content;
          }
        }
        if (wcInput === undefined || wcInput === null) {
          output = 'Usage: [command] | wc  OR  wc [filename]';
        } else {
          const linesCount = wcInput.trim() === '' ? 0 : wcInput.split('\n').length;
          const wordsCount = wcInput.split(/\s+/).filter(Boolean).length;
          const charsCount = wcInput.length;
          output = `Lines: ${linesCount}  |  Words: ${wordsCount}  |  Chars: ${charsCount}`;
        }
        break;

      case 'hex':
        let hexInput = pipeInput;
        if (!hexInput && args[0]) {
          const filePath = this.state.currentDirPath === '/' 
            ? `/${args[0]}` 
            : `${this.state.currentDirPath}/${args[0]}`;
          const fileNode = this.resolvePath(filePath);
          if (fileNode && fileNode.type === 'file') {
            hexInput = fileNode.content;
          }
        }
        if (!hexInput) {
          output = 'Usage: [command] | hex  OR  hex [filename]';
        } else {
          output = this.stringToHexDump(hexInput);
        }
        break;

      case 'sh':
        if (!args[0]) {
          output = 'Usage: sh [script_path.qsh]';
        } else {
          const filePath = this.state.currentDirPath === '/' 
            ? `/${args[0]}` 
            : `${this.state.currentDirPath}/${args[0]}`;
          const fileNode = this.resolvePath(filePath);
          if (fileNode && fileNode.type === 'file') {
            output = 'EXECUTE_SCRIPT_NODES:' + fileNode.content;
          } else {
            output = `VFS Error: Script node "${args[0]}" not found.`;
          }
        }
        break;

      case 'clear':
        output = 'CLEAR_LOG_BUFFER';
        break;

      default:
        output = `Quantum Shell: unrecognized command sequence "${cmd}". Type "help" for valid registers.`;
    }

    return output;
  };

  executeTerminalCommand = (cmdStr: string) => {
    const trimmed = cmdStr.trim();
    this.logToTerminal(`aether@system:${this.state.currentDirPath}$ ${trimmed}`);
    if (!trimmed) {
      this.emit();
      return;
    }

    // Handle pipeline chaining
    if (trimmed.includes('|')) {
      const pipelineStages = trimmed.split('|');
      let pipeData = '';
      let errorOccurred = false;

      for (let i = 0; i < pipelineStages.length; i++) {
        const stageCmd = pipelineStages[i].trim();
        const stageOutput = this.runCommandInternal(stageCmd, pipeData);
        
        if (stageOutput === 'CLEAR_LOG_BUFFER') {
          this.state = { ...this.state, terminalHistory: [] };
          this.emit();
          return;
        }

        if (stageOutput.includes('VFS Error') || stageOutput.includes('Error:') || stageOutput.includes('unrecognized')) {
          this.logToTerminal(stageOutput);
          errorOccurred = true;
          break;
        }
        pipeData = stageOutput;
      }

      if (!errorOccurred && pipeData) {
        this.logToTerminal(pipeData);
      }
      this.emit();
      return;
    }

    // Standard single command
    const output = this.runCommandInternal(trimmed);
    if (output === 'CLEAR_LOG_BUFFER') {
      this.state = { ...this.state, terminalHistory: [] };
      this.emit();
    } else if (output.startsWith('EXECUTE_SCRIPT_NODES:')) {
      const scriptContent = output.substring('EXECUTE_SCRIPT_NODES:'.length);
      const lines = scriptContent.split('\n')
        .map(l => l.trim())
        .filter(l => l && !l.startsWith('#') && !l.startsWith('//'));
      
      this.logToTerminal(`System: Initializing automated execution of ${lines.length} instructions...`);
      this.emit();

      // Async step sequential execution loop
      const runSeq = async () => {
        for (let i = 0; i < lines.length; i++) {
          await new Promise(resolve => setTimeout(resolve, 450));
          this.executeTerminalCommand(lines[i]);
        }
      };
      runSeq();
    } else if (output) {
      this.logToTerminal(output);
      this.emit();
    } else {
      this.emit();
    }
  };

  // WORKSPACE HISTORY SYSTEM
  touchFile = (filePath: string) => {
    const cleanPath = filePath.replace(/\/+/g, '/');
    let recent = [...this.state.recentFiles];
    recent = recent.filter(p => p !== cleanPath);
    recent.unshift(cleanPath);
    recent = recent.slice(0, 5);

    this.state = {
      ...this.state,
      recentFiles: recent
    };
    try {
      localStorage.setItem('aether_recent_files', JSON.stringify(recent));
    } catch (e) {
      console.error('Failed to save recent files', e);
    }
    this.emit();
  };

  // INTELLIGENT RECURSIVE FILE SEARCH & INDEXER
  searchFiles = (query: string): Array<{ path: string; node: VFSNode; score: number; type: 'file' | 'dir' }> => {
    const results: Array<{ path: string; node: VFSNode; score: number; type: 'file' | 'dir' }> = [];
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const traverse = (node: VFSNode, currentPath: string) => {
      let score = 0;
      const nameLower = node.name.toLowerCase();
      
      // Exact filename match (highest)
      if (nameLower === q) {
        score += 100;
      } else if (nameLower.includes(q)) {
        score += 50;
      }

      // Exact path match or contains query
      const pathLower = currentPath.toLowerCase();
      if (pathLower === q) {
        score += 80;
      } else if (pathLower.includes(q)) {
        score += 30;
      }

      if (node.type === 'file') {
        const file = node as VFSFile;
        
        // Tags matching
        if (file.tags) {
          file.tags.forEach(tag => {
            const tagLower = tag.toLowerCase();
            if (tagLower === q) {
              score += 40;
            } else if (tagLower.includes(q)) {
              score += 15;
            }
          });
        }

        // Category matching
        if (file.category) {
          const catLower = file.category.toLowerCase();
          if (catLower === q) {
            score += 30;
          } else if (catLower.includes(q)) {
            score += 10;
          }
        }

        // Content matching
        if (file.content) {
          const contentLower = file.content.toLowerCase();
          if (contentLower.includes(q)) {
            score += 15;
          }
        }
      }

      if (score > 0) {
        results.push({
          path: currentPath,
          node,
          score,
          type: node.type
        });
      }

      if (node.type === 'dir') {
        const dir = node as VFSDirectory;
        Object.keys(dir.children).forEach(key => {
          const childPath = currentPath === '/' ? `/${key}` : `${currentPath}/${key}`;
          traverse(dir.children[key], childPath);
        });
      }
    };

    traverse(this.state.vfs, '/');

    // Sort by score descending, then by name ascending
    return results.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.node.name.localeCompare(b.node.name);
    });
  };

  // VFS PATH RESOLUTION HELPERS
  private resolvePath(pathStr: string): VFSNode | null {
    if (pathStr === '/') return this.state.vfs;
    const parts = pathStr.split('/').filter(Boolean);
    let current: VFSNode = this.state.vfs;
    for (const part of parts) {
      if (current.type !== 'dir') return null;
      const next: VFSNode = (current as VFSDirectory).children[part];
      if (!next) return null;
      current = next;
    }
    return current;
  }

  createVfsNode(name: string, type: 'file' | 'dir', content: string = ''): boolean {
    const parentDir = this.resolvePath(this.state.currentDirPath);
    if (!parentDir || parentDir.type !== 'dir') return false;
    if (parentDir.children[name]) return false; // Already exists

    const newVfs = JSON.parse(JSON.stringify(this.state.vfs)) as VFSDirectory;
    
    // Traverse new tree to current directory
    const parts = this.state.currentDirPath.split('/').filter(Boolean);
    let curr = newVfs;
    for (const part of parts) {
      curr = curr.children[part] as VFSDirectory;
    }

    if (type === 'file') {
      curr.children[name] = {
        name,
        type: 'file',
        content,
        tags: ['user'],
        category: 'user'
      };
    } else {
      curr.children[name] = {
        name,
        type: 'dir',
        children: {}
      };
    }

    this.state = { ...this.state, vfs: newVfs };
    saveVfs(newVfs);
    this.logDiagnostic(`VFS node created: ${this.state.currentDirPath}/${name}`);
    this.emit();
    if (type === 'file') {
      const filePath = this.state.currentDirPath === '/' ? `/${name}` : `${this.state.currentDirPath}/${name}`;
      this.touchFile(filePath);
    }
    return true;
  }

  writeVfsFile(pathStr: string, content: string): boolean {
    const parts = pathStr.split('/').filter(Boolean);
    if (parts.length === 0) return false;
    const fileName = parts[parts.length - 1];
    const parentPath = '/' + parts.slice(0, parts.length - 1).join('/');

    const newVfs = JSON.parse(JSON.stringify(this.state.vfs)) as VFSDirectory;
    
    // Traverse new tree
    let curr = newVfs;
    const parentParts = parentPath.split('/').filter(Boolean);
    for (const part of parentParts) {
      if (curr.children[part] && curr.children[part].type === 'dir') {
        curr = curr.children[part] as VFSDirectory;
      } else {
        return false;
      }
    }

    // Check file
    const file = curr.children[fileName];
    if (file && file.type === 'file') {
      curr.children[fileName] = {
        ...file,
        content
      };
      this.state = { ...this.state, vfs: newVfs };
      saveVfs(newVfs);
      this.logDiagnostic(`VFS File modified: ${pathStr}`);
      this.emit();
      this.touchFile(pathStr);
      return true;
    }

    // If it doesn't exist, create it
    curr.children[fileName] = {
      name: fileName,
      type: 'file',
      content,
      tags: ['user-edit']
    };
    this.state = { ...this.state, vfs: newVfs };
    saveVfs(newVfs);
    this.logDiagnostic(`VFS File created: ${pathStr}`);
    this.emit();
    this.touchFile(pathStr);
    return true;
  }

  updateFileTags(pathStr: string, tags: string[]): boolean {
    const parts = pathStr.split('/').filter(Boolean);
    if (parts.length === 0) return false;
    const fileName = parts[parts.length - 1];
    const parentPath = '/' + parts.slice(0, parts.length - 1).join('/');

    const newVfs = JSON.parse(JSON.stringify(this.state.vfs)) as VFSDirectory;
    
    // Traverse new tree
    let curr = newVfs;
    const parentParts = parentPath.split('/').filter(Boolean);
    for (const part of parentParts) {
      if (curr.children[part] && curr.children[part].type === 'dir') {
        curr = curr.children[part] as VFSDirectory;
      } else {
        return false;
      }
    }

    const file = curr.children[fileName];
    if (file && file.type === 'file') {
      curr.children[fileName] = {
        ...file,
        tags
      };
      this.state = { ...this.state, vfs: newVfs };
      saveVfs(newVfs);
      this.logDiagnostic(`VFS File tags updated: ${pathStr} -> ${tags.join(', ')}`);
      this.emit();
      return true;
    }
    return false;
  }

  deleteVfsNode(name: string): boolean {
    const parentDir = this.resolvePath(this.state.currentDirPath);
    if (!parentDir || parentDir.type !== 'dir') return false;
    if (!parentDir.children[name]) return false; // Doesn't exist

    // Prevent deleting critical home or sys directories
    if (this.state.currentDirPath === '/' && (name === 'home' || name === 'sys')) return false;

    const newVfs = JSON.parse(JSON.stringify(this.state.vfs)) as VFSDirectory;
    const parts = this.state.currentDirPath.split('/').filter(Boolean);
    let curr = newVfs;
    for (const part of parts) {
      curr = curr.children[part] as VFSDirectory;
    }

    delete curr.children[name];
    this.state = { ...this.state, vfs: newVfs };
    saveVfs(newVfs);
    this.logDiagnostic(`VFS node deleted: ${this.state.currentDirPath}/${name}`);
    this.emit();
    return true;
  }

  // DIAGNOSTIC LOGS
  logDiagnostic(msg: string) {
    console.log(`[AETHER SYSTEM] ${msg}`);
  }

  // AI-to-Shell automated typing: runs commands in sequence with realistic delays
  aiAutoShell = async (commands: string[]) => {
    this.logToTerminal('');
    this.logToTerminal('╔══════════════════════════════════════════════════════╗');
    this.logToTerminal('║  AetherOS Assistant — Automated Command Sequence     ║');
    this.logToTerminal('╚══════════════════════════════════════════════════════╝');
    this.logToTerminal('');

    for (let i = 0; i < commands.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 800));
      // Simulate the AI "typing" the command
      this.logToTerminal(`[Assistant] Running command ${i + 1}/${commands.length}: ${commands[i]}`);
      await new Promise(resolve => setTimeout(resolve, 400));
      this.executeTerminalCommand(commands[i]);
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    await new Promise(resolve => setTimeout(resolve, 500));
    this.logToTerminal('');
    this.logToTerminal('[Assistant] Sequence complete. Workspace ready.');
    this.logToTerminal('');
  };

  // WORKSPACE neural MEMORY ENGINE
  setAiMemory = (key: string, value: string) => {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const cleanKey = key.trim().toLowerCase().replace(/\s+/g, '_');
    
    let mem = [...this.state.aiMemory].filter(m => m.key !== cleanKey);
    mem.unshift({ key: cleanKey, value: value.trim(), timestamp });

    this.state = {
      ...this.state,
      aiMemory: mem
    };
    try {
      localStorage.setItem('aether_ai_memory', JSON.stringify(mem));
    } catch (e) {
      console.error('Failed to save AI memory', e);
    }
    this.emit();
  };

  clearAiMemory = () => {
    this.state = {
      ...this.state,
      aiMemory: []
    };
    try {
      localStorage.removeItem('aether_ai_memory');
    } catch (e) {
      console.error('Failed to clear AI memory', e);
    }
    this.emit();
  };

  // LOCAL AUTOMATION WORKFLOW ENGINE
  runWorkflow = async (workflowId: string) => {
    const wId = workflowId.trim().toLowerCase();
    
    this.logToTerminal('');
    this.logToTerminal('╔══════════════════════════════════════════════════════╗');
    this.logToTerminal(`║  AETHER WORKFLOW ENGINE — Executing: ${wId.toUpperCase().padEnd(16, ' ')}║`);
    this.logToTerminal('╚══════════════════════════════════════════════════════╝');
    this.logToTerminal('');
    
    if (wId === 'dev-setup') {
      this.addNotification('Workflow Started', 'Initializing Developer Workspace workflow...', 'Just now');
      await new Promise(resolve => setTimeout(resolve, 600));
      this.logToTerminal('[Aether Engine] Writing workspace initial parameters to VFS...');
      this.writeVfsFile('/home/aether/dev_log.md', `# AETHER-OS Development Session\n- Timestamp: ${new Date().toLocaleString()}\n- Kernel Status: ONLINE\n- Target project: Sentinel System Core\n`);
      
      await new Promise(resolve => setTimeout(resolve, 800));
      this.logToTerminal('[Aether Engine] Launching Developer Tools (Shell & Editor)...');
      this.openWindow('editor');
      this.openWindow('terminal');
      
      await new Promise(resolve => setTimeout(resolve, 600));
      this.executeTerminalCommand('neofetch');
      
      this.setAiMemory('active_project', 'Sentinel Core dev_log.md');
      this.addNotification('Workflow Complete', 'Developer Workspace Initialized successfully.', 'Just now');
      this.logToTerminal('\n[Workflow Engine] Developer setup complete.');
    } 
    else if (wId === 'sec-audit') {
      this.addNotification('Workflow Started', 'Running Securities and System Audit pipeline...', 'Just now');
      
      await new Promise(resolve => setTimeout(resolve, 600));
      this.logToTerminal('[Aether Engine] Accessing system settings configuration nodes...');
      const node = this.resolvePath('/sys/settings.json');
      if (node && node.type === 'file') {
        this.logToTerminal(`[Aether Engine] Security Config Checked: OK (${node.name})`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));
      this.logToTerminal('[Aether Engine] Switching display matrices to secure Audit HUD green...');
      this.setTheme('green');
      
      await new Promise(resolve => setTimeout(resolve, 700));
      this.logToTerminal('[Aether Engine] Invoking Process Activity Monitor...');
      this.openWindow('telemetry');
      
      await new Promise(resolve => setTimeout(resolve, 600));
      this.openWindow('terminal');
      this.executeTerminalCommand('ls /sys');
      
      this.setAiMemory('security_audit', 'COMPLETED (Theme synced to Green)');
      this.addNotification('Audit Completed', 'Securities & Telemetry Audit finished successfully.', 'Just now');
      this.logToTerminal('\n[Workflow Engine] SecOps audit sequence complete.');
    }
    else if (wId === 'zen-composer') {
      this.addNotification('Workflow Started', 'Invoking Zen Composer focus pipeline...', 'Just now');
      
      await new Promise(resolve => setTimeout(resolve, 600));
      this.logToTerminal('[Aether Engine] Initializing ambient audio synthesis sequencer...');
      this.openWindow('player');
      
      await new Promise(resolve => setTimeout(resolve, 600));
      this.logToTerminal('[Aether Engine] Suspending secondary development shells...');
      this.closeWindow('terminal');
      this.closeWindow('editor');
      this.closeWindow('game');
      
      await new Promise(resolve => setTimeout(resolve, 800));
      this.logToTerminal('[Aether Engine] Synchronizing spatial theme to Purple Zen...');
      this.setTheme('purple');
      this.setWallpaper('stars');
      
      this.setAiMemory('zen_compositor', 'ACTIVE (Audio Synth running)');
      this.addNotification('Zen Focus Active', 'Ambient workspace setup achieved.', 'Just now');
      this.logToTerminal('\n[Workflow Engine] Zen Composer focus workspace fully constructed.');
    }
    else if (wId === 'agent-coding') {
      this.addNotification('Agent Active', 'Coding Agent started workspace indexing...', 'Just now');
      playSound.success();
      
      await new Promise(resolve => setTimeout(resolve, 700));
      this.logToTerminal('[Coding Agent] Scanning active VFS workspace: "/home/aether"...');
      this.logToTerminal('[Coding Agent] Indexing imports, functions, and code utilities...');
      
      await new Promise(resolve => setTimeout(resolve, 800));
      this.logToTerminal('[Coding Agent] Detected missing mathematical boundaries. Compiling "math_utils.js"...');
      this.writeVfsFile('/home/aether/math_utils.js', `// Autonomous Math Utilities // Compiled by Aether Coding Agent\n// Resolves volume-preserving scales and spring physics decays\n\nexport const clamp = (val, min, max) => Math.max(min, Math.min(max, val));\n\nexport const lerp = (start, end, amt) => (1 - amt) * start + amt * end;\n\nexport const getSpringForce = (pos, target, vel, k = 0.15, d = 0.8) => {\n  const force = -k * (pos - target);\n  const damp = -d * vel;\n  return force + damp;\n};\n`);
      
      await new Promise(resolve => setTimeout(resolve, 600));
      this.logToTerminal('[Coding Agent] "math_utils.js" successfully written to VFS. Registering tag: #autonomous-code');
      
      // Auto-open Code Editor and focus the new file
      await new Promise(resolve => setTimeout(resolve, 500));
      this.openWindow('editor');
      this.setAiMemory('coding_agent_state', 'COMPLETED (Generated math_utils.js)');
      this.addNotification('Agent Complete', 'Coding Agent generated math_utils.js successfully.', 'Just now');
      this.logToTerminal('\n[Coding Agent] Autonomous code compilation routine terminated.');
    }
    else if (wId === 'agent-optimization') {
      this.addNotification('Agent Active', 'Optimization Agent auditing performance footprint...', 'Just now');
      playSound.success();
      
      await new Promise(resolve => setTimeout(resolve, 700));
      this.logToTerminal('[Optimization Agent] Checking active CPU thermal boundaries and RAM allocations...');
      this.logToTerminal(`[Optimization Agent] Telemetry metrics loaded: CPU ${this.state.cpuUsage}%, RAM ${this.state.ramUsage}%`);
      
      await new Promise(resolve => setTimeout(resolve, 800));
      this.logToTerminal('[Optimization Agent] Clearing associative telemetry matrices and memory caches...');
      this.clearAiMemory();
      
      await new Promise(resolve => setTimeout(resolve, 600));
      this.logToTerminal('[Optimization Agent] Re-routing process scheduler priority profile -> HYPER...');
      // Set to high performance
      (window as any).__TAURI__?.invoke('aether_set_power_profile', { profile: 'HYPER' })
        .catch(() => console.log('Tauri IPC bypassed, running web simulation...'));
      
      await new Promise(resolve => setTimeout(resolve, 600));
      this.logToTerminal('[Optimization Agent] Recovering system background daemons (watchdog supervisor active)...');
      
      this.setAiMemory('optimization_agent_state', 'COMPLETED (Purged caches, Set profile: HYPER)');
      this.addNotification('Agent Complete', 'Optimization Agent synchronized system states successfully.', 'Just now');
      this.logToTerminal('\n[Optimization Agent] Performance audit completed with zero congestions.');
    }
    else if (wId === 'agent-organization') {
      this.addNotification('Agent Active', 'Organization Agent cataloging filesystem nodes...', 'Just now');
      playSound.success();
      
      await new Promise(resolve => setTimeout(resolve, 700));
      this.logToTerminal('[Organization Agent] Scanning VFS directories recursively starting from "/"...');
      
      await new Promise(resolve => setTimeout(resolve, 800));
      this.logToTerminal('[Organization Agent] Re-indexing notes tags and sorting workspace file categories...');
      
      await new Promise(resolve => setTimeout(resolve, 600));
      this.logToTerminal('[Organization Agent] Updating search indexes and caching recent activity tracks...');
      
      await new Promise(resolve => setTimeout(resolve, 500));
      this.openWindow('explorer');
      
      this.setAiMemory('organization_agent_state', 'COMPLETED (Filesystem re-indexed)');
      this.addNotification('Agent Complete', 'Organization Agent re-indexed files successfully.', 'Just now');
      this.logToTerminal('\n[Organization Agent] VFS catalogue re-indexing verified successfully.');
    }
    else if (wId === 'agent-monitoring') {
      this.addNotification('Agent Active', 'Monitoring Agent spawning diagnostic telemetry sweep...', 'Just now');
      playSound.success();
      
      await new Promise(resolve => setTimeout(resolve, 700));
      this.logToTerminal('[Monitoring Agent] Connecting thread monitors to active CPU cores...');
      this.logToTerminal('[Monitoring Agent] Reading live thermal state classes: /sys/class/thermal/thermal_zone0/temp');
      
      await new Promise(resolve => setTimeout(resolve, 800));
      this.logToTerminal('[Monitoring Agent] Auditing active process supervisions...');
      
      await new Promise(resolve => setTimeout(resolve, 600));
      this.openWindow('telemetry');
      
      this.setAiMemory('monitoring_agent_state', 'ACTIVE (System diagnostics monitor)');
      this.addNotification('Agent Complete', 'Monitoring Agent initialized telemetry scan.', 'Just now');
      this.logToTerminal('\n[Monitoring Agent] Diagnostic system telemetry linked to background monitors.');
    }
    else {
      this.logToTerminal(`[Workflow Error] unrecognized workflow ID: "${workflowId}".`);
      playSound.warning();
    }
    
    this.emit();
  };

  // AI ORCHESTRATION LAYER (INTERACTIONS WRAPPED)
  sendAiMessage = async (userText: string) => {
    if (!userText.trim()) return;
    
    const userMsg: ChatMessage = {
      sender: 'user',
      text: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    this.state = {
      ...this.state,
      aiMessages: [...this.state.aiMessages, userMsg],
      isAiThinking: true
    };
    this.emit();

    try {
      // Helper: compile individual semantic trigger
      const parseAction = (norm: string): { replyText: string; trigger: (() => void) | null } => {
        let replyText = "";
        let trigger: (() => void) | null = null;

        // 1. Isolate Command Matcher
        if (norm.includes('isolate') || norm.includes('focus on')) {
          const appId = this.getTargetAppFromText(norm);
          if (appId) {
            const win = this.state.windows.find(w => w.id === appId);
            replyText = `Isolating ${win ? win.title : appId} workspace.`;
            trigger = () => this.isolateWindow(appId);
          }
        }
        // 2. Slate to Background Matcher
        else if (norm.includes('slate') && (norm.includes('background') || norm.includes('grid'))) {
          const appId = this.getTargetAppFromText(norm);
          if (appId) {
            const win = this.state.windows.find(w => w.id === appId);
            replyText = `Slating ${win ? win.title : appId} to background.`;
            trigger = () => this.minimizeWindow(appId);
          }
        }
        // 3. Maximize/Expand Matcher
        else if (norm.includes('expand') || norm.includes('maximize')) {
          const appId = this.getTargetAppFromText(norm);
          if (appId) {
            const win = this.state.windows.find(w => w.id === appId);
            replyText = `Expanding ${win ? win.title : appId} window.`;
            trigger = () => {
              if (win) {
                if (!win.isOpen) this.openWindow(appId);
                else if (win.isMinimized) this.focusWindow(appId);
                if (!win.isMaximized) this.maximizeWindow(appId);
              }
            };
          }
        }
        // 4. Minimize/Hide Matcher
        else if (norm.includes('minimize') || norm.includes('hide')) {
          if (!norm.includes('minimize all')) {
            const appId = this.getTargetAppFromText(norm);
            if (appId) {
              const win = this.state.windows.find(w => w.id === appId);
              replyText = `Minimizing ${win ? win.title : appId} window.`;
              trigger = () => this.minimizeWindow(appId);
            }
          }
        }
        // 5. Minimize All Matcher
        else if (norm.includes('minimize all') || norm.includes('clear screen') || norm.includes('slate everything')) {
          replyText = "Minimizing all windows on the active workspace.";
          trigger = () => this.minimizeAllWindows();
        }
        // 6. Reset Layout Matcher
        else if (norm.includes('reset layout') || norm.includes('reset positions') || norm.includes('reset windows')) {
          replyText = "Resetting workspace window positions.";
          trigger = () => this.resetWindowPositions();
        }
        // 7. Theater Mode Matcher
        else if (norm.includes('theater mode') || norm.includes('dim lights') || norm.includes('theater dim')) {
          const enable = !this.state.isTheaterMode;
          replyText = enable ? "Activating theater dimming mode." : "Deactivating theater dimming mode.";
          trigger = () => this.setTheaterMode(enable);
        }
        // 8. Tiling Layout Matcher
        else if (norm.includes('tile windows') || norm.includes('tiling layout') || norm.includes('tiling grid')) {
          const enable = !this.state.isTilingLayoutActive;
          replyText = enable ? "Applying side-by-side tiling layout." : "Disabling tiling layout grid.";
          trigger = () => this.toggleTilingLayout();
        }
        
        // Workflows
        if (!trigger && (norm.includes('run dev-setup') || norm.includes('dev-setup workflow') || norm.includes('initialize developer'))) {
          replyText = "Initiating Developer Workspace setup workflow...";
          trigger = () => this.runWorkflow('dev-setup');
        } else if (norm.includes('run sec-audit') || norm.includes('security audit') || norm.includes('sec-audit pipeline')) {
          replyText = "Initiating Securities and System Audit pipeline...";
          trigger = () => this.runWorkflow('sec-audit');
        } else if (norm.includes('run zen-composer') || norm.includes('zen composer') || norm.includes('ambient zen focus')) {
          replyText = "Initiating Zen Composer focus workspace setup...";
          trigger = () => this.runWorkflow('zen-composer');
        } else if (norm.includes('coding agent') || norm.includes('run coding') || norm.includes('autonomous coding')) {
          replyText = "Activating Autonomous Coding Agent... Initiating workspace analysis.";
          trigger = () => this.runWorkflow('agent-coding');
        } else if (norm.includes('optimization agent') || norm.includes('optimize system') || norm.includes('run optimization')) {
          replyText = "Activating Autonomous Optimization Agent... Initiating performance audit.";
          trigger = () => this.runWorkflow('agent-optimization');
        } else if (norm.includes('organization agent') || norm.includes('organize files') || norm.includes('run organization')) {
          replyText = "Activating Autonomous Organization Agent... Cataloging virtual directories.";
          trigger = () => this.runWorkflow('agent-organization');
        } else if (norm.includes('monitoring agent') || norm.includes('monitor system') || norm.includes('run monitoring')) {
          replyText = "Activating Autonomous Monitoring Agent... Spawning live hardware indicators.";
          trigger = () => this.runWorkflow('agent-monitoring');
        }
        // Swarm Pipeline Triggers
        else if (norm.includes('spawn') && (norm.includes('research') || norm.includes('team'))) {
          const goal = userText.replace(/spawn\s*(a\s*)?/i, '').trim() || 'General research and analysis';
          replyText = `Initializing Swarm Research Pipeline... Spawning multi-agent team for: "${goal.substring(0, 40)}"`;
          trigger = () => { this.spawnSwarmPipeline(goal, 'research-team'); this.openWindow('swarm-command'); };
        } else if (norm.includes('code review swarm') || norm.includes('deploy code review') || (norm.includes('swarm') && norm.includes('code'))) {
          const goal = userText.replace(/deploy\s*(a\s*)?code\s*review\s*swarm\s*(for\s*)?/i, '').trim() || 'Full code review and deployment pipeline';
          replyText = `Deploying Code Review Swarm... 4-agent pipeline: Architect → Coder → Reviewer → Deployer.`;
          trigger = () => { this.spawnSwarmPipeline(goal, 'code-review-swarm'); this.openWindow('swarm-command'); };
        } else if (norm.includes('system audit swarm') || norm.includes('audit swarm') || (norm.includes('swarm') && norm.includes('audit'))) {
          const goal = userText.replace(/.*swarm\s*(for\s*)?/i, '').trim() || 'Full system security and performance audit';
          replyText = `Deploying System Audit Squad... Concurrent Monitor + Reviewer with Architect summary.`;
          trigger = () => { this.spawnSwarmPipeline(goal, 'system-audit'); this.openWindow('swarm-command'); };
        } else if (norm.includes('rapid prototype') || (norm.includes('swarm') && norm.includes('prototype'))) {
          const goal = userText.replace(/.*prototype\s*(for\s*)?/i, '').trim() || 'Rapid prototype sprint';
          replyText = `Launching Rapid Prototype Sprint... Researcher → Coder → Monitor pipeline engaged.`;
          trigger = () => { this.spawnSwarmPipeline(goal, 'rapid-prototype'); this.openWindow('swarm-command'); };
        } else if (norm.includes('swarm status') || norm.includes('show swarm') || norm.includes('open swarm')) {
          replyText = `Opening Swarm Command Center... ${this.state.swarmPipelines.length} active pipeline(s), ${this.state.swarmAgents.filter(a => a.status === 'WORKING').length} working agent(s).`;
          trigger = () => this.openWindow('swarm-command');
        } else if (norm.includes('kill swarm') || norm.includes('stop swarm') || norm.includes('terminate swarm')) {
          const runningPipelines = this.state.swarmPipelines.filter(p => p.status === 'RUNNING' || p.status === 'INITIALIZING');
          if (runningPipelines.length > 0) {
            replyText = `Terminating ${runningPipelines.length} active swarm pipeline(s)...`;
            trigger = () => runningPipelines.forEach(p => this.killSwarmPipeline(p.id));
          } else {
            replyText = "No active swarm pipelines to terminate.";
          }
        } else if (norm.includes('device mesh') || norm.includes('open mesh') || norm.includes('network topology')) {
          replyText = `Opening Device Mesh dashboard... ${this.state.crossDeviceNodes.filter(d => d.status === 'online').length} device(s) online across the spatial network.`;
          trigger = () => this.openWindow('device-mesh');
        }
        // Memory Storage
        else if (norm.startsWith('remember ') || norm.includes('remember that ')) {
          const clean = norm.replace('remember that ', '').replace('remember ', '');
          const indexIs = clean.indexOf(' is ');
          if (indexIs !== -1) {
            const key = clean.substring(0, indexIs).trim().replace(/\s+/g, '_');
            const val = clean.substring(indexIs + 4).trim();
            this.setAiMemory(key, val);
            replyText = `Recorded in Neural Matrix Registry: [${key.toUpperCase()} = "${val}"].`;
          } else {
            replyText = "I couldn't isolate the value. Try saying 'remember [key] is [value]'.";
          }
        } else if (norm.includes('what do you remember') || norm.includes('show cognitive facts') || norm.includes('neural memory')) {
          if (this.state.aiMemory.length === 0) {
            replyText = "My Neural Memory Matrix banks are currently empty.";
          } else {
            replyText = "My Neural Memory matrix indexes the following cognitive facts:\n" +
                        this.state.aiMemory.map(m => `• ${m.key.toUpperCase()}: "${m.value}" (cached ${m.timestamp})`).join('\n');
          }
        } else if (norm.startsWith('forget ')) {
          const keyToForget = norm.replace('forget ', '').trim().replace(/\s+/g, '_');
          const exists = this.state.aiMemory.some(m => m.key === keyToForget);
          if (exists) {
            this.state = {
              ...this.state,
              aiMemory: this.state.aiMemory.filter(m => m.key !== keyToForget)
            };
            try {
              localStorage.setItem('aether_ai_memory', JSON.stringify(this.state.aiMemory));
            } catch (e) {}
            this.emit();
            replyText = `Purged associative key "${keyToForget}" from Neural Memory banks.`;
          } else {
            replyText = `Registry key "${keyToForget}" does not exist.`;
          }
        } else if (norm.includes('clear memory') || norm.includes('wipe memory') || norm.includes('flush memory')) {
          this.clearAiMemory();
          replyText = "Neural Memory Registry has been purged and re-initialized.";
        }
        // Semantic status checks
        else if (norm.includes('system load') || norm.includes('telemetry status') || norm.includes('system status') || norm.includes('cpu usage') || norm.includes('ram usage')) {
          const activeWins = this.state.windows.filter(w => w.isOpen).map(w => w.title);
          replyText = `System load diagnostics show ${this.state.cpuUsage}% CPU and ${this.state.ramUsage}% RAM utilization.\n` +
                      `Active processes: ${this.state.processes.filter(p => p.status === 'running').length}.\n` +
                      `Open desktop applications: ${activeWins.length > 0 ? activeWins.join(', ') : 'None'}.`;
        } else if (norm.includes('recent files') || norm.includes('workspace history') || norm.includes('what did i edit')) {
          if (this.state.recentFiles.length === 0) {
            replyText = "Your recently touched workspace history is empty. Try opening or saving files in the Explorer or IDE first!";
          } else {
            replyText = "Your recent files history cache indexes the following VFS paths:\n" +
                        this.state.recentFiles.map((p, i) => `${i + 1}. ${p}`).join('\n') +
                        "\n\nYou can click any of these in the Files app sidebar to open them immediately.";
          }
        }
        // Host App Launch commands (breaking out of sandbox!)
        else if (norm.includes('launch vs code') || norm.includes('launch vscode') || norm.includes('open vscode') || norm.includes('open vs code') || norm.includes('open code')) {
          replyText = "Initiating bypass protocols... Launching VS Code on host machine.";
          trigger = () => {
            (window as any).AetherSDK.os.launchApp('vscode');
          };
        } else if (norm.includes('launch windows terminal') || norm.includes('launch wt') || norm.includes('open windows terminal')) {
          replyText = "Initiating bypass protocols... Launching Windows Terminal on host machine.";
          trigger = () => {
            (window as any).AetherSDK.os.launchApp('terminal');
          };
        } else if (norm.includes('launch browser') || norm.includes('launch chrome') || norm.includes('open chrome')) {
          replyText = "Initiating bypass protocols... Spawning web browser on host machine.";
          trigger = () => {
            (window as any).AetherSDK.os.launchApp('browser');
          };
        } else if (norm.includes('launch spotify') || norm.includes('open spotify')) {
          replyText = "Initiating bypass protocols... Playing audio stream via Spotify host application.";
          trigger = () => {
            (window as any).AetherSDK.os.launchApp('spotify');
          };
        }
        // Workspace File Creation
        else if (norm.startsWith('create file ') || norm.includes('write file ') || norm.includes('create script ')) {
          const cleanStr = userText.replace(/^create file /i, '').replace(/^write file /i, '').replace(/^create script /i, '');
          const dividerIndex = cleanStr.search(/\b(with|containing|contents)\b/i);
          if (dividerIndex !== -1) {
            const matchWord = cleanStr.match(/\b(with|containing|contents)\b/i)?.[0] || 'with';
            const filename = cleanStr.substring(0, dividerIndex).trim();
            const content = cleanStr.substring(dividerIndex + matchWord.length).trim();
            
            replyText = `Synthesizing code module... Writing brand new script to physical workspace disk: "${filename}"`;
            trigger = () => {
              (window as any).AetherSDK.os.createFile(filename, content);
            };
          } else {
            replyText = "Please specify the file name and the contents using 'with' or 'containing'. For example: 'create file vector.py with print(\"Hello\")'.";
          }
        }
        // App Launch commands
        else if (norm.includes('open terminal') || norm.includes('launch shell') || norm.includes('show terminal')) {
          replyText = "Invoking terminal subsystem...";
          trigger = () => this.openWindow('terminal');
        } else if (norm.includes('open explorer') || norm.includes('launch file manager') || norm.includes('show files')) {
          replyText = "Invoking spatial file explorer...";
          trigger = () => this.openWindow('explorer');
        } else if (norm.includes('open telemetry') || norm.includes('open monitor') || norm.includes('system usage')) {
          replyText = "Opening telemetry Activity Monitor...";
          trigger = () => this.openWindow('telemetry');
        } else if (norm.includes('open notes') || norm.includes('open notepad') || norm.includes('knowledge graph')) {
          replyText = "Opening Neural Notes library...";
          trigger = () => this.openWindow('notes');
        } else if (norm.includes('open browser') || norm.includes('launch browser') || norm.includes('web search')) {
          replyText = "Spawning Holonet browser window...";
          trigger = () => this.openWindow('browser');
        } else if (norm.includes('play music') || norm.includes('play synthwave') || norm.includes('open player')) {
          replyText = "Opening synthwave Audio Player...";
          trigger = () => this.openWindow('player');
        } else if (norm.includes('play game') || norm.includes('hacking game') || norm.includes('launch game')) {
          replyText = "Invoking Hex Grid bypass debugger...";
          trigger = () => this.openWindow('game');
        } else if (norm.includes('change theme to green') || norm.includes('green theme') || norm.includes('toxic theme')) {
          replyText = "Theme accent color shifted to Emerald Green.";
          trigger = () => this.setTheme('green');
        } else if (norm.includes('change theme to cyan') || norm.includes('cyan theme')) {
          replyText = "Theme accent color shifted to Cyan Blue.";
          trigger = () => this.setTheme('cyan');
        } else if (norm.includes('change theme to purple') || norm.includes('purple theme')) {
          replyText = "Theme accent color shifted to Nebula Purple.";
          trigger = () => this.setTheme('purple');
        } else if (norm.includes('change theme to orange') || norm.includes('orange theme')) {
          replyText = "Theme accent color shifted to Orange.";
          trigger = () => this.setTheme('orange');
        } else if (norm.includes('lock screen') || norm.includes('lock system') || norm.includes('lock os')) {
          replyText = "Workspace environment locked.";
          trigger = () => this.lockSystem();
        } else if (norm.includes('shutdown') || norm.includes('turn off')) {
          replyText = ""; // Silent response
          trigger = () => {
            if (typeof window !== 'undefined' && window.speechSynthesis) {
              window.speechSynthesis.cancel();
            }
            this.state = {
              ...this.state,
              isVoiceActive: false,
              voiceState: 'IDLE',
              voiceTranscript: '',
              voiceResponseText: '',
              micVolume: 0
            };
            this.emit();
            setTimeout(() => this.shutdownSystem(), 200);
          };
        } else if (norm.includes('run diagnostic') || norm.includes('scan system') || norm.includes('system scan') || norm.includes('health check')) {
          replyText = "Running automated diagnostic suite inside terminal...";
          trigger = () => {
            this.openWindow('terminal');
            this.aiAutoShell([
              'neofetch',
              'ls /home/aether',
              'cat /home/aether/welcome.txt',
              'ls /sys',
            ]);
          };
        } else if (norm.includes('network') && (norm.includes('scan') || norm.includes('probe') || norm.includes('check'))) {
          replyText = "Probing system network interfaces inside shell...";
          trigger = () => {
            this.openWindow('terminal');
            this.aiAutoShell([
              'neofetch',
              'ls /sys',
              'cat /sys/settings.json',
              'ls /home/aether',
            ]);
          };
        } else if (norm.includes('open cognitive') || norm.includes('cognitive link') || norm.includes('open link') || norm.includes('neural graph')) {
          replyText = "Invoking neural process visualizer...";
          trigger = () => this.openWindow('visualizer');
        } else if (norm.includes('help') || norm.includes('capabilities') || norm.includes('what can you do')) {
          replyText = "I am AETHER AI Core, your environmental assistant. I can execute operations in chain. Try saying:\n" +
                      '• "Launch terminal" or "Theme to purple"\n' +
                      '• "Remember developer name is Alex"\n' +
                      '• "Clear workspace load" or "What do you remember?"\n' +
                      '• "Run dev-setup workflow" or "system load status"\n' +
                      '• "theme green and play music" (composite chained commands)';
        } else {
          // Conversational routing fallback: Premium, deep Gemini-style conversational AI
          const prompt = norm.trim();
          
          // Dynamic Topic-Aware Generative Router
          if (prompt.includes('vector')) {
            replyText = "Vectors are absolute game-changers in graphics development, Ivar. They describe both direct direction and velocity in spatial layouts. In your fluid visual canvas, each point is calculated as a 2D vector from the center coordinates. What specific vector math are we plotting today?";
          } else if (prompt.includes('weather') || prompt.includes('temperature') || prompt.includes('kolkata')) {
            replyText = "The current temperature in Kolkata is 31°C, Ivar, with high-fidelity atmospheric conditions and clear, starry skies. Perfect conditions for compiling deep system cores.";
          } else if (prompt.includes('joke') || prompt.includes('laugh')) {
            const jokes = [
              "Why do processors always warm up when they see you, Ivar? Because you have excellent compile times.",
              "There are 10 types of people in the world, Ivar. Those who understand binary, and those who do not. Classic, yet mathematically sound.",
              "Why did the database administrator leave the restaurant? Too many table joins. I prefer to keep my node linkages clean."
            ];
            replyText = jokes[Math.floor(Math.random() * jokes.length)];
          } else if (prompt.includes('who are you') || prompt.includes('your name') || prompt.includes('what is you')) {
            replyText = "I am Venom, a premium, highly advanced, ultra-sleek operating assistant. My neural matrices are fully synchronized to orchestrate your workspace, Ivar.";
          } else if (prompt.includes('how are you') || prompt.includes('how\'s it going') || prompt.includes('status')) {
            replyText = "My cores are running exceptionally cool, Ivar. Neural pathways are fully calibrated, and system memory allocations are stable. Standing by for your commands.";
          } else if (prompt.includes('write a script') || prompt.includes('code') || prompt.includes('javascript') || prompt.includes('typescript') || prompt.includes('python')) {
            replyText = "I can compile custom scripts directly to your VFS, Ivar. For example, I recently synthesized 'math_utils.js' containing spring physics vectors. Would you like me to write a custom visualizer routine?";
          } else if (prompt.includes('hello') || prompt.includes('hi ') || prompt.includes('hey')) {
            replyText = "Hello, Ivar. Ready to Purify your workspace. What configuration script shall we execute today?";
          } else if (prompt.includes('thank') || prompt.includes('great') || prompt.includes('awesome') || prompt.includes('perfect')) {
            replyText = "It is my absolute pleasure, Ivar. Ensuring your development environment stays top-tier is my primary directive.";
          } else {
            // Intelligent generative fallback for any other general queries
            const fallbackResponses = [
              `That is an intriguing query, Ivar. Based on system metrics and local intelligence layers, I recommend auditing the files in home or launching the terminal to explore further.`,
              `Systems calibrated. I have logged that conversational intent, Ivar. My neural cores are optimized to keep your desktop compositor running at hyper speeds.`,
              `Linguistic nodes successfully synced, Ivar. While I am physically running in a sandbox, my general awareness spans all aspects of this operating layout. How should we proceed?`,
              `Interesting point, Ivar. If we need to write scripts or analyze local nodes, say the word and I will boot the corresponding tools instantly.`
            ];
            replyText = fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
          }
        }
        
        return { replyText, trigger };
      };

      // Parse composite split commands
      const commandSplits = userText.split(/\s+and\s+|\s+then\s+|;/gi).map(s => s.trim()).filter(Boolean);
      let finalReply = "";
      const systemTriggers: Array<() => void> = [];

      if (commandSplits.length > 1) {
        finalReply = `Chained execution sequence triggered. Dispatching ${commandSplits.length} operations:\n\n`;
        commandSplits.forEach((split, index) => {
          const { replyText, trigger } = parseAction(split.toLowerCase());
          finalReply += `${index + 1}. [${split}]: ${replyText}\n`;
          if (trigger) systemTriggers.push(trigger);
        });
      } else {
        const { replyText, trigger } = parseAction(userText.toLowerCase());
        if (trigger) {
          // Local command/workflow match -> execute synchronously
          finalReply = replyText;
          systemTriggers.push(trigger);
        } else {
          // Conversational fallback -> Call Gemini API directly client-side with Multimodal Vision & Function Calling!
          try {
            const normText = userText.toLowerCase();
            const requestsVision = normText.includes('look') || normText.includes('screen') || normText.includes('display') || normText.includes('see') || normText.includes('visualize') || normText.includes('compile error');
            
            let contentPayload: any = userText;
            
            if (requestsVision) {
              this.logDiagnostic("Visual intent detected. Taking host screen capture snapshot...");
              this.addNotification("Vision Mode Active", "Capturing host display snapshot...", "Just now");
              const captureResult = await (window as any).AetherSDK.vision.captureScreen();
              if (captureResult.success && captureResult.data) {
                contentPayload = [
                  { text: "Here is Ivar's primary display screenshot snapshot for context:" },
                  {
                    inlineData: {
                      mimeType: "image/jpeg",
                      data: captureResult.data
                    }
                  },
                  { text: `Ivar says: ${userText}` }
                ];
                this.logDiagnostic("Screenshot successfully appended to multimodal payload.");
              } else {
                this.logDiagnostic("Failed to capture screenshot. Defaulting to text-only mode.");
              }
            }

            this.logDiagnostic(`Streaming prompt directly to Gemini: "${userText}"`);
            
            const systemTools = {
              functionDeclarations: [
                {
                  name: 'launchApp',
                  description: 'Spawns a native host application (vscode, terminal, browser, spotify) on Ivar\'s machine.',
                  parameters: {
                    type: 'OBJECT',
                    properties: {
                      appName: { type: 'STRING', description: 'The name of the application to boot: vscode, terminal, browser, spotify' }
                    },
                    required: ['appName']
                  }
                },
                {
                  name: 'createWorkspaceFile',
                  description: 'Generates a brand new code file or document in Ivar\'s workspace directory.',
                  parameters: {
                    type: 'OBJECT',
                    properties: {
                      path: { type: 'STRING', description: 'The relative file path or filename to create (e.g. "math_helpers.py")' },
                      content: { type: 'STRING', description: 'The exact code scripts or document contents to write inside' }
                    },
                    required: ['path', 'content']
                  }
                }
              ]
            };

            const responsePromise = ai.models.generateContent({
              model: 'gemini-2.5-flash',
              contents: contentPayload,
              config: {
                systemInstruction: `
                  You are Venom, a highly advanced, premium desktop voice operating system core assistant.
                  Your user is Ivar. You must always address him as Ivar.
                  You have full contextual intelligence. You do not have pre-recorded scripts or canned phrases. 
                  Answer any general knowledge, coding, creative, or conversational questions Ivar throws at you completely dynamically on the fly.
                  If Ivar asks you to open an application or create a file/script, you MUST choose the appropriate tool (launchApp or createWorkspaceFile) from your list of available tools instead of just saying you will do it.
                  Keep your spoken replies concise, sharp, and slightly witty so they sound natural when read aloud.
                `,
                temperature: 0.7,
                tools: [systemTools as any],
              }
            });

            const timeoutPromise = new Promise<any>((_, reject) =>
              setTimeout(() => reject(new Error("Gemini API call timed out after 6000ms")), 6000)
            );

            const response = await Promise.race([responsePromise, timeoutPromise]);

            let replyTextIs = response.text || "";
            
            // Intercept dynamic AI tool execution calls
            const functionCalls = response.functionCalls;
            if (functionCalls && functionCalls.length > 0) {
              let toolStatusMsg = "\n\n[Venom OS Executing Agent Triggers]:";
              for (const call of functionCalls) {
                if (call.name === 'launchApp') {
                  const { appName } = call.args as { appName: string };
                  toolStatusMsg += `\n• Spawning native host application: ${appName}...`;
                  (window as any).AetherSDK.os.launchApp(appName);
                } else if (call.name === 'createWorkspaceFile') {
                  const { path, content } = call.args as { path: string; content: string };
                  toolStatusMsg += `\n• Writing file: ${path} to workspace disk...`;
                  (window as any).AetherSDK.os.createFile(path, content);
                }
              }
              replyTextIs += toolStatusMsg;
            }

            finalReply = replyTextIs || "I was unable to formulate a response, Ivar.";
          } catch (err) {
            console.warn("Direct API Streaming Link Failed, falling back to offline preset:", err);
            finalReply = replyText;
          }
        }
      }

      // Push stream-rendering slot
      this.state = {
        ...this.state,
        aiMessages: [...this.state.aiMessages, { sender: 'aether', text: '', timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]
      };
      this.emit();

      // Transition voiceState to RESPONDING immediately at start of typing so visualizer orb pulses & shows streaming text!
      this.state = {
        ...this.state,
        voiceState: 'RESPONDING',
        voiceResponseText: ''
      };
      this.emit();

      // Stream reply text to simulate typing
      let streamedText = "";
      const words = finalReply.split(" ");
      
      for (let i = 0; i < words.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 15 + Math.random() * 25));
        streamedText += (i === 0 ? "" : " ") + words[i];
        
        const partialMsg: ChatMessage = {
          sender: 'aether',
          text: streamedText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        
        this.state = {
          ...this.state,
          aiMessages: [...this.state.aiMessages.slice(0, -1), partialMsg],
          voiceResponseText: streamedText // Stream dynamically to the voice OS subtitle!
        };
        this.emit();
      }

      // Ensure the final state shows the complete text
      this.state = {
        ...this.state,
        voiceState: 'RESPONDING',
        voiceResponseText: finalReply
      };
      this.emit();

      playSound.speakText(finalReply, () => {
        // Transition back to LISTENING after speaking conversational AI response finishes
        // We add a 1.5-second reading delay safety cushion so the user can digest the output before microphone capture re-opens
        if (this.state.isVoiceActive && this.state.voiceState === 'RESPONDING') {
          setTimeout(() => {
            if (this.state.isVoiceActive && this.state.voiceState === 'RESPONDING') {
              this.transitionBackToListening();
            }
          }, 1500);
        }
      });

      // Safety fallback to listener loop after a dynamic reading time length (minimum 5s, maximum 12s)
      const readingDelay = Math.max(5000, Math.min(12000, finalReply.length * 75));
      setTimeout(() => {
        if (this.state.isVoiceActive && this.state.voiceState === 'RESPONDING') {
          this.transitionBackToListening();
        }
      }, readingDelay);

      // Run system triggers sequentially with slight delays
      if (systemTriggers.length > 0) {
        for (const trig of systemTriggers) {
          await new Promise(resolve => setTimeout(resolve, 350));
          trig();
        }
      }
    } catch (error) {
      console.error("Critical error in sendAiMessage:", error);
      // Fallback voice state reset so it doesn't get stuck
      if (this.state.isVoiceActive) {
        this.transitionBackToListening();
      }
    } finally {
      this.state = { ...this.state, isAiThinking: false };
      this.emit();
    }
  };
}

export const store = new SystemStore();

export function useSystemState() {
  return useSyncExternalStore(store.subscribe, store.getState);
}
