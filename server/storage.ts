/**
 * Storage Layer
 * 
 * Database access layer for all CRUD operations.
 * Provides a clean interface between routes and database.
 */

import { db, withDatabaseRetry } from '../shared/db';
import { eq, desc, asc, and, or, gte, lte, like, sql, isNull, not } from 'drizzle-orm';
import * as schema from '../shared/schema';
import type {
  User, NewUser,
  Member, NewMember,
  Call, NewCall,
  CallAssignment, NewCallAssignment,
  CallLog, NewCallLog,
  Draft, NewDraft,
  Schedule, NewSchedule,
  ShiftOverride, NewShiftOverride,
  QueueSession, NewQueueSession,
  Highway, NewHighway,
  HighwayExit, NewHighwayExit,
  CarMake, NewCarMake,
  CarModel, NewCarModel,
  Agency, NewAgency,
  ProblemCode, NewProblemCode,
  PhoneCategory, NewPhoneCategory,
  ImportantPhone, NewImportantPhone,
  Setting, NewSetting,
  AppVersion, NewAppVersion,
  Feedback, NewFeedback,
  WebhookLog, NewWebhookLog,
} from '../shared/schema';

// ============================================================================
// USERS
// ============================================================================

export const userStorage = {
  async findById(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(schema.users).where(eq(schema.users.id, id)).limit(1);
    return user;
  },

  async findByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(schema.users).where(eq(schema.users.email, email.toLowerCase())).limit(1);
    return user;
  },

  async create(data: NewUser): Promise<User> {
    const [user] = await db.insert(schema.users).values({ ...data, email: data.email.toLowerCase() }).returning();
    return user;
  },

  async update(id: string, data: Partial<NewUser>): Promise<User> {
    const [user] = await db.update(schema.users).set({ ...data, updatedAt: new Date() }).where(eq(schema.users.id, id)).returning();
    return user;
  },

  async delete(id: string): Promise<void> {
    await db.update(schema.users).set({ isActive: false }).where(eq(schema.users.id, id));
  },

  async findByResetToken(token: string): Promise<User | undefined> {
    const [user] = await db.select().from(schema.users)
      .where(and(
        eq(schema.users.passwordResetToken, token),
        gte(schema.users.passwordResetExpires, new Date())
      ))
      .limit(1);
    return user;
  },
};

// ============================================================================
// MEMBERS
// ============================================================================

export const memberStorage = {
  async findAll(includeInactive = false): Promise<Member[]> {
    if (includeInactive) {
      return db.select().from(schema.members).orderBy(asc(schema.members.unitNumber));
    }
    return db.select().from(schema.members).where(eq(schema.members.isActive, true)).orderBy(asc(schema.members.unitNumber));
  },

  async findById(id: string): Promise<Member | undefined> {
    const [member] = await db.select().from(schema.members).where(eq(schema.members.id, id)).limit(1);
    return member;
  },

  async findByUnitNumber(unitNumber: string): Promise<Member | undefined> {
    const [member] = await db.select().from(schema.members).where(eq(schema.members.unitNumber, unitNumber)).limit(1);
    return member;
  },

  async findDispatchers(): Promise<Member[]> {
    return db.select().from(schema.members)
      .where(and(eq(schema.members.isDispatcher, true), eq(schema.members.isActive, true)))
      .orderBy(asc(schema.members.unitNumber));
  },

  async findCoordinators(): Promise<Member[]> {
    return db.select().from(schema.members)
      .where(and(eq(schema.members.isCoordinator, true), eq(schema.members.isActive, true)))
      .orderBy(asc(schema.members.unitNumber));
  },

  async search(query: string): Promise<Member[]> {
    const searchPattern = `%${query}%`;
    return db.select().from(schema.members)
      .where(and(
        eq(schema.members.isActive, true),
        or(
          like(schema.members.firstName, searchPattern),
          like(schema.members.lastName, searchPattern),
          like(schema.members.unitNumber, searchPattern),
          like(schema.members.phone, searchPattern)
        )
      ))
      .orderBy(asc(schema.members.unitNumber))
      .limit(50);
  },

  async create(data: NewMember): Promise<Member> {
    const [member] = await db.insert(schema.members).values(data).returning();
    return member;
  },

  async update(id: string, data: Partial<NewMember>): Promise<Member> {
    const [member] = await db.update(schema.members).set({ ...data, updatedAt: new Date() }).where(eq(schema.members.id, id)).returning();
    return member;
  },

  async delete(id: string): Promise<void> {
    await db.update(schema.members).set({ isActive: false }).where(eq(schema.members.id, id));
  },
};

