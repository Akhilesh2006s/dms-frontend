'use client'

import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import { useMemo } from 'react'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler)

type Props = {
  labels: string[]
  datasets: {
    label: string
    data: number[]
    color: string
  }[]
  height?: number
}

export default function LineChart({ labels, datasets, height = 300 }: Props) {
  const chartData = useMemo(() => {
    return {
      labels,
      datasets: datasets.map((ds, idx) => ({
        label: ds.label,
        data: ds.data,
        borderColor: ds.color,
        backgroundColor: `${ds.color}20`,
        fill: true,
        tension: 0.4,
        borderWidth: 3,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: ds.color,
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
      })),
    }
  }, [labels, datasets])

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          padding: 15,
          font: {
            size: 12,
          },
          usePointStyle: true,
        },
      },
      tooltip: {
        intersect: false,
        mode: 'index' as const,
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: '#6b7280',
        },
      },
      y: {
        grid: {
          color: '#eceff1',
        },
        ticks: {
          color: '#6b7280',
        },
      },
    },
  }

  return (
    <div style={{ height: `${height}px` }}>
      <Line data={chartData} options={options} />
    </div>
  )
}


