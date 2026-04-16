import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  TooltipProps,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { AirQualityData } from '../types';
import { motion } from 'motion/react';

interface HistoricalChartProps {
  data: AirQualityData[];
  dataKey: keyof AirQualityData;
  color: string;
  label: string;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-zinc-900/90 border border-zinc-800 p-3 rounded-xl backdrop-blur-md shadow-2xl">
        <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1">
          {label ? format(parseISO(label as string), 'MMM d, HH:mm') : ''}
        </p>
        <p className="text-lg font-bold text-white">
          {payload[0].value} <span className="text-xs font-normal text-zinc-400">units</span>
        </p>
      </div>
    );
  }
  return null;
};

export const HistoricalChart: React.FC<HistoricalChartProps> = ({ data, dataKey, color, label }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="p-6 bg-zinc-900/40 rounded-3xl border border-zinc-800/50 backdrop-blur-sm h-[400px] w-full"
    >
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-widest">{label} Trends</h3>
        <div className="flex gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
          <span className="text-[10px] text-zinc-500 uppercase tracking-widest">Last 24 Hours</span>
        </div>
      </div>

      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id={`gradient-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
            <XAxis
              dataKey="timestamp"
              tickFormatter={(str) => format(parseISO(str), 'HH:mm')}
              stroke="#4b5563"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              minTickGap={30}
            />
            <YAxis
              stroke="#4b5563"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              tickFormatter={(val) => val.toString()}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              strokeWidth={2}
              fillOpacity={1}
              fill={`url(#gradient-${dataKey})`}
              animationDuration={1500}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
};
