import { CardHeader, CardTitle, CardDescription } from './ui';
import { AlertTriangle, Users, GitBranch, Clock, Play, BookOpen } from './ui';

interface Incident {
  id?: string;
  title?: string;
  service?: string;
  severity?: string;
  status?: string;
  impactSummary?: string;
  alertContext?: string;
  logs?: string;
  repositoryContext?: string;
  recentChange?: string;
  reproductionInstructions?: string;
  createdAt?: string | Date;
}

interface IncidentContextProps {
  incident: Incident | undefined;
}

function Field({
  label,
  value,
  icon: Icon,
  mono = false,
}: {
  label: string;
  value?: string;
  icon?: React.ReactNode;
  mono?: boolean;
}) {
  if (!value) return null;

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5 text-xs text-graphite-500">
        {Icon}
        <span>{label}</span>
      </div>
      <div className={`text-sm ${mono ? 'font-mono text-graphite-300' : 'text-graphite-300'}`}>
        {value}
      </div>
    </div>
  );
}

export function IncidentContext({ incident }: IncidentContextProps) {
  if (!incident) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded bg-graphite-800 flex items-center justify-center">
            <Clock className="w-4 h-4 text-graphite-500" />
          </div>
          <CardTitle>Loading...</CardTitle>
        </div>
        <div className="animate-pulse space-y-3">
          <div className="h-3 bg-graphite-800 rounded w-3/4" />
          <div className="h-3 bg-graphite-800 rounded w-1/2" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-8 h-8 rounded flex items-center justify-center ${
          incident.severity === 'critical' ? 'bg-status-red-500/20' :
          incident.severity === 'high' ? 'bg-status-amber-500/20' :
          'bg-violet-500/20'
        }`}>
          <AlertTriangle className={`w-4 h-4 ${
            incident.severity === 'critical' ? 'text-status-red-400' :
            incident.severity === 'high' ? 'text-status-amber-400' :
            'text-violet-400'
          }`} />
        </div>
        <div>
          <CardTitle className="text-base">{incident.title}</CardTitle>
          <CardDescription>{incident.service}</CardDescription>
        </div>
        <div className="ml-auto flex gap-1">
          <span className="text-xs text-graphite-500 font-mono">
            {typeof incident.createdAt === 'string'
              ? new Date(incident.createdAt).toLocaleString()
              : incident.createdAt?.toLocaleString() || ''}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Field
            label="Impact Summary"
            value={incident.impactSummary}
          />
        </div>
        <div>
          <Field
            label="Status"
            value={incident.status}
          />
          <Field
            label="Severity"
            value={incident.severity}
          />
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-graphite-800">
        <Field
          label="Alert Context"
          value={incident.alertContext}
          icon={<AlertTriangle className="w-3.5 h-3.5" />}
        />
      </div>

      {(incident.logs || incident.repositoryContext || incident.recentChange || incident.reproductionInstructions) && (
        <div className="mt-4 pt-4 border-t border-graphite-800">
          <h4 className="text-xs text-graphite-500 uppercase tracking-wider mb-3">Investigation Context</h4>

          <div className="space-y-3">
            {incident.logs && (
              <Field
                label="Error Logs"
                value={incident.logs}
                icon={<Users className="w-3.5 h-3.5" />}
                mono
              />
            )}

            {incident.repositoryContext && (
              <Field
                label="Repository Context"
                value={incident.repositoryContext}
                icon={<BookOpen className="w-3.5 h-3.5" />}
                mono
              />
            )}

            {incident.recentChange && (
              <Field
                label="Recent Change"
                value={incident.recentChange}
                icon={<GitBranch className="w-3.5 h-3.5" />}
                mono
              />
            )}

            {incident.reproductionInstructions && (
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-graphite-500">
                  <Play className="w-3.5 h-3.5" />
                  <span>Reproduction Instructions</span>
                </div>
                <div className="text-sm text-graphite-300 font-mono">
                  {incident.reproductionInstructions}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
