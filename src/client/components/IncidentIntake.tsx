import { useState } from 'react';
import { trpc } from '../lib/trpc';
import { Button, Input, Textarea, Label, FormField, Card, CardHeader, CardTitle, CardDescription, CardContent, Badge } from './ui';
import { Loader2, AlertCircle, CheckCircle, ArrowRight, ArrowLeft } from './ui';
import { toast } from 'sonner';

interface IncidentIntakeProps {
  onClose: () => void;
  onCreated: (incidentId: string) => void;
}

const STEPS = [
  { id: 'basic', label: 'Basic Info' },
  { id: 'context', label: 'Context' },
  { id: 'review', label: 'Review' },
];

const DEMO_INCIDENT = {
  title: 'Checkout API: Elevated 5xx Responses',
  service: 'checkout-service',
  severity: 'high' as const,
  impactSummary: 'Customers cannot complete checkout reliably. Order flow is broken for approximately 15% of checkout requests.',
  alertContext: 'PagerDuty alert: checkout-service.high_error_rate triggered at 14:32 UTC. 5xx rate increased from baseline 0.2% to 8.7% over 10 minutes.',
  logs: `2024-03-15T14:32:01Z ERROR [checkout-service] POST /v1/checkouts - 500 Internal Server Error
  at PaymentParser.parsePaymentRequest (payment-parser.ts:142:15)
  TypeError: Cannot read properties of undefined (reading 'currency')
  at PaymentParser.formatForProvider (payment-parser.ts:89:10)

  2024-03-15T14:32:02Z ERROR [checkout-service] POST /v1/checkouts - 500 Internal Server Error
  at PaymentParser.parsePaymentRequest (payment-parser.ts:142:15)
  TypeError: Cannot read properties of undefined (reading 'currency')
  at PaymentParser.formatForProvider (payment-parser.ts:89:10)

  2024-03-15T14:32:03Z WARN  [checkout-service] Failed checkout attempt for user_id=usr_884721, amount=149.99,
  currency=undefined, payment_method=card_rsa`,
  repositoryContext: `src/services/payment-parser.ts
  src/services/payment-parser.test.ts
  src/api/checkouts/routes.ts
  src/types/payment.ts

  The PaymentParser service handles normalization of incoming payment requests before forwarding to processor APIs.`,
  recentChange: `Commit 7a3f2e1 - "feat: normalize provider payload structure"

  Changes:
  - Updated PaymentParser.formatForProvider to expect currency field
  - Modified provider payload normalization to require currency
  - Updated tests for new payload structure

  This commit was deployed to production at 14:00 UTC today, approximately 32 minutes before the alert fired.`,
  reproductionInstructions: `To reproduce the issue:

  1. Send POST request to /v1/checkouts with a payload missing the currency field:
     {
       "order_id": "ord_992831",
       "items": [{"sku": "PROD-001", "quantity": 1}],
       "payment_method": "card_rsa",
       "amount": 149.99
     }

  2. The request should return 500 Internal Server Error with:
     TypeError: Cannot read properties of undefined (reading 'currency')

  3. Expected: The service should handle missing currency gracefully or provide a clear validation error.`,
};

