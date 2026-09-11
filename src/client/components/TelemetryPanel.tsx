import { trpc } from '../lib/trpc';
import { Card, Badge, Loader2 } from './ui';
import { 
  AlertTriangle, 
  BarChart3, 
  Clock, 
  Activity, 
  ShieldCheck, 
  Info,
  Server,
  TrendingUp
} from './ui';

interface TelemetryPanelProps {
  incidentId: string;
}

export function TelemetryPanel({ incidentId }: TelemetryPanelProps) {
  const { data: telemetry, isLoading } = trpc.observability.getTelemetry.useQuery({ incidentId });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-80 gap-3">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
        <p className="text-xs text-graphite-400 font-mono">Streaming telemetry stream...</p>
      </div>
    );
  }

  if (!telemetry) {
    return (
      <div className="text-center py-12">
        <Activity className="w-8 h-8 text-graphite-600 mx-auto mb-2" />
        <p className="text-xs text-graphite-400">No telemetry data available for this incident.</p>
      </div>
    );
  }

  const successRate = telemetry.totalRequests > 0
    ? ((telemetry.successfulRequests / telemetry.totalRequests) * 100).toFixed(1)
    : '100';

  return (
    <div className="flex flex-col gap-4">
      {/* Demo Telemetry Disclaimer Banner (AGENTS.md compliance) */}
      {telemetry._demoData && (
        <div className="p-3 rounded-lg bg-cyan-950/40 border border-cyan-800/60 flex items-start gap-3">
          <Info className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs">
            <div className="font-semibold text-cyan-300 flex items-center gap-2">
              Controlled Outage Telemetry
              <Badge variant="cyan" className="text-[9px] py-0 px-1.5">DEMO DATA</Badge>
            </div>
            <p className="text-cyan-200/80 mt-0.5">
              Metrics simulate the controlled checkout service outage. Baseline 5xx rate was &lt;0.05% before the provider normalization change.
            </p>
          </div>
        </div>
      )}

      {/* Main Metric Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 5xx Error Rate Card */}
        <Card className="p-4 bg-graphite-950/80 border-graphite-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-graphite-400 uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                5xx Error Rate
              </span>
              <Badge variant="red" className="text-[10px] animate-pulse">
                CRITICAL SPIKE
              </Badge>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold font-mono text-red-400">
                {telemetry.fivexxRate.toFixed(1)}%
              </span>
              <span className="text-xs text-graphite-500 font-mono">baseline: 0.05%</span>
            </div>
          </div>

          <div className="mt-4">
            <div className="h-2 w-full bg-graphite-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-red-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, telemetry.fivexxRate * 4)}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] font-mono text-graphite-500 mt-1">
              <span>0%</span>
              <span className="text-amber-400">Threshold: 1.0%</span>
              <span>25%</span>
            </div>
          </div>
        </Card>

        {/* Request Volume Card */}
        <Card className="p-4 bg-graphite-950/80 border-graphite-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-graphite-400 uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-cyan-400" />
                Total Throughput
              </span>
              <Badge variant="cyan" className="text-[10px]">
                LIVE TRAFFIC
              </Badge>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold font-mono text-white">
                {telemetry.totalRequests.toLocaleString()}
              </span>
              <span className="text-xs text-graphite-500 font-mono">requests / 30m</span>
            </div>
          </div>

          <div className="mt-4 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="text-status-green-400">
                200 OK: {telemetry.successfulRequests.toLocaleString()} ({successRate}%)
              </span>
              <span className="text-red-400">
                500 ERR: {telemetry.failedRequests.toLocaleString()}
              </span>
            </div>
            <div className="h-2 w-full bg-graphite-800 rounded-full overflow-hidden flex">
              <div
                className="h-full bg-status-green-500 transition-all duration-500"
                style={{ width: `${successRate}%` }}
              />
              <div
                className="h-full bg-red-500 transition-all duration-500"
                style={{ width: `${100 - parseFloat(successRate)}%` }}
              />
            </div>
          </div>
        </Card>

        {/* Latency & MTTR Card */}
        <Card className="p-4 bg-graphite-950/80 border-graphite-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-graphite-400 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-violet-400" />
                Service Latency
              </span>
              <Badge variant="violet" className="text-[10px]">
                p95: 480ms
              </Badge>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold font-mono text-violet-300">
                {telemetry.avgResponseTime}ms
              </span>
              <span className="text-xs text-graphite-500 font-mono">avg response</span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-graphite-800/80 flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-1 text-graphite-400">
              <Server className="w-3.5 h-3.5" />
              <span>{telemetry.service}</span>
            </div>
            <div className="flex items-center gap-1 text-status-green-400">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>SLA Target: 150ms</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Outage Breakdown & Observability Telemetry Card */}
      <Card className="p-4 bg-graphite-950/80 border-graphite-800">
        <div className="flex items-center justify-between mb-3 border-b border-graphite-800/80 pb-2">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-semibold text-white uppercase tracking-wider">
              Telemetry Telemetry Breakdown
            </span>
          </div>
          <span className="text-[11px] font-mono text-graphite-400">
            Window: Incident Detection to Present
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-lg bg-graphite-900 border border-graphite-800">
            <div className="text-[10px] font-mono text-graphite-500 uppercase">Affected Endpoint</div>
            <div className="text-sm font-mono text-white mt-1">POST /v1/checkouts</div>
            <div className="text-[10px] text-cyan-400 mt-1">Payment processing gateway</div>
          </div>

          <div className="p-3 rounded-lg bg-graphite-900 border border-graphite-800">
            <div className="text-[10px] font-mono text-graphite-500 uppercase">Error Signature</div>
            <div className="text-sm font-mono text-red-300 truncate mt-1">TypeError: undefined currency</div>
            <div className="text-[10px] text-graphite-400 mt-1">PaymentParser.formatForProvider</div>
          </div>

          <div className="p-3 rounded-lg bg-graphite-900 border border-graphite-800">
            <div className="text-[10px] font-mono text-graphite-500 uppercase">Impact Assessment</div>
            <div className="text-sm font-semibold text-amber-400 mt-1">Checkout Failure</div>
            <div className="text-[10px] text-graphite-400 mt-1">Orders blocked on provider payload</div>
          </div>

          <div className="p-3 rounded-lg bg-graphite-900 border border-graphite-800">
            <div className="text-[10px] font-mono text-graphite-500 uppercase">Resolution Posture</div>
            <div className="text-sm font-semibold text-status-green-400 mt-1">Patch Verified</div>
            <div className="text-[10px] text-cyan-400 mt-1">Awaiting Human Approval</div>
          </div>
        </div>
      </Card>
    </div>
  );
}
