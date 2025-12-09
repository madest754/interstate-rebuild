/**
 * Chaveirim Dispatcher - Database Schema
 * 
 * This file defines all database tables using Drizzle ORM.
 * Tables are organized by domain:
 * - Authentication & Users
 * - Members & Directory
 * - Calls & Assignments
 * - Schedules & Queue Sessions
 * - Reference Data (Highways, Vehicles, Agencies, etc.)
 * - System (Settings, Logs, Feedback)
 */

import { pgTable, text, varchar, boolean, timestamp, uuid, integer, json, serial, index, primaryKey } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

// ============================================================================
// AUTHENTICATION & USERS
// ============================================================================

/**
 * Users table - Authentication accounts
 */
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: varchar('password', { length: 255 }).notNull(),
  role: varchar('role', { length: 50 }).notNull().default('member'), // 'admin', 'dispatcher', 'member'
  memberId: uuid('member_id').references(() => members.id),
  isActive: boolean('is_active').notNull().default(true),
  lastLogin: timestamp('last_login'),
  passwordResetToken: varchar('password_reset_token', { length: 255 }),
  passwordResetExpires: timestamp('password_reset_expires'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

/**
 * Sessions table - Express session storage
 */
export const sessions = pgTable('sessions', {
  sid: varchar('sid', { length: 255 }).primaryKey(),
  sess: json('sess').notNull(),
  expire: timestamp('expire').notNull(),
}, (table) => ({
  expireIdx: index('sessions_expire_idx').on(table.expire),
}));

// ============================================================================
// MEMBERS & DIRECTORY
// ============================================================================

/**
 * Members table - Chaveirim volunteers
 */
export const members = pgTable('members', {
  id: uuid('id').defaultRandom().primaryKey(),
  unitNumber: varchar('unit_number', { length: 20 }).notNull().unique(),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 20 }).notNull(),
  secondaryPhone: varchar('secondary_phone', { length: 20 }),
  whatsappId: varchar('whatsapp_id', { length: 50 }),
  address: varchar('address', { length: 255 }),
  city: varchar('city', { length: 100 }),
  state: varchar('state', { length: 50 }),
  zip: varchar('zip', { length: 20 }),
  zones: json('zones').$type<string[]>().default([]),
  skills: json('skills').$type<string[]>().default([]),
  isActive: boolean('is_active').notNull().default(true),
  isDispatcher: boolean('is_dispatcher').notNull().default(false),
  isCoordinator: boolean('is_coordinator').notNull().default(false),
  smsOptIn: boolean('sms_opt_in').notNull().default(true),
  whatsappOptIn: boolean('whatsapp_opt_in').notNull().default(false),
  emailOptIn: boolean('email_opt_in').notNull().default(true),
  appOptIn: boolean('app_opt_in').notNull().default(true),
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  unitNumberIdx: index('members_unit_number_idx').on(table.unitNumber),
  activeIdx: index('members_active_idx').on(table.isActive),
}));

/**
 * Dispatcher phones - Phone numbers assigned to dispatchers
 */