// ============================================================================
// CALLS
// ============================================================================

export const callStorage = {
  async findAll(status?: string): Promise<Call[]> {
    let query = db.select().from(schema.calls).where(eq(schema.calls.isDeleted, false));
    
    if (status) {
      return db.select().from(schema.calls)
        .where(and(eq(schema.calls.status, status), eq(schema.calls.isDeleted, false)))
        .orderBy(desc(schema.calls.createdAt));
    }
    
    return db.select().from(schema.calls)
      .where(eq(schema.calls.isDeleted, false))
      .orderBy(desc(schema.calls.createdAt));
  },

  async findActive(): Promise<Call[]> {
    return db.select().from(schema.calls)
      .where(and(eq(schema.calls.status, 'active'), eq(schema.calls.isDeleted, false)))
      .orderBy(desc(schema.calls.createdAt));
  },

  async findById(id: string): Promise<Call | undefined> {
    const [call] = await db.select().from(schema.calls).where(eq(schema.calls.id, id)).limit(1);
    return call;
  },

  async findByCallNumber(callNumber: number): Promise<Call | undefined> {
    const [call] = await db.select().from(schema.calls).where(eq(schema.calls.callNumber, callNumber)).limit(1);
    return call;
  },

  async findRecentCompleted(minutes: number = 15): Promise<Call[]> {
    const cutoff = new Date(Date.now() - minutes * 60 * 1000);
    return db.select().from(schema.calls)
      .where(and(
        eq(schema.calls.status, 'closed'),
        gte(schema.calls.closedAt, cutoff),
        eq(schema.calls.isDeleted, false)
      ))
      .orderBy(desc(schema.calls.closedAt));
  },

  async findDeleted(): Promise<Call[]> {
    return db.select().from(schema.calls)
      .where(eq(schema.calls.isDeleted, true))
      .orderBy(desc(schema.calls.createdAt));
  },

  async getNextCallNumber(): Promise<number> {
    // Get the max call number for current month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const result = await db.select({ max: sql<number>`MAX(${schema.calls.callNumber})` })
      .from(schema.calls)
      .where(gte(schema.calls.createdAt, startOfMonth));
    
    return (result[0]?.max || 0) + 1;
  },

  async create(data: NewCall): Promise<Call> {
    const callNumber = await this.getNextCallNumber();
    const [call] = await db.insert(schema.calls).values({ ...data, callNumber }).returning();
    return call;
  },

  async update(id: string, data: Partial<NewCall>): Promise<Call> {
    const [call] = await db.update(schema.calls).set({ ...data, updatedAt: new Date() }).where(eq(schema.calls.id, id)).returning();
    return call;
  },

  async close(id: string, closedBy: string): Promise<Call> {
    const [call] = await db.update(schema.calls)
      .set({ status: 'closed', closedAt: new Date(), closedBy, updatedAt: new Date() })
      .where(eq(schema.calls.id, id))
      .returning();
    return call;
  },

  async reopen(id: string): Promise<Call> {
    const [call] = await db.update(schema.calls)
      .set({ status: 'active', closedAt: null, closedBy: null, updatedAt: new Date() })
      .where(eq(schema.calls.id, id))
      .returning();
    return call;
  },

  async softDelete(id: string): Promise<void> {
    await db.update(schema.calls).set({ isDeleted: true }).where(eq(schema.calls.id, id));
  },
};

// ============================================================================
// CALL ASSIGNMENTS
// ============================================================================

