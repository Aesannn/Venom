import React, { useState, useEffect, useRef } from 'react';
import { store, useSystemState } from '../../store/systemStore';
import { playSound } from '../../utils/audio';
import { BookOpen, Plus, Sparkles, Brain } from 'lucide-react';

interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  x: number; // for neural graph position
  y: number;
}

export const NeuralNotes: React.FC = () => {
  const state = useSystemState();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [notes, setNotes] = useState<Note[]>([
    { id: 'note-1', title: 'welcome.txt', content: '', tags: ['intro', 'welcome'], x: 120, y: 100 },
    { id: 'note-2', title: 'neural_notes.txt', content: '', tags: ['notes', 'ai'], x: 260, y: 150 },
    { id: 'note-3', title: 'quantum_core.js', content: '', tags: ['code', 'simulation'], x: 180, y: 220 }
  ]);
  const [activeNoteId, setActiveNoteId] = useState('note-2');

  const activeNote = notes.find(n => n.id === activeNoteId) || notes[0];

  // Sync contents from VFS on load
  useEffect(() => {
    const vfs = state.vfs;
    // Helper to find file content in VFS
    const getFileContent = (path: string): string => {
      const parts = path.split('/').filter(Boolean);
      let curr: any = vfs;
      for (const part of parts) {
        if (curr.children && curr.children[part]) {
          curr = curr.children[part];
        } else {
          return '';
        }
      }
      return curr.content || '';
    };

    setNotes(prev => prev.map(n => {
      const content = getFileContent(`/home/aether/${n.title}`);
      return { ...n, content: content || `// empty note ${n.title}` };
    }));
  }, [state.vfs]);

  // Handle note editor content change (autosave)
  const handleContentChange = (val: string) => {
    setNotes(prev => prev.map(n => {
      if (n.id === activeNoteId) {
        return { ...n, content: val };
      }
      return n;
    }));

    // Autosave directly back to VFS!
    store.writeVfsFile(`/home/aether/${activeNote.title}`, val);
  };

  const handleTitleChange = (val: string) => {
    // If name changing, delete old VFS node and create new VFS node
    const oldTitle = activeNote.title;
    const cleanTitle = val.trim();
    if (!cleanTitle) return;

    setNotes(prev => prev.map(n => {
      if (n.id === activeNoteId) {
        return { ...n, title: cleanTitle };
      }
      return n;
    }));

    // Update VFS
    const originalTerminalPath = store.getState().currentDirPath;
    store.getState().currentDirPath = '/home/aether';
    store.deleteVfsNode(oldTitle);
    store.createVfsNode(cleanTitle, 'file', activeNote.content);
    store.getState().currentDirPath = originalTerminalPath;
  };

  const handleAddNote = () => {
    playSound.click();
    const newId = `note-${Date.now()}`;
    const newTitle = `note_${notes.length + 1}.txt`;
    const newNote: Note = {
      id: newId,
      title: newTitle,
      content: '# New Neural Note\nWrite content here...',
      tags: ['draft'],
      x: 100 + Math.random() * 200,
      y: 100 + Math.random() * 150
    };

    setNotes([...notes, newNote]);
    setActiveNoteId(newId);

    // Write to VFS
    const originalTerminalPath = store.getState().currentDirPath;
    store.getState().currentDirPath = '/home/aether';
    store.createVfsNode(newTitle, 'file', newNote.content);
    store.getState().currentDirPath = originalTerminalPath;
    store.addNotification('Note Created', `New note ${newTitle} created successfully.`, 'Just now');
  };

  const handleAiSummarize = async () => {
    playSound.click();
    store.addNotification('AI Summarizer Active', 'Parsing markdown tokens...', 'Just now');
    const prompt = `Summarize this text in 3 short cybernetic bullet points: ${activeNote.content}`;
    // Show AI app
    store.openWindow('ai-chat');
    store.sendAiMessage(prompt);
  };

  // Draw Neural Graph on Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = canvas.parentElement?.clientWidth || 360);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 300);


    const drawGraph = () => {
      ctx.clearRect(0, 0, width, height);

      // System themes colors
      let themeColor = '#00f0ff';
      let themeRgb = '0, 240, 255';
      switch (state.theme) {
        case 'purple': themeColor = '#d946ef'; themeRgb = '217, 70, 239'; break;
        case 'green': themeColor = '#10b981'; themeRgb = '16, 185, 129'; break;
        case 'orange': themeColor = '#f97316'; themeRgb = '249, 115, 22'; break;
      }

      // 1. Draw connecting lines between nodes (Knowledge Tree)
      ctx.lineWidth = 1;
      ctx.strokeStyle = `rgba(${themeRgb}, 0.12)`;
      for (let i = 0; i < notes.length; i++) {
        for (let j = i + 1; j < notes.length; j++) {
          ctx.beginPath();
          ctx.moveTo(notes[i].x, notes[i].y);
          ctx.lineTo(notes[j].x, notes[j].y);
          ctx.stroke();
        }
      }

      // 2. Draw nodes (glowing circles)
      notes.forEach((n) => {
        const isSelected = n.id === activeNoteId;

        // Glowing shadow
        ctx.shadowBlur = isSelected ? 12 : 4;
        ctx.shadowColor = isSelected ? themeColor : 'rgba(255, 255, 255, 0.2)';

        // Inner circle
        ctx.beginPath();
        ctx.arc(n.x, n.y, isSelected ? 8 : 5, 0, Math.PI * 2);
        ctx.fillStyle = isSelected ? themeColor : 'rgba(255, 255, 255, 0.3)';
        ctx.fill();

        // Outer ring
        if (isSelected) {
          ctx.shadowBlur = 0; // reset
          ctx.beginPath();
          ctx.arc(n.x, n.y, 14, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(${themeRgb}, 0.3)`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }

        // Text label
        ctx.shadowBlur = 0;
        ctx.fillStyle = isSelected ? '#ffffff' : 'rgba(255, 255, 255, 0.45)';
        ctx.font = '9px Fira Code';
        ctx.textAlign = 'center';
        ctx.fillText(n.title, n.x, n.y - 18);
      });
    };

    drawGraph();

    // Mouse click node detection
    const handleCanvasClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      // Check if clicked near any node
      const clicked = notes.find(n => {
        const dist = Math.sqrt((n.x - clickX) ** 2 + (n.y - clickY) ** 2);
        return dist < 18; // detection radius
      });

      if (clicked) {
        playSound.click();
        setActiveNoteId(clicked.id);
      }
    };

    canvas.addEventListener('mousedown', handleCanvasClick);

    const handleResize = () => {
      if (canvas.parentElement) {
        width = canvas.width = canvas.parentElement.clientWidth;
        height = canvas.height = canvas.parentElement.clientHeight;
        drawGraph();
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      canvas.removeEventListener('mousedown', handleCanvasClick);
      window.removeEventListener('resize', handleResize);
    };
  }, [notes, activeNoteId, state.theme]);

  const textTheme = 
    state.theme === 'purple' ? 'text-purple-400' :
    state.theme === 'green' ? 'text-emerald-400' :
    state.theme === 'orange' ? 'text-orange-400' :
    'text-cyan-400';

  const accentTheme = 
    state.theme === 'purple' ? 'border-purple-500 text-purple-400 focus:border-purple-400' :
    state.theme === 'green' ? 'border-emerald-500 text-emerald-400 focus:border-emerald-400' :
    state.theme === 'orange' ? 'border-orange-500 text-orange-400 focus:border-orange-400' :
    'border-cyan-500 text-cyan-400 focus:border-cyan-400';

  const scrollbarColor = 
    state.theme === 'purple' ? 'scrollbar-thumb-purple-900' :
    state.theme === 'green' ? 'scrollbar-thumb-emerald-900' :
    state.theme === 'orange' ? 'scrollbar-thumb-orange-900' :
    'scrollbar-thumb-cyan-900';

  return (
    <div className={`flex-1 flex bg-[#07090c]/90 text-xs font-mono h-full theme-${state.theme} divide-x divide-white/5`}>
      
      {/* Left panel: Note list & Editor */}
      <div className="w-1/2 flex flex-col h-full">
        {/* Header bar */}
        <div className="px-4 py-2.5 bg-[#090b0e] border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center space-x-1.5 text-white">
            <BookOpen className={`w-4 h-4 ${textTheme}`} />
            <span className="font-bold uppercase tracking-wide">Notes Library</span>
          </div>
          <button
            onClick={handleAddNote}
            className="p-1 rounded hover:bg-white/5 border border-white/10 text-white/50 hover:text-white transition flex items-center space-x-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Note</span>
          </button>
        </div>

        {/* Notes side list */}
        <div className={`flex-1 p-4 space-y-4 overflow-y-auto ${scrollbarColor}`}>
          
          {/* Note Title Input */}
          <div className="space-y-1 select-text">
            <label className="text-[9px] text-white/30 uppercase tracking-widest pl-0.5">Note Title</label>
            <input
              type="text"
              value={activeNote.title}
              onChange={(e) => handleTitleChange(e.target.value)}
              className={`w-full bg-[#0a0c10]/40 border rounded px-3 py-1.5 text-white outline-none focus:ring-1 focus:ring-current text-xs font-mono uppercase ${accentTheme}`}
            />
          </div>

          {/* Note content textarea */}
          <div className="flex-1 flex flex-col space-y-1 select-text min-h-[180px]">
            <label className="text-[9px] text-white/30 uppercase tracking-widest pl-0.5">Editor Content</label>
            <textarea
              value={activeNote.content}
              onChange={(e) => handleContentChange(e.target.value)}
              placeholder="# Note Content..."
              className="w-full flex-1 bg-black/40 border border-white/10 rounded p-3 text-white outline-none focus:border-current resize-none font-mono text-[11px] leading-relaxed focus:ring-1 focus:ring-current"
            />
          </div>

          {/* AI Helper trigger */}
          <div className="pt-2 flex justify-end">
            <button
              onClick={handleAiSummarize}
              className={`px-4 py-2 border rounded text-black bg-current hover:opacity-90 font-bold transition flex items-center space-x-1.5 ${accentTheme}`}
            >
              <Sparkles className="w-3.5 h-3.5 animate-pulse" />
              <span>AI Summarize</span>
            </button>
          </div>
        </div>
      </div>

      {/* Right panel: Interactive Neural Graph canvas */}
      <div className="w-1/2 flex flex-col h-full bg-[#030406]/55 relative overflow-hidden select-none">
        
        {/* Header HUD */}
        <div className="px-4 py-2.5 bg-[#090b0e]/80 border-b border-white/5 flex items-center justify-between text-[10px] text-white/30 font-bold">
          <div className="flex items-center space-x-1.5">
            <Brain className="w-3.5 h-3.5 text-current" />
            <span>KNOWLEDGE GRAPH</span>
          </div>
          <span>GRID SCALE: 1.0</span>
        </div>

        {/* Graph Canvas */}
        <div className="flex-1 relative flex items-center justify-center">
          <canvas ref={canvasRef} className="w-full h-full block cursor-crosshair" />
          <div className="absolute bottom-4 left-4 bg-black/80 px-3 py-1.5 rounded border border-white/5 text-[9px] text-white/40 tracking-wider font-mono select-none pointer-events-none">
            Click nodes to select
          </div>
        </div>

      </div>

    </div>
  );
};
