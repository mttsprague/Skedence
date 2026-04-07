'use client';
import {
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

interface ChartData {
  date: string;
  signups: number;
  cumulativeSignups: number;
}

export default function UsersComposedChart({ data }: { data: ChartData[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis yAxisId="left" />
        <YAxis yAxisId="right" orientation="right" />
        <Tooltip />
        <Legend />
        <Bar yAxisId="left" dataKey="signups" fill="#3b82f6" name="New Signups" />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="cumulativeSignups"
          stroke="#10b981"
          name="Total Signups"
          strokeWidth={2}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
