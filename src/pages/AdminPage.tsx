import { useState } from 'react';
import { RefreshCw, Database, Trash2, Download, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { 
  callsStore, 
  membersStore, 
  highwaysStore, 
  carMakesStore, 
  agenciesStore,
  problemCodesStore,
  resetAllData,
} from '@/lib/store';

export default function AdminPage() {
  const [message, setMessage] = useState('');

  const stats = {
    calls: callsStore.getAll().length,
    activeCalls: callsStore.getActive().length,
    members: membersStore.getAll().length,
    dispatchers: membersStore.getDispatchers().length,
    highways: highwaysStore.getAll().length,
    carMakes: carMakesStore.getAll().length,
    agencies: agenciesStore.getAll().length,
    problemCodes: problemCodesStore.getAll().length,
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to reset ALL data? This will restore sample data.')) {
      resetAllData();
      setMessage('Data reset to sample data!');
      setTimeout(() => setMessage(''), 3000);
      window.location.reload();
    }
  };

  const handleExport = () => {
    const data: Record<string, any> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('chaveirim_')) {
        data[key] = JSON.parse(localStorage.getItem(key) || '[]');
      }
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chaveirim-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMessage('Data exported!');
    setTimeout(() => setMessage(''), 3000);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string);
          Object.entries(data).forEach(([key, value]) => {
            if (key.startsWith('chaveirim_')) {
              localStorage.setItem(key, JSON.stringify(value));
            }
          });
          setMessage('Data imported successfully!');
          setTimeout(() => {
            setMessage('');
            window.location.reload();
          }, 1500);
        } catch (err) {
          setMessage('Error importing data');
          setTimeout(() => setMessage(''), 3000);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleClearClosed = () => {
    if (confirm('Delete all closed calls?')) {
      const calls = callsStore.getAll();
      const activeCalls = calls.filter(c => c.status === 'active');
      localStorage.setItem('chaveirim_calls', JSON.stringify(activeCalls));
      setMessage('Closed calls deleted!');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Admin Panel</h1>

      {message && (
        <div className="mb-4 p-3 bg-green-100 text-green-800 rounded-lg">
          {message}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="text-2xl font-bold text-blue-600">{stats.activeCalls}</div>
          <div className="text-sm text-slate-500">Active Calls</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-slate-600">{stats.calls}</div>
          <div className="text-sm text-slate-500">Total Calls</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-green-600">{stats.members}</div>
          <div className="text-sm text-slate-500">Members</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-purple-600">{stats.dispatchers}</div>
          <div className="text-sm text-slate-500">Dispatchers</div>
        </Card>
      </div>

      {/* Reference Data Stats */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Reference Data
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-slate-50 rounded-lg">
              <div className="font-bold">{stats.highways}</div>
              <div className="text-sm text-slate-500">Highways</div>
            </div>
            <div className="text-center p-3 bg-slate-50 rounded-lg">
              <div className="font-bold">{stats.carMakes}</div>
              <div className="text-sm text-slate-500">Car Makes</div>
            </div>
            <div className="text-center p-3 bg-slate-50 rounded-lg">
              <div className="font-bold">{stats.agencies}</div>
              <div className="text-sm text-slate-500">Agencies</div>
            </div>
            <div className="text-center p-3 bg-slate-50 rounded-lg">
              <div className="font-bold">{stats.problemCodes}</div>
              <div className="text-sm text-slate-500">Problem Codes</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Management */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Data Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" onClick={handleExport}>
                <Download className="h-4 w-4 mr-2" />
                Export Data
              </Button>
              <Button variant="outline" onClick={handleImport}>
                <Upload className="h-4 w-4 mr-2" />
                Import Data
              </Button>
              <Button variant="secondary" onClick={handleClearClosed}>
                <Trash2 className="h-4 w-4 mr-2" />
                Clear Closed Calls
              </Button>
            </div>
            
            <hr className="my-4" />
            
            <div>
              <Button variant="destructive" onClick={handleReset}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Reset to Sample Data
              </Button>
              <p className="text-sm text-slate-500 mt-2">
                This will delete all current data and restore the sample data.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Storage Info */}
      <Card>
        <CardHeader>
          <CardTitle>Storage Information</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600 mb-2">
            All data is stored in your browser's localStorage.
          </p>
          <ul className="text-sm text-slate-500 list-disc list-inside space-y-1">
            <li>Data persists across browser sessions</li>
            <li>Data is only stored on this device</li>
            <li>Clearing browser data will delete all stored data</li>
            <li>Use Export to backup your data</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
