import { useState } from 'react';
import { Plus, RefreshCw, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CallCard } from '@/components/CallCard';
import { callsStore, type Call } from '@/lib/store';

interface DashboardProps {
  onNewCall: () => void;
  onEditCall: (callId: string) => void;
}

export default function Dashboard({ onNewCall, onEditCall }: DashboardProps) {
  const [refreshKey, setRefreshKey] = useState(0);
  
  const activeCalls = callsStore.getActive();
  const urgentCalls = activeCalls.filter(c => c.urgent);
  const regularCalls = activeCalls.filter(c => !c.urgent);

  const handleRefresh = () => {
    setRefreshKey(k => k + 1);
  };

  return (
    <div className="p-4 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Active Calls</h1>
          <p className="text-slate-500">{activeCalls.length} active call{activeCalls.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={onNewCall}>
            <Plus className="h-4 w-4 mr-2" />
            New Call
          </Button>
        </div>
      </div>

      {/* Urgent Calls */}
      {urgentCalls.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <h2 className="font-semibold text-red-700">Urgent ({urgentCalls.length})</h2>
          </div>
          <div className="space-y-3">
            {urgentCalls.map(call => (
              <CallCard 
                key={call.id} 
                call={call} 
                onClick={() => onEditCall(call.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Regular Calls */}
      {regularCalls.length > 0 && (
        <div>
          {urgentCalls.length > 0 && (
            <h2 className="font-semibold text-slate-700 mb-3">Other Calls ({regularCalls.length})</h2>
          )}
          <div className="space-y-3">
            {regularCalls.map(call => (
              <CallCard 
                key={call.id} 
                call={call} 
                onClick={() => onEditCall(call.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {activeCalls.length === 0 && (
        <div className="text-center py-12">
          <div className="bg-slate-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <Phone className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-medium text-slate-900 mb-1">No Active Calls</h3>
          <p className="text-slate-500 mb-4">All calls have been resolved</p>
          <Button onClick={onNewCall}>
            <Plus className="h-4 w-4 mr-2" />
            Create New Call
          </Button>
        </div>
      )}
    </div>
  );
}

function Phone(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
    </svg>
  );
}