export const dispatcherPhones = pgTable('dispatcher_phones', {
  id: uuid('id').defaultRandom().primaryKey(),
  memberId: uuid('member_id').notNull().references(() => members.id),
  phoneNumber: varchar('phone_number', { length: 20 }).notNull(),
  isPrimary: boolean('is_primary').notNull().default(false),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// ============================================================================
// CALLS & ASSIGNMENTS
// ============================================================================

/**
 * Calls table - Emergency assistance requests
 */
export const calls = pgTable('calls', {
  id: uuid('id').defaultRandom().primaryKey(),
  callNumber: integer('call_number').notNull(),
  status: varchar('status', { length: 20 }).notNull().default('active'), // 'active', 'closed', 'abandoned'
  
  // Requester info
  requestedBy1: uuid('requested_by_1').references(() => agencies.id),
  requestedBy2: uuid('requested_by_2').references(() => agencies.id),
  requestedBy3: uuid('requested_by_3').references(() => agencies.id),
  requestedBy4: uuid('requested_by_4').references(() => agencies.id),
  nature: uuid('nature').references(() => problemCodes.id),
  
  // Caller info
  callerName: varchar('caller_name', { length: 100 }),
  phone1: varchar('phone_1', { length: 20 }),
  phone2: varchar('phone_2', { length: 20 }),
  phone3: varchar('phone_3', { length: 20 }),
  phone4: varchar('phone_4', { length: 20 }),
  
  // Address location
  address: varchar('address', { length: 255 }),
  city: varchar('city', { length: 100 }),
  state: varchar('state', { length: 50 }),
  zip: varchar('zip', { length: 20 }),
  
  // Highway location
  highwayId: uuid('highway_id').references(() => highways.id),
  customHighway: varchar('custom_highway', { length: 100 }),
  direction: varchar('direction', { length: 50 }),
  localExpress: varchar('local_express', { length: 20 }),
  betweenExit: varchar('between_exit', { length: 50 }),
  andExit: varchar('and_exit', { length: 50 }),
  mileMarker: varchar('mile_marker', { length: 20 }),
  
  // Free text location
  freeTextLocation: text('free_text_location'),
  
  // Coordinates & map
  mapLink: text('map_link'),
  latitude: varchar('latitude', { length: 20 }),
  longitude: varchar('longitude', { length: 20 }),
  territory: varchar('territory', { length: 100 }),
  
  // Vehicle info
  carMakeId: uuid('car_make_id').references(() => carMakes.id),
  carModelId: uuid('car_model_id').references(() => carModels.id),
  carColor: varchar('car_color', { length: 50 }),
  customVehicle: varchar('custom_vehicle', { length: 100 }),
  vehicleComment: text('vehicle_comment'),
  
  // Notes & messages
  dispatcherMessage: text('dispatcher_message'),
  internalNotes: json('internal_notes').$type<InternalNote[]>().default([]),
  
  // Flags
  urgent: boolean('urgent').notNull().default(false),
  isDraft: boolean('is_draft').notNull().default(false),
  isDeleted: boolean('is_deleted').notNull().default(false),
  
  // Metadata
  createdBy: uuid('created_by').references(() => users.id),
  closedAt: timestamp('closed_at'),
  closedBy: uuid('closed_by').references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  statusIdx: index('calls_status_idx').on(table.status),
  callNumberIdx: index('calls_call_number_idx').on(table.callNumber),
  createdAtIdx: index('calls_created_at_idx').on(table.createdAt),
}));

// Internal note type
export type InternalNote = {
  note: string;
  timestamp: string;
  author: string;
};

/**
 * Call assignments - Members assigned to calls
 */
export const callAssignments = pgTable('call_assignments', {
  id: uuid('id').defaultRandom().primaryKey(),
  callId: uuid('call_id').notNull().references(() => calls.id, { onDelete: 'cascade' }),
  memberId: uuid('member_id').notNull().references(() => members.id),
  eta: integer('eta'), // minutes
  status: varchar('status', { length: 20 }).notNull().default('assigned'), // 'assigned', 'enroute', 'onscene', 'completed'
  assignedAt: timestamp('assigned_at').notNull().defaultNow(),
  arrivedAt: timestamp('arrived_at'),
  completedAt: timestamp('completed_at'),
}, (table) => ({
  callIdx: index('call_assignments_call_idx').on(table.callId),
  memberIdx: index('call_assignments_member_idx').on(table.memberId),
}));

/**
 * Call logs - Activity log for calls
 */
export const callLogs = pgTable('call_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  callId: uuid('call_id').notNull().references(() => calls.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').references(() => users.id),
  logType: varchar('log_type', { length: 50 }).notNull(), // 'created', 'updated', 'broadcast', 'assigned', 'closed', 'reopened'
  message: text('message'),
  metadata: json('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  callIdx: index('call_logs_call_idx').on(table.callId),
  createdAtIdx: index('call_logs_created_at_idx').on(table.createdAt),
}));

