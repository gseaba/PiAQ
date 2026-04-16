import React from 'react';
import { motion } from 'motion/react';
import { getAqiLevel } from '../constants';
import { cn } from '../lib/utils';

interface AqiGaugeProps {
  aqi: number;
}

export const AqiGauge: React.FC<AqiGaugeProps> = ({ aqi }) => {
  const level = getAqiLevel(aqi);
  const percentage = Math.min((aqi / 500) * 100, 100);

  return (
    <div className="relative flex flex-col items-center justify-center p-8 bg-zinc-900/50 rounded-3xl border border-zinc-800 backdrop-blur-xl overflow-hidden">
      {/* Background Glow */}
      <div 
        className="absolute inset-0 opacity-20 blur-[100px] transition-all duration-1000"
        style={{ backgroundColor: level.color }}
      />

      <div className="relative z-10 text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 100 }}
          className="mb-2"
        >
          <span className="text-sm font-medium text-zinc-500 uppercase tracking-[0.2em]">Air Quality Index</span>
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="flex flex-col items-center"
        >
          <span className="text-8xl font-black tracking-tighter text-white tabular-nums leading-none">
            {aqi}
          </span>
          <div 
            className="mt-4 px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-widest border transition-all duration-500"
            style={{ 
              color: level.color, 
              borderColor: `${level.color}40`,
              backgroundColor: `${level.color}10`
            }}
          >
            {level.label}
          </div>
        </motion.div>

        <div className="mt-12 w-full max-w-md">
          <div className="flex justify-between text-[10px] text-zinc-600 uppercase tracking-widest mb-2 font-mono">
            <span>0</span>
            <span>500</span>
          </div>
          <div className="h-2 w-full bg-zinc-800 rounded-full relative overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${percentage}%` }}
              transition={{ duration: 1.5, ease: "circOut" }}
              className="h-full rounded-full shadow-[0_0_20px_rgba(255,255,255,0.2)]"
              style={{ backgroundColor: level.color }}
            />
          </div>
        </div>
      </div>

      {/* Decorative Elements */}
      <div className="absolute top-4 right-4 flex gap-1">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="w-1 h-1 rounded-full bg-zinc-700" />
        ))}
      </div>
    </div>
  );
};
