import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, User, Phone, Mail, MapPin, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { cn, formatPhoneNumber } from '@/lib/utils';

interface Member {
  id: string;
  unitNumber: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  city?: string;
  isDispatcher: boolean;
  isCoordinator: boolean;
  isActive: boolean;
}

export default function MembersPage() {
  const [search, setSearch] = useState('');

  const { data: members = [], isLoading } = useQuery<Member[]>({
    queryKey: ['members'],
    queryFn: async () => {
      const res = await fetch('/api/members', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch members');
      return res.json();
    },
  });

  const filteredMembers = members.filter((member) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      member.firstName.toLowerCase().includes(searchLower) ||
      member.lastName.toLowerCase().includes(searchLower) ||
      member.unitNumber.toLowerCase().includes(searchLower) ||
      member.phone.includes(search)
    );
  });

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Member Directory</h1>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, unit, or phone..."
          className="pl-10"
        />
      </div>

      {/* Members list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : (
        <div className="space-y-2">
          {filteredMembers.map((member) => (
            <Card key={member.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'h-10 w-10 rounded-full flex items-center justify-center text-white font-bold text-sm',
                    member.isDispatcher ? 'bg-blue-600' : 
                    member.isCoordinator ? 'bg-purple-600' : 'bg-slate-400'
                  )}>
                    {member.unitNumber}
                  </div>
                  <div>
                    <p className="font-medium">
                      {member.firstName} {member.lastName}
                    </p>
                    <div className="flex items-center gap-4 text-sm text-slate-500">
                      <a 
                        href={`tel:${member.phone}`}
                        className="flex items-center gap-1 hover:text-blue-600"
                      >
                        <Phone className="h-3 w-3" />
                        {formatPhoneNumber(member.phone)}
                      </a>
                      {member.city && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {member.city}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-1">
                  {member.isDispatcher && (
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                      Dispatcher
                    </span>
                  )}
                  {member.isCoordinator && (
                    <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">
                      Coordinator
                    </span>
                  )}
                </div>
              </div>
            </Card>
          ))}
          
          {filteredMembers.length === 0 && (
            <div className="text-center py-8 text-slate-500">
              No members found matching "{search}"
            </div>
          )}
        </div>
      )}
    </div>
  );
}
