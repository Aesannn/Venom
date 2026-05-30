import React, { useEffect, useRef, useState } from 'react';
import { store, useSystemState } from '../../store/systemStore';
import type { VFSNode } from '../../store/systemStore';
import { playSound } from '../../utils/audio';
import { 
  Share2, 
  FileText, 
  BookOpen, 
  Zap, 
  Sparkles, 
  Terminal,
  Plus,
  Search,
  Network
} from 'lucide-react';

interface GraphNode {
  id: string;
  name: string;
  type: 'project' | 'file' | 'app' | 'workflow' | 'note' | 'session' | 'collaborator';
  description: string;
  tags: string[];
  metadata: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  isDragging?: boolean;
}

interface GraphLink {
  source: string;
  target: string;
  relationship: string;
  weight: number;
}

export const CognitiveLink: React.FC = () => {
  const state = useSystemState();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [links, setLinks] = useState<GraphLink[]>([]);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Creation form states
  const [showAddNode, setShowAddNode] = useState(false);
  const [newId, setNewId] = useState('');
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<'project' | 'file' | 'app' | 'workflow' | 'note' | 'session' | 'collaborator'>('note');
  const [newDesc, setNewDesc] = useState('');
  const [newTagsStr, setNewTagsStr] = useState('');
  const [newMetaStr, setNewMetaStr] = useState('{}');

  const nodesRef = useRef<GraphNode[]>([]);
  const selectedNodeRef = useRef<GraphNode | null>(null);
  const hoveredNodeRef = useRef<GraphNode | null>(null);
  const dragNodeRef = useRef<GraphNode | null>(null);

  // Sync references to prevent stale closures in canvas animation loop
  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  useEffect(() => {
    selectedNodeRef.current = selectedNode;
  }, [selectedNode]);

  useEffect(() => {
    hoveredNodeRef.current = hoveredNode;
  }, [hoveredNode]);

  // Synchronize state and crawl VFS to build the unified Spatial Semantic Memory Graph
  useEffect(() => {
    const semanticNodes = state.semanticNodes || [];
    const semanticLinks = state.semanticLinks || [];

    const mergedNodes: GraphNode[] = [];
    const mergedLinks: GraphLink[] = [];

    // 1. Load all high-level persistent semantic nodes
    semanticNodes.forEach(node => {
      const existing = nodesRef.current.find(n => n.id === node.id);
      
      let size = 12;
      if (node.type === 'project') size = 20;
      else if (node.type === 'session') size = 17;
      else if (node.type === 'workflow') size = 15;
      else if (node.type === 'collaborator') size = 14;
      else if (node.type === 'app') size = 13;
      else if (node.type === 'note') size = 11;
      else if (node.type === 'file') size = 10;

      mergedNodes.push({
        id: node.id,
        name: node.name,
        type: node.type,
        description: node.description,
        tags: node.tags || [],
        metadata: node.metadata || '{}',
        x: existing ? existing.x : 100 + Math.random() * (containerRef.current?.clientWidth ? containerRef.current.clientWidth - 200 : 400),
        y: existing ? existing.y : 80 + Math.random() * (containerRef.current?.clientHeight ? containerRef.current.clientHeight - 160 : 260),
        vx: existing ? existing.vx : 0,
        vy: existing ? existing.vy : 0,
        size
      });
    });

    // Load all persistent semantic links
    semanticLinks.forEach(link => {
      mergedLinks.push({
        source: link.source,
        target: link.target,
        relationship: link.relationship,
        weight: link.weight
      });
    });

    // 2. Crawl VFS files and notes to link them organically into our project nodes
    const crawlVFS = (node: VFSNode, path: string = '') => {
      const currentPath = path ? `${path}/${node.name}` : node.name;
      
      if (node.type === 'dir') {
        Object.values(node.children).forEach(child => {
          crawlVFS(child, currentPath);
        });
      } else {
        const fileNodeId = `vfs-file-${currentPath.replace(/\//g, '-')}`;
        
        // If the file is not already represented in semanticNodes, let's create a beautiful dynamic link
        if (!mergedNodes.some(n => n.id === fileNodeId)) {
          const isMarkdown = node.name.endsWith('.md') || node.name.endsWith('.txt');
          const nodeType = isMarkdown ? 'note' : 'file';
          
          const existing = nodesRef.current.find(n => n.id === fileNodeId);
          
          mergedNodes.push({
            id: fileNodeId,
            name: node.name,
            type: nodeType,
            description: `Workspace virtual file located at ${currentPath}`,
            tags: node.tags || ['vfs'],
            metadata: JSON.stringify({ path: currentPath, category: node.category || 'general' }),
            x: existing ? existing.x : 100 + Math.random() * (containerRef.current?.clientWidth ? containerRef.current.clientWidth - 200 : 400),
            y: existing ? existing.y : 80 + Math.random() * (containerRef.current?.clientHeight ? containerRef.current.clientHeight - 160 : 260),
            vx: existing ? existing.vx : 0,
            vy: existing ? existing.vy : 0,
            size: isMarkdown ? 11 : 10
          });

          // Establish knowledge linking: link files/notes to the main Project Node ("project-kernel")
          if (mergedNodes.some(n => n.id === 'project-kernel')) {
            mergedLinks.push({
              source: fileNodeId,
              target: 'project-kernel',
              relationship: isMarkdown ? 'documents' : 'part_of',
              weight: 0.65
            });
          }
        }
      }
    };

    crawlVFS(state.vfs);

    setNodes(mergedNodes);
    setLinks(mergedLinks);
  }, [state.semanticNodes, state.semanticLinks, state.vfs]);

  // Canvas loop & Interactive Physics Engine
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = containerRef.current?.clientWidth || 500);
    let height = (canvas.height = containerRef.current?.clientHeight || 400);

    const handleResize = () => {
      if (containerRef.current) {
        width = canvas.width = containerRef.current.clientWidth;
        height = canvas.height = containerRef.current.clientHeight;
      }
    };
    window.addEventListener('resize', handleResize);

    let animationFrameId: number;

    const animate = () => {
      const activeNodes = nodesRef.current;
      const activeLinks = links;

      // Physics loop configurations
      const kRepulsion = 1400;
      const kLink = 0.085;
      const damping = 0.86;
      const centerForce = 0.012;

      const cx = width / 2;
      const cy = height / 2;

      // 1. Repulsion force between ALL node pairs
      for (let i = 0; i < activeNodes.length; i++) {
        const n1 = activeNodes[i];
        for (let j = i + 1; j < activeNodes.length; j++) {
          const n2 = activeNodes[j];
          const dx = n2.x - n1.x;
          const dy = n2.y - n1.y;
          const distSq = dx * dx + dy * dy + 0.01;
          const dist = Math.sqrt(distSq);

          if (dist < 180) {
            const force = kRepulsion / distSq;
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;

            if (!n1.isDragging) { n1.vx -= fx; n1.vy -= fy; }
            if (!n2.isDragging) { n2.vx += fx; n2.vy += fy; }
          }
        }
      }

      // 2. Link force pulling connected nodes closer
      activeLinks.forEach(link => {
        const sourceNode = activeNodes.find(n => n.id === link.source);
        const targetNode = activeNodes.find(n => n.id === link.target);

        if (sourceNode && targetNode) {
          const dx = targetNode.x - sourceNode.x;
          const dy = targetNode.y - sourceNode.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 0.01;
          
          // Resting spring length is 95px
          const force = (dist - 100) * kLink;
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;

          if (!sourceNode.isDragging) { sourceNode.vx += fx; sourceNode.vy += fy; }
          if (!targetNode.isDragging) { targetNode.vx -= fx; targetNode.vy -= fy; }
        }
      });

      // 3. Update positions & apply gravity towards center
      activeNodes.forEach(node => {
        if (!node.isDragging) {
          node.vx += (cx - node.x) * centerForce;
          node.vy += (cy - node.y) * centerForce;

          node.vx *= damping;
          node.vy *= damping;

          node.vx = Math.max(-10, Math.min(10, node.vx));
          node.vy = Math.max(-10, Math.min(10, node.vy));

          node.x += node.vx;
          node.y += node.vy;

          // Constraints within spatial canvas boundaries
          node.x = Math.max(25, Math.min(width - 25, node.x));
          node.y = Math.max(25, Math.min(height - 25, node.y));
        }
      });

      // RENDER CANVAS SCENE GRAPH
      ctx.clearRect(0, 0, width, height);

      // 1. Draw dynamic cybergrid background (faint coordinates + concentric circles)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.012)';
      ctx.lineWidth = 0.8;
      const gridSize = 40;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Draw faint tactical radar circles in center
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
      ctx.beginPath();
      ctx.arc(cx, cy, 100, 0, Math.PI * 2);
      ctx.arc(cx, cy, 220, 0, Math.PI * 2);
      ctx.arc(cx, cy, 350, 0, Math.PI * 2);
      ctx.stroke();

      // Faint center crosshairs
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.beginPath();
      ctx.moveTo(cx - 30, cy);
      ctx.lineTo(cx + 30, cy);
      ctx.moveTo(cx, cy - 30);
      ctx.lineTo(cx, cy + 30);
      ctx.stroke();

      // Distinct visual color mapping based on semantic node types
      const getNodeTypeColors = (type: string) => {
        if (type === 'project') return '0, 240, 255'; // neon cyan
        if (type === 'session') return '139, 92, 246'; // nebula purple
        if (type === 'workflow') return '249, 115, 22'; // fiery orange
        if (type === 'collaborator') return '245, 158, 11'; // amber yellow
        if (type === 'app') return '16, 185, 129'; // emerald green
        if (type === 'note') return '217, 70, 239'; // pastel magenta
        return '226, 232, 240'; // file (cool ice-white)
      };

      // 2. Draw glowing links with dynamic data flow particles
      activeLinks.forEach(link => {
        const sourceNode = activeNodes.find(n => n.id === link.source);
        const targetNode = activeNodes.find(n => n.id === link.target);

        if (sourceNode && targetNode) {
          const rgb = getNodeTypeColors(sourceNode.type);
          
          // Query highlighting: fade links that are not matched
          let linkAlpha = 0.16;
          if (searchQuery.trim()) {
            const sq = searchQuery.toLowerCase();
            const sourceMatch = sourceNode.name.toLowerCase().includes(sq) || sourceNode.tags.some(t => t.toLowerCase().includes(sq));
            const targetMatch = targetNode.name.toLowerCase().includes(sq) || targetNode.tags.some(t => t.toLowerCase().includes(sq));
            linkAlpha = (sourceMatch && targetMatch) ? 0.45 : 0.03;
          }

          // Draw the physical relation line
          ctx.beginPath();
          ctx.moveTo(sourceNode.x, sourceNode.y);
          ctx.lineTo(targetNode.x, targetNode.y);
          ctx.strokeStyle = `rgba(${rgb}, ${linkAlpha})`;
          ctx.lineWidth = link.weight ? 1.0 + link.weight * 1.5 : 1.5;
          
          if (link.weight && link.weight < 0.8) {
            ctx.setLineDash([4, 4]); // Dashed lines for lighter relationships
          } else {
            ctx.setLineDash([]);
          }
          ctx.stroke();
          ctx.setLineDash([]); // Reset line dash

          // Draw animated pulse wave particle traveling along the vector
          const speedFactor = link.weight ? link.weight * 1.4 : 1.0;
          const pulseTime = (Date.now() * 0.001 * speedFactor) % 1;
          const px = sourceNode.x + (targetNode.x - sourceNode.x) * pulseTime;
          const py = sourceNode.y + (targetNode.y - sourceNode.y) * pulseTime;
          
          ctx.beginPath();
          ctx.arc(px, py, 2.5, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${rgb}, ${searchQuery.trim() ? linkAlpha * 2 : 0.85})`;
          ctx.shadowColor = `rgba(${rgb}, 0.8)`;
          ctx.shadowBlur = 6;
          ctx.fill();
          ctx.shadowBlur = 0; // Reset shadow

          // Draw relationship title on hover / selected focus
          const isSourceFocus = selectedNodeRef.current?.id === sourceNode.id || hoveredNodeRef.current?.id === sourceNode.id;
          const isTargetFocus = selectedNodeRef.current?.id === targetNode.id || hoveredNodeRef.current?.id === targetNode.id;
          
          if (isSourceFocus || isTargetFocus) {
            const mx = (sourceNode.x + targetNode.x) / 2;
            const my = (sourceNode.y + targetNode.y) / 2;
            ctx.font = '7.5px "Fira Code", monospace';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
            ctx.textAlign = 'center';
            ctx.fillText(link.relationship || 'links', mx, my - 6);
          }
        }
      });

      // 3. Draw nodes styled with unique visual geometries
      activeNodes.forEach(node => {
        const isSelected = selectedNodeRef.current?.id === node.id;
        const isHovered = hoveredNodeRef.current?.id === node.id;
        const rgb = getNodeTypeColors(node.type);

        // Search query filter
        let isMatched = true;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          isMatched = node.name.toLowerCase().includes(q) || 
                      node.type.toLowerCase().includes(q) || 
                      node.tags.some(t => t.toLowerCase().includes(q)) ||
                      node.description.toLowerCase().includes(q);
        }

        const globalAlpha = searchQuery.trim() ? (isMatched ? 1.0 : 0.22) : 1.0;
        ctx.save();
        ctx.globalAlpha = globalAlpha;

        // Animated target scanner rings for hovered/selected nodes
        if (isSelected || isHovered) {
          ctx.save();
          ctx.translate(node.x, node.y);
          ctx.rotate(Date.now() * (isHovered ? 0.0015 : 0.0008));
          
          ctx.strokeStyle = `rgba(${rgb}, ${isHovered ? 0.8 : 0.45})`;
          ctx.lineWidth = 1.0;
          ctx.setLineDash([3, 5]);
          
          ctx.beginPath();
          ctx.arc(0, 0, node.size + 11, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();

          // Outer diagnostic crosshair ticks
          ctx.strokeStyle = `rgba(${rgb}, 0.85)`;
          ctx.lineWidth = 1.2;
          const tickLen = 4;
          const angles = [0, Math.PI/2, Math.PI, Math.PI * 1.5];
          angles.forEach(angle => {
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);
            ctx.beginPath();
            ctx.moveTo(node.x + cos * (node.size + 6), node.y + sin * (node.size + 6));
            ctx.lineTo(node.x + cos * (node.size + 6 + tickLen), node.y + sin * (node.size + 6 + tickLen));
            ctx.stroke();
          });
        }

        // Faint glowing backdrop
        const nodeGlow = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, node.size + (isSelected ? 18 : 8));
        nodeGlow.addColorStop(0, `rgba(${rgb}, ${isSelected ? 0.28 : 0.1})`);
        nodeGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = nodeGlow;
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.size + (isSelected ? 18 : 8), 0, Math.PI * 2);
        ctx.fill();

        // Spatial Node fill gradient
        const nodeGrad = ctx.createRadialGradient(
          node.x - node.size * 0.25,
          node.y - node.size * 0.25,
          0,
          node.x,
          node.y,
          node.size
        );
        nodeGrad.addColorStop(0, isSelected ? '#ffffff' : `rgba(${rgb}, 0.85)`);
        nodeGrad.addColorStop(1, isSelected ? `rgba(${rgb}, 0.25)` : 'rgba(11, 15, 23, 0.95)');

        ctx.fillStyle = nodeGrad;
        ctx.strokeStyle = isSelected ? '#ffffff' : `rgba(${rgb}, 0.85)`;
        ctx.lineWidth = isSelected ? 2.0 : 1.2;

        // Custom Geometric Shapes by Semantic Category
        if (node.type === 'project') {
          // Double circle ring
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.size - 4.5, 0, Math.PI * 2);
          ctx.strokeStyle = isSelected ? 'rgba(255, 255, 255, 0.45)' : `rgba(${rgb}, 0.45)`;
          ctx.lineWidth = 0.8;
          ctx.stroke();
        } 
        else if (node.type === 'app') {
          // Sharp bounding square
          ctx.beginPath();
          ctx.rect(node.x - node.size, node.y - node.size, node.size * 2, node.size * 2);
          ctx.fill();
          ctx.stroke();
        } 
        else if (node.type === 'workflow') {
          // Tech Hexagon
          ctx.beginPath();
          for (let side = 0; side < 6; side++) {
            const angle = (side * Math.PI) / 3;
            const hx = node.x + Math.cos(angle) * node.size;
            const hy = node.y + Math.sin(angle) * node.size;
            if (side === 0) ctx.moveTo(hx, hy);
            else ctx.lineTo(hx, hy);
          }
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        } 
        else if (node.type === 'session') {
          // Frosted capsule structure
          ctx.beginPath();
          const r = node.size * 0.7;
          const w = node.size * 1.4;
          ctx.arc(node.x - w/2 + r, node.y - r, r, Math.PI/2, Math.PI * 1.5);
          ctx.lineTo(node.x + w/2 - r, node.y - r);
          ctx.arc(node.x + w/2 - r, node.y + r, r, Math.PI * 1.5, Math.PI/2);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        } 
        else if (node.type === 'collaborator') {
          // Diamond polygon
          ctx.beginPath();
          ctx.moveTo(node.x, node.y - node.size);
          ctx.lineTo(node.x + node.size, node.y);
          ctx.lineTo(node.x, node.y + node.size);
          ctx.lineTo(node.x - node.size, node.y);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        } 
        else if (node.type === 'note') {
          // Rounded square notepad
          const size = node.size;
          const radius = 3;
          ctx.beginPath();
          ctx.moveTo(node.x - size + radius, node.y - size);
          ctx.lineTo(node.x + size - radius, node.y - size);
          ctx.quadraticCurveTo(node.x + size, node.y - size, node.x + size, node.y - size + radius);
          ctx.lineTo(node.x + size, node.y + size - radius);
          ctx.quadraticCurveTo(node.x + size, node.y + size, node.x + size - radius, node.y + size);
          ctx.lineTo(node.x - size + radius, node.y + size);
          ctx.quadraticCurveTo(node.x - size, node.y + size, node.x - size, node.y + size - radius);
          ctx.lineTo(node.x - size, node.y - size + radius);
          ctx.quadraticCurveTo(node.x - size, node.y - size, node.x - size + radius, node.y - size);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
        else {
          // File: Standard Core Circle
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }

        // Render type emoji center glyph
        const getGlyph = (t: string) => {
          if (t === 'project') return '⚛️';
          if (t === 'session') return '🔮';
          if (t === 'workflow') return '⚡';
          if (t === 'collaborator') return '🤖';
          if (t === 'app') return '⚙️';
          if (t === 'note') return '📝';
          return '📄';
        };

        ctx.font = `${node.size * 0.75}px "Fira Code", monospace`;
        ctx.fillStyle = isSelected ? '#000000' : '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(getGlyph(node.type), node.x, node.y);

        // Capsule capsule file name title tag
        ctx.font = '8px "Fira Code", monospace';
        const labelWidth = ctx.measureText(node.name).width;
        const capW = labelWidth + 8;
        const capH = 12;
        const capX = node.x - capW / 2;
        const capY = node.y - node.size - 16;

        // Draw pill tag
        ctx.fillStyle = 'rgba(7, 9, 13, 0.88)';
        ctx.fillRect(capX, capY, capW, capH);
        ctx.strokeStyle = isSelected ? `rgba(${rgb}, 0.85)` : 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = 0.8;
        ctx.strokeRect(capX, capY, capW, capH);

        // File label
        ctx.fillStyle = isSelected ? `rgba(${rgb}, 1.0)` : 'rgba(255, 255, 255, 0.85)';
        ctx.fillText(node.name, node.x, capY + capH / 2);

        ctx.restore();
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, [links, state.theme, searchQuery]);

  // Click / Drag Handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Check click hit inside any node (size + buffer)
    const clickedNode = nodes.find(n => {
      const dx = n.x - clickX;
      const dy = n.y - clickY;
      return Math.sqrt(dx * dx + dy * dy) < n.size + 10;
    });

    if (clickedNode) {
      playSound.click();
      setSelectedNode(clickedNode);
      dragNodeRef.current = clickedNode;
      clickedNode.isDragging = true;
      clickedNode.vx = 0;
      clickedNode.vy = 0;
    } else {
      setSelectedNode(null);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const moveX = e.clientX - rect.left;
    const moveY = e.clientY - rect.top;

    if (dragNodeRef.current) {
      const node = dragNodeRef.current;
      node.x = Math.max(15, Math.min(canvasRef.current.width - 15, moveX));
      node.y = Math.max(15, Math.min(canvasRef.current.height - 15, moveY));
      node.vx = 0;
      node.vy = 0;
      return;
    }

    // Check hover state
    const foundHover = nodes.find(n => {
      const dx = n.x - moveX;
      const dy = n.y - moveY;
      return Math.sqrt(dx * dx + dy * dy) < n.size + 8;
    });

    if (foundHover !== hoveredNode) {
      setHoveredNode(foundHover || null);
    }
  };

  const handleMouseUp = () => {
    if (dragNodeRef.current) {
      dragNodeRef.current.isDragging = false;
      dragNodeRef.current = null;
    }
  };

  const handleDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const clicked = nodes.find(n => {
      const dx = n.x - clickX;
      const dy = n.y - clickY;
      return Math.sqrt(dx * dx + dy * dy) < n.size + 10;
    });

    if (clicked) {
      triggerActiveNodeAction(clicked);
    }
  };

  const triggerActiveNodeAction = (node: GraphNode) => {
    playSound.success();
    
    if (node.type === 'file' || node.type === 'note') {
      // Launch Editor / Notes
      store.openWindow('editor');
      store.addNotification('Semantic Node Action', `Opened file target ${node.name} inside Editor workspace.`, 'Just now');
    } 
    else if (node.type === 'session' || node.type === 'project') {
      // Environment Reconstruction
      store.reconstructEnvironment(node.metadata);
    } 
    else if (node.type === 'workflow') {
      // Trigger Workflow sequence
      store.runWorkflow(node.name);
    } 
    else if (node.type === 'app') {
      // Open linked desktop window
      const appId = node.id.replace('app-', '');
      store.openWindow(appId);
      store.addNotification('Application Launched', `Opened ${node.name} via Semantic Memory Graph.`, 'Just now');
    }
    else if (node.type === 'collaborator') {
      // Trigger corresponding optimization daemon optimization audit logs
      store.runWorkflow('agent-optimization');
    }
  };

  const handleCreateNode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newId || !newName) return;

    let parsedMeta = {};
    try {
      parsedMeta = JSON.parse(newMetaStr);
    } catch(e) {
      store.addNotification('Error Parsing Metadata', 'Failed to parse raw JSON metadata input. Defaulting to empty.', 'Just now');
    }

    const tagsList = newTagsStr.split(',').map(t => t.trim()).filter(Boolean);

    store.addSemanticNode(
      newId.trim(),
      newName.trim(),
      newType,
      newDesc.trim(),
      tagsList,
      parsedMeta
    );

    store.addNotification('Semantic Node Created', `Added node ${newName} to persistent cognition loop.`, 'Just now');
    playSound.success();

    // Reset Form
    setNewId('');
    setNewName('');
    setNewDesc('');
    setNewTagsStr('');
    setNewMetaStr('{}');
    setShowAddNode(false);
  };



  const textTheme = 
    state.theme === 'purple' ? 'text-purple-400' :
    state.theme === 'green' ? 'text-emerald-400' :
    state.theme === 'orange' ? 'text-orange-400' :
    'text-cyan-400';

  const accentBorder = 
    state.theme === 'purple' ? 'border-purple-500/20' :
    state.theme === 'green' ? 'border-emerald-500/20' :
    state.theme === 'orange' ? 'border-orange-500/20' :
    'border-cyan-500/20';

  const glowButtonClass = 
    state.theme === 'purple' ? 'from-purple-600/30 to-fuchsia-600/30 border-purple-500/50 hover:from-purple-600/50 hover:to-fuchsia-600/50 hover:border-purple-400 hover:shadow-[0_0_15px_rgba(217,70,239,0.35)]' :
    state.theme === 'green' ? 'from-emerald-600/30 to-teal-600/30 border-emerald-500/50 hover:from-emerald-600/50 hover:to-teal-600/50 hover:border-emerald-400 hover:shadow-[0_0_15px_rgba(16,185,129,0.35)]' :
    state.theme === 'orange' ? 'from-orange-600/30 to-amber-600/30 border-orange-500/50 hover:from-orange-600/50 hover:to-amber-600/50 hover:border-orange-400 hover:shadow-[0_0_15px_rgba(249,115,22,0.35)]' :
    'from-cyan-600/30 to-blue-600/30 border-cyan-500/50 hover:from-cyan-600/50 hover:to-blue-600/50 hover:border-cyan-400 hover:shadow-[0_0_15px_rgba(6,182,212,0.35)]';

  return (
    <div className="flex-1 bg-[#06080b]/95 text-xs font-mono h-full flex select-none overflow-hidden relative">
      {/* Dynamic Graph Canvas Area */}
      <div 
        ref={containerRef} 
        className="flex-1 h-full relative cursor-grab active:cursor-grabbing border-r border-white/5"
      >
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onDoubleClick={handleDoubleClick}
          className="absolute inset-0 w-full h-full block"
        />
        
        {/* Hover / Status Node Info HUD Overlay */}
        {hoveredNode && (
          <div className="absolute top-3 left-3 bg-[#0a0d12]/90 border border-white/10 rounded p-2.5 space-y-1 select-none pointer-events-none max-w-xs shadow-2xl backdrop-blur-md animate-fade-in">
            <div className="flex items-center space-x-1.5">
              <span className={`text-[8px] px-1 py-0.5 rounded font-bold uppercase tracking-wider bg-white/5 text-[9px] ${
                hoveredNode.type === 'project' ? 'text-cyan-400' :
                hoveredNode.type === 'session' ? 'text-violet-400' :
                hoveredNode.type === 'workflow' ? 'text-orange-400' :
                hoveredNode.type === 'collaborator' ? 'text-amber-400' :
                hoveredNode.type === 'app' ? 'text-emerald-400' :
                hoveredNode.type === 'note' ? 'text-fuchsia-400' : 'text-slate-300'
              }`}>
                {hoveredNode.type}
              </span>
              <span className="text-white font-bold text-[10.5px] uppercase tracking-wide">{hoveredNode.name}</span>
            </div>
            <p className="text-[8.5px] text-white/50 leading-relaxed font-sans">{hoveredNode.description}</p>
          </div>
        )}

        {/* Floating Controls Info Bar */}
        <div className="absolute bottom-3 left-3 bg-[#080a0f]/80 border border-white/5 rounded px-2.5 py-1 text-[8.5px] text-white/40 uppercase tracking-widest flex items-center space-x-2 pointer-events-none">
          <Share2 className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
          <span>Double-click: Trigger Action / Reconstruct // Drag: Layout positions // Scroll: zoom simulation</span>
        </div>
      </div>

      {/* Side Sector Metadata Inspector & Controls Panel */}
      <div className="w-72 flex flex-col justify-between bg-[#080b0e]/95 border-l border-white/5 relative z-10">
        
        {/* Search and Node Action Header */}
        <div className="p-4 border-b border-white/5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1.5 uppercase text-[9px] tracking-widest text-white/40 font-bold">
              <Network className="w-3.5 h-3.5 text-current" style={{ color: 'var(--theme-color)' }} />
              <span>Semantic Cognition</span>
            </div>
            <button 
              onClick={() => {
                playSound.click();
                setShowAddNode(!showAddNode);
              }}
              className="p-1 hover:bg-white/5 rounded border border-white/5 hover:border-white/10 transition text-white/70"
              title="Add Cognitive Node"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Glowing Search Bar */}
          <div className="relative">
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Tag, Workflow or Node..."
              className="w-full bg-[#050608] border border-white/5 focus:border-cyan-500/40 rounded px-2.5 py-1.5 text-[9.5px] text-white placeholder-white/20 uppercase tracking-wide focus:outline-none transition"
            />
            <Search className="w-3 h-3 text-white/20 absolute right-2.5 top-2" />
          </div>
        </div>

        {/* Add Node Dialog Drawer overlays or renders inside Side Panel */}
        {showAddNode ? (
          <form onSubmit={handleCreateNode} className="flex-1 p-4 border-b border-white/5 space-y-3.5 overflow-y-auto scrollbar-thin">
            <div className="flex justify-between items-center pb-1 border-b border-white/5">
              <span className="text-[8.5px] uppercase font-bold text-white/40 tracking-wider">Add Semantic Node</span>
              <button 
                type="button" 
                onClick={() => setShowAddNode(false)}
                className="text-white/30 hover:text-white/60 font-sans"
              >
                ✕
              </button>
            </div>

            <div className="space-y-1">
              <label className="text-[8px] text-white/30 uppercase font-bold">Node Unique ID</label>
              <input 
                type="text" 
                value={newId} 
                onChange={(e) => setNewId(e.target.value)}
                placeholder="e.g. project-game" 
                className="w-full bg-[#050608] border border-white/5 rounded p-1.5 text-[9.5px] text-white focus:outline-none focus:border-cyan-500/40 transition" 
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[8px] text-white/30 uppercase font-bold">Node Title Name</label>
              <input 
                type="text" 
                value={newName} 
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Sentinel Engine" 
                className="w-full bg-[#050608] border border-white/5 rounded p-1.5 text-[9.5px] text-white focus:outline-none focus:border-cyan-500/40 transition" 
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[8px] text-white/30 uppercase font-bold">Semantic Category</label>
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value as any)}
                className="w-full bg-[#050608] border border-white/5 rounded p-1.5 text-[9.5px] text-white focus:outline-none focus:border-cyan-500/40 transition font-mono"
              >
                <option value="project">Project Core</option>
                <option value="session">Session Layout</option>
                <option value="workflow">Workflow Script</option>
                <option value="collaborator">AI Collaborator Agent</option>
                <option value="app">Desktop App</option>
                <option value="note">Markdown Note</option>
                <option value="file">System Code File</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[8px] text-white/30 uppercase font-bold">Description Profile</label>
              <textarea 
                value={newDesc} 
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Brief summary of semantic meaning..." 
                className="w-full bg-[#050608] border border-white/5 rounded p-1.5 text-[9.5px] text-white focus:outline-none focus:border-cyan-500/40 transition h-14 font-mono leading-relaxed" 
              />
            </div>

            <div className="space-y-1">
              <label className="text-[8px] text-white/30 uppercase font-bold">Tags (comma-separated)</label>
              <input 
                type="text" 
                value={newTagsStr} 
                onChange={(e) => setNewTagsStr(e.target.value)}
                placeholder="rust, engine, core" 
                className="w-full bg-[#050608] border border-white/5 rounded p-1.5 text-[9.5px] text-white focus:outline-none focus:border-cyan-500/40 transition" 
              />
            </div>

            <div className="space-y-1">
              <label className="text-[8px] text-white/30 uppercase font-bold">Raw JSON Metadata</label>
              <textarea 
                value={newMetaStr} 
                onChange={(e) => setNewMetaStr(e.target.value)}
                placeholder='{"layout": "dev", "windows": ["terminal"]}' 
                className="w-full bg-[#050608] border border-white/5 rounded p-1.5 text-[8.5px] text-white focus:outline-none focus:border-cyan-500/40 transition h-16 font-mono select-all whitespace-pre leading-relaxed" 
              />
            </div>

            <button
              type="submit"
              className={`w-full py-2 bg-gradient-to-r ${glowButtonClass} text-[9.5px] rounded font-bold uppercase transition flex items-center justify-center space-x-1.5`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Link New Node</span>
            </button>
          </form>
        ) : (
          /* Selected Node Details Sector */
          <div className="flex-1 p-4 overflow-y-auto scrollbar-thin space-y-4">
            {selectedNode ? (
              <div className="space-y-4 animate-fade-in select-text">
                <div>
                  <div className="flex items-center space-x-1.5 mb-1">
                    <span className={`text-[8.5px] font-bold px-1.5 py-0.5 rounded tracking-widest uppercase ${
                      selectedNode.type === 'project' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' :
                      selectedNode.type === 'session' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                      selectedNode.type === 'workflow' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' :
                      selectedNode.type === 'collaborator' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                      selectedNode.type === 'app' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                      selectedNode.type === 'note' ? 'bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/20' :
                      'bg-slate-500/10 text-slate-300 border border-slate-500/20'
                    }`}>
                      {selectedNode.type}
                    </span>
                  </div>
                  <h4 className="text-white font-bold text-xs uppercase tracking-widest flex items-center mt-1.5">
                    <FileText className="w-3.5 h-3.5 text-white/40 mr-1.5 flex-shrink-0" />
                    {selectedNode.name}
                  </h4>
                </div>

                <div className="space-y-1">
                  <span className="text-[8px] text-white/30 uppercase font-bold">System Identity</span>
                  <div className="text-[9.5px] leading-relaxed text-white/60 font-mono select-all">
                    {selectedNode.id}
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[8px] text-white/30 uppercase font-bold">Cognitive Description</span>
                  <p className="text-[9.5px] leading-relaxed text-white/70 font-sans border-l-2 border-white/5 pl-2 select-text">
                    {selectedNode.description}
                  </p>
                </div>

                {selectedNode.tags.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-[8px] text-white/30 uppercase font-bold">Index Tags</span>
                    <div className="flex flex-wrap gap-1">
                      {selectedNode.tags.map(tag => (
                        <span key={tag} className={`text-[8.5px] bg-white/5 border ${accentBorder} rounded px-1.5 py-0.5 uppercase ${textTheme}`}>
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Cognitive Reconstruction Solver Actions */}
                <div className="space-y-2 pt-2">
                  <span className="text-[8px] text-white/30 uppercase font-bold">Spatial Orchestration</span>
                  
                  {/* Project or Session node -> Reconstruct Environment */}
                  {(selectedNode.type === 'session' || selectedNode.type === 'project') && (
                    <button
                      onClick={() => triggerActiveNodeAction(selectedNode)}
                      className={`w-full py-2 bg-gradient-to-r ${glowButtonClass} text-[9.5px] rounded font-bold uppercase transition flex items-center justify-center space-x-1.5 text-white`}
                    >
                      <Sparkles className="w-3.5 h-3.5 text-white animate-pulse" />
                      <span>Reconstruct Workspace</span>
                    </button>
                  )}

                  {/* Workflow node -> Execute script workflow */}
                  {selectedNode.type === 'workflow' && (
                    <button
                      onClick={() => triggerActiveNodeAction(selectedNode)}
                      className="w-full py-2 bg-gradient-to-r from-orange-600/30 to-amber-600/30 border border-orange-500/50 hover:from-orange-600/50 hover:to-amber-600/50 hover:border-orange-400 hover:shadow-[0_0_15px_rgba(249,115,22,0.35)] text-[9.5px] rounded font-bold uppercase transition flex items-center justify-center space-x-1.5 text-white"
                    >
                      <Zap className="w-3.5 h-3.5 text-orange-400 animate-pulse" />
                      <span>Execute Workflow</span>
                    </button>
                  )}

                  {/* Application node -> Launch app */}
                  {selectedNode.type === 'app' && (
                    <button
                      onClick={() => triggerActiveNodeAction(selectedNode)}
                      className="w-full py-2 bg-emerald-600/20 border border-emerald-500/40 hover:bg-emerald-600/45 hover:border-emerald-400 text-[9.5px] rounded font-bold uppercase transition flex items-center justify-center space-x-1.5 text-white"
                    >
                      <Terminal className="w-3.5 h-3.5 text-emerald-400 mr-1" />
                      <span>Launch Application</span>
                    </button>
                  )}

                  {/* File or Note node -> Open in editor */}
                  {(selectedNode.type === 'file' || selectedNode.type === 'note') && (
                    <button
                      onClick={() => triggerActiveNodeAction(selectedNode)}
                      className="w-full py-2 bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 text-[9.5px] rounded font-bold uppercase transition flex items-center justify-center space-x-1.5 text-white"
                    >
                      <BookOpen className="w-3.5 h-3.5 text-white/50" />
                      <span>Open in Editor</span>
                    </button>
                  )}
                </div>

                {/* JSON Metadata Payload viewer */}
                {selectedNode.metadata && selectedNode.metadata !== '{}' && (
                  <div className="space-y-1">
                    <span className="text-[8px] text-white/30 uppercase font-bold">Metadata Payload</span>
                    <div className="bg-[#050608] border border-white/5 rounded p-2.5 max-h-36 overflow-y-auto scrollbar-thin text-[8.5px] leading-relaxed text-white/60 whitespace-pre-wrap font-mono select-all">
                      {(() => {
                        try {
                          return JSON.stringify(JSON.parse(selectedNode.metadata), null, 2);
                        } catch(e) {
                          return selectedNode.metadata;
                        }
                      })()}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center text-white/25 py-28 space-y-3.5 uppercase select-none">
                <Network className="w-8 h-8 stroke-[1] text-white/15 animate-pulse" />
                <p className="text-[8.5px] tracking-widest leading-relaxed">
                  Memory Graph Idle<br/>
                  <span className="text-white/15">Select any semantic node core on the canvas to inspect relationship vectors</span>
                </p>
              </div>
            )}
          </div>
        )}

        {/* Global Spatial Graph Stats */}
        <div className="p-4 border-t border-white/5 space-y-2 bg-[#07090c]">
          <div className="space-y-1.5 text-[8.5px] text-white/30 uppercase">
            <div className="flex justify-between">
              <span>High-Level Contexts</span>
              <span className="font-mono text-white/50">{state.semanticNodes?.length || 0}</span>
            </div>
            <div className="flex justify-between">
              <span>Index Connections</span>
              <span className="font-mono text-white/50">{state.semanticLinks?.length || 0}</span>
            </div>
            <div className="flex justify-between">
              <span>Workspace VFS Nodes</span>
              <span className="font-mono text-white/50">{nodes.length}</span>
            </div>
            <div className="flex justify-between border-t border-white/5 pt-1.5 mt-1 text-white/45">
              <span>Cognitive Memory State</span>
              <span className={`font-bold uppercase ${textTheme}`}>Synchronized</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
