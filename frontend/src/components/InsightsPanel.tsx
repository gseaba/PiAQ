import React, { useState, useEffect } from 'react';
import { Sparkles, AlertCircle, CheckCircle2, ChevronRight, Loader2 } from 'lucide-react';
import { AirQualityData, Insight } from '../types';
import { getAirQualityInsights } from '../services/geminiService';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface InsightsPanelProps {
  currentData: AirQualityData;
}

export const InsightsPanel: React.FC<InsightsPanelProps> = ({ currentData }) => {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchInsights = async () => {
    setLoading(true);
    const newInsights = await getAirQualityInsights(currentData);
    setInsights(newInsights);
    setLoading(false);
  };

  useEffect(() => {
    fetchInsights();
  }, [currentData.timestamp]);

  const getIcon = (type: Insight['type']) => {
    switch (type) {
      case 'health': return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case 'action': return <ChevronRight className="w-4 h-4 text-amber-500" />;
      case 'alert': return <AlertCircle className="w-4 h-4 text-rose-500" />;
    }
  };

  return (
    <div className="p-6 bg-zinc-900/40 rounded-3xl border border-zinc-800/50 backdrop-blur-sm h-[500px] flex flex-col">
      <div className="flex justify-between items-center mb-6 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-indigo-400" />
          <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-widest">AI Insights</h3>
        </div>
        <button 
          onClick={fetchInsights}
          disabled={loading}
          className="p-2 hover:bg-white/5 rounded-full transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin text-zinc-500" /> : <Sparkles className="w-4 h-4 text-zinc-500" />}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-12 text-zinc-500 gap-4"
            >
              <Loader2 className="w-8 h-8 animate-spin" />
              <p className="text-xs uppercase tracking-widest animate-pulse">Analyzing Air Quality...</p>
            </motion.div>
          ) : (
            <motion.div
              key="content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4"
            >
              {insights.map((insight, idx) => (
                <motion.div
                  key={insight.id || idx}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: idx * 0.1 }}
                  className={cn(
                    "p-4 rounded-2xl border bg-white/5 transition-all duration-300",
                    "hover:bg-white/10 hover:border-white/20 group cursor-default"
                  )}
                >
                  <div className="flex gap-3">
                    <div className="mt-1 flex-shrink-0">{getIcon(insight.type)}</div>
                    <div>
                      <p className="text-sm text-zinc-300 leading-relaxed group-hover:text-white transition-colors">
                        {insight.message}
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        <span className={cn(
                          "text-[10px] uppercase tracking-widest font-bold",
                          insight.severity === 'high' ? 'text-rose-500' : 
                          insight.severity === 'medium' ? 'text-amber-500' : 'text-emerald-500'
                        )}>
                          {insight.severity} Priority
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
