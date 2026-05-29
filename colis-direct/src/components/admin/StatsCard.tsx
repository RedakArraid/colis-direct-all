import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color?: 'orange' | 'blue' | 'green' | 'purple' | 'red';
}

export default function StatsCard({ title, value, icon: Icon, trend, color = 'orange' }: StatsCardProps) {
  const colorClasses = {
    orange: 'bg-gradient-to-br from-[#FF6C00] to-[#ff8534]',
    blue: 'bg-gradient-to-br from-blue-500 to-blue-600',
    green: 'bg-gradient-to-br from-green-500 to-green-600',
    purple: 'bg-gradient-to-br from-purple-500 to-purple-600',
    red: 'bg-gradient-to-br from-red-500 to-red-600',
  };

  return (
    <div className={`${colorClasses[color]} text-white rounded-md sm:rounded-lg md:rounded-xl p-1.5 sm:p-2 md:p-3 lg:p-6 shadow-lg transform transition-all hover:scale-105`}>
      <div className="flex items-center justify-between mb-0.5 sm:mb-1 md:mb-2 lg:mb-4">
        <div className="bg-white/20 rounded p-1 sm:p-1.5 md:p-2 lg:p-3">
          <Icon className="w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-4 md:h-4 lg:w-6 lg:h-6" />
        </div>
        {trend && (
          <span className={`text-[8px] sm:text-[10px] md:text-xs lg:text-sm font-medium ${trend.isPositive ? 'text-green-200' : 'text-red-200'}`}>
            {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
          </span>
        )}
      </div>
      <h3 className="text-sm sm:text-base md:text-lg lg:text-3xl font-bold mb-0 sm:mb-0.5 md:mb-1">{value}</h3>
      <p className="text-white/90 text-[8px] sm:text-[9px] md:text-[10px] lg:text-sm leading-tight line-clamp-2">{title}</p>
    </div>
  );
}

