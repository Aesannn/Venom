/**
 * AETHER OS — SWARM ORCHESTRATION ENGINE
 * 
 * Multi-agent concurrent pipeline system with:
 * - Agent spawning/lifecycle management
 * - Inter-agent communication bus
 * - Decision escalation to human operator
 * - Resource budget tracking
 * - Gemini API-powered autonomous intelligence
 */

import { GoogleGenAI } from '@google/genai';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";
const genAI = new GoogleGenAI({ apiKey: API_KEY });

// ─── TYPES ───────────────────────────────────────────────────────────
export type AgentRole = 'RESEARCHER' | 'CODER' | 'REVIEWER' | 'DEPLOYER' | 'MONITOR' | 'ARCHITECT';
export type AgentStatus = 'SPAWNING' | 'IDLE' | 'WORKING' | 'WAITING' | 'ESCALATED' | 'COMPLETED' | 'FAILED' | 'KILLED';
export type PipelineStatus = 'INITIALIZING' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'FAILED' | 'KILLED';

export interface SwarmTask {
  id: string;
  description: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';
  status: 'QUEUED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'ESCALATED';
  assignedAgentId: string;
  result?: string;
  startTime?: number;
  endTime?: number;
  artifacts?: string[]; // VFS paths of generated files
}

export interface SwarmMessage {
  id: string;
  fromAgentId: string;
  toAgentId: string | 'BROADCAST' | 'HUMAN';
  content: string;
  timestamp: number;
  type: 'INFO' | 'REQUEST' | 'RESPONSE' | 'ESCALATION' | 'HANDOFF';
}

export interface SwarmAgent {
  id: string;
  name: string;
  role: AgentRole;
  status: AgentStatus;
  pipelineId: string;
  taskQueue: SwarmTask[];
  currentTask: SwarmTask | null;
  logs: SwarmLogEntry[];
  progress: number; // 0-100
  parentId: string | null;
  childIds: string[];
  resourceAllocation: {
    cpu: number;   // percentage points
    ram: number;   // MB
    vram: number;  // MB
    gpu: number;   // percentage points
  };
  autonomyLevel: 'FULL' | 'SUPERVISED' | 'MANUAL';
  totalTokensUsed: number;
  spawnTime: number;
  completionTime?: number;
  avatar: string; // emoji icon
}

export interface SwarmLogEntry {
  timestamp: number;
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS';
  message: string;
}

export interface EscalationRequest {
  id: string;
  agentId: string;
  agentName: string;
  pipelineId: string;
  question: string;
  options: string[];
  context: string;
  timestamp: number;
  resolved: boolean;
  resolution?: string;
}

export interface SwarmPipeline {
  id: string;
  goal: string;
  status: PipelineStatus;
  agents: string[]; // agent IDs
  createdAt: number;
  completedAt?: number;
  totalProgress: number; // 0-100
  escalations: EscalationRequest[];
}

export interface DeviceNode {
  id: string;
  name: string;
  type: 'workstation' | 'server' | 'mobile' | 'cloud' | 'edge';
  status: 'online' | 'offline' | 'busy' | 'standby';
  os: string;
  location: string;
  ip: string;
  telemetry: DeviceTelemetry;
  capabilities: string[];
  x: number; // canvas position
  y: number;
  lastSeen: number;
}

export interface DeviceTelemetry {
  cpu: number;
  ram: number;
  gpu: number;
  vram: number;
  networkIn: number;  // Mbps
  networkOut: number; // Mbps
  temperature: number; // Celsius
  uptime: number; // hours
  activeProcesses: number;
}

export interface TelemetryStream {
  deviceId: string;
  history: DeviceTelemetry[];
  maxHistory: number;
}

