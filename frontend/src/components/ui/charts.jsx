import React from 'react';
import {
  LineChart as ReLineChart,
  Line,
  BarChart as ReBarChart,
  Bar,
  PieChart as RePieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Area
} from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export const LineChart = ({ data, title, xAxisKey = "name", series = [] }) => {
  return (
    <div className="w-full p-4 bg-white rounded-lg shadow-sm border border-gray-100">
      <h3 className="text-lg font-semibold mb-4 text-gray-800">{title}</h3>
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ReLineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
            <XAxis
              dataKey={xAxisKey}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#666' }}
              dy={10}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#666' }}
            />
            <Tooltip
              contentStyle={{ border: 'none', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
            />
            <Legend wrapperStyle={{ paddingTop: '20px' }} />
            {series.map((s, i) => (
              <Line
                key={s.dataKey}
                type="monotone"
                dataKey={s.dataKey}
                stroke={s.color || COLORS[i % COLORS.length]}
                name={s.name || s.dataKey}
                strokeWidth={2}
                dot={{ r: 4, strokeWidth: 2 }}
                activeDot={{ r: 6 }}
              />
            ))}
          </ReLineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export const BarChart = ({ data, title, xAxisKey = "name", series = [] }) => {
  return (
    <div className="w-full p-4 bg-white rounded-lg shadow-sm border border-gray-100">
      <h3 className="text-lg font-semibold mb-4 text-gray-800">{title}</h3>
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ReBarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
            <XAxis
              dataKey={xAxisKey}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#666' }}
              dy={10}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#666' }}
            />
            <Tooltip
              cursor={{ fill: '#f5f5f5' }}
              contentStyle={{ border: 'none', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
            />
            <Legend wrapperStyle={{ paddingTop: '20px' }} />
            {series.map((s, i) => (
              <Bar
                key={s.dataKey}
                dataKey={s.dataKey}
                fill={s.color || COLORS[i % COLORS.length]}
                name={s.name || s.dataKey}
                radius={[4, 4, 0, 0]}
              />
            ))}
          </ReBarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export const PieChart = ({ data, title, dataKey = "value", nameKey = "name" }) => {
  return (
    <div className="w-full p-4 bg-white rounded-lg shadow-sm border border-gray-100">
      <h3 className="text-lg font-semibold mb-4 text-gray-800">{title}</h3>
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <RePieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey={dataKey}
              nameKey={nameKey}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ border: 'none', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
            />
            <Legend layout="vertical" align="right" verticalAlign="middle" />
          </RePieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export const ModernAreaChart = ({ data, title, xAxisKey = "name", mainSeries, secondarySeries }) => {
  return (
    <div className="w-full h-full bg-transparent">
      <h3 className="text-lg font-semibold mb-6 text-foreground">{title}</h3>
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorMain" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={mainSeries.color} stopOpacity={0.3}/>
                <stop offset="95%" stopColor={mainSeries.color} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#2d3748" opacity={0.4} />
            <XAxis
              dataKey={xAxisKey}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              dy={15}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: '#9ca3af' }}
            />
            <Tooltip
              contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px', color: '#f3f4f6' }}
              itemStyle={{ color: '#f3f4f6' }}
            />
            
            {secondarySeries && (
              <Line 
                type="monotone" 
                dataKey={secondarySeries.dataKey} 
                name={secondarySeries.name} 
                stroke={secondarySeries.color || "#6b7280"} 
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={false}
                activeDot={{ r: 4, fill: secondarySeries.color || "#6b7280", stroke: 'transparent' }}
              />
            )}

              <Area 
                type="monotone" 
                dataKey={mainSeries.dataKey} 
                name={mainSeries.name} 
                stroke={mainSeries.color} 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorMain)" 
                dot={{ r: 4, strokeWidth: 2, fill: 'var(--card, #000)', stroke: mainSeries.color }}
                activeDot={{ r: 6, fill: mainSeries.color, stroke: 'var(--card, #000)', strokeWidth: 2 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };