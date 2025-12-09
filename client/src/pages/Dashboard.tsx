/**
 * Dashboard Page
 * 
 * Main dispatch dashboard showing active calls, queue status, and recent activity.
 */

import { useState } from 'react';
import { 
  RefreshCw,
  Plus,
  Search,
  Filter,
  CheckCircle,
  Clock,
  ChevronDown,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { SkeletonList } from '../components/ui/spinner';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { CallList } from '../components/CallCard';
import { QueueStatus } from '../components/QueueStatus';
import { 
  useAuth, 
  useCalls, 
  useCallMutations, 
  useRecentlyCompletedCalls,
  type Call,
} from '../hooks';

interface DashboardProps {
  onNewCall?: () => void;
  onEditCall?: (callId: string) => void;
}

export default function Dashboard({ onNewCall, onEditCall }: DashboardProps) {
  const { isDispatcher } = useAuth();
  const [filter, setFilter] = useState<'active' | 'closed' | 'all'>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Fetch calls
  const { 
    data: calls = [], 
    isLoading, 
    refetch, 
    isFetching 
  } = useCalls(filter === 'all' ? undefined : filter);

  // Fetch recently completed for notification
  const { data: recentlyCompleted = [] } = useRecentlyCompletedCalls(15);

  // Call mutations
  const { closeCall, reopenCall } = useCallMutations();

  // Filter calls by search query
  const filteredCalls = calls.filter((call: Call) => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      call.callNumber.toString().includes(query) ||
      call.callerName?.toLowerCase().includes(query) ||
      call.phone1?.includes(query) ||
      call.freeTextLocation?.toLowerCase().includes(query) ||
      call.address?.toLowerCase().includes(query) ||
      call.dispatcherMessage?.toLowerCase().includes(query)
    );
  });

  // Sort calls - urgent first, then by date
  const sortedCalls = [...filteredCalls].sort((a: Call, b: Call) => {
    if (a.urgent && !b.urgent) return -1;
    if (!a.urgent && b.urgent) return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  // Stats
  const activeCalls = calls.filter((c: Call) => c.status === 'active');
  const urgentCalls = activeCalls.filter((c: Call) => c.urgent);

  const handleClose = async (callId: string) => {
    try {
      await closeCall(callId);
    } catch (error) {
      console.error('Failed to close call:', error);
    }
  };

  const handleReopen = async (callId: string) => {
    try {
      await reopenCall(callId);
    } catch (error) {
      console.error('Failed to reopen call:', error);
    }
  };

  const handleAssign = (callId: string) => {
    // TODO: Open assignment dialog
    console.log('Assign to call:', callId);
  };

  const handleBroadcast = (callId: string) => {
    // TODO: Open broadcast dialog
    console.log('Broadcast call:', callId);
  };

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Dispatch Dashboard</h1>
          <p className="text-muted-foreground">
            {activeCalls.length} active call{activeCalls.length !== 1 ? 's' : ''}
            {urgentCalls.length > 0 && (
              <span className="text-red-600 ml-2">
                ({urgentCalls.length} urgent)
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
          </Button>
          
          {isDispatcher && onNewCall && (
            <Button onClick={onNewCall}>
              <Plus className="h-4 w-4 mr-2" />
              New Call
            </Button>
          )}
        </div>
      </div>

      {/* Queue Status (compact on mobile) */}
      <div className="md:hidden">
        <QueueStatus compact />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Calls List */}
        <div className="lg:col-span-3 space-y-4">
          {/* Search and Filters */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search calls..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filter
              <ChevronDown className={cn(
                'h-4 w-4 ml-2 transition-transform',
                showFilters && 'rotate-180'
              )} />
            </Button>
          </div>

          {/* Filter Tabs */}
          <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
            <TabsList>
              <TabsTrigger value="active">
                Active
                {activeCalls.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {activeCalls.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="closed">Closed</TabsTrigger>
              <TabsTrigger value="all">All</TabsTrigger>
            </TabsList>

            <TabsContent value={filter} className="mt-4">
              {isLoading ? (
                <SkeletonList count={3} />
              ) : sortedCalls.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
                    <h3 className="text-lg font-medium">No {filter} calls</h3>
                    <p className="text-muted-foreground mt-1">
                      {filter === 'active' 
                        ? 'All calls have been handled' 
                        : searchQuery 
                          ? 'No calls match your search'
                          : 'No calls to display'}
                    </p>
                    {isDispatcher && filter === 'active' && onNewCall && (
                      <Button className="mt-4" onClick={onNewCall}>
                        <Plus className="h-4 w-4 mr-2" />
                        Create New Call
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <CallList
                  calls={sortedCalls}
                  onAssign={isDispatcher ? handleAssign : undefined}
                  onClose={isDispatcher ? handleClose : undefined}
                  onReopen={isDispatcher ? handleReopen : undefined}
                  onBroadcast={isDispatcher ? handleBroadcast : undefined}
                />
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="hidden lg:block space-y-4">
          {/* Queue Status */}
          <QueueStatus />

          {/* Recently Completed */}
          {recentlyCompleted.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Recently Completed
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {recentlyCompleted.slice(0, 5).map((call: Call) => (
                  <div 
                    key={call.id}
                    className="flex items-center justify-between text-sm p-2 bg-muted/50 rounded"
                  >
                    <span className="font-medium">#{call.callNumber}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatTimeSince(call.closedAt || call.updatedAt)}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Quick Stats */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Today's Stats</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-blue-600">
                    {activeCalls.length}
                  </div>
                  <div className="text-xs text-muted-foreground">Active</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {calls.filter((c: Call) => c.status === 'closed').length}
                  </div>
                  <div className="text-xs text-muted-foreground">Closed</div>
                </div>
                {urgentCalls.length > 0 && (
                  <div className="col-span-2">
                    <div className="text-xl font-bold text-red-600">
                      {urgentCalls.length}
                    </div>
                    <div className="text-xs text-muted-foreground">Urgent</div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

/**
 * Format time since
 */
function formatTimeSince(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
}
