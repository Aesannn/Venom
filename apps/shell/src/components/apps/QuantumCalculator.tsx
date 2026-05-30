import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useSystemState } from '../../store/systemStore';
import { playSound } from '../../utils/audio';
import { Delete, History } from 'lucide-react';

interface HistoryEntry {
  expression: string;
  result: string;
}

export const QuantumCalculator: React.FC = () => {
  const state = useSystemState();
  const [display, setDisplay] = useState('0');
  const [expression, setExpression] = useState('');
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const textTheme =
    state.theme === 'purple' ? 'text-violet-400' :
    state.theme === 'green' ? 'text-emerald-400' :
    state.theme === 'orange' ? 'text-amber-400' :
    'text-blue-400';

  const bgAccent =
    state.theme === 'purple' ? 'bg-violet-650 bg-violet-600 text-white' :
    state.theme === 'green' ? 'bg-emerald-650 bg-emerald-600 text-white' :
    state.theme === 'orange' ? 'bg-amber-650 bg-amber-600 text-white' :
    'bg-blue-650 bg-blue-600 text-white';

  const borderAccent =
    state.theme === 'purple' ? 'border-violet-500/20' :
    state.theme === 'green' ? 'border-emerald-500/20' :
    state.theme === 'orange' ? 'border-amber-500/20' :
    'border-blue-500/20';

  const evaluate = useCallback((expr: string): string => {
    try {
      let sanitized = expr
        .replace(/×/g, '*')
        .replace(/÷/g, '/')
        .replace(/π/g, String(Math.PI))
        .replace(/sin\(/g, 'Math.sin(')
        .replace(/cos\(/g, 'Math.cos(')
        .replace(/tan\(/g, 'Math.tan(')
        .replace(/√\(/g, 'Math.sqrt(')
        .replace(/log\(/g, 'Math.log10(')
        .replace(/ln\(/g, 'Math.log(')
        .replace(/\^/g, '**');

      if (!/^[0-9+\-*/().%\s,Math.sincotaglqrpowe10PI]+$/.test(sanitized)) {
        return 'ERR';
      }

      // eslint-disable-next-line no-eval
      const result = Function('"use strict"; return (' + sanitized + ')')();

      if (typeof result !== 'number' || !isFinite(result)) return 'ERR';

      return Number(result.toPrecision(12)).toString();
    } catch {
      return 'ERR';
    }
  }, []);

  const handleInput = useCallback((val: string) => {
    playSound.keypress();

    switch (val) {
      case 'C':
        setDisplay('0');
        setExpression('');
        setLastResult(null);
        break;

      case 'DEL':
        if (display.length <= 1 || display === '0') {
          setDisplay('0');
        } else {
          setDisplay(prev => prev.slice(0, -1));
        }
        break;

      case '=': {
        const exprToEval = expression + display;
        const result = evaluate(exprToEval);
        if (result !== 'ERR') {
          setHistory(prev => [{ expression: exprToEval, result }, ...prev].slice(0, 15));
          playSound.success();
        } else {
          playSound.warning();
        }
        setLastResult(result);
        setDisplay(result);
        setExpression('');
        break;
      }

      case '+':
      case '-':
      case '×':
      case '÷':
      case '^':
      case '%':
        setExpression(prev => prev + display + ' ' + val + ' ');
        setDisplay('0');
        setLastResult(null);
        break;

      case 'sin(':
      case 'cos(':
      case 'tan(':
      case '√(':
      case 'log(':
        setDisplay(val);
        setLastResult(null);
        break;

      case 'π':
        setDisplay(String(Math.PI).substring(0, 10));
        setLastResult(null);
        break;

      case 'NEG':
        if (display !== '0' && display !== 'ERR') {
          setDisplay(prev => prev.startsWith('-') ? prev.slice(1) : '-' + prev);
        }
        break;

      default:
        if (lastResult !== null) {
          setDisplay(val);
          setLastResult(null);
        } else if (display === '0' && val !== '.' && val !== '(' && val !== ')') {
          setDisplay(val);
        } else {
          setDisplay(prev => prev + val);
        }
        break;
    }
  }, [display, expression, evaluate, lastResult]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!containerRef.current?.contains(document.activeElement) && 
          document.activeElement !== document.body) return;

      const key = e.key;

      if (/^[0-9.]$/.test(key)) {
        e.preventDefault();
        handleInput(key);
      } else if (key === '+') { e.preventDefault(); handleInput('+'); }
      else if (key === '-') { e.preventDefault(); handleInput('-'); }
      else if (key === '*') { e.preventDefault(); handleInput('×'); }
      else if (key === '/') { e.preventDefault(); handleInput('÷'); }
      else if (key === '^') { e.preventDefault(); handleInput('^'); }
      else if (key === '%') { e.preventDefault(); handleInput('%'); }
      else if (key === '(' || key === ')') { e.preventDefault(); handleInput(key); }
      else if (key === 'Enter' || key === '=') { e.preventDefault(); handleInput('='); }
      else if (key === 'Backspace') { e.preventDefault(); handleInput('DEL'); }
      else if (key === 'Escape') { e.preventDefault(); handleInput('C'); }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleInput]);

  const previewResult = expression ? evaluate(expression + display) : null;

  const CalcButton: React.FC<{
    label: string;
    value?: string;
    span?: number;
    variant?: 'default' | 'operator' | 'accent' | 'danger';
    icon?: React.ReactNode;
  }> = ({ label, value, span = 1, variant = 'default', icon }) => {
    const baseStyle = 'rounded-lg font-medium text-xs transition-all duration-150 active:scale-95 border flex items-center justify-center';
    const variants = {
      default: 'bg-zinc-900/50 border-zinc-800 text-zinc-300 hover:bg-zinc-800/40 hover:border-zinc-700',
      operator: `bg-zinc-900/30 ${borderAccent} ${textTheme} hover:bg-zinc-800/30`,
      accent: `${bgAccent} border-transparent font-semibold hover:opacity-90`,
      danger: 'bg-rose-950/20 border-rose-900/30 text-rose-450 text-rose-450 hover:bg-rose-900/30',
    };

    return (
      <button
        onClick={() => handleInput(value || label)}
        className={`${baseStyle} ${variants[variant]} h-10`}
        style={{ gridColumn: span > 1 ? `span ${span}` : undefined }}
      >
        {icon || label}
      </button>
    );
  };

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      className={`flex-1 bg-[#09090b]/95 text-xs font-sans h-full flex flex-col select-none overflow-hidden outline-none`}
    >
      {/* Display Section */}
      <div className="p-5 bg-[#0d0d10]/40 border-b border-zinc-800/60 space-y-1">
        {/* Expression row */}
        <div className="text-[10px] text-zinc-500 text-right h-4 truncate font-mono tracking-wider">
          {expression || '\u00A0'}
        </div>

        {/* Main display */}
        <div className={`text-right text-2xl font-semibold tracking-tight ${
          display === 'ERR' ? 'text-rose-400' : 'text-zinc-150 text-zinc-200'
        }`}>
          {display}
        </div>

        {/* Preview row */}
        {previewResult && previewResult !== 'ERR' && (
          <div className={`text-right text-[11px] ${textTheme} opacity-60 font-mono`}>
            = {previewResult}
          </div>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#0c0c0e]/80 border-b border-zinc-800/60">
        <button
          onClick={() => { playSound.click(); setShowHistory(!showHistory); }}
          className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-[10px] uppercase tracking-wider font-semibold transition ${
            showHistory ? `${textTheme} bg-zinc-850 bg-zinc-800/60` : 'text-zinc-500 hover:text-zinc-400'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>History ({history.length})</span>
        </button>
        <button
          onClick={() => { playSound.click(); setHistory([]); }}
          className="text-[10px] text-zinc-500 hover:text-zinc-400 uppercase tracking-wider font-semibold transition"
        >
          Clear
        </button>
      </div>

      {showHistory ? (
        /* History Panel */
        <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-thin">
          {history.length === 0 ? (
            <div className="text-center text-zinc-650 text-zinc-600 text-[10px] uppercase tracking-wider py-16 font-semibold">
              No calculations yet
            </div>
          ) : (
            history.map((entry, i) => (
              <button
                key={i}
                onClick={() => {
                  playSound.click();
                  setDisplay(entry.result);
                  setExpression('');
                  setShowHistory(false);
                }}
                className="w-full text-right p-3 rounded-lg border border-zinc-800/60 bg-zinc-900/20 hover:bg-zinc-800/20 transition space-y-1 block"
              >
                <div className="text-[10px] text-zinc-500 truncate font-mono">{entry.expression}</div>
                <div className={`text-base font-semibold ${textTheme}`}>= {entry.result}</div>
              </button>
            ))
          )}
        </div>
      ) : (
        /* Calculator Grid */
        <div className="flex-1 p-4 flex flex-col justify-end space-y-2">
          {/* Scientific row */}
          <div className="grid grid-cols-5 gap-2">
            <CalcButton label="sin" value="sin(" variant="operator" />
            <CalcButton label="cos" value="cos(" variant="operator" />
            <CalcButton label="tan" value="tan(" variant="operator" />
            <CalcButton label="√" value="√(" variant="operator" />
            <CalcButton label="log" value="log(" variant="operator" />
          </div>

          {/* Function row */}
          <div className="grid grid-cols-5 gap-2">
            <CalcButton label="π" variant="operator" />
            <CalcButton label="^" variant="operator" />
            <CalcButton label="(" variant="operator" />
            <CalcButton label=")" variant="operator" />
            <CalcButton label="%" variant="operator" />
          </div>

          {/* Main grid */}
          <div className="grid grid-cols-4 gap-2">
            <CalcButton label="C" variant="danger" />
            <CalcButton label="DEL" variant="danger" icon={<Delete className="w-4 h-4" />} />
            <CalcButton label="÷" variant="operator" />
            <CalcButton label="×" variant="operator" />

            <CalcButton label="7" />
            <CalcButton label="8" />
            <CalcButton label="9" />
            <CalcButton label="-" variant="operator" />

            <CalcButton label="4" />
            <CalcButton label="5" />
            <CalcButton label="6" />
            <CalcButton label="+" variant="operator" />

            <CalcButton label="1" />
            <CalcButton label="2" />
            <CalcButton label="3" />
            <CalcButton label="=" variant="accent" />

            <CalcButton label="0" span={2} />
            <CalcButton label="." />
            <CalcButton label="±" value="NEG" />
          </div>
        </div>
      )}
    </div>
  );
};
