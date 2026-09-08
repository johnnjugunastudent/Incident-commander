import { useState } from 'react';
import { IncidentList } from './components/IncidentList';
import { IncidentWorkspace } from './components/IncidentWorkspace';
import { IncidentIntake } from './components/IncidentIntake';
import { ToastProvider } from './components/Toast';
import { TooltipProvider } from '@radix-ui/react-tooltip';
import { Toaster } from 'sonner';

type View =
  | { name: 'list' }
  | { name: 'intake' }
  | { name: 'workspace'; incidentId: string };

export default function App() {
  const [view, setView] = useState<View>({ name: 'list' });

  const openIncident = (id: string) => setView({ name: 'workspace', incidentId: id });

  return (
    <TooltipProvider delayDuration={300}>
      <ToastProvider>
        <div className="min-h-screen bg-graphite-999">
          {view.name === 'list' && (
            <IncidentList
              onSelectIncident={openIncident}
              onCreateIncident={() => setView({ name: 'intake' })}
            />
          )}
          {view.name === 'intake' && (
            <IncidentIntake
              onClose={() => setView({ name: 'list' })}
              onCreated={openIncident}
            />
          )}
          {view.name === 'workspace' && (
            <IncidentWorkspace
              incidentId={view.incidentId}
              onBack={() => setView({ name: 'list' })}
            />
          )}
        </div>
        <Toaster
          position="bottom-right"
          toastOptions={{
            className: 'bg-graphite-900 border-graphite-700 text-graphite-100',
            style: {
              fontFamily: "'Inter', system-ui, sans-serif",
            },
          }}
        />
      </ToastProvider>
    </TooltipProvider>
  );
}
