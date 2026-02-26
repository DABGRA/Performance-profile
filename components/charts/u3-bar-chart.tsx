'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Cell,
  ResponsiveContainer,
} from 'recharts'

// Norm waarden voor Psychologische Veiligheid (Edmondson, 1999)
export const PSYCH_SAFETY_NORM = {
  mean: 4.6,
  sd: 0.5,
}

// Bereken z-score en p-waarde (one-sample z-test, tweezijdig)
// z = (teamMean - normMean) / (normSD / sqrt(n))
// p = 2 * (1 - Φ(|z|))
function normalCDF(z: number): number {
  // Abramowitz and Stegun approximation
  const t = 1 / (1 + 0.2316419 * Math.abs(z))
  const d = 0.3989423 * Math.exp(-z * z / 2)
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.7814779 + t * (-1.8212560 + t * 1.3302744))))
  return z > 0 ? 1 - p : p
}

function calcSignificance(teamMean: number, n: number, norm = PSYCH_SAFETY_NORM) {
  if (n < 2) return { z: 0, p: 1, stars: '' }
  const se = norm.sd / Math.sqrt(n)
  const z = (teamMean - norm.mean) / se
  const p = 2 * (1 - normalCDF(Math.abs(z)))
  const stars = p < 0.001 ? '***' : p < 0.01 ? '**' : p < 0.05 ? '*' : ''
  return { z: Math.round(z * 100) / 100, p: Math.round(p * 1000) / 1000, stars }
}

interface U3DataPoint {
  period: string
  team_avg: number
  response_count: number
}

interface U3BarChartProps {
  data: U3DataPoint[]
  norm?: { mean: number; sd: number }
  title?: string
}

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  const diff = d.diff
  const sig = d.sig
  return (
    <div className="bg-card border border-border rounded-lg p-3 text-xs shadow-lg">
      <p className="font-semibold text-foreground mb-1">{d.period}</p>
      <p className="text-foreground">Teamgemiddelde: <strong>{d.team_avg.toFixed(2)}</strong></p>
      <p className="text-muted-foreground">Norm: {d.normMean.toFixed(1)}</p>
      <p className={diff >= 0 ? 'text-emerald-400' : 'text-red-400'}>
        Verschil: {diff >= 0 ? '+' : ''}{diff.toFixed(2)}
      </p>
      <p className="text-muted-foreground mt-1">
        z = {sig.z} · p = {sig.p} {sig.stars && <strong className="text-foreground">{sig.stars}</strong>}
      </p>
      <p className="text-muted-foreground">n = {d.response_count}</p>
    </div>
  )
}

export function U3BarChart({ data, norm = PSYCH_SAFETY_NORM, title = 'U3 Score t.o.v. norm' }: U3BarChartProps) {
  const chartData = data.map(d => {
    const diff = Math.round((d.team_avg - norm.mean) * 100) / 100
    const sig = calcSignificance(d.team_avg, d.response_count, norm)
    return { ...d, diff, sig, normMean: norm.mean }
  })

  const maxAbs = Math.max(...chartData.map(d => Math.abs(d.diff)), 1)
  const domain = [-Math.ceil(maxAbs * 10) / 10 - 0.2, Math.ceil(maxAbs * 10) / 10 + 0.2]

  return (
    <div className="w-full">
      {title && (
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          <span className="text-xs text-muted-foreground">norm = {norm.mean} (SD={norm.sd})</span>
        </div>
      )}
      {chartData.length === 0 ? (
        <div className="h-40 flex items-center justify-center text-xs text-muted-foreground">
          Nog geen data beschikbaar
        </div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} margin={{ top: 8, right: 16, left: -8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis
                dataKey="period"
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={domain}
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={v => v > 0 ? `+${v}` : `${v}`}
              />
              <ReferenceLine y={0} stroke="hsl(var(--border))" strokeWidth={2} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="diff" radius={[4, 4, 0, 0]} maxBarSize={48}>
                {chartData.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={entry.diff >= 0 ? 'hsl(142 71% 45%)' : 'hsl(0 72% 51%)'}
                    opacity={0.85}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          {/* Significance legenda */}
          <div className="flex items-center justify-end gap-4 mt-2">
            {chartData.some(d => d.sig.stars) && (
              <div className="flex gap-3 text-xs text-muted-foreground">
                {chartData.filter(d => d.sig.stars).map(d => (
                  <span key={d.period}>
                    {d.period}: {d.sig.stars} (p={d.sig.p})
                  </span>
                ))}
              </div>
            )}
            <div className="flex gap-3 text-xs text-muted-foreground">
              <span>* p&lt;.05</span>
              <span>** p&lt;.01</span>
              <span>*** p&lt;.001</span>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
