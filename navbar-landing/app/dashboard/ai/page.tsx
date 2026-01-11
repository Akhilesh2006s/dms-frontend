'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { apiRequest } from '@/lib/api'
import { 
  Brain, 
  TrendingUp, 
  AlertTriangle, 
  DollarSign, 
  Users, 
  Shield, 
  Activity,
  Clock,
  UserX,
  FileText,
  Sparkles
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

const AI_TOOLS = [
  {
    id: 'revenue-at-risk',
    name: 'Revenue at Risk Engine',
    description: 'Identifies revenue likely to get stuck or lost',
    icon: DollarSign,
    color: 'rose'
  },
  {
    id: 'executive-dashboard',
    name: 'Executive War-Room Dashboard',
    description: 'High-level view of revenue trends and critical issues',
    icon: TrendingUp,
    color: 'blue'
  },
  {
    id: 'priority-engine',
    name: 'Smart Priority Engine',
    description: 'Automatically ranks daily actions by business impact',
    icon: Sparkles,
    color: 'amber'
  },
  {
    id: 'deal-risk-scoring',
    name: 'Deal & Renewal Risk Scoring',
    description: 'Identifies deals at high risk of failing',
    icon: AlertTriangle,
    color: 'red'
  },
  {
    id: 'performance-risk',
    name: 'Manager & Zone Performance Risk',
    description: 'Highlights managers showing performance drops',
    icon: Users,
    color: 'purple'
  },
  {
    id: 'fraud-detection',
    name: 'Fraud & Anomaly Detection',
    description: 'Detects unusual patterns in expenses and transactions',
    icon: Shield,
    color: 'orange'
  },
  {
    id: 'cashflow-analyzer',
    name: 'Cashflow Blockage Analyzer',
    description: 'Identifies payment delays and cashflow bottlenecks',
    icon: Activity,
    color: 'teal'
  },
  {
    id: 'delay-cost-calculator',
    name: 'Operational Delay Cost Calculator',
    description: 'Calculates financial loss from operational delays',
    icon: Clock,
    color: 'yellow'
  },
  {
    id: 'churn-predictor',
    name: 'Churn & Non-Renewal Predictor',
    description: 'Identifies customers likely to churn',
    icon: UserX,
    color: 'pink'
  },
  {
    id: 'narrative-bi',
    name: 'Narrative Business Intelligence',
    description: 'Converts data into simple business summaries',
    icon: FileText,
    color: 'indigo'
  }
]

export default function AIDashboardPage() {
  const [activeTool, setActiveTool] = useState('narrative-bi')
  const [data, setData] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadAIData()
  }, [activeTool])

  const loadAIData = async () => {
    setLoading(true)
    setError(null)
    try {
      const endpoint = `/ai/${activeTool.replace(/_/g, '-')}`
      const response = await apiRequest(endpoint, { method: 'GET' })
      setData(response)
    } catch (err: any) {
      let errorMessage = err.message || 'Failed to load AI data'
      
      // Check if it's a service unavailable error (503)
      if (err.status === 503 || err.message?.includes('503') || err.message?.includes('not available') || err.message?.includes('AI Service')) {
        // Use the error message from backend which includes instructions
        errorMessage = err.message || 'AI Service is not running. Please start the Python AI service:\n\ncd ai-service\npython app.py'
      }
      
      setError(errorMessage)
      console.error('AI Data Error:', err)
    } finally {
      setLoading(false)
    }
  }

  const renderToolContent = () => {
    if (loading) {
      return (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      )
    }

    if (error) {
      const isServiceError = error.includes('not running') || error.includes('not available')
      return (
        <Card className="p-6">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {isServiceError ? 'AI Service Not Available' : 'Error Loading Data'}
            </h3>
            <div className="text-gray-600 mb-4 whitespace-pre-line">{error}</div>
            {isServiceError && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4 text-left max-w-2xl mx-auto">
                <p className="text-sm font-semibold text-yellow-800 mb-2">Quick Fix:</p>
                <ol className="text-sm text-yellow-700 list-decimal list-inside space-y-1">
                  <li>Open a terminal/command prompt</li>
                  <li>Navigate to: <code className="bg-yellow-100 px-1 rounded">cd ai-service</code></li>
                  <li>Install dependencies: <code className="bg-yellow-100 px-1 rounded">pip install -r requirements.txt</code></li>
                  <li>Start the service: <code className="bg-yellow-100 px-1 rounded">python app.py</code></li>
                </ol>
              </div>
            )}
            <Button onClick={loadAIData} className="mt-4">Retry</Button>
          </div>
        </Card>
      )
    }

    switch (activeTool) {
      case 'narrative-bi':
        return <NarrativeBIView data={data} />
      case 'revenue-at-risk':
        return <RevenueAtRiskView data={data} />
      case 'executive-dashboard':
        return <ExecutiveDashboardView data={data} />
      case 'priority-engine':
        return <PriorityEngineView data={data} />
      case 'deal-risk-scoring':
        return <DealRiskScoringView data={data} />
      case 'performance-risk':
        return <PerformanceRiskView data={data} />
      case 'fraud-detection':
        return <FraudDetectionView data={data} />
      case 'cashflow-analyzer':
        return <CashflowAnalyzerView data={data} />
      case 'delay-cost-calculator':
        return <DelayCostCalculatorView data={data} />
      case 'churn-predictor':
        return <ChurnPredictorView data={data} />
      default:
        return <div>Select a tool to view insights</div>
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Brain className="h-8 w-8 text-blue-600" />
        <div>
          <h1 className="text-3xl font-bold">AI Intelligence Dashboard</h1>
          <p className="text-gray-600">Revenue & Risk Intelligence Platform</p>
        </div>
      </div>

      <Tabs value={activeTool} onValueChange={setActiveTool} className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5 gap-2 h-auto">
          {AI_TOOLS.map((tool) => {
            const Icon = tool.icon
            return (
              <TabsTrigger
                key={tool.id}
                value={tool.id}
                className="flex flex-col items-center gap-2 p-4 h-auto"
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs text-center">{tool.name}</span>
              </TabsTrigger>
            )
          })}
        </TabsList>

        {AI_TOOLS.map((tool) => (
          <TabsContent key={tool.id} value={tool.id} className="mt-6">
            <Card className="p-6">
              <div className="mb-4">
                <h2 className="text-2xl font-semibold mb-2">{tool.name}</h2>
                <p className="text-gray-600">{tool.description}</p>
              </div>
              {renderToolContent()}
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}

// Individual View Components
function NarrativeBIView({ data }: { data: any }) {
  return (
    <div className="space-y-4">
      <Card className="p-6 bg-gradient-to-r from-indigo-50 to-purple-50">
        <h3 className="text-lg font-semibold mb-4">Business Summary</h3>
        <p className="text-gray-700 leading-relaxed mb-4">{data.summary}</p>
        <div className="mt-4 p-4 bg-white rounded-lg">
          <p className="font-semibold text-gray-800">{data.overall_assessment}</p>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4">
          <h4 className="font-semibold mb-3">Key Insights</h4>
          <ul className="space-y-2">
            {data.key_insights?.map((insight: string, i: number) => (
              <li key={i} className="flex items-start gap-2">
                <Sparkles className="h-4 w-4 text-indigo-500 mt-0.5" />
                <span className="text-sm">{insight}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-4">
          <h4 className="font-semibold mb-3">Recommended Actions</h4>
          <ul className="space-y-2">
            {data.recommended_actions?.map((action: string, i: number) => (
              <li key={i} className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5" />
                <span className="text-sm">{action}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  )
}

function RevenueAtRiskView({ data }: { data: any }) {
  return (
    <div className="space-y-4">
      <Card className="p-6 bg-gradient-to-r from-rose-50 to-pink-50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold mb-2">Total Revenue at Risk</h3>
            <p className="text-3xl font-bold text-rose-600">
              ₹{data.total_revenue_at_risk?.toLocaleString('en-IN') || 0}
            </p>
          </div>
          <DollarSign className="h-12 w-12 text-rose-500" />
        </div>
      </Card>

      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-sm text-gray-600">High Risk</p>
          <p className="text-2xl font-bold text-red-600">{data.risk_breakdown?.high_risk || 0}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-600">Medium Risk</p>
          <p className="text-2xl font-bold text-yellow-600">{data.risk_breakdown?.medium_risk || 0}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-600">Low Risk</p>
          <p className="text-2xl font-bold text-green-600">{data.risk_breakdown?.low_risk || 0}</p>
        </Card>
      </div>

      <Card className="p-4">
        <h4 className="font-semibold mb-4">High Risk Items</h4>
        <div className="space-y-2">
          {data.high_risk_items?.slice(0, 10).map((item: any, i: number) => (
            <div key={i} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
              <div>
                <p className="font-medium">{item.name}</p>
                <p className="text-sm text-gray-600">{item.type} • {item.status}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-red-600">₹{item.risk_amount?.toLocaleString('en-IN')}</p>
                <p className="text-xs text-gray-500">{Math.round(item.risk_probability * 100)}% risk</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

function ExecutiveDashboardView({ data }: { data: any }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-sm text-gray-600">Total Revenue</p>
          <p className="text-2xl font-bold">₹{data.key_metrics?.total_revenue?.toLocaleString('en-IN') || 0}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-600">Total Deals</p>
          <p className="text-2xl font-bold">{data.key_metrics?.total_deals || 0}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-600">Revenue Trend</p>
          <p className={`text-2xl font-bold ${data.revenue_trend === 'increasing' ? 'text-green-600' : 'text-red-600'}`}>
            {data.key_metrics?.revenue_trend > 0 ? '+' : ''}{data.key_metrics?.revenue_trend?.toFixed(1) || 0}%
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-600">Avg Daily Revenue</p>
          <p className="text-2xl font-bold">₹{data.key_metrics?.avg_daily_revenue?.toLocaleString('en-IN') || 0}</p>
        </Card>
      </div>

      {data.critical_issues && data.critical_issues.length > 0 && (
        <Card className="p-4 bg-red-50 border-red-200">
          <h4 className="font-semibold mb-3 text-red-800">Critical Issues</h4>
          <div className="space-y-2">
            {data.critical_issues.map((issue: any, i: number) => (
              <div key={i} className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                <p className="text-sm">{issue.message}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {data.alerts && data.alerts.length > 0 && (
        <Card className="p-4">
          <h4 className="font-semibold mb-3">Alerts</h4>
          <div className="space-y-2">
            {data.alerts.map((alert: any, i: number) => (
              <div key={i} className={`p-3 rounded-lg ${alert.type === 'critical' ? 'bg-red-50' : 'bg-yellow-50'}`}>
                <p className="text-sm">{alert.message}</p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}

function PriorityEngineView({ data }: { data: any }) {
  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Prioritized Tasks</h3>
          <span className="text-sm text-gray-600">
            {data.high_priority_count || 0} high priority
          </span>
        </div>
        <div className="space-y-2">
          {data.prioritized_tasks?.slice(0, 20).map((task: any, i: number) => (
            <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex-1">
                <p className="font-medium">{task.name}</p>
                <p className="text-sm text-gray-600">{task.type} • {task.status}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold">Score: {task.priority_score?.toFixed(2)}</p>
                <p className="text-xs text-gray-500">{task.recommended_action}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

function DealRiskScoringView({ data }: { data: any }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-sm text-gray-600">High Risk</p>
          <p className="text-2xl font-bold text-red-600">{data.high_risk_count || 0}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-600">Medium Risk</p>
          <p className="text-2xl font-bold text-yellow-600">{data.medium_risk_count || 0}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-600">Low Risk</p>
          <p className="text-2xl font-bold text-green-600">{data.low_risk_count || 0}</p>
        </Card>
      </div>

      <Card className="p-4">
        <h4 className="font-semibold mb-4">Deal Risks</h4>
        <div className="space-y-2">
          {data.deal_risks?.slice(0, 20).map((deal: any, i: number) => (
            <div key={i} className={`p-3 rounded-lg ${
              deal.risk_level === 'High' ? 'bg-red-50' : 
              deal.risk_level === 'Medium' ? 'bg-yellow-50' : 'bg-green-50'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{deal.deal_name}</p>
                  <p className="text-sm text-gray-600">₹{deal.amount?.toLocaleString('en-IN')} • {deal.status}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{Math.round(deal.risk_score * 100)}% risk</p>
                  <p className="text-xs text-gray-500">{deal.risk_level}</p>
                </div>
              </div>
              {deal.recommendations && deal.recommendations.length > 0 && (
                <div className="mt-2 pt-2 border-t">
                  <p className="text-xs font-medium mb-1">Recommendations:</p>
                  <ul className="text-xs text-gray-600 space-y-1">
                    {deal.recommendations.map((rec: string, j: number) => (
                      <li key={j}>• {rec}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

function PerformanceRiskView({ data }: { data: any }) {
  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Performance Risks</h3>
          <span className="text-sm text-gray-600">
            {data.high_risk_count || 0} high risk • {data.anomaly_count || 0} anomalies
          </span>
        </div>
        <div className="space-y-2">
          {data.performance_risks?.map((risk: any, i: number) => (
            <div key={i} className={`p-3 rounded-lg ${
              risk.risk_level === 'High' ? 'bg-red-50' : 
              risk.risk_level === 'Medium' ? 'bg-yellow-50' : 'bg-green-50'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{risk.manager_name}</p>
                  <p className="text-sm text-gray-600">{risk.zone}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">Risk: {risk.risk_index?.toFixed(2)}</p>
                  <p className="text-xs text-gray-500">{risk.risk_level}</p>
                </div>
              </div>
              {risk.recommendations && risk.recommendations.length > 0 && (
                <div className="mt-2 pt-2 border-t">
                  <p className="text-xs font-medium mb-1">Recommendations:</p>
                  <ul className="text-xs text-gray-600 space-y-1">
                    {risk.recommendations.map((rec: string, j: number) => (
                      <li key={j}>• {rec}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

function FraudDetectionView({ data }: { data: any }) {
  return (
    <div className="space-y-4">
      <Card className="p-4 bg-orange-50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold mb-2">Fraud Alerts</h3>
            <p className="text-2xl font-bold text-orange-600">
              {data.suspicious_count || 0} suspicious transactions
            </p>
          </div>
          <Shield className="h-12 w-12 text-orange-500" />
        </div>
      </Card>

      <Card className="p-4">
        <h4 className="font-semibold mb-4">Flagged Transactions</h4>
        <div className="space-y-2">
          {data.fraud_alerts?.slice(0, 20).map((alert: any, i: number) => (
            <div key={i} className="p-3 bg-red-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{alert.transaction_type}</p>
                  <p className="text-sm text-gray-600">{alert.anomaly_type}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-red-600">₹{alert.amount?.toLocaleString('en-IN')}</p>
                  <p className="text-xs text-gray-500">{Math.round(alert.fraud_score * 100)}% suspicious</p>
                </div>
              </div>
              {alert.recommendations && alert.recommendations.length > 0 && (
                <div className="mt-2 pt-2 border-t">
                  <p className="text-xs font-medium mb-1">Actions:</p>
                  <ul className="text-xs text-gray-600 space-y-1">
                    {alert.recommendations.map((rec: string, j: number) => (
                      <li key={j}>• {rec}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

function CashflowAnalyzerView({ data }: { data: any }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4">
          <p className="text-sm text-gray-600">Total Pending</p>
          <p className="text-2xl font-bold">₹{data.total_pending?.toLocaleString('en-IN') || 0}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-600">Total Delayed</p>
          <p className="text-2xl font-bold text-red-600">₹{data.total_delayed?.toLocaleString('en-IN') || 0}</p>
        </Card>
      </div>

      {data.bottlenecks && data.bottlenecks.length > 0 && (
        <Card className="p-4 bg-red-50">
          <h4 className="font-semibold mb-3">Bottlenecks</h4>
          <div className="space-y-2">
            {data.bottlenecks.map((bottleneck: any, i: number) => (
              <div key={i} className="p-3 bg-white rounded-lg">
                <p className="font-medium">{bottleneck.message}</p>
                {bottleneck.amount && (
                  <p className="text-sm text-gray-600">Amount: ₹{bottleneck.amount.toLocaleString('en-IN')}</p>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {data.recommended_actions && data.recommended_actions.length > 0 && (
        <Card className="p-4">
          <h4 className="font-semibold mb-3">Recommended Actions</h4>
          <ul className="space-y-2">
            {data.recommended_actions.map((action: string, i: number) => (
              <li key={i} className="flex items-start gap-2">
                <Activity className="h-4 w-4 text-teal-500 mt-0.5" />
                <span className="text-sm">{action}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}

function DelayCostCalculatorView({ data }: { data: any }) {
  return (
    <div className="space-y-4">
      <Card className="p-6 bg-gradient-to-r from-yellow-50 to-amber-50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold mb-2">Total Delay Cost</h3>
            <p className="text-3xl font-bold text-yellow-600">
              ₹{data.total_delay_cost?.toLocaleString('en-IN') || 0}
            </p>
          </div>
          <Clock className="h-12 w-12 text-yellow-500" />
        </div>
      </Card>

      <Card className="p-4">
        <h4 className="font-semibold mb-4">Delay Costs</h4>
        <div className="space-y-2">
          {data.delay_costs?.slice(0, 20).map((cost: any, i: number) => (
            <div key={i} className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{cost.event_type}</p>
                  <p className="text-sm text-gray-600">{cost.delay_days} days delay</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-yellow-600">₹{cost.estimated_cost?.toLocaleString('en-IN')}</p>
                  <p className="text-xs text-gray-500">Amount: ₹{cost.amount?.toLocaleString('en-IN')}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

function ChurnPredictorView({ data }: { data: any }) {
  return (
    <div className="space-y-4">
      <Card className="p-4 bg-pink-50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold mb-2">Churn Predictions</h3>
            <p className="text-2xl font-bold text-pink-600">
              {data.high_risk_count || 0} high risk customers
            </p>
            <p className="text-sm text-gray-600 mt-1">
              ₹{data.total_at_risk_revenue?.toLocaleString('en-IN') || 0} at risk
            </p>
          </div>
          <UserX className="h-12 w-12 text-pink-500" />
        </div>
      </Card>

      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-sm text-gray-600">High Risk</p>
          <p className="text-2xl font-bold text-red-600">{data.high_risk_count || 0}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-600">Medium Risk</p>
          <p className="text-2xl font-bold text-yellow-600">{data.medium_risk_count || 0}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-600">Low Risk</p>
          <p className="text-2xl font-bold text-green-600">{data.low_risk_count || 0}</p>
        </Card>
      </div>

      <Card className="p-4">
        <h4 className="font-semibold mb-4">At-Risk Customers</h4>
        <div className="space-y-2">
          {data.churn_predictions?.slice(0, 20).map((prediction: any, i: number) => (
            <div key={i} className={`p-3 rounded-lg ${
              prediction.risk_level === 'High' ? 'bg-red-50' : 
              prediction.risk_level === 'Medium' ? 'bg-yellow-50' : 'bg-green-50'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{prediction.customer_name}</p>
                  <p className="text-sm text-gray-600">
                    ₹{prediction.total_revenue?.toLocaleString('en-IN')} • {prediction.total_orders} orders
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{Math.round(prediction.churn_probability * 100)}% risk</p>
                  <p className="text-xs text-gray-500">{prediction.risk_level}</p>
                </div>
              </div>
              {prediction.retention_recommendations && prediction.retention_recommendations.length > 0 && (
                <div className="mt-2 pt-2 border-t">
                  <p className="text-xs font-medium mb-1">Retention Strategies:</p>
                  <ul className="text-xs text-gray-600 space-y-1">
                    {prediction.retention_recommendations.map((rec: string, j: number) => (
                      <li key={j}>• {rec}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
