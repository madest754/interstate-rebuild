import { useState } from 'react';
import { Search, Plus, Phone, Mail, MapPin, Shield, Users, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Label, Textarea } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogHeader, DialogContent, DialogFooter } from '@/components/ui/dialog';
import { membersStore, type Member } from '@/lib/store';
import { formatPhone } from '@/lib/utils';

export default function MembersPage() {
  const [search, setSearch] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const allMembers = membersStore.getAll();
  const members = search 
    ? membersStore.search(search)
    : allMembers;

  const dispatchers = members.filter(m => m.isDispatcher);
  const coordinators = members.filter(m => m.isCoordinator);
  const regularMembers = members.filter(m => !m.isDispatcher && !m.isCoordinator);

  const handleSaveMember = (data: Partial<Member>) => {
    if (editingMember) {
      membersStore.update(editingMember.id, data);
    } else {
      membersStore.create(data);
    }
    setShowAddDialog(false);
    setEditingMember(null);
    setRefreshKey(k => k + 1);
  };

  const handleDeleteMember = (id: string) => {
    if (confirm('Are you sure you want to remove this member?')) {
      membersStore.delete(id);
      setRefreshKey(k => k + 1);
    }
  };

  const handleEdit = (member: Member) => {
    setEditingMember(member);
    setShowAddDialog(true);
  };

  return (
    <div className="p-4 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Member Directory</h1>
          <p className="text-slate-500">{allMembers.length} members</p>
        </div>
        <Button onClick={() => { setEditingMember(null); setShowAddDialog(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Add Member
        </Button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by unit number, name, or phone..."
          className="pl-10"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card className="p-4 text-center">
          <Shield className="h-6 w-6 mx-auto text-blue-600 mb-2" />
          <div className="text-2xl font-bold">{dispatchers.length}</div>
          <div className="text-sm text-slate-500">Dispatchers</div>
        </Card>
        <Card className="p-4 text-center">
          <Users className="h-6 w-6 mx-auto text-green-600 mb-2" />
          <div className="text-2xl font-bold">{coordinators.length}</div>
          <div className="text-sm text-slate-500">Coordinators</div>
        </Card>
        <Card className="p-4 text-center">
          <Users className="h-6 w-6 mx-auto text-slate-600 mb-2" />
          <div className="text-2xl font-bold">{regularMembers.length}</div>
          <div className="text-sm text-slate-500">Members</div>
        </Card>
      </div>

      {/* Member List */}
      <div className="space-y-3">
        {members.map(member => (
          <Card key={member.id} className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                {/* Unit Number */}
                <div className="bg-blue-100 text-blue-700 font-mono font-bold px-3 py-2 rounded-lg text-lg">
                  {member.unitNumber}
                </div>
                
                {/* Info */}
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-lg">
                      {member.firstName} {member.lastName}
                    </h3>
                    {member.isDispatcher && (
                      <Badge variant="default">Dispatcher</Badge>
                    )}
                    {member.isCoordinator && (
                      <Badge variant="success">Coordinator</Badge>
                    )}
                  </div>
                  
                  <div className="space-y-1 text-sm text-slate-600">
                    {member.cellPhone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-slate-400" />
                        <a href={`tel:${member.cellPhone}`} className="hover:text-blue-600">
                          {formatPhone(member.cellPhone)}
                        </a>
                      </div>
                    )}
                    {member.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-slate-400" />
                        <a href={`mailto:${member.email}`} className="hover:text-blue-600">
                          {member.email}
                        </a>
                      </div>
                    )}
                    {member.city && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-slate-400" />
                        <span>{member.city}, {member.state}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button variant="ghost" size="icon" onClick={() => handleEdit(member)}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleDeleteMember(member.id)}>
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            </div>
          </Card>
        ))}

        {members.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            {search ? 'No members match your search' : 'No members found'}
          </div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <MemberDialog
        open={showAddDialog}
        member={editingMember}
        onClose={() => { setShowAddDialog(false); setEditingMember(null); }}
        onSave={handleSaveMember}
      />
    </div>
  );
}

interface MemberDialogProps {
  open: boolean;
  member: Member | null;
  onClose: () => void;
  onSave: (data: Partial<Member>) => void;
}

function MemberDialog({ open, member, onClose, onSave }: MemberDialogProps) {
  const [unitNumber, setUnitNumber] = useState(member?.unitNumber || '');
  const [firstName, setFirstName] = useState(member?.firstName || '');
  const [lastName, setLastName] = useState(member?.lastName || '');
  const [cellPhone, setCellPhone] = useState(member?.cellPhone || '');
  const [email, setEmail] = useState(member?.email || '');
  const [city, setCity] = useState(member?.city || '');
  const [state, setState] = useState(member?.state || 'NJ');
  const [isDispatcher, setIsDispatcher] = useState(member?.isDispatcher || false);
  const [isCoordinator, setIsCoordinator] = useState(member?.isCoordinator || false);

  // Reset form when member changes
  useState(() => {
    if (member) {
      setUnitNumber(member.unitNumber);
      setFirstName(member.firstName);
      setLastName(member.lastName);
      setCellPhone(member.cellPhone || '');
      setEmail(member.email || '');
      setCity(member.city || '');
      setState(member.state || 'NJ');
      setIsDispatcher(member.isDispatcher);
      setIsCoordinator(member.isCoordinator);
    } else {
      setUnitNumber('');
      setFirstName('');
      setLastName('');
      setCellPhone('');
      setEmail('');
      setCity('');
      setState('NJ');
      setIsDispatcher(false);
      setIsCoordinator(false);
    }
  });

  const handleSubmit = () => {
    onSave({
      unitNumber,
      firstName,
      lastName,
      cellPhone,
      email,
      city,
      state,
      isDispatcher,
      isCoordinator,
    });
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogHeader onClose={onClose}>
        {member ? 'Edit Member' : 'Add Member'}
      </DialogHeader>
      <DialogContent>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Unit Number *</Label>
              <Input
                value={unitNumber}
                onChange={(e) => setUnitNumber(e.target.value)}
                placeholder="101"
              />
            </div>
            <div>
              <Label>Cell Phone</Label>
              <Input
                value={cellPhone}
                onChange={(e) => setCellPhone(e.target.value)}
                placeholder="(732) 555-1234"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>First Name *</Label>
              <Input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="John"
              />
            </div>
            <div>
              <Label>Last Name *</Label>
              <Input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Doe"
              />
            </div>
          </div>

          <div>
            <Label>Email</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="john@example.com"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>City</Label>
              <Input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Lakewood"
              />
            </div>
            <div>
              <Label>State</Label>
              <Input
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="NJ"
                maxLength={2}
              />
            </div>
          </div>

          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isDispatcher}
                onChange={(e) => setIsDispatcher(e.target.checked)}
                className="w-4 h-4 rounded"
              />
              <span>Dispatcher</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isCoordinator}
                onChange={(e) => setIsCoordinator(e.target.checked)}
                className="w-4 h-4 rounded"
              />
              <span>Coordinator</span>
            </label>
          </div>
        </div>
      </DialogContent>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={!unitNumber || !firstName || !lastName}>
          {member ? 'Update' : 'Add Member'}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
