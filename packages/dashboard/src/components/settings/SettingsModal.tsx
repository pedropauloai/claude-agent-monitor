import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AppearanceTab } from './AppearanceTab.js';
import { AgentMapTab } from './AgentMapTab.js';
import { ActivityFeedTab } from './ActivityFeedTab.js';
import { AdvancedTab } from './AdvancedTab.js';
import { useSettingsStore } from '../../stores/settings-store.js';
import type { ThemeName } from '../../stores/settings-store.js';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabId = 'appearance' | 'agent-map' | 'activity-feed' | 'advanced';

interface TabConfig {
  id: TabId;
  label: string;
}

const TABS: TabConfig[] = [
  { id: 'appearance', label: 'Aparencia' },
  { id: 'agent-map', label: 'Agent Map' },
  { id: 'activity-feed', label: 'Activity Feed' },
  { id: 'advanced', label: 'Avancado' },
];

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

const modalVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.95, y: 20 },
};

// === Theme-conditional style helpers ===

function getModalClasses(theme: ThemeName): string {
  switch (theme) {
    case 'pixel':
      return 'relative w-full max-w-lg mx-4 max-h-[85vh] flex flex-col';
    case 'terminal':
      return 'relative w-full max-w-lg mx-4 max-h-[85vh] flex flex-col';
    case 'modern':
    default:
      return 'relative w-full max-w-lg mx-4 max-h-[85vh] flex flex-col rounded-2xl shadow-2xl';
  }
}

function getModalStyle(theme: ThemeName): React.CSSProperties {
  switch (theme) {
    case 'pixel':
      return {
        background: 'var(--pixel-bg-dark, #0f0f1e)',
        border: '4px solid var(--pixel-border, #444477)',
        boxShadow: 'inset -4px -4px 0 rgba(0,0,0,0.4), inset 4px 4px 0 rgba(255,255,255,0.08), 0 0 0 2px #000, 8px 8px 0 rgba(0,0,0,0.5)',
        fontFamily: "'Press Start 2P', monospace",
        imageRendering: 'pixelated',
      };
    case 'terminal':
      return {
        background: '#0a0a0a',
        border: '1px solid #00aa00',
        boxShadow: '0 0 20px rgba(0,255,0,0.05), inset 0 0 60px rgba(0,255,0,0.02)',
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      };
    case 'modern':
    default:
      return {
        background: 'rgba(15, 15, 15, 0.85)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        border: '1px solid rgba(255,255,255,0.08)',
      };
  }
}

function getHeaderClasses(theme: ThemeName): string {
  switch (theme) {
    case 'pixel':
      return 'flex items-center justify-between px-4 py-3 shrink-0';
    case 'terminal':
      return 'flex items-center justify-between px-4 py-3 shrink-0';
    case 'modern':
    default:
      return 'flex items-center justify-between px-5 py-4 border-b border-white/5 shrink-0';
  }
}

function getHeaderStyle(theme: ThemeName): React.CSSProperties {
  switch (theme) {
    case 'pixel':
      return {
        borderBottom: '3px solid var(--pixel-border, #444477)',
        background: 'var(--pixel-surface, #222244)',
      };
    case 'terminal':
      return {
        borderBottom: '1px solid #1a3a1a',
      };
    default:
      return {};
  }
}

function getTitleElement(theme: ThemeName): React.ReactNode {
  switch (theme) {
    case 'pixel':
      return (
        <span style={{ fontSize: '8px', lineHeight: '14px', color: 'var(--pixel-gold, #ffd700)' }}>
          CONFIGURACOES
        </span>
      );
    case 'terminal':
      return (
        <span style={{ color: '#00ff00', textShadow: '0 0 4px rgba(0,255,0,0.4)', fontSize: '12px' }}>
          {'> configuracoes'}
          <span style={{ animation: 'terminal-cursor-blink 0.6s step-end infinite', color: '#00ff00' }}>{'\u2588'}</span>
        </span>
      );
    case 'modern':
    default:
      return (
        <span className="text-base font-semibold text-cam-text">
          Configuracoes
        </span>
      );
  }
}

function getCloseButtonClasses(theme: ThemeName): string {
  switch (theme) {
    case 'pixel':
      return 'flex items-center justify-center w-7 h-7 pixel-btn';
    case 'terminal':
      return 'flex items-center justify-center w-7 h-7';
    case 'modern':
    default:
      return 'flex items-center justify-center w-7 h-7 rounded-md text-cam-text-muted hover:text-cam-text hover:bg-white/5 transition-colors';
  }
}

function getCloseButtonStyle(theme: ThemeName): React.CSSProperties {
  switch (theme) {
    case 'pixel':
      return { color: 'var(--pixel-text, #e8e8ff)' };
    case 'terminal':
      return { color: '#00aa00' };
    default:
      return {};
  }
}