/**
 * Drafts - Incomplete call drafts
 */
export const drafts = pgTable('drafts', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id),
  formData: json('form_data').notNull(),
  locationType: varchar('location_type', { length: 20 }).default('address'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ============================================================================
// SCHEDULES & QUEUE SESSIONS
// ============================================================================

/**
 * Schedules - Recurring dispatcher shifts
 */
export const schedules = pgTable('schedules', {
  id: uuid('id').defaultRandom().primaryKey(),
  memberId: uuid('member_id').notNull().references(() => members.id),
  dayOfWeek: integer('day_of_week').notNull(), // 0-6 (Sunday-Saturday)
  startTime: varchar('start_time', { length: 10 }).notNull(), // HH:MM format
  endTime: varchar('end_time', { length: 10 }).notNull(),
  queue: varchar('queue', { length: 20 }).notNull().default('primary'), // 'primary', 'secondary', 'third'
  autoPullLine: boolean('auto_pull_line').notNull().default(true),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  memberIdx: index('schedules_member_idx').on(table.memberId),
  dayIdx: index('schedules_day_idx').on(table.dayOfWeek),
}));

/**
 * Shift overrides - Temporary schedule changes
 */
export const shiftOverrides = pgTable('shift_overrides', {
  id: uuid('id').defaultRandom().primaryKey(),
  date: varchar('date', { length: 10 }).notNull(), // YYYY-MM-DD format
  scheduleId: uuid('schedule_id').references(() => schedules.id),
  originalMemberId: uuid('original_member_id').references(() => members.id),
  replacementMemberId: uuid('replacement_member_id').references(() => members.id),
  reason: text('reason'),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

/**
 * Queue sessions - Active phone queue login sessions
 */
export const queueSessions = pgTable('queue_sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  memberId: uuid('member_id').notNull().references(() => members.id),
  queue: varchar('queue', { length: 20 }).notNull(),
  phoneNumber: varchar('phone_number', { length: 20 }),
  source: varchar('source', { length: 20 }).notNull().default('manual'), // 'manual', 'auto', 'override'
  loginTime: timestamp('login_time').notNull().defaultNow(),
  logoutTime: timestamp('logout_time'),
  isActive: boolean('is_active').notNull().default(true),
}, (table) => ({
  memberIdx: index('queue_sessions_member_idx').on(table.memberId),
  activeIdx: index('queue_sessions_active_idx').on(table.isActive),
}));

// ============================================================================
// REFERENCE DATA - HIGHWAYS & EXITS
// ============================================================================

/**
 * Highways - Highway reference data
 */
export const highways = pgTable('highways', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  abbreviation: varchar('abbreviation', { length: 20 }),
  alternativeNames: json('alternative_names').$type<string[]>().default([]),
  displayOrder: integer('display_order').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  displayOrderIdx: index('highways_display_order_idx').on(table.displayOrder),
}));

/**
 * Highway exits - Exit coordinates and info
 */
export const highwayExits = pgTable('highway_exits', {
  id: uuid('id').defaultRandom().primaryKey(),
  highwayId: uuid('highway_id').notNull().references(() => highways.id, { onDelete: 'cascade' }),
  exitNumber: varchar('exit_number', { length: 20 }).notNull(),
  exitName: varchar('exit_name', { length: 100 }),
  latitude: varchar('latitude', { length: 20 }),
  longitude: varchar('longitude', { length: 20 }),
  direction: varchar('direction', { length: 20 }), // 'North', 'South', 'East', 'West'
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  highwayIdx: index('highway_exits_highway_idx').on(table.highwayId),
  exitNumberIdx: index('highway_exits_number_idx').on(table.exitNumber),
}));

// ============================================================================
// REFERENCE DATA - VEHICLES
// ============================================================================

