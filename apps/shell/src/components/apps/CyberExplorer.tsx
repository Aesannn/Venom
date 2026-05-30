import React, { useState, useEffect } from 'react';
import type { VFSNode, VFSFile, VFSDirectory } from '../../store/systemStore';
import { store, useSystemState } from '../../store/systemStore';
import { playSound } from '../../utils/audio';
import { 
  Folder, 
  FileText, 
  ChevronRight, 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Edit3, 
  Grid, 
  List, 
  Save, 
  X, 
  Search, 
  Star, 
  Code, 
  Settings, 
  BookOpen, 
  Terminal, 
  Sparkles, 
  Binary, 
  Tag, 
  PlusCircle,
  Hash
} from 'lucide-react';

export const CyberExplorer: React.FC = () => {
  const state = useSystemState();
  const [currentPath, setCurrentPath] = useState('/home/aether');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Interactive Search / Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [activeVirtualFilter, setActiveVirtualFilter] = useState<'all' | 'starred' | 'development' | 'system' | 'guides' | string>('all');
  
  // File Preview and Details Panel State
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
  const [selectedFileNode, setSelectedFileNode] = useState<VFSFile | null>(null);
  
  // File Editor drawer state
  const [editingFile, setEditingFile] = useState<{ path: string; name: string; content: string } | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFileName, setNewFileName] = useState('');
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [showNewFileModal, setShowNewFileModal] = useState(false);
  const [newTagInput, setNewTagInput] = useState('');
  const [showHexPreview, setShowHexPreview] = useState(false);

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

  const currentNode = resolvePath(currentPath);

  // Sync selected file node if VFS updates
  useEffect(() => {
    if (selectedFilePath) {
      const node = resolvePath(selectedFilePath);
      if (node && node.type === 'file') {
        setSelectedFileNode(node as VFSFile);
      } else {
        setSelectedFilePath(null);
        setSelectedFileNode(null);
      }
    }
  }, [state.vfs, selectedFilePath]);

  // Handle single click to select file/folder and populate preview panel
  const handleNodeClick = (name: string, isDir: boolean) => {
    playSound.click();
    const filePath = currentPath === '/' ? `/${name}` : `${currentPath}/${name}`;
    if (!isDir) {
      setSelectedFilePath(filePath);
      const node = resolvePath(filePath);
      if (node && node.type === 'file') {
        setSelectedFileNode(node as VFSFile);
        setShowHexPreview(false); // Reset hex state
      }
    } else {
      setSelectedFilePath(null);
      setSelectedFileNode(null);
    }
  };

  // Navigation handlers
  const handleFolderDoubleClick = (name: string) => {
    playSound.click();
    const nextPath = currentPath === '/' ? `/${name}` : `${currentPath}/${name}`;
    setCurrentPath(nextPath);
    setSelectedFilePath(null);
    setSelectedFileNode(null);
  };

  const handleFileDoubleClick = (name: string, file: VFSFile) => {
    playSound.click();
    const filePath = currentPath === '/' ? `/${name}` : `${currentPath}/${name}`;
    setEditingFile({
      path: filePath,
      name: name,
      content: file.content
    });
  };

  const handleBack = () => {
    if (currentPath === '/') return;
    playSound.click();
    const parts = currentPath.split('/').filter(Boolean);
    parts.pop();
    const parentPath = '/' + parts.join('/');
    setCurrentPath(parentPath);
    setSelectedFilePath(null);
    setSelectedFileNode(null);
  };

  const handleBreadcrumbClick = (idx: number) => {
    playSound.click();
    const parts = currentPath.split('/').filter(Boolean);
    const targetParts = parts.slice(0, idx + 1);
    const targetPath = '/' + targetParts.join('/');
    setCurrentPath(targetPath);
    setSelectedFilePath(null);
    setSelectedFileNode(null);
  };

  // VFS Operations
  const handleCreateFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    playSound.click();
    const originalTerminalPath = store.getState().currentDirPath;
    store.getState().currentDirPath = currentPath;

    const success = store.createVfsNode(newFolderName.trim(), 'dir');
    if (success) {
      store.addNotification('Folder Created', `New folder ${newFolderName} created under ${currentPath}`, 'Just now');
      setNewFolderName('');
      setShowNewFolderModal(false);
    } else {
      playSound.warning();
    }
    store.getState().currentDirPath = originalTerminalPath;
  };

  const handleCreateFile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFileName.trim()) return;

    playSound.click();
    const originalTerminalPath = store.getState().currentDirPath;
    store.getState().currentDirPath = currentPath;

    const success = store.createVfsNode(newFileName.trim(), 'file', '// new source code file\n');
    if (success) {
      store.addNotification('File Created', `New file ${newFileName} created under ${currentPath}`, 'Just now');
      setNewFileName('');
      setShowNewFileModal(false);
    } else {
      playSound.warning();
    }
    store.getState().currentDirPath = originalTerminalPath;
  };

  const handleDeleteNode = (name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    playSound.warning();
    
    const originalTerminalPath = store.getState().currentDirPath;
    store.getState().currentDirPath = currentPath;
    
    const success = store.deleteVfsNode(name);
    if (success) {
      store.addNotification('Item Deleted', `Deleted ${name} successfully.`, 'Just now');
      setSelectedFilePath(null);
      setSelectedFileNode(null);
    }
    store.getState().currentDirPath = originalTerminalPath;
  };

  // Editor save handler
  const handleSaveEditedFile = () => {
    if (!editingFile) return;
    playSound.success();
    store.writeVfsFile(editingFile.path, editingFile.content);
    store.addNotification('File Saved', `Changes saved for file ${editingFile.name} successfully.`, 'Just now');
    setEditingFile(null);
  };

  // Metadata tags management
  const handleAddTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFilePath || !selectedFileNode || !newTagInput.trim()) return;
    playSound.click();
    const currentTags = selectedFileNode.tags || [];
    const cleanTag = newTagInput.trim().toLowerCase();
    if (!currentTags.includes(cleanTag)) {
      const updatedTags = [...currentTags, cleanTag];
      (store as any).updateFileTags(selectedFilePath, updatedTags);
      store.addNotification('Tag Appended', `Tag "${cleanTag}" attached to ${selectedFileNode.name}`, 'Just now');
    }
    setNewTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    if (!selectedFilePath || !selectedFileNode) return;
    playSound.click();
    const currentTags = selectedFileNode.tags || [];
    const updatedTags = currentTags.filter(t => t !== tagToRemove);
    (store as any).updateFileTags(selectedFilePath, updatedTags);
  };

  // Cyberpunk hex dump utility for files
  const renderHexDump = (content: string) => {
    let result = '';
    const clean = content.replace(/\r/g, '');
    for (let i = 0; i < Math.min(256, clean.length); i += 8) {
      const chunk = clean.slice(i, i + 8);
      const hex = Array.from(chunk).map(c => c.charCodeAt(0).toString(16).padStart(2, '0').toUpperCase()).join(' ');
      const ascii = Array.from(chunk).map(c => {
        const code = c.charCodeAt(0);
        return (code >= 32 && code <= 126) ? c : '.';
      }).join('');
      const offset = i.toString(16).padStart(4, '0').toUpperCase();
      result += `${offset}  ${hex.padEnd(23, ' ')}  |${ascii}|\n`;
    }
    if (clean.length > 256) {
      result += '... [content truncated in preview]';
    }
    return result;
  };

  // Dynamic system styling helpers
  const textTheme = 
    state.theme === 'purple' ? 'text-purple-400' :
    state.theme === 'green' ? 'text-emerald-400' :
    state.theme === 'orange' ? 'text-orange-400' :
    'text-cyan-400';

  const hoverTheme = 
    state.theme === 'purple' ? 'hover:bg-purple-500/10 hover:border-purple-500/30' :
    state.theme === 'green' ? 'hover:bg-emerald-500/10 hover:border-emerald-500/30' :
    state.theme === 'orange' ? 'hover:bg-orange-500/10 hover:border-orange-500/30' :
    'hover:bg-cyan-500/10 hover:border-cyan-500/30';

  const accentBg = 
    state.theme === 'purple' ? 'bg-purple-500/20 text-purple-300 border-purple-500/30' :
    state.theme === 'green' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' :
    state.theme === 'orange' ? 'bg-orange-500/20 text-orange-300 border-orange-500/30' :
    'bg-cyan-500/20 text-cyan-300 border-cyan-500/30';

  const accentTheme = 
    state.theme === 'purple' ? 'border-purple-500 text-purple-400 focus:border-purple-400' :
    state.theme === 'green' ? 'border-emerald-500 text-emerald-400 focus:border-emerald-400' :
    state.theme === 'orange' ? 'border-orange-500 text-orange-400 focus:border-orange-400' :
    'border-cyan-500 text-cyan-400 focus:border-cyan-400';

  const glowTheme = 
    state.theme === 'purple' ? 'shadow-[0_0_15px_rgba(168,85,247,0.15)]' :
    state.theme === 'green' ? 'shadow-[0_0_15px_rgba(16,185,129,0.15)]' :
    state.theme === 'orange' ? 'shadow-[0_0_15px_rgba(249,115,22,0.15)]' :
    'shadow-[0_0_15px_rgba(6,182,212,0.15)]';

  // Compute VFS Search or Filter results
  let computedItems: Array<{ path: string; node: VFSNode; score?: number }> = [];

  if (searchQuery.trim()) {
    // Active text search query
    computedItems = (store as any).searchFiles(searchQuery);
  } else if (activeVirtualFilter !== 'all') {
    // Active sidebar virtual folders
    const allFiles = (store as any).searchFiles(''); // Crawls VFS
    if (activeVirtualFilter === 'starred') {
      computedItems = allFiles.filter((f: any) => f.node.type === 'file' && f.node.tags?.includes('starred'));
    } else if (activeVirtualFilter === 'development') {
      computedItems = allFiles.filter((f: any) => 
        f.node.type === 'file' && 
        (f.node.category === 'development' || f.node.tags?.includes('code') || f.node.tags?.includes('utility'))
      );
    } else if (activeVirtualFilter === 'system') {
      computedItems = allFiles.filter((f: any) => 
        f.node.type === 'file' && 
        (f.node.category === 'system' || f.node.tags?.includes('config') || f.node.tags?.includes('system'))
      );
    } else if (activeVirtualFilter === 'guides') {
      computedItems = allFiles.filter((f: any) => 
        f.node.type === 'file' && 
        (f.node.tags?.includes('guide') || f.node.tags?.includes('readme'))
      );
    } else {
      // Filter strictly by tag clicked in tag cloud
      computedItems = allFiles.filter((f: any) => f.node.type === 'file' && f.node.tags?.includes(activeVirtualFilter));
    }
  } else {
    // Normal directory viewing
    if (currentNode && currentNode.type === 'dir') {
      computedItems = Object.keys(currentNode.children).map(name => {
        const child = currentNode.children[name];
        return {
          path: currentPath === '/' ? `/${name}` : `${currentPath}/${name}`,
          node: child
        };
      });
    }
  }

  // Get all unique tags recursively across the VFS to render the Tag Cloud
  const getAllUniqueTags = (): string[] => {
    const tagsSet = new Set<string>();
    const traverse = (node: VFSNode) => {
      if (node.type === 'file') {
        const file = node as VFSFile;
        if (file.tags) {
          file.tags.forEach(t => tagsSet.add(t));
        }
      } else {
        const dir = node as VFSDirectory;
        Object.values(dir.children).forEach(traverse);
      }
    };
    traverse(state.vfs);
    return Array.from(tagsSet);
  };

  const uniqueTags = getAllUniqueTags();

  return (
    <div className={`flex-1 flex bg-[#06080b]/95 text-xs font-mono h-full relative theme-${state.theme} select-none`}>
      
      {/* ================= SIDEBAR (LEFT PANE) ================= */}
      <div className="w-52 border-r border-white/5 bg-[#080b0f]/50 flex flex-col justify-between select-none">
        <div className="p-3 space-y-5 overflow-y-auto scrollbar-none h-full">
          
          {/* Smart Folders Section */}
          <div className="space-y-1.5">
            <span className="text-[9px] text-white/30 uppercase tracking-widest pl-1 font-bold">Virtual Folders</span>
            <div className="space-y-0.5">
              {[
                { id: 'all', label: 'All Workspace', icon: Folder },
                { id: 'starred', label: 'Starred Items', icon: Star, color: 'text-amber-400' },
                { id: 'development', label: 'Dev Files', icon: Code, color: 'text-purple-400' },
                { id: 'system', label: 'System Config', icon: Settings, color: 'text-blue-400' },
                { id: 'guides', label: 'Reference guides', icon: BookOpen, color: 'text-emerald-400' }
              ].map(folder => {
                const IconComponent = folder.icon;
                const isActive = activeVirtualFilter === folder.id && !searchQuery;
                return (
                  <button
                    key={folder.id}
                    onClick={() => {
                      playSound.click();
                      setSearchQuery('');
                      setActiveVirtualFilter(folder.id);
                      setSelectedFilePath(null);
                      setSelectedFileNode(null);
                    }}
                    className={`w-full text-left p-2 rounded-xl flex items-center space-x-2.5 transition text-[10.5px] ${
                      isActive 
                        ? 'bg-white/8 text-white font-bold border border-white/8' 
                        : 'text-white/50 hover:text-white hover:bg-white/[0.02]'
                    }`}
                  >
                    <IconComponent className={`w-3.5 h-3.5 ${folder.color || 'text-white/50'}`} />
                    <span>{folder.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Recent Workspace History */}
          <div className="space-y-1.5 border-t border-white/5 pt-3">
            <span className="text-[9px] text-white/30 uppercase tracking-widest pl-1 font-bold">Recent Activity</span>
            {state.recentFiles.length === 0 ? (
              <p className="text-[10px] text-white/20 italic pl-1 py-1">No recent activity</p>
            ) : (
              <div className="space-y-1">
                {state.recentFiles.map(path => {
                  const parts = path.split('/');
                  const name = parts[parts.length - 1];
                  const isSelected = selectedFilePath === path;
                  return (
                    <button
                      key={path}
                      onClick={() => {
                        playSound.click();
                        setSearchQuery('');
                        setActiveVirtualFilter('all');
                        // Navigate to parent directory
                        const parentPath = '/' + parts.slice(0, -1).filter(Boolean).join('/');
                        setCurrentPath(parentPath || '/');
                        setSelectedFilePath(path);
                        const node = resolvePath(path);
                        if (node && node.type === 'file') {
                          setSelectedFileNode(node as VFSFile);
                        }
                      }}
                      className={`w-full text-left p-2 rounded-xl border transition group flex flex-col space-y-0.5 ${
                        isSelected 
                          ? accentBg
                          : 'bg-white/[0.01] border-white/5 text-white/60 hover:text-white hover:bg-white/[0.03]'
                      }`}
                    >
                      <div className="flex items-center space-x-1.5 truncate">
                        <FileText className="w-3 h-3 text-white/40 flex-shrink-0" />
                        <span className="truncate text-[10px] font-semibold">{name}</span>
                      </div>
                      <span className="text-[8px] text-white/25 truncate font-mono">{path}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Dynamic Tag Filters Cloud */}
          {uniqueTags.length > 0 && (
            <div className="space-y-1.5 border-t border-white/5 pt-3">
              <span className="text-[9px] text-white/30 uppercase tracking-widest pl-1 font-bold">Metadata Tags</span>
              <div className="flex flex-wrap gap-1.5 p-1 select-none">
                {uniqueTags.map(tag => {
                  const isFiltered = activeVirtualFilter === tag && !searchQuery;
                  return (
                    <button
                      key={tag}
                      onClick={() => {
                        playSound.click();
                        setSearchQuery('');
                        setActiveVirtualFilter(isFiltered ? 'all' : tag);
                        setSelectedFilePath(null);
                        setSelectedFileNode(null);
                      }}
                      className={`px-2 py-0.5 rounded text-[8px] uppercase tracking-wide border flex items-center space-x-1 transition font-bold select-none ${
                        isFiltered
                          ? 'bg-current text-black border-transparent'
                          : 'bg-white/5 text-white/60 border-white/5 hover:bg-white/10 hover:text-white'
                      }`}
                      style={{ color: isFiltered ? 'inherit' : undefined }}
                    >
                      <Hash className="w-2.5 h-2.5 opacity-60" />
                      <span>{tag}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

        </div>
        
        <div className="p-3 border-t border-white/5 bg-[#050709] text-[9.5px] text-white/25 select-none font-sans flex items-center justify-between">
          <span>VFS v1.2 EXT</span>
          <span className="font-mono text-[8px] uppercase px-1 py-0.2 rounded border border-white/10 bg-white/5">SECURE</span>
        </div>
      </div>

      {/* ================= WORKSPACE PANEL (MIDDLE PANE) ================= */}
      <div className="flex-1 flex flex-col relative select-none">
        
        {/* Navigation, Path, and Filter Header */}
        <div className="p-3 bg-[#080a0d] border-b border-white/5 flex flex-col space-y-2">
          
          <div className="flex items-center justify-between space-x-3">
            
            {/* Nav Back & Address Breadcrumbs */}
            <div className="flex items-center space-x-2 overflow-hidden flex-1 select-none">
              <button
                onClick={handleBack}
                disabled={currentPath === '/' || !!searchQuery || activeVirtualFilter !== 'all'}
                className="p-1.5 rounded-lg border border-white/10 text-white/60 hover:text-white disabled:opacity-20 disabled:hover:text-white/60 transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>

              {/* Path Breadcrumbs */}
              {searchQuery ? (
                <div className="flex items-center space-x-1.5 text-white/40">
                  <Search className="w-3.5 h-3.5 text-white/60" />
                  <span className="font-bold uppercase tracking-wider text-xs">Search Index Results</span>
                </div>
              ) : activeVirtualFilter !== 'all' ? (
                <div className="flex items-center space-x-1.5 text-white/40">
                  <Star className="w-3.5 h-3.5 text-white/60" />
                  <span className="font-bold uppercase tracking-wider text-xs">Virtual View: {activeVirtualFilter}</span>
                </div>
              ) : (
                <div className="flex items-center space-x-1.5 overflow-x-auto whitespace-nowrap scrollbar-none py-0.5 text-white/50 text-[10.5px]">
                  <span 
                    onClick={() => { playSound.click(); setCurrentPath('/'); }}
                    className="hover:text-white cursor-pointer uppercase font-bold text-[10px]"
                  >
                    Root
                  </span>
                  {currentPath.split('/').filter(Boolean).map((part, index) => (
                    <React.Fragment key={index}>
                      <ChevronRight className="w-2.5 h-2.5 text-white/20" />
                      <span
                        onClick={() => handleBreadcrumbClick(index)}
                        className="hover:text-white cursor-pointer font-semibold"
                      >
                        {part}
                      </span>
                    </React.Fragment>
                  ))}
                </div>
              )}
            </div>

            {/* Layout Controls & Creation Triggers */}
            <div className="flex items-center space-x-1.5 flex-shrink-0">
              <button
                onClick={() => { playSound.click(); setViewMode('grid'); }}
                className={`p-1.5 rounded border border-white/10 transition ${viewMode === 'grid' ? textTheme : 'text-white/40 bg-white/[0.01]'}`}
              >
                <Grid className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => { playSound.click(); setViewMode('list'); }}
                className={`p-1.5 rounded border border-white/10 transition ${viewMode === 'list' ? textTheme : 'text-white/40 bg-white/[0.01]'}`}
              >
                <List className="w-3.5 h-3.5" />
              </button>
              
              <div className="h-4 w-[1px] bg-white/10" />

              <button
                onClick={() => { playSound.click(); setShowNewFolderModal(true); }}
                className="px-2 py-1 rounded bg-[#0b0f14] border border-white/5 hover:border-white/15 text-[10px] text-white/70 hover:text-white transition flex items-center space-x-1 font-semibold"
              >
                <Plus className="w-3 h-3" />
                <span>Dir</span>
              </button>
              <button
                onClick={() => { playSound.click(); setShowNewFileModal(true); }}
                className="px-2 py-1 rounded bg-[#0b0f14] border border-white/5 hover:border-white/15 text-[10px] text-white/70 hover:text-white transition flex items-center space-x-1 font-semibold"
              >
                <Plus className="w-3 h-3" />
                <span>File</span>
              </button>
            </div>
          </div>

          {/* Intelligent Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-white/30 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSelectedFilePath(null);
                setSelectedFileNode(null);
              }}
              placeholder="Search VFS recursively (indexes filename, tags, path, category, content)..."
              className="w-full bg-[#040508] border border-white/5 hover:border-white/10 focus:border-white/15 rounded-xl px-3 py-2 pl-9 text-white text-xs outline-none placeholder-white/20 transition-all font-mono"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2 p-0.5 rounded text-white/30 hover:text-white transition"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Workspace Display Grid/List */}
        <div className="flex-1 p-4 overflow-y-auto">
          {computedItems.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-white/15 select-none space-y-2 mt-12">
              <Folder className="w-12 h-12 stroke-[0.8]" />
              <p className="tracking-widest uppercase font-semibold text-[10px]">No Matching Items</p>
            </div>
          ) : viewMode === 'grid' ? (
            /* GRID VIEW */
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {computedItems.map((item) => {
                const node = item.node;
                const isDir = node.type === 'dir';
                const isSelected = selectedFilePath === item.path;

                return (
                  <div
                    key={item.path}
                    onClick={() => handleNodeClick(node.name, isDir)}
                    onDoubleClick={() => isDir ? handleFolderDoubleClick(node.name) : handleFileDoubleClick(node.name, node as VFSFile)}
                    className={`p-4 rounded-xl border bg-[#0a0c10]/40 flex flex-col items-center text-center justify-between cursor-pointer group transition-all duration-300 relative ${
                      isSelected 
                        ? accentBg + ' ' + glowTheme
                        : 'border-white/5 hover:border-white/10 ' + hoverTheme
                    }`}
                  >
                    {/* Delete Trigger Overlay */}
                    <button
                      onClick={(e) => handleDeleteNode(node.name, e)}
                      className="absolute top-2 right-2 p-1 text-white/0 group-hover:text-rose-500/70 hover:!text-rose-500 rounded transition duration-200"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    {/* Node Visual Icon */}
                    {isDir ? (
                      <Folder className={`w-9 h-9 mb-2.5 ${isSelected ? textTheme : 'text-white/60'} drop-shadow`} />
                    ) : (
                      <FileText className={`w-9 h-9 mb-2.5 ${isSelected ? 'text-white' : 'text-white/35 group-hover:text-white/55'} transition-colors`} />
                    )}

                    {/* Node Name */}
                    <span className="font-mono text-[10.5px] text-white/80 group-hover:text-white font-semibold truncate max-w-full leading-tight">
                      {node.name}
                    </span>

                    {/* Metadata indicators */}
                    {!isDir && (node as VFSFile).tags && (
                      <span className="text-[7.5px] text-white/20 mt-1 uppercase tracking-wide flex items-center space-x-1 truncate max-w-full">
                        <Tag className="w-2 h-2 opacity-50" />
                        <span>{(node as VFSFile).tags?.slice(0, 1).join('')}</span>
                      </span>
                    )}

                    {/* Query Match relevance score if searching */}
                    {item.score !== undefined && (
                      <span className="absolute bottom-1 right-2 text-[7.5px] text-cyan-400/50 uppercase font-mono">
                        {item.score}pts
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            /* LIST VIEW */
            <div className="border border-white/5 bg-[#0a0c10]/30 rounded-xl overflow-hidden">
              <div className="grid grid-cols-6 p-2 bg-[#090b0e] text-[9.5px] text-white/30 border-b border-white/5 uppercase select-none font-bold">
                <span className="col-span-3">Node Name</span>
                <span className="col-span-1">Type</span>
                <span className="col-span-1">Category</span>
                <span className="col-span-1 text-right pr-2">Action</span>
              </div>
              <div className="divide-y divide-white/5">
                {computedItems.map((item) => {
                  const node = item.node;
                  const isDir = node.type === 'dir';
                  const isSelected = selectedFilePath === item.path;

                  return (
                    <div
                      key={item.path}
                      onClick={() => handleNodeClick(node.name, isDir)}
                      onDoubleClick={() => isDir ? handleFolderDoubleClick(node.name) : handleFileDoubleClick(node.name, node as VFSFile)}
                      className={`grid grid-cols-6 p-2.5 items-center cursor-pointer transition border-l-2 ${
                        isSelected 
                          ? accentBg + ' border-current'
                          : 'border-transparent ' + hoverTheme
                      }`}
                    >
                      <div className="col-span-3 flex items-center space-x-2 truncate pr-1">
                        {isDir ? (
                          <Folder className={`w-3.5 h-3.5 ${isSelected ? textTheme : 'text-white/60'}`} />
                        ) : (
                          <FileText className="w-3.5 h-3.5 text-white/30" />
                        )}
                        <span className="text-white/80 font-bold truncate text-[11px]">{node.name}</span>
                      </div>
                      <span className="col-span-1 text-white/30 uppercase text-[9.5px]">
                        {isDir ? 'Directory' : 'File'}
                      </span>
                      <span className="col-span-1 text-white/30 uppercase text-[9.5px]">
                        {isDir ? 'System' : (node as VFSFile).category || 'User'}
                      </span>
                      <div className="col-span-1 text-right pr-2">
                        <button
                          onClick={(e) => handleDeleteNode(node.name, e)}
                          className="p-1 hover:bg-white/5 text-rose-500 rounded transition"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ================= DETAILS PREVIEW (RIGHT PANE) ================= */}
      {selectedFilePath && selectedFileNode ? (
        <div className="w-60 border-l border-white/5 bg-[#080a0e]/40 p-4 flex flex-col justify-between overflow-y-auto space-y-4">
          <div className="space-y-4.5">
            
            {/* Header info */}
            <div className="flex items-center space-x-2.5 pb-3 border-b border-white/5">
              <FileText className={`w-4 h-4 ${textTheme}`} />
              <div className="truncate">
                <span className="text-[10px] text-white/30 uppercase tracking-widest font-bold">Active Selection</span>
                <h4 className="text-[11px] font-bold text-white truncate uppercase font-mono leading-tight">{selectedFileNode.name}</h4>
              </div>
            </div>

            {/* Properties List */}
            <div className="space-y-2 select-text">
              <span className="text-[9px] text-white/30 uppercase tracking-widest font-bold">Properties</span>
              <div className="space-y-1 bg-[#040508]/30 rounded-xl p-2.5 border border-white/5">
                <div className="flex justify-between">
                  <span className="text-white/30 text-[9px]">File Type</span>
                  <span className="text-white/70 uppercase">File</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/30 text-[9px]">Size</span>
                  <span className="text-white/70 font-mono">{selectedFileNode.content.length} chars</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/30 text-[9px]">Words</span>
                  <span className="text-white/70 font-mono">
                    {selectedFileNode.content.split(/\s+/).filter(Boolean).length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/30 text-[9px]">Lines</span>
                  <span className="text-white/70 font-mono">
                    {selectedFileNode.content.split('\n').length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/30 text-[9px]">Category</span>
                  <span className="text-cyan-400 uppercase text-[9.5px] font-semibold">{selectedFileNode.category || 'general'}</span>
                </div>
              </div>
            </div>

            {/* Tag Engine Workspace */}
            <div className="space-y-2 select-text">
              <span className="text-[9px] text-white/30 uppercase tracking-widest font-bold">Tags Index</span>
              <div className="space-y-2 bg-[#040508]/30 rounded-xl p-2.5 border border-white/5">
                
                {/* Active Tags list */}
                {(!selectedFileNode.tags || selectedFileNode.tags.length === 0) ? (
                  <p className="text-[9.5px] text-white/20 italic">No metadata tags assigned</p>
                ) : (
                  <div className="flex flex-wrap gap-1 select-none">
                    {selectedFileNode.tags.map(tag => (
                      <span 
                        key={tag}
                        className="px-1.5 py-0.5 rounded text-[8px] bg-white/5 border border-white/5 text-white/70 uppercase font-mono flex items-center space-x-1"
                      >
                        <span>{tag}</span>
                        <button 
                          onClick={() => handleRemoveTag(tag)}
                          className="hover:text-rose-400 pl-0.5 opacity-60 hover:opacity-100 transition"
                        >
                          <X className="w-2.5 h-2.5 stroke-[2.5]" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Add Tag form */}
                <form onSubmit={handleAddTag} className="flex space-x-1 mt-1.5">
                  <input
                    type="text"
                    value={newTagInput}
                    onChange={(e) => setNewTagInput(e.target.value)}
                    placeholder="add tag..."
                    className="flex-1 bg-[#050709] border border-white/5 rounded px-2 py-1 text-[10px] text-white outline-none focus:border-white/15 font-mono"
                  />
                  <button 
                    type="submit"
                    className="p-1 rounded bg-[#0b0f14] border border-white/5 text-white/50 hover:text-white transition"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>
            </div>

            {/* Predictive Context actions list */}
            <div className="space-y-2 select-none">
              <span className="text-[9px] text-white/30 uppercase tracking-widest font-bold">Predictive Workflows</span>
              <div className="space-y-1.5">
                
                <button
                  onClick={() => {
                    playSound.success();
                    // Expose the active file for Code Editor
                    (window as any).AetherActiveEditFilePath = selectedFilePath;
                    store.openWindow('editor');
                    store.addNotification('IDE Launched', `Opening ${selectedFileNode.name} in Code Editor`, 'Just now');
                  }}
                  className="w-full p-2 bg-[#090b0f] hover:bg-white/[0.04] border border-white/5 hover:border-white/10 rounded-xl text-left transition flex items-center space-x-2.5 text-[10px] font-semibold text-white/70 hover:text-white"
                >
                  <Edit3 className="w-3.5 h-3.5 text-purple-400" />
                  <span>Open in Code Editor</span>
                </button>

                <button
                  onClick={() => {
                    playSound.success();
                    // Navigate terminal path to parent folder
                    const parts = selectedFilePath.split('/');
                    const parent = '/' + parts.slice(0, -1).filter(Boolean).join('/');
                    store.getState().currentDirPath = parent || '/';
                    store.openWindow('terminal');
                    store.logToTerminal(`System: Shell pointer synced to directory ${parent || '/'}`);
                    store.addNotification('Terminal Hooked', `Spawned shell under ${parent || '/'}`, 'Just now');
                  }}
                  className="w-full p-2 bg-[#090b0f] hover:bg-white/[0.04] border border-white/5 hover:border-white/10 rounded-xl text-left transition flex items-center space-x-2.5 text-[10px] font-semibold text-white/70 hover:text-white"
                >
                  <Terminal className={`w-3.5 h-3.5 ${textTheme}`} />
                  <span>Launch Terminal here</span>
                </button>

                <button
                  onClick={() => {
                    playSound.success();
                    store.openWindow('ai-chat');
                    store.sendAiMessage(`Examine and optimize the file located at ${selectedFilePath}:\n\n${selectedFileNode.content}`);
                    store.addNotification('Aether AI', 'Diagnostic prompt dispatched to assistant core.', 'Just now');
                  }}
                  className="w-full p-2 bg-[#090b0f] hover:bg-white/[0.04] border border-white/5 hover:border-white/10 rounded-xl text-left transition flex items-center space-x-2.5 text-[10px] font-semibold text-white/70 hover:text-white"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                  <span>Optimize code with AI</span>
                </button>

                <button
                  onClick={() => {
                    playSound.click();
                    setShowHexPreview(!showHexPreview);
                  }}
                  className="w-full p-2 bg-[#090b0f] hover:bg-white/[0.04] border border-white/5 hover:border-white/10 rounded-xl text-left transition flex items-center space-x-2.5 text-[10px] font-semibold text-white/70 hover:text-white"
                >
                  <Binary className="w-3.5 h-3.5 text-blue-400" />
                  <span>{showHexPreview ? 'Hide Hex Dump' : 'Preview Hex Dump'}</span>
                </button>
              </div>
            </div>

          </div>

          <span className="text-[8px] text-white/20 uppercase tracking-widest font-mono select-none block pt-2 border-t border-white/5">
            Path: {selectedFilePath}
          </span>
        </div>
      ) : (
        /* Empty Preview Panel placeholder */
        <div className="w-60 border-l border-white/5 bg-[#080a0e]/25 p-4 flex flex-col justify-center items-center text-center text-white/20 select-none">
          <FileText className="w-8 h-8 stroke-[0.8] mb-2 opacity-50" />
          <span className="text-[10px] tracking-wide uppercase font-semibold">Select a File</span>
          <p className="text-[8.5px] leading-relaxed text-white/15 max-w-[150px] mt-1 select-none">
            Click on any file to populate metadata indices and predictive triggers.
          </p>
        </div>
      )}

      {/* ================= LIVE HEX PREVIEW DIALOGUE ================= */}
      {selectedFilePath && selectedFileNode && showHexPreview && (
        <div className="absolute right-[245px] top-4 bottom-4 w-72 bg-[#040609]/95 border border-white/10 shadow-2xl rounded-2xl p-4 flex flex-col z-[100] backdrop-blur-xl animate-fade-in">
          <div className="flex justify-between items-center border-b border-white/5 pb-2 mb-3">
            <div className="flex items-center space-x-2 text-blue-400 font-bold text-[10px] uppercase tracking-wider">
              <Binary className="w-3.5 h-3.5" />
              <span>Cyber Hexadecimal View</span>
            </div>
            <button 
              onClick={() => setShowHexPreview(false)}
              className="p-0.5 rounded text-white/30 hover:text-white transition"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <pre className="flex-1 overflow-auto text-[8.5px] leading-tight text-cyan-400/80 scrollbar-none font-mono bg-black/45 p-3 rounded-xl border border-white/5">
            {renderHexDump(selectedFileNode.content)}
          </pre>
          <div className="text-[8px] text-white/20 mt-2 text-right uppercase">
            Dump range: 0x0000 - 0x0100
          </div>
        </div>
      )}

      {/* VFS CREATION MODALS */}
      {showNewFolderModal && (
        <div className="absolute inset-0 bg-[#030406]/75 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <form onSubmit={handleCreateFolder} className="w-80 cyber-glass-heavy border border-white/10 rounded-2xl p-6 space-y-4 shadow-2xl">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-white">Create Directory Node</h3>
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="folder_name"
              className={`w-full bg-[#07090c] border rounded-lg px-3 py-2 text-white outline-none focus:ring-1 focus:ring-current text-xs font-mono uppercase ${accentTheme}`}
              autoFocus
            />
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => { playSound.click(); setShowNewFolderModal(false); }}
                className="w-1/2 border border-white/10 py-1.5 rounded-lg text-white/60 hover:bg-white/5 transition font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="w-1/2 bg-current text-black py-1.5 rounded-lg transition uppercase hover:opacity-90 font-bold"
              >
                Create
              </button>
            </div>
          </form>
        </div>
      )}

      {showNewFileModal && (
        <div className="absolute inset-0 bg-[#030406]/75 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <form onSubmit={handleCreateFile} className="w-80 cyber-glass-heavy border border-white/10 rounded-2xl p-6 space-y-4 shadow-2xl">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-white">Create Document Node</h3>
            <input
              type="text"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              placeholder="document_name.txt"
              className={`w-full bg-[#07090c] border rounded-lg px-3 py-2 text-white outline-none focus:ring-1 focus:ring-current text-xs font-mono uppercase ${accentTheme}`}
              autoFocus
            />
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => { playSound.click(); setShowNewFileModal(false); }}
                className="w-1/2 border border-white/10 py-1.5 rounded-lg text-white/60 hover:bg-white/5 transition font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="w-1/2 bg-current text-black py-1.5 rounded-lg transition uppercase hover:opacity-90 font-bold"
              >
                Create
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TEXT EDITOR DRAWER BACKUP */}
      {editingFile && (
        <div className="absolute inset-0 bg-[#030406]/85 backdrop-blur-md z-[150] flex flex-col">
          {/* Header */}
          <div className="px-4 py-3 bg-[#090b0e] border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center space-x-2 text-white">
              <Edit3 className={`w-4 h-4 ${textTheme}`} />
              <span className="font-bold uppercase tracking-wide">Text Editor: {editingFile.name}</span>
            </div>
            <button
              onClick={() => { playSound.click(); setEditingFile(null); }}
              className="p-1 rounded hover:bg-white/5 text-white/40 hover:text-white transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Textarea */}
          <textarea
            value={editingFile.content}
            onChange={(e) => setEditingFile(prev => prev ? { ...prev, content: e.target.value } : null)}
            className="flex-1 bg-[#050608]/90 text-gray-200 p-4 font-mono text-xs leading-relaxed outline-none border-none resize-none"
            spellCheck="false"
          />

          {/* Action Footer */}
          <div className="p-3 bg-[#090b0e] border-t border-white/5 flex justify-end space-x-2">
            <button
              onClick={() => { playSound.click(); setEditingFile(null); }}
              className="px-4 py-1.5 border border-white/10 rounded-lg text-white/60 hover:bg-white/5 transition font-semibold"
            >
              Discard
            </button>
            <button
              onClick={handleSaveEditedFile}
              className={`px-5 py-1.5 border rounded-lg text-black bg-current hover:opacity-90 transition font-bold flex items-center space-x-1 ${accentTheme}`}
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Changes</span>
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
