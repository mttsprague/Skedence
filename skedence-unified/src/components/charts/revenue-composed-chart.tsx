'use client';
import {
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

interface DailyRevenue {
  date: string;
  paidRevenue: number;
  adminRevenue: number;
  totalRevenue: number;
  paidPassCount: number;
  adminPassCount: number;
  totalPassCount: number;
}

export default function RevenueComposedChart({ data }: { data: DailyRevenue[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis
          yAxisId="left"
          domain={[0, (dataMax: number) => Math.max(5, Math.ceil(dataMax * 1.2))]}
          tickFormatter={(value) => `$${value}`}
          label={{ value: 'Revenue ($)', angle: -90, position: 'insideLeft' }}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          domain={[0, (dataMax: number) => Math.max(5, Math.ceil(dataMax * 1.2))]}
          label={{ value: 'Passes', angle: 90, position: 'insideRight' }}
        />
        <Tooltip
          formatter={(value: any, name?: string) => {
            if (name && name.includes('Revenue')) {
              return [`$${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, name];
            }
            return [value, name || ''];
          }}
        />
        <Legend />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="totalPassCount"
          stroke="#3b82f6"
          strokeWidth={2}
          dot={{ r: 3, fill: '#3b82f6', strokeWidth: 0 }}
          isAnimationActive={false}
          name="Total Passes"
        />
        <Line
          yAxisId="left"
          type="monotone"
          dataKey="adminRevenue"
          stroke="#f59e0b"
          strokeWidth={2}
          dot={{ r: 3, fill: '#f59e0b', strokeWidth: 0 }}
          isAnimationActive={false}
          name="Admin Revenue ($)"
        />
        <Line
          yAxisId="left"
          type="monotone"
          dataKey="paidRevenue"
          stroke="#10b981"
          strokeWidth={2}
          dot={{ r: 3, fill: '#10b981', strokeWidth: 0 }}
          isAnimationActive={false}
          name="Paid Revenue ($)"
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
