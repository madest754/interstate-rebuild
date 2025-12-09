/**
 * LocalStorage-based Data Store
 * 
 * All data is stored in browser localStorage.
 * Sample data is pre-populated on first load.
 */

// Types
export interface Call {
  id: string;
  callNumber: string;
  nature: string;
  status: 'active' | 'closed' | 'cancelled';
  urgent: boolean;
  callerPhone?: string;
  callerName?: string;
  callbackPhone?: string;
  highwayId?: string;
  direction?: string;
  betweenExit?: string;
  andExit?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  latitude?: number;
  longitude?: number;
  freeTextLocation?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleColor?: string;
  vehicleLicensePlate?: string;
  vehicleState?: string;
  notes?: string;
  dispatcherId?: string;
  closeReason?: string;
  closeNotes?: string;
  createdAt: string;
  updatedAt: string;
  closedAt?: string;
}

export interface Member {
  id: string;
  unitNumber: string;
  firstName: string;
  lastName: string;
  cellPhone?: string;
  homePhone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  isDispatcher: boolean;
  isCoordinator: boolean;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Assignment {
  id: string;
  callId: string;
  memberId: string;
  role: string;
  status: string;
  notes?: string;
  assignedAt: string;
}

export interface Highway {
  id: string;
  name: string;
  shortName: string;
  active: boolean;
  sortOrder: number;
}

export interface HighwayExit {
  id: string;
  highwayId: string;
  exitNumber: string;
  name: string;
  active: boolean;
  sortOrder: number;
}

export interface CarMake {
  id: string;
  name: string;
  active: boolean;
  sortOrder: number;
}

export interface CarModel {
  id: string;
  makeId: string;
  name: string;
  active: boolean;
}

export interface Agency {
  id: string;
  name: string;
  phone?: string;
  type: string;
  active: boolean;
  sortOrder: number;
}

export interface ProblemCode {
  id: string;
  code: string;
  description: string;
  active: boolean;
  sortOrder: number;
}

export interface InternalNote {
  id: string;
  callId: string;
  note: string;
  userId: string;
  createdAt: string;
}

export interface Schedule {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  memberId: string;
  role: string;
  active: boolean;
}

// Storage keys
const KEYS = {
  calls: 'chaveirim_calls',
  members: 'chaveirim_members',
  assignments: 'chaveirim_assignments',
  highways: 'chaveirim_highways',
  exits: 'chaveirim_exits',
  carMakes: 'chaveirim_carMakes',
  carModels: 'chaveirim_carModels',
  agencies: 'chaveirim_agencies',
  problemCodes: 'chaveirim_problemCodes',
  notes: 'chaveirim_notes',
  schedules: 'chaveirim_schedules',
  initialized: 'chaveirim_initialized',
};

// Helper functions
function get<T>(key: string): T[] {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function set<T>(key: string, data: T[]): void {
  localStorage.setItem(key, JSON.stringify(data));
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Initialize with sample data
function initializeData(): void {
  if (localStorage.getItem(KEYS.initialized)) return;

  // Sample highways
  const highways: Highway[] = [
    { id: '1', name: 'Garden State Parkway', shortName: 'GSP', active: true, sortOrder: 1 },
    { id: '2', name: 'NJ Turnpike', shortName: 'NJTP', active: true, sortOrder: 2 },
    { id: '3', name: 'Route 9', shortName: 'RT9', active: true, sortOrder: 3 },
    { id: '4', name: 'Route 70', shortName: 'RT70', active: true, sortOrder: 4 },
    { id: '5', name: 'Route 195', shortName: 'RT195', active: true, sortOrder: 5 },
    { id: '6', name: 'I-95', shortName: 'I95', active: true, sortOrder: 6 },
    { id: '7', name: 'I-295', shortName: 'I295', active: true, sortOrder: 7 },
    { id: '8', name: 'Route 18', shortName: 'RT18', active: true, sortOrder: 8 },
  ];
  set(KEYS.highways, highways);

  // Sample exits
  const exits: HighwayExit[] = [
    { id: '1', highwayId: '1', exitNumber: '88', name: 'Lakewood', active: true, sortOrder: 1 },
    { id: '2', highwayId: '1', exitNumber: '89', name: 'Lakewood/Brick', active: true, sortOrder: 2 },
    { id: '3', highwayId: '1', exitNumber: '90', name: 'Brick', active: true, sortOrder: 3 },
    { id: '4', highwayId: '1', exitNumber: '91', name: 'Brick/Howell', active: true, sortOrder: 4 },
    { id: '5', highwayId: '1', exitNumber: '98', name: 'I-195', active: true, sortOrder: 5 },
    { id: '6', highwayId: '1', exitNumber: '100', name: 'Route 33', active: true, sortOrder: 6 },
    { id: '7', highwayId: '2', exitNumber: '7A', name: 'I-195', active: true, sortOrder: 1 },
    { id: '8', highwayId: '2', exitNumber: '8', name: 'Hightstown', active: true, sortOrder: 2 },
    { id: '9', highwayId: '2', exitNumber: '8A', name: 'Jamesburg', active: true, sortOrder: 3 },
  ];
  set(KEYS.exits, exits);

  // Sample car makes
  const carMakes: CarMake[] = [
    { id: '1', name: 'Toyota', active: true, sortOrder: 1 },
    { id: '2', name: 'Honda', active: true, sortOrder: 2 },
    { id: '3', name: 'Ford', active: true, sortOrder: 3 },
    { id: '4', name: 'Chevrolet', active: true, sortOrder: 4 },
    { id: '5', name: 'Nissan', active: true, sortOrder: 5 },
    { id: '6', name: 'Hyundai', active: true, sortOrder: 6 },
    { id: '7', name: 'Kia', active: true, sortOrder: 7 },
    { id: '8', name: 'BMW', active: true, sortOrder: 8 },
    { id: '9', name: 'Mercedes', active: true, sortOrder: 9 },
    { id: '10', name: 'Lexus', active: true, sortOrder: 10 },
    { id: '11', name: 'Subaru', active: true, sortOrder: 11 },
    { id: '12', name: 'Mazda', active: true, sortOrder: 12 },
  ];
  set(KEYS.carMakes, carMakes);

  // Sample car models
  const carModels: CarModel[] = [
    { id: '1', makeId: '1', name: 'Camry', active: true },
    { id: '2', makeId: '1', name: 'Corolla', active: true },
    { id: '3', makeId: '1', name: 'RAV4', active: true },
    { id: '4', makeId: '1', name: 'Highlander', active: true },
    { id: '5', makeId: '1', name: 'Sienna', active: true },
    { id: '6', makeId: '2', name: 'Accord', active: true },
    { id: '7', makeId: '2', name: 'Civic', active: true },
    { id: '8', makeId: '2', name: 'CR-V', active: true },
    { id: '9', makeId: '2', name: 'Pilot', active: true },
    { id: '10', makeId: '2', name: 'Odyssey', active: true },
    { id: '11', makeId: '3', name: 'F-150', active: true },
    { id: '12', makeId: '3', name: 'Explorer', active: true },
    { id: '13', makeId: '3', name: 'Escape', active: true },
    { id: '14', makeId: '4', name: 'Silverado', active: true },
    { id: '15', makeId: '4', name: 'Equinox', active: true },
    { id: '16', makeId: '4', name: 'Tahoe', active: true },
    { id: '17', makeId: '5', name: 'Altima', active: true },
    { id: '18', makeId: '5', name: 'Rogue', active: true },
    { id: '19', makeId: '5', name: 'Maxima', active: true },
  ];
  set(KEYS.carModels, carModels);

  // Sample agencies
  const agencies: Agency[] = [
    { id: '1', name: 'Lakewood Police', phone: '732-363-0200', type: 'police', active: true, sortOrder: 1 },
    { id: '2', name: 'Ocean County Sheriff', phone: '732-929-2027', type: 'police', active: true, sortOrder: 2 },
    { id: '3', name: 'NJ State Police', phone: '609-882-2000', type: 'police', active: true, sortOrder: 3 },
    { id: '4', name: 'Lakewood First Aid', phone: '732-363-1313', type: 'ems', active: true, sortOrder: 4 },
    { id: '5', name: 'Hatzolah', phone: '732-363-1400', type: 'ems', active: true, sortOrder: 5 },
    { id: '6', name: 'Lakewood Fire', phone: '732-363-0811', type: 'fire', active: true, sortOrder: 6 },
  ];
  set(KEYS.agencies, agencies);

  // Sample problem codes
  const problemCodes: ProblemCode[] = [
    { id: '1', code: 'FLAT', description: 'Flat Tire', active: true, sortOrder: 1 },
    { id: '2', code: 'JUMP', description: 'Jump Start / Dead Battery', active: true, sortOrder: 2 },
    { id: '3', code: 'LOCK', description: 'Locked Out', active: true, sortOrder: 3 },
    { id: '4', code: 'GAS', description: 'Out of Gas', active: true, sortOrder: 4 },
    { id: '5', code: 'TOW', description: 'Needs Tow', active: true, sortOrder: 5 },
    { id: '6', code: 'MECH', description: 'Mechanical Issue', active: true, sortOrder: 6 },
    { id: '7', code: 'ACC', description: 'Accident', active: true, sortOrder: 7 },
    { id: '8', code: 'OTHER', description: 'Other', active: true, sortOrder: 8 },
  ];
  set(KEYS.problemCodes, problemCodes);

  // Sample members
  const members: Member[] = [
    { id: '1', unitNumber: '101', firstName: 'Moshe', lastName: 'Cohen', cellPhone: '732-555-0101', isDispatcher: true, isCoordinator: true, active: true, city: 'Lakewood', state: 'NJ', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: '2', unitNumber: '102', firstName: 'Yosef', lastName: 'Levy', cellPhone: '732-555-0102', isDispatcher: true, isCoordinator: false, active: true, city: 'Lakewood', state: 'NJ', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: '3', unitNumber: '103', firstName: 'David', lastName: 'Goldstein', cellPhone: '732-555-0103', isDispatcher: false, isCoordinator: false, active: true, city: 'Lakewood', state: 'NJ', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: '4', unitNumber: '104', firstName: 'Shmuel', lastName: 'Friedman', cellPhone: '732-555-0104', isDispatcher: false, isCoordinator: false, active: true, city: 'Lakewood', state: 'NJ', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: '5', unitNumber: '105', firstName: 'Yaakov', lastName: 'Schwartz', cellPhone: '732-555-0105', isDispatcher: false, isCoordinator: false, active: true, city: 'Lakewood', state: 'NJ', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: '6', unitNumber: '106', firstName: 'Avi', lastName: 'Klein', cellPhone: '732-555-0106', isDispatcher: false, isCoordinator: true, active: true, city: 'Lakewood', state: 'NJ', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: '7', unitNumber: '107', firstName: 'Eli', lastName: 'Weiss', cellPhone: '732-555-0107', isDispatcher: false, isCoordinator: false, active: true, city: 'Toms River', state: 'NJ', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: '8', unitNumber: '108', firstName: 'Chaim', lastName: 'Rosen', cellPhone: '732-555-0108', isDispatcher: false, isCoordinator: false, active: true, city: 'Jackson', state: 'NJ', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: '9', unitNumber: '109', firstName: 'Menachem', lastName: 'Stern', cellPhone: '732-555-0109', isDispatcher: true, isCoordinator: false, active: true, city: 'Lakewood', state: 'NJ', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: '10', unitNumber: '110', firstName: 'Dovid', lastName: 'Katz', cellPhone: '732-555-0110', isDispatcher: false, isCoordinator: false, active: true, city: 'Howell', state: 'NJ', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  ];
  set(KEYS.members, members);

  // Sample active calls
  const now = new Date();
  const calls: Call[] = [
    {
      id: '1',
      callNumber: 'C1001',
      nature: 'Flat Tire',
      status: 'active',
      urgent: false,
      callerPhone: '732-555-1234',
      callerName: 'John Smith',
      highwayId: '1',
      direction: 'North',
      betweenExit: '88',
      andExit: '89',
      vehicleMake: 'Toyota',
      vehicleModel: 'Camry',
      vehicleColor: 'Silver',
      vehicleLicensePlate: 'ABC123',
      vehicleState: 'NJ',
      notes: 'Right rear tire, has spare',
      createdAt: new Date(now.getTime() - 30 * 60000).toISOString(),
      updatedAt: new Date(now.getTime() - 30 * 60000).toISOString(),
    },
    {
      id: '2',
      callNumber: 'C1002',
      nature: 'Jump Start',
      status: 'active',
      urgent: true,
      callerPhone: '732-555-5678',
      callerName: 'Sarah Johnson',
      address: '123 Main Street',
      city: 'Lakewood',
      state: 'NJ',
      zip: '08701',
      vehicleMake: 'Honda',
      vehicleModel: 'Accord',
      vehicleColor: 'Black',
      notes: 'Car wont start, baby in car',
      createdAt: new Date(now.getTime() - 15 * 60000).toISOString(),
      updatedAt: new Date(now.getTime() - 15 * 60000).toISOString(),
    },
    {
      id: '3',
      callNumber: 'C1003',
      nature: 'Locked Out',
      status: 'active',
      urgent: false,
      callerPhone: '732-555-9999',
      callerName: 'Mike Brown',
      address: '456 Oak Ave',
      city: 'Toms River',
      state: 'NJ',
      vehicleMake: 'Ford',
      vehicleModel: 'Explorer',
      vehicleColor: 'Blue',
      createdAt: new Date(now.getTime() - 45 * 60000).toISOString(),
      updatedAt: new Date(now.getTime() - 45 * 60000).toISOString(),
    },
  ];
  set(KEYS.calls, calls);

  // Sample assignments
  const assignments: Assignment[] = [
    { id: '1', callId: '1', memberId: '3', role: 'responder', status: 'assigned', assignedAt: new Date().toISOString() },
    { id: '2', callId: '2', memberId: '4', role: 'responder', status: 'assigned', assignedAt: new Date().toISOString() },
    { id: '3', callId: '2', memberId: '5', role: 'responder', status: 'assigned', assignedAt: new Date().toISOString() },
  ];
  set(KEYS.assignments, assignments);

  // Mark as initialized
  localStorage.setItem(KEYS.initialized, 'true');
}

// Initialize on load
initializeData();

// ==================== CALLS ====================
export const callsStore = {
  getAll: (): Call[] => get<Call>(KEYS.calls),
  
  getActive: (): Call[] => get<Call>(KEYS.calls).filter(c => c.status === 'active'),
  
  getById: (id: string): Call | undefined => get<Call>(KEYS.calls).find(c => c.id === id),
  
  create: (data: Partial<Call>): Call => {
    const calls = get<Call>(KEYS.calls);
    const newCall: Call = {
      id: generateId(),
      callNumber: `C${Date.now().toString().slice(-6)}`,
      nature: data.nature || 'Unknown',
      status: 'active',
      urgent: data.urgent || false,
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as Call;
    calls.unshift(newCall);
    set(KEYS.calls, calls);
    return newCall;
  },
  
  update: (id: string, data: Partial<Call>): Call | null => {
    const calls = get<Call>(KEYS.calls);
    const index = calls.findIndex(c => c.id === id);
    if (index === -1) return null;
    calls[index] = { ...calls[index], ...data, updatedAt: new Date().toISOString() };
    set(KEYS.calls, calls);
    return calls[index];
  },
  
  close: (id: string, reason: string, notes?: string): Call | null => {
    return callsStore.update(id, {
      status: 'closed',
      closeReason: reason,
      closeNotes: notes,
      closedAt: new Date().toISOString(),
    });
  },
  
  delete: (id: string): boolean => {
    const calls = get<Call>(KEYS.calls);
    const filtered = calls.filter(c => c.id !== id);
    if (filtered.length === calls.length) return false;
    set(KEYS.calls, filtered);
    return true;
  },
};

// ==================== MEMBERS ====================
export const membersStore = {
  getAll: (): Member[] => get<Member>(KEYS.members).filter(m => m.active),
  
  getById: (id: string): Member | undefined => get<Member>(KEYS.members).find(m => m.id === id),
  
  getDispatchers: (): Member[] => get<Member>(KEYS.members).filter(m => m.active && m.isDispatcher),
  
  search: (query: string): Member[] => {
    const q = query.toLowerCase();
    return get<Member>(KEYS.members).filter(m => 
      m.active && (
        m.unitNumber.toLowerCase().includes(q) ||
        m.firstName.toLowerCase().includes(q) ||
        m.lastName.toLowerCase().includes(q) ||
        (m.cellPhone && m.cellPhone.includes(q))
      )
    );
  },
  
  create: (data: Partial<Member>): Member => {
    const members = get<Member>(KEYS.members);
    const newMember: Member = {
      id: generateId(),
      unitNumber: data.unitNumber || '',
      firstName: data.firstName || '',
      lastName: data.lastName || '',
      isDispatcher: data.isDispatcher || false,
      isCoordinator: data.isCoordinator || false,
      active: true,
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as Member;
    members.push(newMember);
    set(KEYS.members, members);
    return newMember;
  },
  
  update: (id: string, data: Partial<Member>): Member | null => {
    const members = get<Member>(KEYS.members);
    const index = members.findIndex(m => m.id === id);
    if (index === -1) return null;
    members[index] = { ...members[index], ...data, updatedAt: new Date().toISOString() };
    set(KEYS.members, members);
    return members[index];
  },
  
  delete: (id: string): boolean => {
    return membersStore.update(id, { active: false }) !== null;
  },
};

// ==================== ASSIGNMENTS ====================
export const assignmentsStore = {
  getByCallId: (callId: string): (Assignment & { member?: Member })[] => {
    const assignments = get<Assignment>(KEYS.assignments).filter(a => a.callId === callId);
    return assignments.map(a => ({
      ...a,
      member: membersStore.getById(a.memberId),
    }));
  },
  
  create: (data: { callId: string; memberId: string; role?: string; notes?: string }): Assignment => {
    const assignments = get<Assignment>(KEYS.assignments);
    const newAssignment: Assignment = {
      id: generateId(),
      callId: data.callId,
      memberId: data.memberId,
      role: data.role || 'responder',
      status: 'assigned',
      notes: data.notes,
      assignedAt: new Date().toISOString(),
    };
    assignments.push(newAssignment);
    set(KEYS.assignments, assignments);
    return newAssignment;
  },
  
  delete: (id: string): boolean => {
    const assignments = get<Assignment>(KEYS.assignments);
    const filtered = assignments.filter(a => a.id !== id);
    if (filtered.length === assignments.length) return false;
    set(KEYS.assignments, filtered);
    return true;
  },
};

// ==================== REFERENCE DATA ====================
export const highwaysStore = {
  getAll: (): Highway[] => get<Highway>(KEYS.highways).filter(h => h.active).sort((a, b) => a.sortOrder - b.sortOrder),
  getExits: (highwayId: string): HighwayExit[] => get<HighwayExit>(KEYS.exits).filter(e => e.highwayId === highwayId && e.active).sort((a, b) => a.sortOrder - b.sortOrder),
};

export const carMakesStore = {
  getAll: (): CarMake[] => get<CarMake>(KEYS.carMakes).filter(m => m.active).sort((a, b) => a.sortOrder - b.sortOrder),
  getModels: (makeId: string): CarModel[] => get<CarModel>(KEYS.carModels).filter(m => m.makeId === makeId && m.active),
};

export const agenciesStore = {
  getAll: (): Agency[] => get<Agency>(KEYS.agencies).filter(a => a.active).sort((a, b) => a.sortOrder - b.sortOrder),
};

export const problemCodesStore = {
  getAll: (): ProblemCode[] => get<ProblemCode>(KEYS.problemCodes).filter(p => p.active).sort((a, b) => a.sortOrder - b.sortOrder),
};

// ==================== INTERNAL NOTES ====================
export const notesStore = {
  getByCallId: (callId: string): InternalNote[] => 
    get<InternalNote>(KEYS.notes)
      .filter(n => n.callId === callId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
  
  create: (callId: string, note: string): InternalNote => {
    const notes = get<InternalNote>(KEYS.notes);
    const newNote: InternalNote = {
      id: generateId(),
      callId,
      note,
      userId: 'dispatcher',
      createdAt: new Date().toISOString(),
    };
    notes.push(newNote);
    set(KEYS.notes, notes);
    return newNote;
  },
};

// ==================== SCHEDULES ====================
export const schedulesStore = {
  getAll: (): (Schedule & { member?: Member })[] => {
    const schedules = get<Schedule>(KEYS.schedules).filter(s => s.active);
    return schedules.map(s => ({
      ...s,
      member: membersStore.getById(s.memberId),
    }));
  },
};

// ==================== RESET ====================
export function resetAllData(): void {
  Object.values(KEYS).forEach(key => localStorage.removeItem(key));
  initializeData();
}