export const assignmentStorage = {
  async findByCall(callId: string): Promise<CallAssignment[]> {
    return db.select().from(schema.callAssignments)
      .where(eq(schema.callAssignments.callId, callId))
      .orderBy(asc(schema.callAssignments.assignedAt));
  },

  async findByMember(memberId: string): Promise<CallAssignment[]> {
    return db.select().from(schema.callAssignments)
      .where(eq(schema.callAssignments.memberId, memberId))
      .orderBy(desc(schema.callAssignments.assignedAt));
  },

  async create(data: NewCallAssignment): Promise<CallAssignment> {
    const [assignment] = await db.insert(schema.callAssignments).values(data).returning();
    return assignment;
  },

  async update(id: string, data: Partial<NewCallAssignment>): Promise<CallAssignment> {
    const [assignment] = await db.update(schema.callAssignments).set(data).where(eq(schema.callAssignments.id, id)).returning();
    return assignment;
  },

  async delete(id: string): Promise<void> {
    await db.delete(schema.callAssignments).where(eq(schema.callAssignments.id, id));
  },
};

// ============================================================================
// CALL LOGS
// ============================================================================

export const callLogStorage = {
  async findByCall(callId: string): Promise<CallLog[]> {
    return db.select().from(schema.callLogs)
      .where(eq(schema.callLogs.callId, callId))
      .orderBy(desc(schema.callLogs.createdAt));
  },

  async findRecent(minutes: number = 60): Promise<CallLog[]> {
    const cutoff = new Date(Date.now() - minutes * 60 * 1000);
    return db.select().from(schema.callLogs)
      .where(gte(schema.callLogs.createdAt, cutoff))
      .orderBy(desc(schema.callLogs.createdAt));
  },

  async create(data: NewCallLog): Promise<CallLog> {
    const [log] = await db.insert(schema.callLogs).values(data).returning();
    return log;
  },
};

// ============================================================================
// DRAFTS
// ============================================================================

export const draftStorage = {
  async findByUser(userId: string): Promise<Draft[]> {
    return db.select().from(schema.drafts)
      .where(eq(schema.drafts.userId, userId))
      .orderBy(desc(schema.drafts.updatedAt));
  },

  async findAll(): Promise<Draft[]> {
    return db.select().from(schema.drafts).orderBy(desc(schema.drafts.updatedAt));
  },

  async findById(id: string): Promise<Draft | undefined> {
    const [draft] = await db.select().from(schema.drafts).where(eq(schema.drafts.id, id)).limit(1);
    return draft;
  },

  async create(data: NewDraft): Promise<Draft> {
    const [draft] = await db.insert(schema.drafts).values(data).returning();
    return draft;
  },

  async update(id: string, data: Partial<NewDraft>): Promise<Draft> {
    const [draft] = await db.update(schema.drafts).set({ ...data, updatedAt: new Date() }).where(eq(schema.drafts.id, id)).returning();
    return draft;
  },

  async delete(id: string): Promise<void> {
    await db.delete(schema.drafts).where(eq(schema.drafts.id, id));
  },
};

// ============================================================================
// SCHEDULES
// ============================================================================

export const scheduleStorage = {
  async findAll(): Promise<Schedule[]> {
    return db.select().from(schema.schedules)
      .where(eq(schema.schedules.isActive, true))
      .orderBy(asc(schema.schedules.dayOfWeek), asc(schema.schedules.startTime));
  },

  async findByDay(dayOfWeek: number): Promise<Schedule[]> {
    return db.select().from(schema.schedules)
      .where(and(eq(schema.schedules.dayOfWeek, dayOfWeek), eq(schema.schedules.isActive, true)))
      .orderBy(asc(schema.schedules.startTime));
  },

  async findByMember(memberId: string): Promise<Schedule[]> {
    return db.select().from(schema.schedules)
      .where(and(eq(schema.schedules.memberId, memberId), eq(schema.schedules.isActive, true)))
      .orderBy(asc(schema.schedules.dayOfWeek));
  },

  async findById(id: string): Promise<Schedule | undefined> {
    const [schedule] = await db.select().from(schema.schedules).where(eq(schema.schedules.id, id)).limit(1);
    return schedule;
  },

  async create(data: NewSchedule): Promise<Schedule> {
    const [schedule] = await db.insert(schema.schedules).values(data).returning();
    return schedule;
  },

  async update(id: string, data: Partial<NewSchedule>): Promise<Schedule> {
    const [schedule] = await db.update(schema.schedules).set({ ...data, updatedAt: new Date() }).where(eq(schema.schedules.id, id)).returning();
    return schedule;
  },

  async delete(id: string): Promise<void> {
    await db.update(schema.schedules).set({ isActive: false }).where(eq(schema.schedules.id, id));
  },
};

// ============================================================================
// SHIFT OVERRIDES
// ============================================================================

