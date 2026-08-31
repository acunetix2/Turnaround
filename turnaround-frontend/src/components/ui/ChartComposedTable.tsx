import { useState, useEffect } from 'react'
import { BarChart2, ExternalLink } from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './Table'
import {
  Chart,
  ChartActions,
  ChartBar,
  ChartCard,
  ChartContent,
  ChartEmptyState,
  ChartFooter,
  ChartHeader,
  ChartLoadingState,
  ChartTitle,
} from './Chart'

export function ChartComposedTable({
  title = "Standard Bar Chart",
  tooltip = "Telematics metrics aggregate score",
  dataKey = "standard_score",
  initialData,
  onActionClick
}: {
  title?: string
  tooltip?: string
  dataKey?: string
  initialData?: Array<{ timestamp: string; standard_score: number }>
  onActionClick?: () => void
}) {
  const [isLoading, setIsLoading] = useState(true)

  const actions = [
    {
      label: 'Open in Logs Explorer',
      onClick: () => {
        if (onActionClick) onActionClick()
        else alert('Opening in Logs Explorer...')
      },
      icon: <ExternalLink size={12} />,
    },
  ]

  const [data, setData] = useState<Array<{ timestamp: string; standard_score: number }>>([])

  useEffect(() => {
    if (initialData && initialData.length > 0) {
      setData(initialData)
    } else {
      const generated = Array.from({ length: 30 }, (_, i) => {
        const date = new Date()
        date.setMinutes(date.getMinutes() - i * 5)
        return {
          timestamp: date.toISOString(),
          standard_score: Math.floor(Math.random() * 85) + 15,
        }
      }).reverse()
      setData(generated)
    }

    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 600)
    return () => clearTimeout(timer)
  }, [initialData])

  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr)
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    } catch {
      return isoStr
    }
  }

  return (
    <div className="flex flex-col gap-6 w-full">
      <Chart isLoading={isLoading}>
        <ChartCard>
          <ChartHeader>
            <ChartTitle tooltip={tooltip}>{title}</ChartTitle>
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
            loadingState={<ChartLoadingState height={160} />}
          >
            <div className="h-40">
              <ChartBar
                data={data}
                dataKey={dataKey}
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
          <ChartFooter>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead className="text-right">Standard Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.slice(0, 4).map((item) => (
                  <TableRow key={item.timestamp}>
                    <TableCell className="text-text-tertiary">
                      {formatDate(item.timestamp)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-numeric font-medium text-text-primary">
                      {item.standard_score}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ChartFooter>
        </ChartCard>
      </Chart>
    </div>
  )
}
