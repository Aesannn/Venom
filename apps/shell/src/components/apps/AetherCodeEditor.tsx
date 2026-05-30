import React, { useState, useEffect } from 'react';
import type { VFSNode, VFSDirectory } from '../../store/systemStore';
import { store, useSystemState } from '../../store/systemStore';
import { playSound } from '../../utils/audio';
import { FileCode, Save, Terminal, Sparkles, Plus, Trash2, Folder, RefreshCw, AlertTriangle } from 'lucide-react';

export const AetherCodeEditor: React.FC = () => {
  const state = useSystemState();
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [editorContent, setEditorContent] = useState('');
  const [filesList, setFilesList] = useState<Array<{ name: string, path: string }>>([]);
  const [newFileName, setNewFileName] = useState('');
  const [showNewFileInput, setShowNewFileInput] = useState(false);

  // Real-time syntax compiler checks: circular imports, compile breaks, syntax exceptions
  const [compilationWarning, setCompilationWarning] = useState<string | null>(null);

  // Load files from /home/aether in VFS
  const refreshFiles = () => {
    const homeDir = state.vfs.children.home;
    if (homeDir && homeDir.type === 'dir') {
      const aetherDir = homeDir.children.aether;
      if (aetherDir && aetherDir.type === 'dir') {
        const list = Object.keys(aetherDir.children)
          .filter(k => aetherDir.children[k].type === 'file')
          .map(k => ({
            name: k,
            path: `/home/aether/${k}`
          }));
        setFilesList(list);
      }
    }
  };

  // Helper: resolve path node from VFS tree
  const resolvePath = (pathStr: string): VFSNode | null => {
    if (pathStr === '/') return state.vfs;
    const parts = pathStr.split('/').filter(Boolean);
    let current: VFSNode = state.vfs;
    for (const part of parts) {
      if (current.type !== 'dir') return null;
      const next: VFSNode = (current as VFSDirectory).children[part];
      if (!next) return null;
      current = next;
    }
    return current;
  };

  useEffect(() => {
    refreshFiles();
  }, [state.vfs]);

  // Global channel listener for opening files from other apps (explorer/spotlight)
  useEffect(() => {
    const checkActiveFile = () => {
      const activePath = (window as any).AetherActiveEditFilePath;
      if (activePath) {
        handleOpenFile(activePath);
        (window as any).AetherActiveEditFilePath = null;
      }
    };

    checkActiveFile();
    const interval = setInterval(checkActiveFile, 400);
    return () => clearInterval(interval);
  }, [state.activeAppId]);

  // Real-time predictive compilation check hook
  useEffect(() => {
    if (!selectedFile || !editorContent) {
      setCompilationWarning(null);
      (window as any).AetherEditorCompilationWarning = null;
      return;
    }

    let warning: string | null = null;
    const basename = selectedFile.split('/').pop() || '';
    
    // Rule 1: Circular imports check
    if (editorContent.includes('import') && (editorContent.includes(`./${basename}`) || editorContent.includes(`../${basename}`))) {
      warning = `CRITICAL: Circular import dependency predicted in ${basename}`;
    }
    // Rule 2: Unbalanced braces check
    else {
      const openBraces = (editorContent.match(/\{/g) || []).length;
      const closeBraces = (editorContent.match(/\}/g) || []).length;
      if (openBraces !== closeBraces) {
        warning = `COMPILER WARNING: Unbalanced curly braces predicted {${openBraces} open, ${closeBraces} closed}`;
      } else {
        const openParens = (editorContent.match(/\(/g) || []).length;
        const closeParens = (editorContent.match(/\)/g) || []).length;
        if (openParens !== closeParens) {
          warning = `COMPILER WARNING: Unbalanced parentheses predicted (${openParens} open, ${closeParens} closed)`;
        }
      }
    }

    setCompilationWarning(warning);
    (window as any).AetherEditorCompilationWarning = warning;
  }, [editorContent, selectedFile]);

  // Load file content into editor
  const handleOpenFile = (pathOrName: string) => {
    playSound.click();
    const isFullPath = pathOrName.startsWith('/');
    const fullPath = isFullPath ? pathOrName : `/home/aether/${pathOrName}`;
    const fileNode = resolvePath(fullPath);
    if (fileNode && fileNode.type === 'file') {
      setSelectedFile(fullPath);
      setEditorContent(fileNode.content);
    }
  };

  // Save modified file content back to VFS
  const handleSaveFile = () => {
    if (!selectedFile) return;
    playSound.success();
    store.writeVfsFile(selectedFile, editorContent);
    store.addNotification('File Saved', `Successfully updated ${selectedFile}`, 'Just now');
    store.logToTerminal(`IDE VFS Write: ${selectedFile} (${editorContent.length} bytes)`);
  };

  // Create a new blank file in the VFS
  const handleCreateFile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFileName.trim()) return;

    playSound.click();
    const cleanName = newFileName.trim().toLowerCase();
    
    // Add extension if not present
    const finalName = cleanName.includes('.') ? cleanName : `${cleanName}.js`;

    const success = store.createVfsNode(finalName, 'file', '// ' + finalName + ' - Workspace module\n');
    if (success) {
      playSound.success();
      setNewFileName('');
      setShowNewFileInput(false);
      refreshFiles();
      handleOpenFile(finalName);
    } else {
      playSound.warning();
      store.addNotification('File Error', `File ${finalName} already exists.`, 'Just now');
    }
  };

  // Delete active file
  const handleDeleteFile = (fileName: string) => {
    playSound.warning();
    const success = store.deleteVfsNode(fileName);
    if (success) {
      const fullPath = `/home/aether/${fileName}`;
      if (selectedFile === fullPath) {
        setSelectedFile(null);
        setEditorContent('');
      }
      refreshFiles();
      store.addNotification('File Removed', `Deleted /home/aether/${fileName}`, 'Just now');
    }
  };

  // Ask Aether AI to optimize active code editor contents
  const handleAiOptimize = () => {
    if (!selectedFile) {
      playSound.warning();
      return;
    }
    playSound.success();
    store.addNotification('Aether Core', 'Analyzing active workspace code structure...', 'Just now');
    store.openWindow('ai-chat');
    store.sendAiMessage(`Optimize my code inside file ${selectedFile}:\n\n${editorContent}`);
  };

  const textTheme = 
    state.theme === 'purple' ? 'text-purple-400 border-purple-500/30' :
    state.theme === 'green' ? 'text-emerald-400 border-emerald-500/30' :
    state.theme === 'orange' ? 'text-orange-400 border-orange-500/30' :
    'text-cyan-400 border-cyan-500/30';

  const buttonTheme =
    state.theme === 'purple' ? 'bg-purple-500/20 text-purple-300 border-purple-500/30 hover:bg-purple-500/35' :
    state.theme === 'green' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/35' :
    state.theme === 'orange' ? 'bg-orange-500/20 text-orange-300 border-orange-500/30 hover:bg-orange-500/35' :
    'bg-cyan-500/20 text-cyan-300 border-cyan-500/30 hover:bg-cyan-500/35';

  return (
    <div className="flex-1 flex bg-[#07090c]/90 text-xs font-mono h-full relative border-t border-white/5 select-text">
      
      {/* Workspace Directory Sidebar (Glass Material) */}
      <div className="w-56 border-r border-white/5 bg-[#050608]/40 flex flex-col justify-between p-3 select-none">
        <div className="space-y-4">
          <div className="flex justify-between items-center border-b border-white/5 pb-2 text-[10px] text-white/40 uppercase tracking-widest font-bold">
            <span className="flex items-center space-x-1.5">
              <Folder className="w-3.5 h-3.5 text-white/50" />
              <span>Workspace</span>
            </span>
            <button 
              onClick={() => { playSound.click(); refreshFiles(); }}
              className="p-1 rounded hover:bg-white/5 text-white/30 hover:text-white transition"
              title="Refresh Directory"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
          </div>

          {/* New File Trigger */}
          {showNewFileInput ? (
            <form onSubmit={handleCreateFile} className="space-y-2 select-text">
              <input
                type="text"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                placeholder="filename.js..."
                className="w-full bg-[#050608] border border-white/10 rounded px-2 py-1 text-white text-[10px] outline-none"
                autoFocus
              />
              <div className="flex space-x-1.5">
                <button type="submit" className="flex-1 py-1 rounded bg-white/10 text-[9px] hover:bg-white/15 text-white font-bold transition">
                  Create
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowNewFileInput(false)} 
                  className="px-2 py-1 rounded bg-white/5 text-[9px] hover:bg-white/10 text-white/60 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => { playSound.click(); setShowNewFileInput(true); }}
              className="w-full py-1.5 rounded-lg border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] text-[10px] text-white/60 hover:text-white transition flex items-center justify-center space-x-1.5 font-medium"
            >
              <Plus className="w-3.5 h-3.5 text-white/55" />
              <span>New Workspace File</span>
            </button>
          )}

          {/* Files List Directory Tree */}
          <div className="space-y-1">
            {filesList.map((file) => {
              const isOpen = selectedFile === file.name;
              return (
                <div
                  key={file.name}
                  onClick={() => handleOpenFile(file.name)}
                  className={`p-2 rounded-xl flex items-center justify-between cursor-pointer transition group ${
                    isOpen ? 'bg-white/8 text-white' : 'text-white/40 hover:text-white/80 hover:bg-white/[0.02]'
                  }`}
                >
                  <div className="flex items-center space-x-2 truncate">
                    <FileCode className={`w-3.5 h-3.5 ${isOpen ? 'text-white' : 'text-white/40 group-hover:text-white/60'}`} />
                    <span className="truncate text-[10.5px] font-medium tracking-wide">{file.name}</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteFile(file.name);
                    }}
                    className="p-1 rounded text-white/20 hover:text-rose-450 hover:text-rose-400 hover:bg-rose-500/10 opacity-0 group-hover:opacity-100 transition"
                    title="Delete File"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="text-[9px] text-white/20 uppercase tracking-wider text-left">
          Root: VFS://home/aether/
        </div>
      </div>

      {/* Code Editor Area */}
      <div className="flex-1 flex flex-col justify-between">
        
        {/* Editor Controls Header */}
        <div className="p-2 bg-[#090b0e] border-b border-white/5 flex items-center justify-between select-none">
          <div className="flex items-center space-x-2">
            <div className="p-1 rounded bg-white/5 border border-white/5">
              <FileCode className={`w-4 h-4 ${textTheme.split(' ')[0]}`} />
            </div>
            <div className="text-left">
              <h4 className="text-[11px] font-bold text-white uppercase tracking-wider truncate">
                {selectedFile ? selectedFile.split('/').pop() : 'No Active File'}
              </h4>
              <p className="text-[8px] text-white/30 uppercase tracking-widest leading-normal">
                {selectedFile ? `VFS: ${selectedFile}` : 'Select a file from the sidebar to begin'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* AI Optimization Trigger */}
            {selectedFile && (
              <button
                onClick={handleAiOptimize}
                className={`px-3 py-1.5 rounded-lg border text-[10px] font-semibold transition flex items-center space-x-1.5 shadow-sm active:scale-95 ${buttonTheme}`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Ask Aether Optimize</span>
              </button>
            )}

            {/* Save File Trigger */}
            {selectedFile && (
              <button
                onClick={handleSaveFile}
                className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 text-white/80 hover:text-white hover:bg-white/10 text-[10px] font-semibold transition flex items-center space-x-1.5 shadow-sm active:scale-95"
              >
                <Save className="w-3.5 h-3.5 text-white/60" />
                <span>Save File</span>
              </button>
            )}
          </div>
        </div>

        {/* Text Area Workspace */}
        <div className="flex-1 relative flex flex-col select-text bg-[#07080a]/40 justify-between">
          <div className="flex-1 relative flex bg-transparent">
            {selectedFile ? (
              <textarea
                value={editorContent}
                onChange={(e) => setEditorContent(e.target.value)}
                className="flex-1 bg-transparent p-4 text-white text-xs outline-none resize-none font-mono leading-relaxed"
                style={{
                  backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.01) 50%, transparent 50%)',
                  backgroundSize: '100% 2.4rem',
                }}
                placeholder="Start coding..."
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-white/20 select-none space-y-3">
                <Terminal className="w-12 h-12 stroke-[1.2] opacity-35" />
                <div className="text-center space-y-1">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">AETHER IDE WORKSPACE</h3>
                  <p className="text-[10px] uppercase tracking-wider text-white/30">Select an existing script or create a new one to begin development.</p>
                </div>
              </div>
            )}
          </div>

          {/* Proactive Compiler Warning diagnostic bar */}
          {selectedFile && compilationWarning && (
            <div className="bg-amber-500/10 border-t border-amber-500/20 px-4 py-2 flex items-center space-x-2 text-[10px] text-amber-400 select-none text-left">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 animate-bounce" />
              <span className="font-semibold">{compilationWarning}</span>
            </div>
          )}
        </div>

      </div>
      
    </div>
  );
};