export const shiftOverrideStorage = {
  async findAll(): Promise<ShiftOverride[]> {
    return db.select().from(schema.shiftOverrides).orderBy(desc(schema.shiftOverrides.date));
  },

  async findByDate(date: string): Promise<ShiftOverride[]> {
    return db.select().from(schema.shiftOverrides).where(eq(schema.shiftOverrides.date, date));
  },

  async findByMember(memberId: string): Promise<ShiftOverride[]> {
    return db.select().from(schema.shiftOverrides)
      .where(or(
        eq(schema.shiftOverrides.originalMemberId, memberId),
        eq(schema.shiftOverrides.replacementMemberId, memberId)
      ))
      .orderBy(desc(schema.shiftOverrides.date));
  },

  async create(data: NewShiftOverride): Promise<ShiftOverride> {
    const [override] = await db.insert(schema.shiftOverrides).values(data).returning();
    return override;
  },

  async delete(id: string): Promise<void> {
    await db.delete(schema.shiftOverrides).where(eq(schema.shiftOverrides.id, id));
  },
};

// ============================================================================
// QUEUE SESSIONS
// ============================================================================

export const queueSessionStorage = {
  async findActive(): Promise<QueueSession[]> {
    return db.select().from(schema.queueSessions)
      .where(eq(schema.queueSessions.isActive, true))
      .orderBy(asc(schema.queueSessions.loginTime));
  },

  async findByQueue(queue: string): Promise<QueueSession[]> {
    return db.select().from(schema.queueSessions)
      .where(and(eq(schema.queueSessions.queue, queue), eq(schema.queueSessions.isActive, true)));
  },

  async findByMember(memberId: string): Promise<QueueSession[]> {
    return db.select().from(schema.queueSessions)
      .where(eq(schema.queueSessions.memberId, memberId))
      .orderBy(desc(schema.queueSessions.loginTime));
  },

  async findActiveMemberSession(memberId: string, queue: string): Promise<QueueSession | undefined> {
    const [session] = await db.select().from(schema.queueSessions)
      .where(and(
        eq(schema.queueSessions.memberId, memberId),
        eq(schema.queueSessions.queue, queue),
        eq(schema.queueSessions.isActive, true)
      ))
      .limit(1);
    return session;
  },

  async create(data: NewQueueSession): Promise<QueueSession> {
    const [session] = await db.insert(schema.queueSessions).values(data).returning();
    return session;
  },

  async logout(id: string): Promise<QueueSession> {
    const [session] = await db.update(schema.queueSessions)
      .set({ isActive: false, logoutTime: new Date() })
      .where(eq(schema.queueSessions.id, id))
      .returning();
    return session;
  },

  async logoutAll(): Promise<void> {
    await db.update(schema.queueSessions)
      .set({ isActive: false, logoutTime: new Date() })
      .where(eq(schema.queueSessions.isActive, true));
  },

  async logoutMember(memberId: string, queue?: string): Promise<void> {
    if (queue) {
      await db.update(schema.queueSessions)
        .set({ isActive: false, logoutTime: new Date() })
        .where(and(
          eq(schema.queueSessions.memberId, memberId),
          eq(schema.queueSessions.queue, queue),
          eq(schema.queueSessions.isActive, true)
        ));
    } else {
      await db.update(schema.queueSessions)
        .set({ isActive: false, logoutTime: new Date() })
        .where(and(
          eq(schema.queueSessions.memberId, memberId),
          eq(schema.queueSessions.isActive, true)
        ));
    }
  },
};

// ============================================================================
// HIGHWAYS
// ============================================================================

export const highwayStorage = {
  async findAll(): Promise<Highway[]> {
    return db.select().from(schema.highways)
      .where(eq(schema.highways.isActive, true))
      .orderBy(asc(schema.highways.displayOrder));
  },

  async findById(id: string): Promise<Highway | undefined> {
    const [highway] = await db.select().from(schema.highways).where(eq(schema.highways.id, id)).limit(1);
    return highway;
  },

  async create(data: NewHighway): Promise<Highway> {
    const [highway] = await db.insert(schema.highways).values(data).returning();
    return highway;
  },

  async update(id: string, data: Partial<NewHighway>): Promise<Highway> {
    const [highway] = await db.update(schema.highways).set({ ...data, updatedAt: new Date() }).where(eq(schema.highways.id, id)).returning();
    return highway;
  },

  async delete(id: string): Promise<void> {
    await db.update(schema.highways).set({ isActive: false }).where(eq(schema.highways.id, id));
  },

  async reorder(orderedIds: string[]): Promise<void> {
    for (let i = 0; i < orderedIds.length; i++) {
      await db.update(schema.highways)
        .set({ displayOrder: i })
        .where(eq(schema.highways.id, orderedIds[i]));
    }
  },
};

