'use client'

import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'

interface PNSSSDataPoint {
  subscale: string
  satisfaction: number
  frustration: number
}

interface PNSSSRadarChartProps {
  data: PNSSSDataPoint[]
  title?: string
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-card border border-border rounded-lg p-3 text-xs shadow-lg">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-medium text-foreground">{p.value?.toFixed(2)}</span>
        </div>
      ))}
    </div>
  )
}

export function PNSSSRadarChart({ data, title }: PNSSSRadarChartProps) {
  return (
    <div className="w-full">
      {title && <h3 className="text-sm font-semibold text-foreground mb-3">{title}</h3>}
      {data.length === 0 ? (
        <div className="h-40 flex items-center justify-center text-xs text-muted-foreground">
          Nog geen data beschikbaar
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <RadarChart data={data} margin={{ top: 8, right: 24, left: 24, bottom: 8 }}>
            <PolarGrid stroke="hsl(var(--border))" />
            <PolarAngleAxis
              dataKey="subscale"
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 11, color: 'hsl(var(--muted-foreground))' }} />
            <Radar
              name="Bevrediging"
              dataKey="satisfaction"
              stroke="hsl(142 71% 45%)"
              fill="hsl(142 71% 45%)"
              fillOpacity={0.2}
              strokeWidth={2}
            />
            <Radar
              name="Frustratie"
              dataKey="frustration"
              stroke="hsl(0 72% 51%)"
              fill="hsl(0 72% 51%)"
              fillOpacity={0.15}
              strokeWidth={2}
            />
          </RadarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
