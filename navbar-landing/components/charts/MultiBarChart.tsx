'use client'

import { Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js'
import { useMemo } from 'react'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

type Props = {
  labels: string[]
  datasets: {
    label: string
    data: number[]
    color: string
  }[]
  height?: number
}

export default function MultiBarChart({ labels, datasets, height = 300 }: Props) {
  const chartData = useMemo(() => {
    return {
      labels,
      datasets: datasets.map((ds) => ({
        label: ds.label,
        data: ds.data,
        backgroundColor: ds.color,
        hoverBackgroundColor: ds.color,
        borderRadius: 8,
        barPercentage: 0.7,
        categoryPercentage: 0.8,
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
      <Bar data={chartData} options={options} />
    </div>
  )
}