// ============================================================================
// HIGHWAY EXITS
// ============================================================================

export const highwayExitStorage = {
  async findByHighway(highwayId: string): Promise<HighwayExit[]> {
    return db.select().from(schema.highwayExits)
      .where(eq(schema.highwayExits.highwayId, highwayId))
      .orderBy(asc(schema.highwayExits.exitNumber));
  },

  async findById(id: string): Promise<HighwayExit | undefined> {
    const [exit] = await db.select().from(schema.highwayExits).where(eq(schema.highwayExits.id, id)).limit(1);
    return exit;
  },

  async create(data: NewHighwayExit): Promise<HighwayExit> {
    const [exit] = await db.insert(schema.highwayExits).values(data).returning();
    return exit;
  },

  async createMany(data: NewHighwayExit[]): Promise<HighwayExit[]> {
    return db.insert(schema.highwayExits).values(data).returning();
  },

  async update(id: string, data: Partial<NewHighwayExit>): Promise<HighwayExit> {
    const [exit] = await db.update(schema.highwayExits).set(data).where(eq(schema.highwayExits.id, id)).returning();
    return exit;
  },

  async delete(id: string): Promise<void> {
    await db.delete(schema.highwayExits).where(eq(schema.highwayExits.id, id));
  },

  async deleteByHighway(highwayId: string): Promise<void> {
    await db.delete(schema.highwayExits).where(eq(schema.highwayExits.highwayId, highwayId));
  },
};

// ============================================================================
// CAR MAKES
// ============================================================================

export const carMakeStorage = {
  async findAll(): Promise<CarMake[]> {
    return db.select().from(schema.carMakes)
      .where(eq(schema.carMakes.isActive, true))
      .orderBy(asc(schema.carMakes.displayOrder), asc(schema.carMakes.name));
  },

  async findById(id: string): Promise<CarMake | undefined> {
    const [make] = await db.select().from(schema.carMakes).where(eq(schema.carMakes.id, id)).limit(1);
    return make;
  },

  async findByName(name: string): Promise<CarMake | undefined> {
    const [make] = await db.select().from(schema.carMakes).where(eq(schema.carMakes.name, name)).limit(1);
    return make;
  },

  async create(data: NewCarMake): Promise<CarMake> {
    const [make] = await db.insert(schema.carMakes).values(data).returning();
    return make;
  },

  async update(id: string, data: Partial<NewCarMake>): Promise<CarMake> {
    const [make] = await db.update(schema.carMakes).set(data).where(eq(schema.carMakes.id, id)).returning();
    return make;
  },

  async delete(id: string): Promise<void> {
    await db.update(schema.carMakes).set({ isActive: false }).where(eq(schema.carMakes.id, id));
  },
};

// ============================================================================
// CAR MODELS
// ============================================================================

export const carModelStorage = {
  async findAll(): Promise<CarModel[]> {
    return db.select().from(schema.carModels)
      .where(eq(schema.carModels.isActive, true))
      .orderBy(asc(schema.carModels.name));
  },

  async findByMake(makeId: string): Promise<CarModel[]> {
    return db.select().from(schema.carModels)
      .where(and(eq(schema.carModels.makeId, makeId), eq(schema.carModels.isActive, true)))
      .orderBy(asc(schema.carModels.displayOrder), asc(schema.carModels.name));
  },

  async findById(id: string): Promise<CarModel | undefined> {
    const [model] = await db.select().from(schema.carModels).where(eq(schema.carModels.id, id)).limit(1);
    return model;
  },

  async create(data: NewCarModel): Promise<CarModel> {
    const [model] = await db.insert(schema.carModels).values(data).returning();
    return model;
  },

  async createMany(data: NewCarModel[]): Promise<CarModel[]> {
    return db.insert(schema.carModels).values(data).returning();
  },

  async delete(id: string): Promise<void> {
    await db.update(schema.carModels).set({ isActive: false }).where(eq(schema.carModels.id, id));
  },
};

