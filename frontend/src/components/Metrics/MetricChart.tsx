import { useMemo } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ChartOptions,
} from 'chart.js'
import { Line, Bar } from 'react-chartjs-2'
import type { MetricAggregation } from '../../types/api'

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

interface MetricChartProps {
  data: MetricAggregation[]
  chartType?: 'line' | 'area' | 'bar'
  color?: string
  showLegend?: boolean
  height?: number
}

export function MetricChart({
  data,
  chartType = 'line',
  color = '#3b82f6',
  showLegend = false,
  height = 300,
}: MetricChartProps) {
  const chartData = useMemo(() => {
    const labels = data.map((d) =>
      new Date(d.time_bucket).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })
    )
    const values = data.map((d) => d.value)

    const dataset: any = {
      label: data[0]?.metric_name || 'Value',
      data: values,
      borderColor: color,
      backgroundColor: color,
      borderWidth: 2,
      pointRadius: 4,
      pointHoverRadius: 6,
      pointBackgroundColor: color,
      pointBorderColor: '#fff',
      pointBorderWidth: 2,
      pointHoverBackgroundColor: color,
      pointHoverBorderColor: '#fff',
      pointHoverBorderWidth: 2,
      tension: 0.4,
    }

    // For area chart, add fill
    if (chartType === 'area') {
      dataset.fill = true
      dataset.backgroundColor = `${color}33` // 20% opacity
    }

    // For bar chart, adjust styling
    if (chartType === 'bar') {
      dataset.borderWidth = 0
      dataset.borderRadius = 4
    }

    return {
      labels,
      datasets: [dataset],
    }
  }, [data, color, chartType])

  const options: ChartOptions<'line' | 'bar'> = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index' as const,
        intersect: false,
      },
      plugins: {
        legend: {
          display: showLegend,
          position: 'top' as const,
        },
        tooltip: {
          enabled: true,
          mode: 'index' as const,
          intersect: false,
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          titleColor: '#374151',
          bodyColor: '#1f2937',
          borderColor: '#d1d5db',
          borderWidth: 1,
          padding: 12,
          displayColors: false,
          callbacks: {
            title: (context) => {
              const index = context[0].dataIndex
              if (data[index]) {
                return new Date(data[index].time_bucket).toLocaleString()
              }
              return context[0].label
            },
            label: (context) => {
              const index = context.dataIndex
              const value = context.parsed.y
              if (value === null || value === undefined) return ''
              
              const unit = data[index]?.unit || ''
              const metricName = data[index]?.metric_name || 'Value'
              const aggregation = data[index]?.aggregation_type || ''
              
              return [
                `${value.toFixed(2)} ${unit}`.trim(),
                `${metricName} (${aggregation})`,
              ]
            },
          },
        },
      },
      scales: {
        x: {
          grid: {
            color: '#e5e7eb',
            drawBorder: false,
          },
          ticks: {
            color: '#6b7280',
            font: {
              size: 12,
            },
          },
        },
        y: {
          grid: {
            color: '#e5e7eb',
            drawBorder: false,
          },
          ticks: {
            color: '#6b7280',
            font: {
              size: 12,
            },
          },
          beginAtZero: true,
        },
      },
    }),
    [data, showLegend]
  )

  const containerStyle = {
    height: `${height}px`,
    width: '100%',
  }

  if (chartType === 'bar') {
    return (
      <div style={containerStyle}>
        <Bar data={chartData} options={options as ChartOptions<'bar'>} />
      </div>
    )
  }

  return (
    <div style={containerStyle}>
      <Line data={chartData} options={options as ChartOptions<'line'>} />
    </div>
  )
}