function getNavClasses(theme: ThemeName): string {
  switch (theme) {
    case 'pixel':
      return 'flex gap-0 px-3 pt-2 pb-0 shrink-0 flex-wrap';
    case 'terminal':
      return 'flex gap-0 px-4 pt-2 pb-0 shrink-0';
    case 'modern':
    default:
      return 'flex gap-1 px-5 pt-3 pb-0 shrink-0';
  }
}

function getNavStyle(theme: ThemeName): React.CSSProperties {
  switch (theme) {
    case 'pixel':
      return { borderBottom: '3px solid var(--pixel-border, #444477)' };
    case 'terminal':
      return { borderBottom: '1px solid #1a3a1a' };
    default:
      return {};
  }
}

function getTabClasses(theme: ThemeName, isActive: boolean): string {
  switch (theme) {
    case 'pixel':
      return isActive ? 'pixel-btn-active px-2 py-1.5' : 'pixel-btn px-2 py-1.5';
    case 'terminal':
      return `px-3 py-1.5 ${isActive ? '' : 'hover:bg-[#0a1f0a]'}`;
    case 'modern':
    default:
      return `px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
        isActive
          ? 'bg-cam-accent text-white'
          : 'text-cam-text-muted hover:text-cam-text hover:bg-white/5'
      }`;
  }
}

function getTabStyle(theme: ThemeName, isActive: boolean): React.CSSProperties {
  switch (theme) {
    case 'pixel':
      return {
        fontSize: '6px',
        lineHeight: '10px',
        fontFamily: "'Press Start 2P', monospace",
      };
    case 'terminal':
      return {
        fontSize: '11px',
        fontFamily: "'JetBrains Mono', monospace",
        color: isActive ? '#00ff00' : '#00aa00',
        textShadow: isActive ? '0 0 4px rgba(0,255,0,0.4)' : 'none',
        borderBottom: isActive ? '2px solid #00ff00' : '2px solid transparent',
        background: 'transparent',
      };
    default:
      return {};
  }
}

function getTabLabel(theme: ThemeName, label: string, isActive: boolean): string {
  if (theme === 'terminal') {
    return isActive ? `> ${label}` : `  ${label}`;
  }
  if (theme === 'pixel') {
    return label.toUpperCase();
  }
  return label;
}

function getContentClasses(theme: ThemeName): string {
  switch (theme) {
    case 'pixel':
      return 'flex-1 overflow-y-auto px-4 py-3 pixel-scrollbar';
    case 'terminal':
      return 'flex-1 overflow-y-auto px-4 py-3 terminal-scrollbar';
    case 'modern':
    default:
      return 'flex-1 overflow-y-auto px-5 py-4 modern-scrollbar';
  }
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<TabId>('appearance');
  const theme = useSettingsStore((s) => s.theme);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  const handleOverlayClick = useCallback(() => {
    onClose();
  }, [onClose]);

  const handleModalClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'appearance':
        return <AppearanceTab />;
      case 'agent-map':
        return <AgentMapTab />;
      case 'activity-feed':
        return <ActivityFeedTab />;
      case 'advanced':
        return <AdvancedTab />;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center"
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          transition={{ duration: 0.2 }}
          onClick={handleOverlayClick}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

          {/* Scanline overlay for terminal */}
          {theme === 'terminal' && (
            <div
              className="absolute inset-0 pointer-events-none z-[51]"
              style={{
                background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.15) 0px, rgba(0,0,0,0.15) 1px, transparent 1px, transparent 3px)',
              }}
            />
          )}

          {/* Modal */}
          <motion.div
            className={getModalClasses(theme)}
            style={getModalStyle(theme)}
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ duration: 0.25, ease: 'easeOut' }}
            onClick={handleModalClick}
          >
            {/* Header */}
            <header className={getHeaderClasses(theme)} style={getHeaderStyle(theme)}>
              <h2>{getTitleElement(theme)}</h2>
              <button
                onClick={onClose}
                className={getCloseButtonClasses(theme)}
                style={getCloseButtonStyle(theme)}
                aria-label="Fechar"
              >
                {theme === 'terminal' ? (
                  <span style={{ fontSize: '12px' }}>[X]</span>
                ) : theme === 'pixel' ? (
                  <span style={{ fontSize: '8px', fontFamily: "'Press Start 2P', monospace" }}>X</span>
                ) : (
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 14 14"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  >
                    <line x1="1" y1="1" x2="13" y2="13" />
                    <line x1="13" y1="1" x2="1" y2="13" />
                  </svg>
                )}
              </button>
            </header>

            {/* Tab Navigation */}
            <nav className={getNavClasses(theme)} style={getNavStyle(theme)}>
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={getTabClasses(theme, activeTab === tab.id)}
                  style={getTabStyle(theme, activeTab === tab.id)}
                >
                  {getTabLabel(theme, tab.label, activeTab === tab.id)}
                </button>
              ))}
            </nav>

            {/* Tab Content */}
            <main className={getContentClasses(theme)}>
              {renderTabContent()}
            </main>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