// ============================================================================
// AGENCIES
// ============================================================================

export const agencyStorage = {
  async findAll(): Promise<Agency[]> {
    return db.select().from(schema.agencies)
      .where(eq(schema.agencies.isActive, true))
      .orderBy(asc(schema.agencies.displayOrder));
  },

  async findById(id: string): Promise<Agency | undefined> {
    const [agency] = await db.select().from(schema.agencies).where(eq(schema.agencies.id, id)).limit(1);
    return agency;
  },

  async create(data: NewAgency): Promise<Agency> {
    const [agency] = await db.insert(schema.agencies).values(data).returning();
    return agency;
  },

  async update(id: string, data: Partial<NewAgency>): Promise<Agency> {
    const [agency] = await db.update(schema.agencies).set({ ...data, updatedAt: new Date() }).where(eq(schema.agencies.id, id)).returning();
    return agency;
  },

  async delete(id: string): Promise<void> {
    await db.update(schema.agencies).set({ isActive: false }).where(eq(schema.agencies.id, id));
  },
};

// ============================================================================
// PROBLEM CODES
// ============================================================================

export const problemCodeStorage = {
  async findAll(): Promise<ProblemCode[]> {
    return db.select().from(schema.problemCodes)
      .where(eq(schema.problemCodes.isActive, true))
      .orderBy(asc(schema.problemCodes.displayOrder));
  },

  async findById(id: string): Promise<ProblemCode | undefined> {
    const [code] = await db.select().from(schema.problemCodes).where(eq(schema.problemCodes.id, id)).limit(1);
    return code;
  },

  async create(data: NewProblemCode): Promise<ProblemCode> {
    const [code] = await db.insert(schema.problemCodes).values(data).returning();
    return code;
  },

  async update(id: string, data: Partial<NewProblemCode>): Promise<ProblemCode> {
    const [code] = await db.update(schema.problemCodes).set(data).where(eq(schema.problemCodes.id, id)).returning();
    return code;
  },

  async delete(id: string): Promise<void> {
    await db.update(schema.problemCodes).set({ isActive: false }).where(eq(schema.problemCodes.id, id));
  },
};

// ============================================================================
// PHONE CATEGORIES
// ============================================================================

export const phoneCategoryStorage = {
  async findAll(): Promise<PhoneCategory[]> {
    return db.select().from(schema.phoneCategories).orderBy(asc(schema.phoneCategories.displayOrder));
  },

  async findById(id: string): Promise<PhoneCategory | undefined> {
    const [category] = await db.select().from(schema.phoneCategories).where(eq(schema.phoneCategories.id, id)).limit(1);
    return category;
  },

  async create(data: NewPhoneCategory): Promise<PhoneCategory> {
    const [category] = await db.insert(schema.phoneCategories).values(data).returning();
    return category;
  },

  async delete(id: string): Promise<void> {
    await db.delete(schema.phoneCategories).where(eq(schema.phoneCategories.id, id));
  },
};

// ============================================================================
// IMPORTANT PHONES
// ============================================================================

export const importantPhoneStorage = {
  async findAll(): Promise<ImportantPhone[]> {
    return db.select().from(schema.importantPhones)
      .where(eq(schema.importantPhones.isActive, true))
      .orderBy(asc(schema.importantPhones.displayOrder));
  },

  async findByCategory(categoryId: string): Promise<ImportantPhone[]> {
    return db.select().from(schema.importantPhones)
      .where(and(eq(schema.importantPhones.categoryId, categoryId), eq(schema.importantPhones.isActive, true)))
      .orderBy(asc(schema.importantPhones.displayOrder));
  },

  async findById(id: string): Promise<ImportantPhone | undefined> {
    const [phone] = await db.select().from(schema.importantPhones).where(eq(schema.importantPhones.id, id)).limit(1);
    return phone;
  },

  async create(data: NewImportantPhone): Promise<ImportantPhone> {
    const [phone] = await db.insert(schema.importantPhones).values(data).returning();
    return phone;
  },

  async update(id: string, data: Partial<NewImportantPhone>): Promise<ImportantPhone> {
    const [phone] = await db.update(schema.importantPhones).set({ ...data, updatedAt: new Date() }).where(eq(schema.importantPhones.id, id)).returning();
    return phone;
  },

  async delete(id: string): Promise<void> {
    await db.update(schema.importantPhones).set({ isActive: false }).where(eq(schema.importantPhones.id, id));
  },
};