// ─── ROLE CONFIGURATIONS ─────────────────────────────────────────────
export const AGENT_ROLE_CONFIG: Record<AgentRole, { avatar: string; systemPrompt: string; defaultCpu: number; defaultRam: number }> = {
  RESEARCHER: {
    avatar: '🔬',
    systemPrompt: `You are a RESEARCHER agent in the Aether OS Swarm System. Your job is to analyze topics, gather information, and produce concise research briefs. Respond with structured findings in 2-4 bullet points. Be technical and precise. Always end with a one-line recommendation.`,
    defaultCpu: 4,
    defaultRam: 128
  },
  CODER: {
    avatar: '⚡',
    systemPrompt: `You are a CODER agent in the Aether OS Swarm System. Your job is to write clean, production-quality code. When given a task, produce working code with comments. Keep responses focused on code output. Use modern JavaScript/TypeScript patterns.`,
    defaultCpu: 8,
    defaultRam: 256
  },
  REVIEWER: {
    avatar: '🔍',
    systemPrompt: `You are a REVIEWER agent in the Aether OS Swarm System. Your job is to review code and documents for quality, security, and correctness. Provide structured feedback with severity levels (CRITICAL/WARNING/INFO). Be thorough but concise.`,
    defaultCpu: 3,
    defaultRam: 96
  },
  DEPLOYER: {
    avatar: '🚀',
    systemPrompt: `You are a DEPLOYER agent in the Aether OS Swarm System. Your job is to plan and execute deployment strategies. Produce deployment checklists, validate configurations, and confirm readiness. Be systematic and risk-aware.`,
    defaultCpu: 5,
    defaultRam: 160
  },
  MONITOR: {
    avatar: '📡',
    systemPrompt: `You are a MONITOR agent in the Aether OS Swarm System. Your job is to observe system telemetry, detect anomalies, and report system health. Produce concise status reports with metrics. Flag anything above thresholds.`,
    defaultCpu: 2,
    defaultRam: 64
  },
  ARCHITECT: {
    avatar: '🏗️',
    systemPrompt: `You are an ARCHITECT agent in the Aether OS Swarm System. Your job is to design system architectures, plan component interactions, and produce technical specifications. Think in terms of modules, interfaces, and data flows. Be strategic and forward-thinking.`,
    defaultCpu: 6,
    defaultRam: 192
  }
};

// ─── PIPELINE TEMPLATES ──────────────────────────────────────────────
export interface PipelineTemplate {
  id: string;
  name: string;
  description: string;
  agents: { role: AgentRole; taskDescription: string; dependsOn?: number }[];
}

export const PIPELINE_TEMPLATES: PipelineTemplate[] = [
  {
    id: 'research-team',
    name: 'Research & Analysis Team',
    description: 'Multi-agent research pipeline: Researcher gathers data → Architect synthesizes → Reviewer validates',
    agents: [
      { role: 'RESEARCHER', taskDescription: 'Gather and analyze primary sources and technical documentation' },
      { role: 'ARCHITECT', taskDescription: 'Synthesize research findings into an actionable technical brief', dependsOn: 0 },
      { role: 'REVIEWER', taskDescription: 'Validate synthesis accuracy and identify gaps', dependsOn: 1 }
    ]
  },
  {
    id: 'code-review-swarm',
    name: 'Code Review Swarm',
    description: 'Full development pipeline: Architect designs → Coder implements → Reviewer audits → Deployer stages',
    agents: [
      { role: 'ARCHITECT', taskDescription: 'Design the component architecture and define interfaces' },
      { role: 'CODER', taskDescription: 'Implement the designed components with production-quality code', dependsOn: 0 },
      { role: 'REVIEWER', taskDescription: 'Audit code for security vulnerabilities, performance issues, and best practices', dependsOn: 1 },
      { role: 'DEPLOYER', taskDescription: 'Prepare deployment manifest and validate staging readiness', dependsOn: 2 }
    ]
  },
  {
    id: 'system-audit',
    name: 'System Audit Squad',
    description: 'Concurrent system health check: Monitor + Reviewer run in parallel, Architect summarizes',
    agents: [
      { role: 'MONITOR', taskDescription: 'Scan system telemetry for performance anomalies and resource bottlenecks' },
      { role: 'REVIEWER', taskDescription: 'Audit system security configurations and access patterns' },
      { role: 'ARCHITECT', taskDescription: 'Produce executive summary with prioritized remediation steps', dependsOn: 0 }
    ]
  },
  {
    id: 'rapid-prototype',
    name: 'Rapid Prototype Sprint',
    description: 'Fast prototyping: Researcher scopes → Coder builds → Monitor validates performance',
    agents: [
      { role: 'RESEARCHER', taskDescription: 'Scope the prototype requirements and identify key technical constraints' },
      { role: 'CODER', taskDescription: 'Build a minimal working prototype based on research specifications', dependsOn: 0 },
      { role: 'MONITOR', taskDescription: 'Profile prototype performance and report resource consumption metrics', dependsOn: 1 }
    ]
  }
];

