import { Toaster as Sonner } from 'sonner';

type ToastOptions = {
  description?: string;
  action?: {
    label: string;
    onClick?: () => void;
  };
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Sonner
        toastOptions={{
          classNames: {
            toast:
              'bg-graphite-900 border-graphite-700 text-graphite-100 shadow-elevated',
            title: 'font-medium text-white',
            description: 'text-graphite-300 text-sm',
            actionButton:
              'bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium px-3 py-1 rounded-md',
            cancelButton:
              'bg-graphite-700 hover:bg-graphite-600 text-graphite-200 text-sm font-medium px-3 py-1 rounded-md',
          },
        }}
      />
    </>
  );
}

export type { ToastOptions };
