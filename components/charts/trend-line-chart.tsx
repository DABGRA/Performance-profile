'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

interface TrendDataPoint {
  period: string
  [key: string]: number | string
}

interface TrendSeries {
  key: string
  label: string
  color: string
}

interface TrendLineChartProps {
  data: TrendDataPoint[]
  series: TrendSeries[]
  yDomain?: [number, number]
  title?: string
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-card border border-border rounded-lg p-3 text-xs shadow-lg">
      <p className="font-semibold text-foreground mb-2">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-medium text-foreground">{typeof p.value === 'number' ? p.value.toFixed(2) : p.value}</span>
        </div>
      ))}
    </div>
  )
}

export function TrendLineChart({ data, series, yDomain = [1, 7], title }: TrendLineChartProps) {
  return (
    <div className="w-full">
      {title && <h3 className="text-sm font-semibold text-foreground mb-3">{title}</h3>}
      {data.length === 0 ? (
        <div className="h-40 flex items-center justify-center text-xs text-muted-foreground">
          Nog geen data beschikbaar
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data} margin={{ top: 8, right: 16, left: -8, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="period"
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={yDomain}
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            {series.length > 1 && (
              <Legend
                wrapperStyle={{ fontSize: 11, color: 'hsl(var(--muted-foreground))' }}
              />
            )}
            {series.map(s => (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.label}
                stroke={s.color}
                strokeWidth={2}
                dot={{ r: 4, fill: s.color }}
                activeDot={{ r: 6 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
