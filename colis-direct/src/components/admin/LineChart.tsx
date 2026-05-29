import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface LineChartProps {
  data: any[];
  dataKey: string;
  name: string;
  color?: string;
  height?: number;
}

export default function LineChart({ data, dataKey, name, color = '#FF6C00', height = 300 }: LineChartProps) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getDate()}/${date.getMonth() + 1}`;
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsLineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis 
          dataKey="date" 
          tickFormatter={formatDate}
          stroke="#6b7280"
          style={{ fontSize: '12px' }}
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
          labelFormatter={(label) => `Date: ${formatDate(label)}`}
        />
        <Legend />
        <Line 
          type="monotone" 
          dataKey={dataKey} 
          stroke={color} 
          strokeWidth={2}
          dot={{ fill: color, r: 4 }}
          activeDot={{ r: 6 }}
          name={name}
        />
      </RechartsLineChart>
    </ResponsiveContainer>
  );
}

