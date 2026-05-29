import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface PieChartProps {
  data: any[];
  dataKey: string;
  nameKey: string;
  colors?: string[];
  height?: number;
}

const DEFAULT_COLORS = ['#FF6C00', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function PieChart({ data, dataKey, nameKey, colors = DEFAULT_COLORS, height = 300 }: PieChartProps) {
  const formatLabel = (value: string) => {
    return value.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsPieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }: { name?: string; percent?: number }) =>
            name && percent != null ? `${formatLabel(name)}: ${(percent * 100).toFixed(0)}%` : ''
          }
          outerRadius={80}
          fill="#8884d8"
          dataKey={dataKey}
          nameKey={nameKey}
        >
          {data.map((_entry, index) => (
            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
          ))}
        </Pie>
        <Tooltip 
          contentStyle={{ 
            backgroundColor: '#fff', 
            border: '1px solid #e5e7eb', 
            borderRadius: '8px',
            fontSize: '12px'
          }}
          formatter={(value: any) => [typeof value === 'number' ? value.toLocaleString() : value, 'Nombre']}
        />
        <Legend />
      </RechartsPieChart>
    </ResponsiveContainer>
  );
}