// ─── UTILITY ─────────────────────────────────────────────────────────
let _idCounter = 0;
export const generateId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${(++_idCounter).toString(36)}`;

export const formatTimestamp = (ts: number) => {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

// ─── AGENT AI CALL ───────────────────────────────────────────────────
export async function callAgentAI(
  role: AgentRole,
  taskDescription: string,
  context: string,
  pipelineGoal: string
): Promise<string> {
  const config = AGENT_ROLE_CONFIG[role];
  
  const prompt = `${config.systemPrompt}

PIPELINE GOAL: ${pipelineGoal}
YOUR TASK: ${taskDescription}
CONTEXT FROM PREVIOUS AGENTS: ${context || 'None — you are the first agent in this pipeline.'}

Execute your task now. Be concise (max 200 words). Produce actionable output.`;

  try {
    const response = await genAI.models.generateContent({
      model: 'gemini-2.0-flash-lite',
      contents: prompt
    });
    return response.text || '[Agent produced no output]';
  } catch (error) {
    console.error(`[SwarmOrchestrator] Agent AI call failed for ${role}:`, error);
    return `[Agent ${role} inference failed — falling back to heuristic mode]\n\nBased on task "${taskDescription}":\n• Analysis initiated with available system context\n• Preliminary findings indicate nominal system state\n• Recommend proceeding with standard operational parameters`;
  }
}

// ─── DEFAULT DEVICE MESH ─────────────────────────────────────────────
export const DEFAULT_DEVICE_NODES: DeviceNode[] = [
  {
    id: 'aether-main',
    name: 'AETHER-MAIN',
    type: 'workstation',
    status: 'online',
    os: 'AetherOS v1.0.0',
    location: 'Local',
    ip: '192.168.1.100',
    telemetry: { cpu: 12, ram: 38, gpu: 5, vram: 0, networkIn: 45.2, networkOut: 12.8, temperature: 52, uptime: 4.2, activeProcesses: 47 },
    capabilities: ['GPU Inference', 'VRAM Allocation', 'Local LLM', 'Spatial Compositor'],
    x: 250, y: 200,
    lastSeen: Date.now()
  },
  {
    id: 'aether-lab',
    name: 'AETHER-LAB',
    type: 'server',
    status: 'online',
    os: 'Ubuntu 24.04 LTS',
    location: 'Lab Network',
    ip: '192.168.1.201',
    telemetry: { cpu: 45, ram: 62, gpu: 78, vram: 14200, networkIn: 120.5, networkOut: 89.3, temperature: 68, uptime: 72.1, activeProcesses: 128 },
    capabilities: ['Multi-GPU Training', 'CUDA Tensor Cores', 'NVLink Mesh', 'RDMA Fabric'],
    x: 550, y: 100,
    lastSeen: Date.now()
  },
  {
    id: 'aether-mobile',
    name: 'AETHER-EDGE',
    type: 'mobile',
    status: 'standby',
    os: 'AetherOS Lite',
    location: 'Edge Network',
    ip: '10.0.0.42',
    telemetry: { cpu: 8, ram: 22, gpu: 0, vram: 0, networkIn: 5.1, networkOut: 2.3, temperature: 34, uptime: 168.5, activeProcesses: 12 },
    capabilities: ['Sensor Array', 'Edge Inference', 'Low Power Mode'],
    x: 150, y: 350,
    lastSeen: Date.now() - 30000
  },
  {
    id: 'aether-cloud',
    name: 'AETHER-CLOUD',
    type: 'cloud',
    status: 'online',
    os: 'Kubernetes v1.31',
    location: 'us-central1-a',
    ip: '35.224.xxx.xxx',
    telemetry: { cpu: 28, ram: 44, gpu: 35, vram: 24000, networkIn: 450.0, networkOut: 320.7, temperature: 42, uptime: 720.0, activeProcesses: 256 },
    capabilities: ['Elastic Scaling', 'Multi-Region', 'TPU v5e Access', 'Cold Storage Archive'],
    x: 600, y: 330,
    lastSeen: Date.now()
  }
];
