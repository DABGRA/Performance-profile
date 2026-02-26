'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ReferenceLine, ResponsiveContainer } from 'recharts'

// SMS-II subscalen in volgorde van het motivatiecontinuüm (minst → meest autonoom)
// RAI = (-3 × Amotivatie) + (-2 × Extern) + (-1 × Introject) + (1 × Geidentificeerd) + (2 × Geintegreerd) + (3 × Intrinsiek)
const CONTINUUM_ORDER = [
  { key: 'amotivation',      label: 'Amotivatie',          rai: -3, color: 'hsl(0 72% 51%)' },
  { key: 'external_reg',     label: 'Extern',               rai: -2, color: 'hsl(20 90% 50%)' },
  { key: 'introjected_reg',  label: 'Introject',            rai: -1, color: 'hsl(45 95% 50%)' },
  { key: 'identified_reg',   label: 'Geidentificeerd',      rai:  1, color: 'hsl(80 60% 45%)' },
  { key: 'integrated_reg',   label: 'Geintegreerd',         rai:  2, color: 'hsl(142 60% 45%)' },
  { key: 'intrinsic_mot',    label: 'Intrinsiek',           rai:  3, color: 'hsl(200 70% 50%)' },
]

interface MotivationData {
  [subscaleKey: string]: number
}

interface MotivationContinuumChartProps {
  data: MotivationData
  title?: string
  showRAI?: boolean
}

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="bg-card border border-border rounded-lg p-3 text-xs shadow-lg">
      <p className="font-semibold text-foreground">{d.label}</p>
      <p className="text-muted-foreground mt-1">Score: <strong className="text-foreground">{d.score?.toFixed(2)}</strong></p>
      <p className="text-muted-foreground">RAI gewicht: {d.rai > 0 ? '+' : ''}{d.rai}</p>
    </div>
  )
}

export function MotivationContinuumChart({ data, title, showRAI = true }: MotivationContinuumChartProps) {
  const chartData = CONTINUUM_ORDER.map(s => ({
    ...s,
    score: data[s.key] ?? 0,
  }))

  // Bereken RAI score
  const rai = CONTINUUM_ORDER.reduce((acc, s) => acc + s.rai * (data[s.key] ?? 0), 0)
  const raiRounded = Math.round(rai * 100) / 100

  const isEmpty = CONTINUUM_ORDER.every(s => !data[s.key])

  return (
    <div className="w-full">
      {title && (
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {showRAI && !isEmpty && (
            <div className="text-xs text-muted-foreground">
              RAI = <strong className={`${raiRounded >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {raiRounded >= 0 ? '+' : ''}{raiRounded}
              </strong>
            </div>
          )}
        </div>
      )}

      {isEmpty ? (
        <div className="h-40 flex items-center justify-center text-xs text-muted-foreground">
          Nog geen data beschikbaar
        </div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: -12, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={[1, 7]}
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
              />
              <ReferenceLine y={4} stroke="hsl(var(--border))" strokeDasharray="4 4" />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="score" radius={[4, 4, 0, 0]} maxBarSize={48}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} opacity={0.85} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          {/* Continuum label */}
          <div className="flex items-center justify-between mt-2 px-1">
            <span className="text-xs text-muted-foreground">Gecontroleerd</span>
            <div className="flex-1 mx-3 border-t border-border relative">
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="bg-card px-2 text-xs text-muted-foreground">motivatiecontinuüm</span>
              </div>
            </div>
            <span className="text-xs text-muted-foreground">Autonoom</span>
          </div>
        </>
      )}
    </div>
  )
}
