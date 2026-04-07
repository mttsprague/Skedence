'use client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface ChartData {
  date: string;
  scheduled: number;
  completed: number;
  cancelled: number;
  'no-show': number;
  total: number;
}

export default function AppointmentsBarChart({ data }: { data: ChartData[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar dataKey="scheduled" fill="#3b82f6" name="Scheduled" />
        <Bar dataKey="completed" fill="#10b981" name="Completed" />
        <Bar dataKey="cancelled" fill="#f59e0b" name="Cancelled" />
        <Bar dataKey="no-show" fill="#ef4444" name="No-show" />
      </BarChart>
    </ResponsiveContainer>
  );
}
