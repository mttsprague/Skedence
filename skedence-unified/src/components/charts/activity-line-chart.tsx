'use client';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

interface Props {
  data: any[];
  range1Label: string;
  range2Label: string;
}

export default function ActivityLineChart({ data, range1Label, range2Label }: Props) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="day" tick={{ fontSize: 12 }} />
        <YAxis
          label={{ value: 'Count', angle: -90, position: 'insideLeft' }}
          tick={{ fontSize: 12 }}
        />
        <Tooltip
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              const d = payload[0].payload;
              return (
                <div className="bg-card p-3 border border-border rounded shadow-lg text-foreground">
                  <p className="font-semibold mb-2">{d.day}</p>
                  <div className="space-y-1 text-sm">
                    <p className="text-emerald-500 font-medium">{range1Label} ({d.date1}): {d.range1Bookings} bookings</p>
                    <p className="text-blue-500 font-medium">{range2Label} ({d.date2}): {d.range2Bookings} bookings</p>
                    <p className="text-amber-500 font-medium">{range1Label}: {d.range1Cancellations} cancellations</p>
                    <p className="text-red-500 font-medium">{range2Label}: {d.range2Cancellations} cancellations</p>
                  </div>
                </div>
              );
            }
            return null;
          }}
        />
        <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="line" />
        <Line type="monotone" dataKey="range1Bookings" stroke="#10b981" strokeWidth={3} name={`${range1Label} Bookings`} dot={{ r: 5, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 7 }} />
        <Line type="monotone" dataKey="range2Bookings" stroke="#3b82f6" strokeWidth={3} name={`${range2Label} Bookings`} dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 7 }} />
        <Line type="monotone" dataKey="range1Cancellations" stroke="#f59e0b" strokeWidth={3} name={`${range1Label} Cancellations`} dot={{ r: 6, fill: '#f59e0b', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 7 }} strokeDasharray="8 4" />
        <Line type="monotone" dataKey="range2Cancellations" stroke="#ef4444" strokeWidth={3} name={`${range2Label} Cancellations`} dot={{ r: 4, fill: '#ef4444', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 7 }} strokeDasharray="8 4" />
      </LineChart>
    </ResponsiveContainer>
  );
}
