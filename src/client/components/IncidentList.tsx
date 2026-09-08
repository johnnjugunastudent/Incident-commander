import { trpc } from '../lib/trpc';
import { Button } from './ui/Button';
import { Card, CardHeader, CardContent, CardFooter } from './ui/Card';
import { Badge } from './ui/Badge';
import { Input } from './ui/Input';
import { AlertCircle, Plus, Search, Play } from './ui/Icons';
import { Loader2 } from './ui/Loader2';
import { useState } from 'react';
import { toast } from 'sonner';

interface IncidentListProps {
  onSelectIncident: (id: string) => void;
  onCreateIncident: () => void;
}

export function IncidentList({ onSelectIncident, onCreateIncident }: IncidentListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const { data: incidents, isLoading, error } = trpc.incident.list.useQuery();

  const openDemo = trpc.incident.openDemo.useMutation({
    onSuccess: (data) => {
      onSelectIncident(data.id);
    },
    onError: (error) => {
      toast.error('Failed to open demo incident: ' + error.message);
    },
  });

  const filteredIncidents = incidents?.filter((incident) =>
    incident.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    incident.service.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <div className="min-h-screen bg-graphite-999 relative overflow-hidden">
      {/* Background grid pattern */}
      <div className="absolute inset-0 grid-pattern pointer-events-none opacity-50" />

      {/* Header */}
      <header className="relative bg-graphite-950/80 backdrop-blur-sm border-b border-graphite-800 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-violet-600 flex items-center justify-center">
                <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 9v2m0 4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight">Incident Commander</h1>
                <p className="text-sm text-graphite-400">Evidence-backed incident response</p>
              </div>
            </div>
            <Button
              variant="primary"
              onClick={onCreateIncident}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              New Incident
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Features banner */}
        <div className="mb-8 p-4 rounded-lg bg-violet-600/10 border border-violet-500/20">
          <div className="flex items-start gap-3">
            <div className="w-5 h-5 mt-0.5 flex-shrink-0 rounded-full bg-violet-500 flex items-center justify-center">
              <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 12 21 15 18" />
              </svg>
            </div>
            <div className="flex-1">
              <h2 className="text-sm font-semibold text-violet-300 mb-1">Alpha Release</h2>
              <p className="text-sm text-graphite-300">
                Incident Commander helps engineering teams investigate outages with AI assistance while keeping human approval at the center. All evidence is persisted, all claims are linked, and no patch is ever deployed automatically.
              </p>
            </div>
          </div>
        </div>

        {/* Incident list */}
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-graphite-500" />
              <input
                type="text"
                placeholder="Search incidents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-graphite-900 border border-graphite-800 rounded-lg text-graphite-100 placeholder-graphite-500 focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20 outline-none transition-colors"
              />
            </div>
            <span className="text-sm text-graphite-500">
              {filteredIncidents.length} incident{filteredIncidents.length !== 1 ? 's' : ''}
            </span>
          </div>

          {error && (
            <div className="p-4 rounded-lg bg-status-red-500/10 border border-status-red-500/20 text-status-red-300">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-5 h-5" />
                <span className="font-semibold">Failed to load incidents</span>
              </div>
              <p className="text-sm">{error.message}</p>
            </div>
          )}

          {isLoading && filteredIncidents.length === 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="h-4 bg-graphite-700 rounded w-3/4 mb-4" />
                    <div className="h-3 bg-graphite-700 rounded w-1/2 mb-3" />
                    <div className="h-3 bg-graphite-700 rounded w-2/3" />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {filteredIncidents.length === 0 && !isLoading && (
            <div className="text-center py-16">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-graphite-800 flex items-center justify-center">
                <svg className="w-8 h-8 text-graphite-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 11l3 3L22 4" />
                  <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-graphite-300 mb-2">No incidents yet</h3>
              <p className="text-sm text-graphite-500 max-w-md mx-auto mb-6">
                Start by creating a new incident or opening the controlled demo outage to see how Incident Commander works.
              </p>
              <div className="flex items-center justify-center gap-4">
                <Button variant="primary" onClick={onCreateIncident} className="gap-2">
                  <Plus className="w-4 h-4" />
                  New Incident
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => openDemo.mutate()}
                  disabled={openDemo.isPending}
                  className="gap-2"
                >
                  {openDemo.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                  {openDemo.isPending ? 'Opening...' : 'Open Demo'}
                </Button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredIncidents.map((incident) => (
              <Card
                key={incident.id}
                className="card-hover cursor-pointer group"
                onClick={() => onSelectIncident(incident.id)}
              >
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        incident.severity === 'critical' ? 'red' :
                        incident.severity === 'high' ? 'amber' :
                        incident.severity === 'medium' ? 'cyan' :
                        'graphite'
                      }
                    >
                      {incident.severity}
                    </Badge>
                    <Badge variant={incident.status === 'open' ? 'violet' : 'graphite'}>
                      {incident.status}
                    </Badge>
                  </div>
                  <span className="text-xs text-graphite-500 font-mono">
                    {new Date(incident.createdAt).toLocaleDateString()}
                  </span>
                </CardHeader>
                <CardContent className="pt-0">
                  <h3 className="text-base font-semibold text-white group-hover:text-violet-300 transition-colors truncate">
                    {incident.title}
                  </h3>
                  <p className="text-sm text-graphite-400 mt-1">{incident.service}</p>
                  <p className="text-sm text-graphite-500 mt-2 line-clamp-2">
                    {incident.impactSummary}
                  </p>
                </CardContent>
                <CardFooter className="flex items-center gap-2 text-xs text-graphite-500 pt-2">
                  <span className="flex items-center gap-1">
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                    {incident.investigationEvents?.length || 0} events
                  </span>
                  <span className="flex items-center gap-1">
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                    {incident.evidence?.length || 0} evidence
                  </span>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative border-t border-graphite-800 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between text-xs text-graphite-600">
            <span>Incident Commander</span>
            <span className="font-mono">Nebius x NVIDIA Global AI Hackathon</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
