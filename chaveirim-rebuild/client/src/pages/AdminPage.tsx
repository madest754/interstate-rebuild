import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Settings, 
  Users, 
  Car, 
  MapPin, 
  Building, 
  Phone,
  MessageSquare,
  Activity,
  Shield,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type AdminSection = 
  | 'overview'
  | 'users'
  | 'highways'
  | 'vehicles'
  | 'agencies'
  | 'phones'
  | 'webhooks'
  | 'settings';

const sections = [
  { id: 'overview' as AdminSection, label: 'Overview', icon: Activity },
  { id: 'users' as AdminSection, label: 'Users & Members', icon: Users },
  { id: 'highways' as AdminSection, label: 'Highways & Exits', icon: MapPin },
  { id: 'vehicles' as AdminSection, label: 'Vehicles', icon: Car },
  { id: 'agencies' as AdminSection, label: 'Agencies', icon: Building },
  { id: 'phones' as AdminSection, label: 'Important Phones', icon: Phone },
  { id: 'webhooks' as AdminSection, label: 'Webhooks & Logs', icon: MessageSquare },
  { id: 'settings' as AdminSection, label: 'System Settings', icon: Settings },
];

export default function AdminPage() {
  const [activeSection, setActiveSection] = useState<AdminSection>('overview');

  return (
    <div className="max-w-6xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <Shield className="h-6 w-6" />
        Admin Panel
      </h1>

      <div className="grid md:grid-cols-4 gap-6">
        {/* Sidebar navigation */}
        <div className="md:col-span-1">
          <Card>
            <CardContent className="p-2">
              {sections.map((section) => {
                const Icon = section.icon;
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors',
                      activeSection === section.id
                        ? 'bg-blue-50 text-blue-700'
                        : 'hover:bg-slate-50 text-slate-600'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="text-sm font-medium">{section.label}</span>
                  </button>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* Main content */}
        <div className="md:col-span-3">
          {activeSection === 'overview' && <OverviewSection />}
          {activeSection === 'users' && <UsersSection />}
          {activeSection === 'highways' && <HighwaysSection />}
          {activeSection === 'vehicles' && <VehiclesSection />}
          {activeSection === 'agencies' && <AgenciesSection />}
          {activeSection === 'phones' && <PhonesSection />}
          {activeSection === 'webhooks' && <WebhooksSection />}
          {activeSection === 'settings' && <SettingsSection />}
        </div>
      </div>
    </div>
  );
}

function OverviewSection() {
  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      // Fetch various stats
      const [members, calls, feedback] = await Promise.all([
        fetch('/api/members', { credentials: 'include' }).then(r => r.json()),
        fetch('/api/calls', { credentials: 'include' }).then(r => r.json()),
        fetch('/api/feedback/unread-count', { credentials: 'include' }).then(r => r.json()).catch(() => ({ count: 0 })),
      ]);
      return {
        totalMembers: members.length,
        activeMembers: members.filter((m: any) => m.isActive).length,
        activeCalls: calls.filter((c: any) => c.status === 'active').length,
        unreadFeedback: feedback.count,
      };
    },
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>System Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Active Calls" value={stats?.activeCalls || 0} color="blue" />
            <StatCard label="Total Members" value={stats?.totalMembers || 0} color="green" />
            <StatCard label="Active Members" value={stats?.activeMembers || 0} color="purple" />
            <StatCard label="Unread Feedback" value={stats?.unreadFeedback || 0} color="amber" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-green-50 text-green-700',
    purple: 'bg-purple-50 text-purple-700',
    amber: 'bg-amber-50 text-amber-700',
  };
  
  return (
    <div className={cn('p-4 rounded-lg', colorClasses[color as keyof typeof colorClasses])}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-sm opacity-75">{label}</p>
    </div>
  );
}

function UsersSection() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Users & Members Management</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-slate-500">User management interface will be implemented here...</p>
      </CardContent>
    </Card>
  );
}

function HighwaysSection() {
  const { data: highways = [], isLoading } = useQuery({
    queryKey: ['highways'],
    queryFn: async () => {
      const res = await fetch('/api/highways', { credentials: 'include' });
      return res.json();
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Highways & Exits</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Loader2 className="h-6 w-6 animate-spin" />
        ) : (
          <div className="space-y-2">
            {highways.map((hw: any) => (
              <div key={hw.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <span className="font-medium">{hw.name}</span>
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function VehiclesSection() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Vehicle Makes & Models</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-slate-500">Vehicle management interface will be implemented here...</p>
      </CardContent>
    </Card>
  );
}

function AgenciesSection() {
  const { data: agencies = [] } = useQuery({
    queryKey: ['agencies'],
    queryFn: async () => {
      const res = await fetch('/api/agencies', { credentials: 'include' });
      return res.json();
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Requesting Agencies</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {agencies.map((agency: any) => (
            <div key={agency.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <span className="font-medium">{agency.name}</span>
              <span className="text-sm text-slate-500">{agency.code}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function PhonesSection() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Important Phone Numbers</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-slate-500">Phone directory management will be implemented here...</p>
      </CardContent>
    </Card>
  );
}

function WebhooksSection() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Webhook Logs</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-slate-500">Webhook logs will be displayed here...</p>
      </CardContent>
    </Card>
  );
}

function SettingsSection() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>System Settings</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-slate-500">System settings will be configured here...</p>
      </CardContent>
    </Card>
  );
}