/**
 * Car makes - Vehicle manufacturers
 */
export const carMakes = pgTable('car_makes', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  displayOrder: integer('display_order').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

/**
 * Car models - Vehicle models
 */
export const carModels = pgTable('car_models', {
  id: uuid('id').defaultRandom().primaryKey(),
  makeId: uuid('make_id').notNull().references(() => carMakes.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  displayOrder: integer('display_order').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  makeIdx: index('car_models_make_idx').on(table.makeId),
}));

/**
 * Excluded manufacturers - Manufacturers to exclude from lists
 */
export const excludedManufacturers = pgTable('excluded_manufacturers', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// ============================================================================
// REFERENCE DATA - AGENCIES & PROBLEM CODES
// ============================================================================

/**
 * Agencies - Requesting organizations
 */
export const agencies = pgTable('agencies', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  code: varchar('code', { length: 20 }),
  initials: varchar('initials', { length: 10 }),
  displayOrder: integer('display_order').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

/**
 * Problem codes - Nature/type of emergency
 */
export const problemCodes = pgTable('problem_codes', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  code: varchar('code', { length: 20 }),
  description: text('description'),
  displayOrder: integer('display_order').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// ============================================================================
// REFERENCE DATA - IMPORTANT PHONES
// ============================================================================

/**
 * Phone categories - Categories for important phone numbers
 */
export const phoneCategories = pgTable('phone_categories', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  displayOrder: integer('display_order').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

/**
 * Important phones - Important contact numbers
 */
export const importantPhones = pgTable('important_phones', {
  id: uuid('id').defaultRandom().primaryKey(),
  categoryId: uuid('category_id').references(() => phoneCategories.id),
  name: varchar('name', { length: 100 }).notNull(),
  phoneNumber: varchar('phone_number', { length: 50 }).notNull(),
  notes: text('notes'),
  displayOrder: integer('display_order').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ============================================================================
// SYSTEM - SETTINGS, LOGS, FEEDBACK
// ============================================================================

/**
 * Settings - Application configuration
 */
export const settings = pgTable('settings', {
  id: uuid('id').defaultRandom().primaryKey(),
  key: varchar('key', { length: 100 }).notNull().unique(),
  value: text('value'),
  description: text('description'),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

/**
 * App versions - Version history
 */
export const appVersions = pgTable('app_versions', {
  id: uuid('id').defaultRandom().primaryKey(),
  version: varchar('version', { length: 50 }).notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

/**
 * Webhook logs - Outgoing webhook history
 */
export const webhookLogs = pgTable('webhook_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  url: text('url').notNull(),
  method: varchar('method', { length: 10 }).notNull(),
  requestBody: text('request_body'),
  responseBody: text('response_body'),
  statusCode: integer('status_code'),
  duration: integer('duration'), // milliseconds
  error: text('error'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  createdAtIdx: index('webhook_logs_created_at_idx').on(table.createdAt),
}));

/**
 * Incoming webhook logs - Incoming webhook history
 */
export const incomingWebhookLogs = pgTable('incoming_webhook_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  source: varchar('source', { length: 50 }),
  path: varchar('path', { length: 255 }),
  method: varchar('method', { length: 10 }),
  headers: json('headers'),
  body: json('body'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

/**
 * Feedback - User feedback submissions
 */
export const feedback = pgTable('feedback', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id),
  type: varchar('type', { length: 20 }).notNull(), // 'bug', 'feature', 'question', 'other'
  message: text('message').notNull(),
  status: varchar('status', { length: 20 }).notNull().default('new'), // 'new', 'read', 'resolved'
  response: text('response'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

/**
 * Shift monitor events - Automation event log
 */
export const shiftMonitorEvents = pgTable('shift_monitor_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  eventType: varchar('event_type', { length: 50 }).notNull(),
  memberId: uuid('member_id').references(() => members.id),
  queue: varchar('queue', { length: 20 }),
  details: text('details'),
  success: boolean('success').notNull().default(true),
  error: text('error'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// ============================================================================
// RELATIONS
// ============================================================================

export const usersRelations = relations(users, ({ one }) => ({
  member: one(members, {
    fields: [users.memberId],
    references: [members.id],
  }),
}));

export const membersRelations = relations(members, ({ many, one }) => ({
  user: one(users, {
    fields: [members.id],
    references: [users.memberId],
  }),
  assignments: many(callAssignments),
  schedules: many(schedules),
  queueSessions: many(queueSessions),
  dispatcherPhones: many(dispatcherPhones),
}));

export const callsRelations = relations(calls, ({ one, many }) => ({
  agency1: one(agencies, {
    fields: [calls.requestedBy1],
    references: [agencies.id],
  }),
  problemCode: one(problemCodes, {
    fields: [calls.nature],
    references: [problemCodes.id],
  }),
  highway: one(highways, {
    fields: [calls.highwayId],
    references: [highways.id],
  }),
  carMake: one(carMakes, {
    fields: [calls.carMakeId],
    references: [carMakes.id],
  }),
  carModel: one(carModels, {
    fields: [calls.carModelId],
    references: [carModels.id],
  }),
  assignments: many(callAssignments),
  logs: many(callLogs),
}));

export const callAssignmentsRelations = relations(callAssignments, ({ one }) => ({
  call: one(calls, {
    fields: [callAssignments.callId],
    references: [calls.id],
  }),
  member: one(members, {
    fields: [callAssignments.memberId],
    references: [members.id],
  }),
}));

export const highwaysRelations = relations(highways, ({ many }) => ({
  exits: many(highwayExits),
}));

export const highwayExitsRelations = relations(highwayExits, ({ one }) => ({
  highway: one(highways, {
    fields: [highwayExits.highwayId],
    references: [highways.id],
  }),
}));

export const carMakesRelations = relations(carMakes, ({ many }) => ({
  models: many(carModels),
}));

export const carModelsRelations = relations(carModels, ({ one }) => ({
  make: one(carMakes, {
    fields: [carModels.makeId],
    references: [carMakes.id],
  }),
}));

export const schedulesRelations = relations(schedules, ({ one }) => ({
  member: one(members, {
    fields: [schedules.memberId],
    references: [members.id],
  }),
}));

export const importantPhonesRelations = relations(importantPhones, ({ one }) => ({
  category: one(phoneCategories, {
    fields: [importantPhones.categoryId],
    references: [phoneCategories.id],
  }),
}));

// ============================================================================
// ZOD SCHEMAS FOR VALIDATION
// ============================================================================

// User schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, updatedAt: true });
export const selectUserSchema = createSelectSchema(users);

// Member schemas
export const insertMemberSchema = createInsertSchema(members).omit({ id: true, createdAt: true, updatedAt: true });
export const selectMemberSchema = createSelectSchema(members);

// Call schemas
export const insertCallSchema = createInsertSchema(calls).omit({ id: true, createdAt: true, updatedAt: true });
export const selectCallSchema = createSelectSchema(calls);

// Assignment schemas
export const insertAssignmentSchema = createInsertSchema(callAssignments).omit({ id: true, assignedAt: true });
export const selectAssignmentSchema = createSelectSchema(callAssignments);

// Schedule schemas
export const insertScheduleSchema = createInsertSchema(schedules).omit({ id: true, createdAt: true, updatedAt: true });
export const selectScheduleSchema = createSelectSchema(schedules);

// Highway schemas
export const insertHighwaySchema = createInsertSchema(highways).omit({ id: true, createdAt: true, updatedAt: true });
export const selectHighwaySchema = createSelectSchema(highways);

// Highway exit schemas
export const insertHighwayExitSchema = createInsertSchema(highwayExits).omit({ id: true, createdAt: true });
export const selectHighwayExitSchema = createSelectSchema(highwayExits);

// Car make schemas
export const insertCarMakeSchema = createInsertSchema(carMakes).omit({ id: true, createdAt: true });
export const selectCarMakeSchema = createSelectSchema(carMakes);

// Car model schemas
export const insertCarModelSchema = createInsertSchema(carModels).omit({ id: true, createdAt: true });
export const selectCarModelSchema = createSelectSchema(carModels);

// Agency schemas
export const insertAgencySchema = createInsertSchema(agencies).omit({ id: true, createdAt: true, updatedAt: true });
export const selectAgencySchema = createSelectSchema(agencies);

// Problem code schemas
export const insertProblemCodeSchema = createInsertSchema(problemCodes).omit({ id: true, createdAt: true });
export const selectProblemCodeSchema = createSelectSchema(problemCodes);

// Important phone schemas
export const insertImportantPhoneSchema = createInsertSchema(importantPhones).omit({ id: true, createdAt: true, updatedAt: true });
export const selectImportantPhoneSchema = createSelectSchema(importantPhones);

// Feedback schemas
export const insertFeedbackSchema = createInsertSchema(feedback).omit({ id: true, createdAt: true, updatedAt: true });
export const selectFeedbackSchema = createSelectSchema(feedback);

// Draft schemas
export const insertDraftSchema = createInsertSchema(drafts).omit({ id: true, createdAt: true, updatedAt: true });
export const selectDraftSchema = createSelectSchema(drafts);

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Member = typeof members.$inferSelect;
export type NewMember = typeof members.$inferInsert;

export type Call = typeof calls.$inferSelect;
export type NewCall = typeof calls.$inferInsert;

export type CallAssignment = typeof callAssignments.$inferSelect;
export type NewCallAssignment = typeof callAssignments.$inferInsert;

export type CallLog = typeof callLogs.$inferSelect;
export type NewCallLog = typeof callLogs.$inferInsert;

export type Draft = typeof drafts.$inferSelect;
export type NewDraft = typeof drafts.$inferInsert;

export type Schedule = typeof schedules.$inferSelect;
export type NewSchedule = typeof schedules.$inferInsert;

export type ShiftOverride = typeof shiftOverrides.$inferSelect;
export type NewShiftOverride = typeof shiftOverrides.$inferInsert;

export type QueueSession = typeof queueSessions.$inferSelect;
export type NewQueueSession = typeof queueSessions.$inferInsert;

export type Highway = typeof highways.$inferSelect;
export type NewHighway = typeof highways.$inferInsert;

export type HighwayExit = typeof highwayExits.$inferSelect;
export type NewHighwayExit = typeof highwayExits.$inferInsert;

export type CarMake = typeof carMakes.$inferSelect;
export type NewCarMake = typeof carMakes.$inferInsert;

export type CarModel = typeof carModels.$inferSelect;
export type NewCarModel = typeof carModels.$inferInsert;

export type Agency = typeof agencies.$inferSelect;
export type NewAgency = typeof agencies.$inferInsert;

export type ProblemCode = typeof problemCodes.$inferSelect;
export type NewProblemCode = typeof problemCodes.$inferInsert;

export type PhoneCategory = typeof phoneCategories.$inferSelect;
export type NewPhoneCategory = typeof phoneCategories.$inferInsert;

export type ImportantPhone = typeof importantPhones.$inferSelect;
export type NewImportantPhone = typeof importantPhones.$inferInsert;

export type Setting = typeof settings.$inferSelect;
export type NewSetting = typeof settings.$inferInsert;

export type AppVersion = typeof appVersions.$inferSelect;
export type NewAppVersion = typeof appVersions.$inferInsert;

export type Feedback = typeof feedback.$inferSelect;
export type NewFeedback = typeof feedback.$inferInsert;

export type WebhookLog = typeof webhookLogs.$inferSelect;
export type NewWebhookLog = typeof webhookLogs.$inferInsert;
