import { useEffect, useState } from 'react'
import {
  MetricCard,
  MetricCardContent,
  MetricCardDifferential,
  MetricCardHeader,
  MetricCardLabel,
  MetricCardSparkline,
  MetricCardValue,
} from './MetricCard'

export function MetricsCardDemo() {
  const [data, setData] = useState<Array<{ value: number; timestamp: string }>>([])

  useEffect(() => {
    const now = new Date()
    setData(
      Array.from({ length: 12 }, (_, i) => ({
        value: Math.floor(4000 + i * 100 + (Math.random() * 2000 - 800)),
        timestamp: new Date(now.getTime() - (11 - i) * 60 * 60 * 1000).toISOString(),
      }))
    )
  }, [])

  const averageValue = data.length
    ? data.reduce((acc, curr) => acc + curr.value, 0) / data.length
    : 0

  const diff = data.length > 1 ? data[data.length - 1]?.value - data[0]?.value : 0
  const diffPercentage = averageValue ? (diff / averageValue) * 100 : 0

  return (
    <div className="w-full max-w-sm">
      <MetricCard isLoading={!data.length}>
        <MetricCardHeader href="/dashboard">
          <MetricCardLabel tooltip="The number of active users over the last 24 hours">
            Active Users
          </MetricCardLabel>
        </MetricCardHeader>
        <MetricCardContent>
          <MetricCardValue>
            {averageValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </MetricCardValue>
          <MetricCardDifferential variant={diffPercentage >= 0 ? 'positive' : 'negative'}>
            {diffPercentage >= 0 ? '+' : '-'}
            {Math.abs(diffPercentage).toFixed(1)}%
          </MetricCardDifferential>
        </MetricCardContent>
        <MetricCardSparkline data={data} dataKey="value" color="#ED642B" />
      </MetricCard>
    </div>
  )
}
