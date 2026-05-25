import { motion, AnimatePresence } from 'motion/react';
import { useEffect, useState } from 'react';

export type AvatarState = 'idle' | 'listening' | 'processing' | 'translating' | 'speaking';

interface RoboAvatarProps {
  state: AvatarState;
  variant?: 'source' | 'target';
}

export const RoboAvatar = ({ state, variant = 'source' }: RoboAvatarProps) => {
  const [blink, setBlink] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setBlink(true);
      setTimeout(() => setBlink(false), 150);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const getLightColor = () => {
    if (variant === 'target') {
      switch (state) {
        case 'speaking': return 'bg-indigo-400';
        case 'translating': return 'bg-pink-400';
        case 'processing': return 'bg-fuchsia-400';
        default: return 'bg-indigo-500/50';
      }
    }
    switch (state) {
      case 'listening': return 'bg-cyan-400';
      case 'processing': return 'bg-purple-400';
      case 'translating': return 'bg-blue-400';
      case 'speaking': return 'bg-emerald-400';
      default: return 'bg-cyan-500/50'; // idle
    }
  };

  const getGlowColor = () => {
    if (variant === 'target') {
      switch (state) {
        case 'speaking': return 'shadow-[0_0_25px_#818cf8] pointer-events-none';
        case 'translating': return 'shadow-[0_0_20px_#f472b6] pointer-events-none';
        case 'processing': return 'shadow-[0_0_20px_#e879f9] pointer-events-none';
        default: return 'shadow-[0_0_10px_#6366f1] pointer-events-none';
      }
    }
    switch (state) {
      case 'listening': return 'shadow-[0_0_20px_#22d3ee] pointer-events-none';
      case 'processing': return 'shadow-[0_0_20px_#c084fc] pointer-events-none';
      case 'translating': return 'shadow-[0_0_20px_#60a5fa] pointer-events-none';
      case 'speaking': return 'shadow-[0_0_25px_#34d399] pointer-events-none';
      default: return 'shadow-[0_0_10px_#06b6d4] pointer-events-none'; // idle
    }
  };

  const isSpeaking = state === 'speaking';
  const isProcessingOrTranslating = state === 'processing' || state === 'translating';
  const isListening = state === 'listening';

  return (
    <div className="relative w-32 h-32 mx-auto flex items-center justify-center p-2">
      {/* Outer Glow / Ring for state context */}
      <AnimatePresence>
        {isListening && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: [0.3, 0.8, 0.3], scale: [1, 1.2, 1] }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
            className="absolute inset-0 rounded-full border-2 border-cyan-500/50"
            style={{ boxShadow: '0 0 20px rgba(34,211,238,0.3)' }}
          />
        )}
        {isProcessingOrTranslating && (
          <motion.div
            initial={{ opacity: 0, rotate: 0 }}
            animate={{ opacity: 1, rotate: 360 }}
            exit={{ opacity: 0 }}
            transition={{ opacity: { duration: 0.3 }, rotate: { repeat: Infinity, duration: 2, ease: "linear" } }}
            className={`absolute inset-0 rounded-full border-y-2 border-transparent ${
              variant === 'target' 
                ? 'border-t-pink-500 border-b-pink-500' 
                : (state === 'processing' ? 'border-t-purple-500 border-b-purple-500' : 'border-t-blue-500 border-b-blue-500')
            }`}
          />
        )}
        {isSpeaking && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: [0, 0.5, 0], scale: [1, 1.5, 1.8] }}
            exit={{ opacity: 0 }}
            transition={{ repeat: Infinity, duration: 1.2, ease: "easeOut" }}
            className={`absolute inset-0 rounded-full border ${variant === 'target' ? 'border-indigo-500' : 'border-emerald-500'}`}
          />
        )}
      </AnimatePresence>

      {/* Head Shape */}
      <motion.div
        animate={{ 
          y: isSpeaking ? [0, -3, 0] : (isListening ? [0, 2, 0] : 0), 
          rotateZ: isSpeaking ? [0, 1, -1, 0] : 0,
          scale: state === 'idle' ? [1, 1.02, 1] : 1
        }}
        transition={{ 
          repeat: Infinity, 
          duration: state === 'idle' ? 3 : (isSpeaking ? 1.5 : 2), 
          ease: "easeInOut" 
        }}
        className={`relative z-10 w-24 h-24 bg-gradient-to-b from-slate-800 to-slate-900 rounded-[28px] border flex flex-col items-center justify-center gap-2 overflow-hidden ${
          variant === 'target' ? (
            state === 'speaking' ? 'border-indigo-500/60' :
            state === 'translating' ? 'border-pink-500/60' :
            state === 'processing' ? 'border-fuchsia-500/60' :
            'border-slate-600/30'
          ) : (
            state === 'listening' ? 'border-cyan-500/60' : 
            state === 'processing' ? 'border-purple-500/60' : 
            state === 'translating' ? 'border-blue-500/60' : 
            state === 'speaking' ? 'border-emerald-500/60' : 
            'border-slate-600/30'
          )
        }`}
        style={{ boxShadow: 'inset 0 0 15px rgba(0,0,0,0.5)' }}
      >
        {/* Holographic background noise for Translating/Processing */}
        {isProcessingOrTranslating && (
          <motion.div 
            animate={{ y: ['0%', '100%'] }}
            transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
            className={`absolute w-full h-[2px] ${
              variant === 'target' 
                ? 'bg-pink-500/30 shadow-[0_0_10px_#ec4899]' 
                : (state === 'processing' ? 'bg-purple-500/30 shadow-[0_0_10px_#a855f7]' : 'bg-blue-500/30 shadow-[0_0_10px_#3b82f6]')
            }`}
          />
        )}

        {/* Robot ears / antennas base */}
        <div className="absolute top-1/2 -left-1 w-2 h-6 bg-slate-700 -translate-y-1/2 rounded-r-sm"></div>
        <div className="absolute top-1/2 -right-1 w-2 h-6 bg-slate-700 -translate-y-1/2 rounded-l-sm"></div>

        {/* Glowing Eyes Container */}
        <div className="flex gap-4 z-10 w-full px-4 justify-center mt-3">
          {[0, 1].map((i) => (
            <motion.div
              key={i}
              animate={{ 
                scaleY: blink ? 0.1 : 1, 
                opacity: (isSpeaking || isListening) ? [0.7, 1, 0.7] : 0.9 
              }}
              transition={{ opacity: { repeat: Infinity, duration: 1.2 } }}
              className={`w-5 h-4 rounded-full outline outline-1 outline-offset-1 flex items-center justify-center bg-slate-950 shadow-[inset_0_0_3px_rgba(0,0,0,0.8)] ${
                variant === 'target' ? (
                  state === 'speaking' ? 'outline-indigo-500/50' :
                  state === 'translating' ? 'outline-pink-500/50' :
                  state === 'processing' ? 'outline-fuchsia-500/50' :
                  'outline-slate-500/30'
                ) : (
                  state === 'listening' ? 'outline-cyan-500/50' :
                  state === 'processing' ? 'outline-purple-500/50' :
                  state === 'translating' ? 'outline-blue-500/50' :
                  state === 'speaking' ? 'outline-emerald-500/50' :
                  'outline-slate-500/30'
                )
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${getLightColor()} ${getGlowColor()}`} />
            </motion.div>
          ))}
        </div>
        
        {/* Mouth / Voice visualizer */}
        <div className="w-10 h-6 bg-slate-950/90 rounded-[10px] flex items-center justify-evenly px-1.5 py-1 z-10 overflow-hidden shadow-[inset_0_0_5px_rgba(0,0,0,0.8)] mt-1">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                animate={{ 
                  height: isSpeaking ? ['20%', '80%', '30%', '100%', '40%'] : (isListening ? ['10%', '20%', '10%'] : '10%'),
                }}
                transition={{ 
                  repeat: Infinity, 
                  duration: isSpeaking ? 0.3 + (i * 0.1) : 1, 
                  ease: "linear",
                  delay: i * 0.1
                }}
                className={`w-1.5 rounded-full ${getLightColor()} ${getGlowColor()}`}
              />
            ))}
        </div>
      </motion.div>
    </div>
  );
};
