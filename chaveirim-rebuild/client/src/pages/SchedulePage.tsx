import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Calendar, Clock, User, Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface Schedule {
  id: string;
  memberId: string;
  memberName?: string;
  unitNumber?: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  queue: string;
}

export default function SchedulePage() {
  const [selectedDay, setSelectedDay] = useState(new Date().getDay());

  const { data: schedules = [], isLoading } = useQuery<Schedule[]>({
    queryKey: ['schedules'],
    queryFn: async () => {
      const res = await fetch('/api/schedules', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch schedules');
      return res.json();
    },
  });

  const { data: members = [] } = useQuery({
    queryKey: ['members'],
    queryFn: async () => {
      const res = await fetch('/api/members', { credentials: 'include' });
      return res.json();
    },
  });

  // Group schedules by day
  const schedulesByDay = DAYS.map((_, index) => 
    schedules.filter(s => s.dayOfWeek === index)
  );

  // Enrich schedules with member info
  const enrichedSchedules = schedulesByDay[selectedDay].map(schedule => {
    const member = members.find((m: any) => m.id === schedule.memberId);
    return {
      ...schedule,
      memberName: member ? `${member.firstName} ${member.lastName}` : 'Unknown',
      unitNumber: member?.unitNumber || '',
    };
  }).sort((a, b) => a.startTime.localeCompare(b.startTime));

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Schedule</h1>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Shift
        </Button>
      </div>

      {/* Day selector */}
      <div className="flex gap-1 mb-6 overflow-x-auto pb-2">
        {DAYS.map((day, index) => (
          <button
            key={day}
            onClick={() => setSelectedDay(index)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
              selectedDay === index
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            )}
          >
            {day.substring(0, 3)}
          </button>
        ))}
      </div>

      {/* Schedule for selected day */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            {DAYS[selectedDay]}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            </div>
          ) : enrichedSchedules.length === 0 ? (
            <p className="text-center text-slate-500 py-8">
              No shifts scheduled for {DAYS[selectedDay]}
            </p>
          ) : (
            <div className="space-y-3">
              {enrichedSchedules.map((schedule) => (
                <div
                  key={schedule.id}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-bold',
                      schedule.queue === 'primary' ? 'bg-blue-600' :
                      schedule.queue === 'secondary' ? 'bg-green-600' : 'bg-slate-500'
                    )}>
                      {schedule.unitNumber}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{schedule.memberName}</p>
                      <p className="text-xs text-slate-500 capitalize">{schedule.queue} Queue</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-slate-600">
                    <Clock className="h-4 w-4" />
                    {schedule.startTime} - {schedule.endTime}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Queue status */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Current Queue Status</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-500 text-sm">
            Queue status will be displayed here...
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