export function IncidentIntake({ onClose, onCreated }: IncidentIntakeProps) {
  const [step, setStep] = useState(0);
  const [openDemo, setOpenDemo] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    service: '',
    severity: 'high' as 'critical' | 'high' | 'medium' | 'low' | 'informational',
    impactSummary: '',
    alertContext: '',
    logs: '',
    repositoryContext: '',
    recentChange: '',
    reproductionInstructions: '',
  });

  const { mutateAsync: createIncident, isPending } = trpc.incident.create.useMutation({
    onSuccess: (data) => {
      toast.success('Incident created successfully');
    },
    onError: (error) => {
      toast.error('Failed to create incident: ' + error.message);
    },
  });

  const handleDemoClick = () => {
    setOpenDemo(true);
    setFormData({
      title: DEMO_INCIDENT.title,
      service: DEMO_INCIDENT.service,
      severity: DEMO_INCIDENT.severity,
      impactSummary: DEMO_INCIDENT.impactSummary,
      alertContext: DEMO_INCIDENT.alertContext,
      logs: DEMO_INCIDENT.logs,
      repositoryContext: DEMO_INCIDENT.repositoryContext,
      recentChange: DEMO_INCIDENT.recentChange,
      reproductionInstructions: DEMO_INCIDENT.reproductionInstructions,
    });
    setStep(2);
  };

  const handleContinue = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  const handleCreate = async () => {
    setIsCreating(true);
    try {
      const created = await createIncident(formData as any);
      onCreated(created.id);
    } catch {
      // Error toast already shown by mutation onError
    } finally {
      setIsCreating(false);
    }
  };

  const handleInputChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
  };

  if (openDemo) {
    return (
      <Card className="card-elevated border-violet-500/30 glow-border-violet">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-violet-500/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-violet-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 9v2m0 4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Open Controlled Demo Incident</h2>
              <p className="text-sm text-graphite-400">Checkout API: Elevated 5xx Responses</p>
            </div>
          </div>

          <div className="bg-graphite-800 rounded-lg p-4 mb-6 border border-graphite-700">
            <div className="flex items-center gap-2 mb-3">
              <Badge variant="amber">Demo Data</Badge>
              <span className="text-xs text-graphite-500">This is a controlled demonstration incident.</span>
            </div>
            <ul className="space-y-2 text-sm text-graphite-300">
              <li className="flex items-start gap-2">
                <span className="text-violet-400 mt-0.5">•</span>
                <span>High-severity checkout service incident with elevated 5xx rate</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-400 mt-0.5">•</span>
                <span>Representative error logs showing missing currency field</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-status-green-400 mt-0.5">•</span>
                <span>Repository context with payment parser and tests</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-graphite-400 mt-0.5">•</span>
                <span>Recent commit describing provider-payload normalization change</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-400 mt-0.5">•</span>
                <span>Reproduction instructions for a payload without currency</span>
              </li>
            </ul>
          </div>

          <div className="flex gap-3">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setOpenDemo(false)}
            >
              <ArrowLeft className="w-4 h-4" />
              Cancel
            </Button>
            <Button
              variant="primary"
              className="flex-1 gap-2"
              onClick={handleCreate}
              disabled={isCreating}
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Start Investigation
                </>
              )}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="min-h-screen bg-graphite-999 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 grid-pattern pointer-events-none opacity-30" />

      <Card className="card-elevated w-full max-w-2xl animate-fade-in">
        {/* Header */}
        <div className="p-6 border-b border-graphite-800">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-violet-600 flex items-center justify-center">
                <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 9v2m0 4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">New Incident</h1>
                <p className="text-sm text-graphite-400">Capture incident details for investigation</p>
              </div>
            </div>
            <Badge variant="violet">Step {step + 1} of {STEPS.length}</Badge>
          </div>

          {/* Progress steps */}
          <div className="flex items-center gap-2 mt-4">
            {STEPS.map((s, i) => (
              <div key={s.id} className="flex items-center flex-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  i <= step ? 'bg-violet-600 text-white' : 'bg-graphite-800 text-graphite-500'
                }`}>
                  {i < step ? <CheckCircle className="w-4 h-4" /> : i + 1}
                </div>
                <span className={`ml-2 text-sm ${i <= step ? 'text-white' : 'text-graphite-500'} ${i === step ? 'font-semibold' : ''}`}>
                  {s.label}
                </span>
                {i < STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 ${i < step ? 'bg-violet-600' : 'bg-graphite-800'} rounded`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Form content */}
        <div className="p-6">
          {step === 0 && (
            <div className="space-y-4">
              <FormField label="Incident Title">
                <Input
                  placeholder="e.g., Checkout API: Elevated 5xx Responses"
                  value={formData.title}
                  onChange={handleInputChange('title')}
                  className="font-medium"
                />
              </FormField>

              <FormField label="Service Name">
                <Input
                  placeholder="e.g., checkout-service, auth-service"
                  value={formData.service}
                  onChange={handleInputChange('service')}
                  className="font-mono text-sm"
                />
              </FormField>

              <FormField label="Severity">
                <select
                  value={formData.severity}
                  onChange={(e) => setFormData(prev => ({ ...prev, severity: e.target.value as any }))}
                  className="w-full h-10 px-3 rounded-md bg-surface-raised border border-graphite-700 text-graphite-100 focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20 outline-none"
                >
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                  <option value="informational">Informational</option>
                </select>
              </FormField>

              <FormField label="User Impact Summary">
                <Textarea
                  placeholder="Describe how customers/users are affected..."
                  value={formData.impactSummary}
                  onChange={handleInputChange('impactSummary')}
                  className="min-h-[80px]"
                />
              </FormField>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <FormField label="Alert Context">
                <Textarea
                  placeholder="What triggered this investigation? Alert details, monitoring signals..."
                  value={formData.alertContext}
                  onChange={handleInputChange('alertContext')}
                  className="min-h-[80px]"
                />
              </FormField>

              <FormField label="Error Logs">
                <Textarea
                  placeholder="Paste relevant error logs or stack traces..."
                  value={formData.logs}
                  onChange={handleInputChange('logs')}
                  className="min-h-[120px] font-mono text-sm"
                />
              </FormField>

              <FormField label="Repository Context">
                <Textarea
                  placeholder="Which files, modules, or components are involved?"
                  value={formData.repositoryContext}
                  onChange={handleInputChange('repositoryContext')}
                  className="min-h-[80px] font-mono text-sm"
                />
              </FormField>

              <FormField label="Recent Changes / Commits">
                <Textarea
                  placeholder="Any recent deployments, commits, or configuration changes?"
                  value={formData.recentChange}
                  onChange={handleInputChange('recentChange')}
                  className="min-h-[80px] font-mono text-sm"
                />
              </FormField>

              <FormField label="Reproduction Instructions">
                <Textarea
                  placeholder="How can this issue be reproduced?"
                  value={formData.reproductionInstructions}
                  onChange={handleInputChange('reproductionInstructions')}
                  className="min-h-[80px] font-mono text-sm"
                />
              </FormField>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="p-4 bg-graphite-800 rounded-lg border border-graphite-700">
                <h3 className="text-sm font-medium text-white mb-3">Incident Summary</h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="text-graphite-500">Title:</span>
                    <span className="text-graphite-200 ml-2">{formData.title || '—'}</span>
                  </div>
                  <div>
                    <span className="text-graphite-500">Service:</span>
                    <span className="text-graphite-200 ml-2 font-mono text-xs">{formData.service || '—'}</span>
                  </div>
                  <div>
                    <span className="text-graphite-500">Severity:</span>
                    <Badge
                      className="ml-2"
                      variant={
                        formData.severity === 'critical' ? 'red' :
                        formData.severity === 'high' ? 'amber' :
                        formData.severity === 'medium' ? 'cyan' :
                        'graphite'
                      }
                    >
                      {formData.severity}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-graphite-800 rounded-lg border border-graphite-700">
                <h3 className="text-sm font-medium text-white mb-3">Impact Summary</h3>
                <p className="text-graphite-300">{formData.impactSummary || '—'}</p>
              </div>

              <div className="p-4 bg-graphite-800 rounded-lg border border-graphite-700">
                <h3 className="text-sm font-medium text-white mb-3">Alert Context</h3>
                <p className="text-graphite-300">{formData.alertContext || '—'}</p>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-6 border-t border-graphite-800 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => {
              onClose();
              if (step > 0) setStep(0);
            }}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            {step === 0 ? 'Cancel' : 'Back'}
          </Button>

          <div className="flex gap-3">
            {step < STEPS.length - 1 && (
              <Button
                variant="primary"
                onClick={handleContinue}
                className="gap-2"
              >
                Continue
                <ArrowRight className="w-4 h-4" />
              </Button>
            )}

            {step === STEPS.length - 1 && (
              <>
                <Button
                  variant="secondary"
                  onClick={handleDemoClick}
                  className="gap-2"
                >
                  <AlertCircle className="w-4 h-4" />
                  Use Demo Data
                </Button>
                <Button
                  variant="primary"
                  onClick={handleCreate}
                  disabled={isPending || isCreating}
                  className="gap-2"
                >
                  {isPending || isCreating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Create & Investigate
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
