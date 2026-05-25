import { motion } from 'motion/react';

interface AudioVisualizerProps {
  isActive: boolean;
}

export const AudioVisualizer = ({ isActive }: AudioVisualizerProps) => {
  // Simple CSS vertical bars that animate when active
  const bars = Array.from({ length: 24 });

  return (
    <div className="flex items-center justify-center space-x-1 h-32 bg-black/20 rounded-2xl p-4 backdrop-blur-sm border border-white/5">
      {bars.map((_, i) => {
        // Pseudo-random height for baseline
        const baseHeight = 10 + Math.abs(Math.sin(i * 0.5)) * 20;
        return (
          <motion.div
            key={i}
            className="w-2 rounded-full bg-cyan-400"
            initial={{ height: `${baseHeight}%` }}
            animate={{
              height: isActive ? `${Math.max(20, Math.random() * 100)}%` : `${baseHeight}%`,
              opacity: isActive ? [0.5, 1, 0.5] : 0.4
            }}
            transition={{
              height: {
                duration: 0.1 + Math.random() * 0.2,
                repeat: isActive ? Infinity : 0,
                repeatType: "reverse"
              },
              opacity: {
                duration: 0.5,
                repeat: isActive ? Infinity : 0,
                repeatType: "reverse"
              }
            }}
          />
        );
      })}
    </div>
  );
};
