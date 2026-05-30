import React, { useEffect, useRef, useState } from 'react';
import { playSound } from '../utils/audio';
import * as Icons from 'lucide-react';

export interface ContextMenuItem {
  label?: string;
  icon?: string;
  onClick?: () => void;
  shortcut?: string;
  divider?: boolean;
  submenu?: ContextMenuItem[];
}

interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  items: ContextMenuItem[];
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, onClose, items }) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ x, y });
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null);
  const [submenuCoords, setSubmenuCoords] = useState<{ x: string; y: number }>({ x: '100%', y: -6 });

  const hoverBg = 'hover:bg-white/8';

  // Get icon dynamically
  const getIcon = (iconName?: string) => {
    if (!iconName) return null;
    const IconComponent = (Icons as any)[iconName];
    if (!IconComponent) return null;
    return <IconComponent className="w-3.5 h-3.5" />;
  };

  // Adjust menu position to stay within bounds
  useEffect(() => {
    if (!menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    const winWidth = window.innerWidth;
    const winHeight = window.innerHeight;

    let adjustedX = x;
    let adjustedY = y;

    if (x + rect.width > winWidth) {
      adjustedX = winWidth - rect.width - 8;
    }
    if (y + rect.height > winHeight) {
      adjustedY = winHeight - rect.height - 8;
    }

    setCoords({ x: Math.max(8, adjustedX), y: Math.max(8, adjustedY) });
  }, [x, y]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const handleItemClick = (e: React.MouseEvent, item: ContextMenuItem) => {
    e.stopPropagation();
    if (item.submenu) return;
    
    playSound.click();
    if (item.onClick) {
      item.onClick();
    }
    onClose();
  };

  const handleMouseEnter = (e: React.MouseEvent, item: ContextMenuItem) => {
    if (item.submenu) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      setActiveSubmenu(item.label || null);
      
      // Position submenu to the right or left depending on space relative to the parent item
      const fitsRight = rect.right + 164 <= window.innerWidth;
      setSubmenuCoords({
        x: fitsRight ? 'calc(100% + 4px)' : '-164px',
        y: -6
      });
    } else {
      setActiveSubmenu(null);
    }
  };

  return (
    <div
      ref={menuRef}
      className="absolute z-[9999] w-48 rounded-xl py-1.5 font-sans text-[11px] text-white/80 animate-menuFadeIn select-none"
      style={{
        top: coords.y,
        left: coords.x,
        background: 'rgba(30, 30, 36, 0.72)',
        backdropFilter: 'blur(32px) saturate(150%)',
        WebkitBackdropFilter: 'blur(32px) saturate(150%)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 12px 40px -8px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)',
      }}
    >
      {items.map((item, index) => {
        if (item.divider) {
          return <div key={`div-${index}`} className="my-1 border-t border-white/5" />;
        }

        const hasSubmenu = !!item.submenu;
        const isSubmenuActive = activeSubmenu === item.label;

        return (
          <div
            key={`item-${index}`}
            className="relative"
            onMouseEnter={(e) => handleMouseEnter(e, item)}
          >
            <button
              onClick={(e) => handleItemClick(e, item)}
              className={`w-full px-3 py-1.5 flex items-center justify-between transition text-left group ${hoverBg} ${
                isSubmenuActive ? 'bg-white/5 text-white' : ''
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <div className="w-3.5 h-3.5 flex items-center justify-center text-white/50 group-hover:text-white/80">
                  {getIcon(item.icon)}
                </div>
                <span className="group-hover:text-white font-medium tracking-normal">
                  {item.label}
                </span>
              </div>
              
              {item.shortcut && (
                <span className="text-[8px] text-white/30 group-hover:text-white/50 uppercase tracking-widest pl-2">
                  {item.shortcut}
                </span>
              )}

              {hasSubmenu && (
                <Icons.ChevronRight className="w-3 h-3 text-white/30 group-hover:text-white/70" />
              )}
            </button>

            {/* Submenu render */}
            {hasSubmenu && isSubmenuActive && (
              <div
                style={{
                  top: submenuCoords.y,
                  left: submenuCoords.x,
                  background: 'rgba(30, 30, 36, 0.72)',
                  backdropFilter: 'blur(32px) saturate(150%)',
                  WebkitBackdropFilter: 'blur(32px) saturate(150%)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: '0 12px 40px -8px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)',
                }}
                className="absolute w-40 rounded-xl py-1.5 animate-menuFadeIn"
              >
                {item.submenu!.map((subItem, subIndex) => (
                  <button
                    key={`sub-${subIndex}`}
                    onClick={(e) => handleItemClick(e, subItem)}
                    className={`w-full px-3 py-1.5 flex items-center justify-between transition text-left group ${hoverBg}`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <div className="w-3.5 h-3.5 flex items-center justify-center text-white/50 group-hover:text-white/80">
                        {getIcon(subItem.icon)}
                      </div>
                      <span className="group-hover:text-white font-medium tracking-normal">
                        {subItem.label}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