// ============================================================================
// SETTINGS
// ============================================================================

export const settingStorage = {
  async findAll(): Promise<Setting[]> {
    return db.select().from(schema.settings);
  },

  async findByKey(key: string): Promise<Setting | undefined> {
    const [setting] = await db.select().from(schema.settings).where(eq(schema.settings.key, key)).limit(1);
    return setting;
  },

  async upsert(key: string, value: string, description?: string): Promise<Setting> {
    const existing = await this.findByKey(key);
    
    if (existing) {
      const [setting] = await db.update(schema.settings)
        .set({ value, description, updatedAt: new Date() })
        .where(eq(schema.settings.key, key))
        .returning();
      return setting;
    }
    
    const [setting] = await db.insert(schema.settings).values({ key, value, description }).returning();
    return setting;
  },
};

// ============================================================================
// APP VERSIONS
// ============================================================================

export const appVersionStorage = {
  async findAll(): Promise<AppVersion[]> {
    return db.select().from(schema.appVersions).orderBy(desc(schema.appVersions.createdAt));
  },

  async create(data: NewAppVersion): Promise<AppVersion> {
    const [version] = await db.insert(schema.appVersions).values(data).returning();
    return version;
  },
};

// ============================================================================
// FEEDBACK
// ============================================================================

export const feedbackStorage = {
  async findAll(): Promise<Feedback[]> {
    return db.select().from(schema.feedback).orderBy(desc(schema.feedback.createdAt));
  },

  async findById(id: string): Promise<Feedback | undefined> {
    const [fb] = await db.select().from(schema.feedback).where(eq(schema.feedback.id, id)).limit(1);
    return fb;
  },

  async findUnreadCount(): Promise<number> {
    const result = await db.select({ count: sql<number>`COUNT(*)` })
      .from(schema.feedback)
      .where(eq(schema.feedback.status, 'new'));
    return result[0]?.count || 0;
  },

  async create(data: NewFeedback): Promise<Feedback> {
    const [fb] = await db.insert(schema.feedback).values(data).returning();
    return fb;
  },

  async update(id: string, data: Partial<NewFeedback>): Promise<Feedback> {
    const [fb] = await db.update(schema.feedback).set({ ...data, updatedAt: new Date() }).where(eq(schema.feedback.id, id)).returning();
    return fb;
  },
};

// ============================================================================
// WEBHOOK LOGS
// ============================================================================

export const webhookLogStorage = {
  async findAll(limit: number = 100): Promise<WebhookLog[]> {
    return db.select().from(schema.webhookLogs)
      .orderBy(desc(schema.webhookLogs.createdAt))
      .limit(limit);
  },

  async create(data: NewWebhookLog): Promise<WebhookLog> {
    const [log] = await db.insert(schema.webhookLogs).values(data).returning();
    return log;
  },
};

export const incomingWebhookLogStorage = {
  async findAll(limit: number = 100) {
    return db.select().from(schema.incomingWebhookLogs)
      .orderBy(desc(schema.incomingWebhookLogs.createdAt))
      .limit(limit);
  },

  async create(data: any) {
    const [log] = await db.insert(schema.incomingWebhookLogs).values(data).returning();
    return log;
  },
};

// ============================================================================
// DISPATCHER PHONES
// ============================================================================

export const dispatcherPhoneStorage = {
  async findAll() {
    return db.select().from(schema.dispatcherPhones)
      .where(eq(schema.dispatcherPhones.isActive, true));
  },

  async findByMember(memberId: string) {
    return db.select().from(schema.dispatcherPhones)
      .where(and(eq(schema.dispatcherPhones.memberId, memberId), eq(schema.dispatcherPhones.isActive, true)));
  },

  async create(data: any) {
    const [phone] = await db.insert(schema.dispatcherPhones).values(data).returning();
    return phone;
  },

  async delete(id: string) {
    await db.update(schema.dispatcherPhones).set({ isActive: false }).where(eq(schema.dispatcherPhones.id, id));
  },
};
