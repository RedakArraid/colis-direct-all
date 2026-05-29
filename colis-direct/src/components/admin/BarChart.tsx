import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface BarChartProps {
  data: any[];
  dataKey: string;
  name: string;
  color?: string;
  height?: number;
}

export default function BarChart({ data, dataKey, name, color = '#FF6C00', height = 300 }: BarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsBarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis 
          dataKey="name" 
          stroke="#6b7280"
          style={{ fontSize: '12px' }}
          angle={-45}
          textAnchor="end"
          height={80}
        />
        <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: '#fff', 
            border: '1px solid #e5e7eb', 
            borderRadius: '8px',
            fontSize: '12px'
          }}
          formatter={(value: any) => [typeof value === 'number' ? value.toLocaleString() : value, name]}
        />
        <Legend />
        <Bar dataKey={dataKey} fill={color} name={name} radius={[8, 8, 0, 0]} />
      </RechartsBarChart>
    </ResponsiveContainer>
  );
}

