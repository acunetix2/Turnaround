import { BarChart2, ExternalLink } from 'lucide-react'
import { useEffect, useState } from 'react'
import {
  Chart,
  ChartActions,
  ChartBar,
  ChartCard,
  ChartContent,
  ChartEmptyState,
  ChartHeader,
  ChartLine,
  ChartLoadingState,
  ChartTitle,
} from './Chart'

export function ComposedChartBasic() {
  const [isLoading, setIsLoading] = useState(true)

  const actions = [
    {
      label: 'Open in Logs Explorer',
      onClick: () => {
        alert('Opening telemetry explorer...')
      },
      icon: <ExternalLink size={12} />,
    },
  ]

  const data = Array.from({ length: 40 }, (_, i) => {
    const date = new Date()
    date.setMinutes(date.getMinutes() - i * 3) // Each point 3 minutes apart

    const progress = i / 40
    const standard_score = Math.floor(55 + progress * 55 + (Math.random() - 0.5) * 12)
    const performance = Math.floor(35 + progress * 35 + (Math.random() - 0.5) * 10)
    const efficiency = Math.floor(25 + progress * 25 + (Math.random() - 0.5) * 12)

    return {
      timestamp: date.toISOString(),
      standard_score: Math.max(0, Math.min(100, standard_score)),
      performance: Math.max(0, Math.min(100, performance)),
      efficiency: Math.max(0, Math.min(100, efficiency)),
    }
  }).reverse()

  const chartConfig = {
    standard_score: {
      label: 'Standard Score',
      color: '#ED642B',
    },
    performance: {
      label: 'Performance',
      color: '#250C77',
    },
    efficiency: {
      label: 'Efficiency',
      color: '#10B981',
    },
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 800)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="flex flex-col gap-6 w-full">
      <Chart isLoading={isLoading}>
        <ChartCard>
          <ChartHeader>
            <ChartTitle tooltip="Standard dwell telemetry per batch">Standard Bar Chart</ChartTitle>
            <ChartActions actions={actions} />
          </ChartHeader>
          <ChartContent
            isEmpty={data.length === 0}
            emptyState={
              <ChartEmptyState
                icon={<BarChart2 size={16} />}
                title="No data to show"
                description="It may take up to 24 hours for data to refresh"
              />
            }
            loadingState={<ChartLoadingState />}
          >
            <div className="h-40">
              <ChartBar
                data={data}
                dataKey="standard_score"
                showGrid={false}
                showYAxis={true}
                YAxisProps={{
                  tickFormatter: (value) => `${value}k`,
                  width: 36,
                }}
                isFullHeight={true}
              />
            </div>
          </ChartContent>
        </ChartCard>
      </Chart>

      <Chart isLoading={isLoading}>
        <ChartCard>
          <ChartHeader>
            <ChartTitle tooltip="Corridor performance and turnaround efficiency">Standard Line Chart</ChartTitle>
            <ChartActions actions={actions} />
          </ChartHeader>
          <ChartContent
            isEmpty={data.length === 0}
            emptyState={
              <ChartEmptyState
                icon={<BarChart2 size={16} />}
                title="No data to show"
                description="It may take up to 24 hours for data to refresh"
              />
            }
            loadingState={<ChartLoadingState />}
          >
            <div className="h-40">
              <ChartLine
                data={data}
                dataKey="standard_score"
                dataKeys={['standard_score', 'performance', 'efficiency']}
                config={chartConfig}
                showGrid={true}
                showYAxis={true}
                YAxisProps={{
                  tickFormatter: (value) => `${value}k`,
                  width: 36,
                }}
                isFullHeight={true}
              />
            </div>
          </ChartContent>
        </ChartCard>
      </Chart>
    </div>
  )
}
