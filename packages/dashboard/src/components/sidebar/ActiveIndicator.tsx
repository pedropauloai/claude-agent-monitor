import { motion, AnimatePresence } from 'framer-motion';

interface ActiveIndicatorProps {
  agentCount: number;
  hasNewEvents?: boolean;
}

export function ActiveIndicator({ agentCount, hasNewEvents }: ActiveIndicatorProps) {
  if (agentCount === 0) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        className="flex items-center gap-1"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        transition={{ duration: 0.2 }}
      >
        {/* Pulsing green dot */}
        <span className="relative flex h-2 w-2">
          <span
            className={`absolute inline-flex h-full w-full rounded-full bg-cam-success opacity-75 ${
              hasNewEvents ? 'animate-ping' : 'animate-pulse'
            }`}
          />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-cam-success" />
        </span>

        {/* Agent count badge */}
        <motion.span
          key={agentCount}
          className="flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-cam-accent/20 text-cam-accent text-[10px] font-bold leading-none"
          initial={{ scale: 1.3 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 15 }}
        >
          {agentCount}
        </motion.span>
      </motion.div>
    </AnimatePresence>
  );
}
