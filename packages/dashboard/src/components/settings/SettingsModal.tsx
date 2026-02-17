import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AppearanceTab } from './AppearanceTab.js';
import { AgentMapTab } from './AgentMapTab.js';
import { ActivityFeedTab } from './ActivityFeedTab.js';
import { AdvancedTab } from './AdvancedTab.js';

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

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<TabId>('appearance');

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

          {/* Modal */}
          <motion.div
            className="relative w-full max-w-lg mx-4 max-h-[85vh] flex flex-col rounded-xl border border-cam-border bg-cam-surface shadow-2xl"
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ duration: 0.25, ease: 'easeOut' }}
            onClick={handleModalClick}
          >
            {/* Header */}
            <header className="flex items-center justify-between px-5 py-4 border-b border-cam-border shrink-0">
              <h2 className="text-base font-semibold text-cam-text">
                Configuracoes
              </h2>
              <button
                onClick={onClose}
                className="flex items-center justify-center w-7 h-7 rounded-md text-cam-text-muted hover:text-cam-text hover:bg-cam-surface-3 transition-colors"
                aria-label="Fechar"
              >
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
              </button>
            </header>

            {/* Tab Navigation */}
            <nav className="flex gap-1 px-5 pt-3 pb-0 shrink-0">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    activeTab === tab.id
                      ? 'bg-cam-accent text-white'
                      : 'text-cam-text-muted hover:text-cam-text hover:bg-cam-surface-3'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>

            {/* Tab Content */}
            <main className="flex-1 overflow-y-auto px-5 py-4">
              {renderTabContent()}
            </main>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
