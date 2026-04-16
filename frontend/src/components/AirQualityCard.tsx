import React from 'react';
import { PollutantInfo } from '../types';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';
import * as Icons from 'lucide-react';
import { POLLUTANTS } from '../constants';

interface AirQualityCardProps {
  pollutant: PollutantInfo;
  value: number;
}

export const AirQualityCard: React.FC<AirQualityCardProps> = ({ pollutant, value }) => {
  const getStatusColor = (val: number, thresholds: PollutantInfo['thresholds']) => {
    if (val <= thresholds.good) return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
    if (val <= thresholds.moderate) return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
    if (val <= thresholds.unhealthy) return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
    return 'text-rose-500 bg-rose-500/10 border-rose-500/20';
  };

  const statusClass = getStatusColor(value, pollutant.thresholds);
  
  // Dynamically get the icon component
  const IconComponent = (Icons as any)[pollutant.iconName] || Icons.Activity;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "p-6 rounded-2xl border bg-white/5 backdrop-blur-sm transition-all duration-300",
        "hover:bg-white/10 hover:border-white/20"
      )}
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex gap-3">
          <div className={cn("p-2 rounded-xl bg-zinc-900 border border-zinc-800", statusClass.split(' ')[0])}>
            <IconComponent className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">{pollutant.name}</h3>
            <p className="text-xs text-zinc-500 mt-1">{pollutant.label}</p>
          </div>
        </div>
        <div className={cn("px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-tighter border", statusClass)}>
          {value <= pollutant.thresholds.good ? 'Good' : value <= pollutant.thresholds.moderate ? 'Moderate' : 'Unhealthy'}
        </div>
      </div>
      
      <div className="flex items-baseline gap-2">
        <span className="text-4xl font-light tracking-tight text-white">{value}</span>
        <span className="text-sm text-zinc-500 font-mono">{pollutant.unit}</span>
      </div>

      <div className="mt-6 h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min((value / pollutant.max) * 100, 100)}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          className={cn(
            "h-full rounded-full",
            value <= pollutant.thresholds.good ? 'bg-emerald-500' : 
            value <= pollutant.thresholds.moderate ? 'bg-amber-500' : 
            value <= pollutant.thresholds.unhealthy ? 'bg-orange-500' : 'bg-rose-500'
          )}
        />
      </div>
    </motion.div>
  );
};

/**
 * Specialized VOC Card component as requested.
 * This is a convenience wrapper around the generic AirQualityCard.
 */
export const VocCard: React.FC<{ value: number }> = ({ value }) => {
  return <AirQualityCard pollutant={POLLUTANTS.voc} value={value} />;
};
