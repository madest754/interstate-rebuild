/**
 * API Routes
 * 
 * All API endpoints for the Chaveirim Dispatcher application.
 * Routes are organized by domain and use the storage layer for database access.
 */

import type { Express, Request, Response } from 'express';
import passport from 'passport';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import { requireAuth, requireDispatcher, requireAdmin, hashPassword } from './auth';
import {
  userStorage,
  memberStorage,
  callStorage,
  assignmentStorage,
  callLogStorage,
  draftStorage,
  scheduleStorage,
  shiftOverrideStorage,
  queueSessionStorage,
  highwayStorage,
  highwayExitStorage,
  carMakeStorage,
  carModelStorage,
  agencyStorage,
  problemCodeStorage,
  phoneCategoryStorage,
  importantPhoneStorage,
  settingStorage,
  appVersionStorage,
  feedbackStorage,
  webhookLogStorage,
  incomingWebhookLogStorage,
  dispatcherPhoneStorage,
} from './storage';

// Multer configuration for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

/**
 * Register all API routes
 */
export function registerRoutes(app: Express) {
  
  // ============================================================================
  // AUTHENTICATION ROUTES
  // ============================================================================

  /**
   * GET /api/user - Get current authenticated user
   */
  app.get('/api/user', (req: Request, res: Response) => {
    if (req.isAuthenticated()) {
      res.json(req.user);
    } else {
      res.status(401).json({ error: true, message: 'Not authenticated' });
    }
  });

  /**
   * POST /api/login - Authenticate user
   */
  app.post('/api/login', (req: Request, res: Response, next) => {
    passport.authenticate('local', (err: any, user: any, info: any) => {
      if (err) {
        return res.status(500).json({ error: true, message: 'Authentication error' });
      }
      if (!user) {
        return res.status(401).json({ error: true, message: info?.message || 'Invalid credentials' });
      }
      req.logIn(user, (err) => {
        if (err) {
          return res.status(500).json({ error: true, message: 'Login error' });
        }
        res.json(user);
      });
    })(req, res, next);
  });

  /**
   * POST /api/logout - End user session
   */
  app.post('/api/logout', (req: Request, res: Response) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ error: true, message: 'Logout error' });
      }
      res.json({ success: true });
    });
  });

  /**
   * POST /api/register - Register new user (internal)
   */
  app.post('/api/register', requireAdmin, async (req: Request, res: Response) => {
    try {
      const { email, password, role, memberId } = req.body;
      
      const existing = await userStorage.findByEmail(email);
      if (existing) {
        return res.status(400).json({ error: true, message: 'Email already exists' });
      }
      
      const hashedPassword = await hashPassword(password);
      const user = await userStorage.create({
        email,
        password: hashedPassword,
        role: role || 'member',
        memberId,
      });
      
      res.status(201).json({ id: user.id, email: user.email, role: user.role });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ error: true, message: 'Registration failed' });
    }
  });

  /**
   * POST /api/public/register - Public user registration
   */
  app.post('/api/public/register', async (req: Request, res: Response) => {
    try {
      const { email, password, firstName, lastName, phone } = req.body;
      
      const existing = await userStorage.findByEmail(email);
      if (existing) {
        return res.status(400).json({ error: true, message: 'Email already exists' });
      }
      
      // Create member first
      const member = await memberStorage.create({
        unitNumber: `NEW-${Date.now().toString(36).toUpperCase()}`,
        firstName,
        lastName,
        phone,
        email,
      });
      
      // Create user account
      const hashedPassword = await hashPassword(password);
      const user = await userStorage.create({
        email,
        password: hashedPassword,
        role: 'member',
        memberId: member.id,
      });
      
      res.status(201).json({ success: true, message: 'Registration successful' });
    } catch (error) {
      console.error('Public registration error:', error);
      res.status(500).json({ error: true, message: 'Registration failed' });
    }
  });

  /**
   * POST /api/forgot-password - Initiate password reset
   */
  app.post('/api/forgot-password', async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      const user = await userStorage.findByEmail(email);
      
      if (user) {
        const token = uuidv4();
        const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
        
        await userStorage.update(user.id, {
          passwordResetToken: token,
          passwordResetExpires: expires,
        });
        
        // TODO: Send email with reset link
        console.log(`Password reset token for ${email}: ${token}`);
      }
      
      // Always return success to prevent email enumeration
      res.json({ success: true, message: 'If the email exists, a reset link has been sent' });
    } catch (error) {
      console.error('Forgot password error:', error);
      res.status(500).json({ error: true, message: 'Request failed' });
    }
  });

  /**
   * POST /api/reset-password - Reset password with token
   */
  app.post('/api/reset-password', async (req: Request, res: Response) => {
    try {
      const { token, newPassword } = req.body;
      
      const user = await userStorage.findByResetToken(token);
      if (!user) {
        return res.status(400).json({ error: true, message: 'Invalid or expired token' });
      }
      
      const hashedPassword = await hashPassword(newPassword);
      await userStorage.update(user.id, {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpires: null,
      });
      
      res.json({ success: true, message: 'Password reset successful' });
    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({ error: true, message: 'Reset failed' });
    }
  });

  /**
   * POST /api/change-password - Change password (authenticated)
   */
  app.post('/api/change-password', requireAuth, async (req: Request, res: Response) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = req.user!.id;
      
      const user = await userStorage.findById(userId);
      if (!user) {
        return res.status(404).json({ error: true, message: 'User not found' });
      }
      
      const bcrypt = await import('bcrypt');
      const isValid = await bcrypt.compare(currentPassword, user.password);
      if (!isValid) {
        return res.status(400).json({ error: true, message: 'Current password is incorrect' });
      }
      
      const hashedPassword = await hashPassword(newPassword);
      await userStorage.update(userId, { password: hashedPassword });
      
      res.json({ success: true, message: 'Password changed successfully' });
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({ error: true, message: 'Password change failed' });
    }
  });

  /**
   * POST /api/refresh-session - Refresh session
   */
  app.post('/api/refresh-session', requireAuth, (req: Request, res: Response) => {
    req.session.touch();
    res.json({ success: true });
  });

  /**
   * GET /api/registration-form - Get registration form config
   */
  app.get('/api/registration-form', requireAdmin, async (_req: Request, res: Response) => {
    res.json({ enabled: true });
  });

  /**
   * GET /api/public/registration-form - Get public registration form config
   */
  app.get('/api/public/registration-form', async (_req: Request, res: Response) => {
    const setting = await settingStorage.findByKey('public_registration_enabled');
    res.json({ enabled: setting?.value === 'true' });
  });

  // ============================================================================
  // MEMBER ROUTES
  // ============================================================================

  /**
   * GET /api/members - Get all members
   */
  app.get('/api/members', requireAuth, async (req: Request, res: Response) => {
    try {
      const includeAll = req.query.includeAll === 'true';
      const members = await memberStorage.findAll(includeAll);
      res.json(members);
    } catch (error) {
      console.error('Get members error:', error);
      res.status(500).json({ error: true, message: 'Failed to get members' });
    }
  });

  /**
   * GET /api/members/me - Get current user's member profile
   */
  app.get('/api/members/me', requireAuth, async (req: Request, res: Response) => {
    try {
      if (!req.user?.memberId) {
        return res.status(404).json({ error: true, message: 'No member profile linked' });
      }
      const member = await memberStorage.findById(req.user.memberId);
      res.json(member);
    } catch (error) {
      console.error('Get member profile error:', error);
      res.status(500).json({ error: true, message: 'Failed to get profile' });
    }
  });

  /**
   * GET /api/members/:id - Get member by ID
   */
  app.get('/api/members/:id', requireAuth, async (req: Request, res: Response) => {
    try {
      const member = await memberStorage.findById(req.params.id);
      if (!member) {
        return res.status(404).json({ error: true, message: 'Member not found' });
      }
      res.json(member);
    } catch (error) {
      console.error('Get member error:', error);
      res.status(500).json({ error: true, message: 'Failed to get member' });
    }
  });

  /**
   * POST /api/members - Create member
   */
  app.post('/api/members', requireAdmin, async (req: Request, res: Response) => {
    try {
      const member = await memberStorage.create(req.body);
      res.status(201).json(member);
    } catch (error) {
      console.error('Create member error:', error);
      res.status(500).json({ error: true, message: 'Failed to create member' });
    }
  });

  /**
   * PATCH /api/members/:id - Update member
   */
  app.patch('/api/members/:id', requireAuth, async (req: Request, res: Response) => {
    try {
      // Check permissions - admin can update any, others can only update self
      if (req.user!.role !== 'admin' && req.user!.memberId !== req.params.id) {
        return res.status(403).json({ error: true, message: 'Not authorized' });
      }
      
      const member = await memberStorage.update(req.params.id, req.body);
      res.json(member);
    } catch (error) {
      console.error('Update member error:', error);
      res.status(500).json({ error: true, message: 'Failed to update member' });
    }
  });

  /**
   * DELETE /api/members/:id - Delete member
   */
  app.delete('/api/members/:id', requireAdmin, async (req: Request, res: Response) => {
    try {
      await memberStorage.delete(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error('Delete member error:', error);
      res.status(500).json({ error: true, message: 'Failed to delete member' });
    }
  });

  /**
   * POST /api/member/update-email - Update current user's email
   */
  app.post('/api/member/update-email', requireAuth, async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      
      if (req.user?.memberId) {
        await memberStorage.update(req.user.memberId, { email });
      }
      await userStorage.update(req.user!.id, { email });
      
      res.json({ success: true });
    } catch (error) {
      console.error('Update email error:', error);
      res.status(500).json({ error: true, message: 'Failed to update email' });
    }
  });

  /**
   * GET /api/search-directory - Search member directory
   */
  app.get('/api/search-directory', requireDispatcher, async (req: Request, res: Response) => {
    try {
      const query = req.query.q as string || '';
      const members = await memberStorage.search(query);
      res.json(members);
    } catch (error) {
      console.error('Search directory error:', error);
      res.status(500).json({ error: true, message: 'Search failed' });
    }
  });

  /**
   * GET /api/coordinators - Get coordinators
   */
  app.get('/api/coordinators', requireAuth, async (_req: Request, res: Response) => {
    try {
      const coordinators = await memberStorage.findCoordinators();
      res.json(coordinators);
    } catch (error) {
      console.error('Get coordinators error:', error);
      res.status(500).json({ error: true, message: 'Failed to get coordinators' });
    }
  });

  /**
   * GET /api/dispatchers - Get dispatchers
   */
  app.get('/api/dispatchers', requireAuth, async (_req: Request, res: Response) => {
    try {
      const dispatchers = await memberStorage.findDispatchers();
      res.json(dispatchers);
    } catch (error) {
      console.error('Get dispatchers error:', error);
      res.status(500).json({ error: true, message: 'Failed to get dispatchers' });
    }
  });

  /**
   * GET /api/dispatcher-status - Get current dispatcher on duty
   */
  app.get('/api/dispatcher-status', requireAuth, async (_req: Request, res: Response) => {
    try {
      const activeSessions = await queueSessionStorage.findActive();
      const primarySession = activeSessions.find(s => s.queue === 'primary');
      
      if (primarySession) {
        const member = await memberStorage.findById(primarySession.memberId);
        res.json({
          currentDispatcher: member,
          loginTime: primarySession.loginTime,
        });
      } else {
        res.json({ currentDispatcher: null });
      }
    } catch (error) {
      console.error('Get dispatcher status error:', error);
      res.status(500).json({ error: true, message: 'Failed to get status' });
    }
  });

  /**
   * GET /api/online-users - Get online users
   */
  app.get('/api/online-users', requireAuth, async (_req: Request, res: Response) => {
    // TODO: Implement with WebSocket tracking
    res.json([]);
  });

  /**
   * POST /api/sync/members - Sync members from external source
   */
  app.post('/api/sync/members', requireAdmin, async (_req: Request, res: Response) => {
    // TODO: Implement external sync
    res.json({ success: true, message: 'Sync not implemented' });
  });

  // ============================================================================
  // CALL ROUTES
  // ============================================================================

  /**
   * GET /api/calls - Get all calls
   */
  app.get('/api/calls', requireAuth, async (req: Request, res: Response) => {
    try {
      const status = req.query.status as string;
      const calls = await callStorage.findAll(status);
      
      // Enrich with assignments
      const enrichedCalls = await Promise.all(calls.map(async (call) => {
        const assignments = await assignmentStorage.findByCall(call.id);
        return { ...call, assignments };
      }));
      
      res.json(enrichedCalls);
    } catch (error) {
      console.error('Get calls error:', error);
      res.status(500).json({ error: true, message: 'Failed to get calls' });
    }
  });

  /**
   * GET /api/calls/:id - Get call by ID
   */
  app.get('/api/calls/:id', requireAuth, async (req: Request, res: Response) => {
    try {
      const call = await callStorage.findById(req.params.id);
      if (!call) {
        return res.status(404).json({ error: true, message: 'Call not found' });
      }
      
      const assignments = await assignmentStorage.findByCall(call.id);
      const logs = await callLogStorage.findByCall(call.id);
      
      res.json({ ...call, assignments, logs });
    } catch (error) {
      console.error('Get call error:', error);
      res.status(500).json({ error: true, message: 'Failed to get call' });
    }
  });

  /**
   * POST /api/calls - Create call
   */
  app.post('/api/calls', requireDispatcher, async (req: Request, res: Response) => {
    try {
      const call = await callStorage.create({
        ...req.body,
        createdBy: req.user!.id,
      });
      
      // Log creation
      await callLogStorage.create({
        callId: call.id,
        userId: req.user!.id,
        logType: 'created',
        message: `Call #${call.callNumber} created`,
      });
      
      res.status(201).json(call);
    } catch (error) {
      console.error('Create call error:', error);
      res.status(500).json({ error: true, message: 'Failed to create call' });
    }
  });

  /**
   * PATCH /api/calls/:id - Update call
   */
  app.patch('/api/calls/:id', requireDispatcher, async (req: Request, res: Response) => {
    try {
      const call = await callStorage.update(req.params.id, req.body);
      
      // Log update
      await callLogStorage.create({
        callId: call.id,
        userId: req.user!.id,
        logType: 'updated',
        message: 'Call updated',
      });
      
      res.json(call);
    } catch (error) {
      console.error('Update call error:', error);
      res.status(500).json({ error: true, message: 'Failed to update call' });
    }
  });

  /**
   * DELETE /api/calls/:id - Delete call
   */
  app.delete('/api/calls/:id', requireAdmin, async (req: Request, res: Response) => {
    try {
      await callStorage.softDelete(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error('Delete call error:', error);
      res.status(500).json({ error: true, message: 'Failed to delete call' });
    }
  });

  /**
   * POST /api/calls/:id/close - Close call
   */
  app.post('/api/calls/:id/close', requireDispatcher, async (req: Request, res: Response) => {
    try {
      const call = await callStorage.close(req.params.id, req.user!.id);
      
      await callLogStorage.create({
        callId: call.id,
        userId: req.user!.id,
        logType: 'closed',
        message: 'Call closed',
      });
      
      res.json(call);
    } catch (error) {
      console.error('Close call error:', error);
      res.status(500).json({ error: true, message: 'Failed to close call' });
    }
  });

  /**
   * POST /api/calls/:id/reopen - Reopen call
   */
  app.post('/api/calls/:id/reopen', requireDispatcher, async (req: Request, res: Response) => {
    try {
      const call = await callStorage.reopen(req.params.id);
      
      await callLogStorage.create({
        callId: call.id,
        userId: req.user!.id,
        logType: 'reopened',
        message: 'Call reopened',
      });
      
      res.json(call);
    } catch (error) {
      console.error('Reopen call error:', error);
      res.status(500).json({ error: true, message: 'Failed to reopen call' });
    }
  });

  /**
   * POST /api/calls/:id/assign - Assign member to call
   */
  app.post('/api/calls/:id/assign', requireDispatcher, async (req: Request, res: Response) => {
    try {
      const { memberId, eta } = req.body;
      
      const assignment = await assignmentStorage.create({
        callId: req.params.id,
        memberId,
        eta,
      });
      
      const member = await memberStorage.findById(memberId);
      await callLogStorage.create({
        callId: req.params.id,
        userId: req.user!.id,
        logType: 'assigned',
        message: `${member?.unitNumber || 'Member'} assigned`,
      });
      
      res.status(201).json(assignment);
    } catch (error) {
      console.error('Assign member error:', error);
      res.status(500).json({ error: true, message: 'Failed to assign member' });
    }
  });

  /**
   * DELETE /api/calls/:id/assign/:assignmentId - Remove assignment
   */
  app.delete('/api/calls/:id/assign/:assignmentId', requireDispatcher, async (req: Request, res: Response) => {
    try {
      await assignmentStorage.delete(req.params.assignmentId);
      
      await callLogStorage.create({
        callId: req.params.id,
        userId: req.user!.id,
        logType: 'unassigned',
        message: 'Assignment removed',
      });
      
      res.json({ success: true });
    } catch (error) {
      console.error('Remove assignment error:', error);
      res.status(500).json({ error: true, message: 'Failed to remove assignment' });
    }
  });

  /**
   * POST /api/calls/:id/broadcast - Broadcast call
   */
  app.post('/api/calls/:id/broadcast', requireDispatcher, async (req: Request, res: Response) => {
    try {
      const { message } = req.body;
      const call = await callStorage.findById(req.params.id);
      
      if (!call) {
        return res.status(404).json({ error: true, message: 'Call not found' });
      }
      
      // Log broadcast
      await callLogStorage.create({
        callId: call.id,
        userId: req.user!.id,
        logType: 'broadcast',
        message: message,
      });
      
      // TODO: Send to webhook, WhatsApp, SMS, Email
      console.log(`Broadcasting call #${call.callNumber}:`, message);
      
      res.json({ success: true });
    } catch (error) {
      console.error('Broadcast error:', error);
      res.status(500).json({ error: true, message: 'Broadcast failed' });
    }
  });

  /**
   * POST /api/calls/:id/logs - Add log to call
   */
  app.post('/api/calls/:id/logs', requireDispatcher, async (req: Request, res: Response) => {
    try {
      const { message, logType } = req.body;
      
      const log = await callLogStorage.create({
        callId: req.params.id,
        userId: req.user!.id,
        logType: logType || 'note',
        message,
      });
      
      res.status(201).json(log);
    } catch (error) {
      console.error('Add log error:', error);
      res.status(500).json({ error: true, message: 'Failed to add log' });
    }
  });

  /**
   * GET /api/calls/deleted/all - Get deleted calls
   */
  app.get('/api/calls/deleted/all', requireAdmin, async (_req: Request, res: Response) => {
    try {
      const calls = await callStorage.findDeleted();
      res.json(calls);
    } catch (error) {
      console.error('Get deleted calls error:', error);
      res.status(500).json({ error: true, message: 'Failed to get deleted calls' });
    }
  });

  /**
   * GET /api/call-logs-recent - Get recent call logs
   */
  app.get('/api/call-logs-recent', requireDispatcher, async (req: Request, res: Response) => {
    try {
      const minutes = parseInt(req.query.minutes as string) || 60;
      const logs = await callLogStorage.findRecent(minutes);
      res.json(logs);
    } catch (error) {
      console.error('Get recent logs error:', error);
      res.status(500).json({ error: true, message: 'Failed to get logs' });
    }
  });

  /**
   * GET /api/recent-completed - Get recently completed calls
   */
  app.get('/api/recent-completed', requireDispatcher, async (req: Request, res: Response) => {
    try {
      const minutes = parseInt(req.query.minutes as string) || 15;
      const calls = await callStorage.findRecentCompleted(minutes);
      res.json(calls);
    } catch (error) {
      console.error('Get recent completed error:', error);
      res.status(500).json({ error: true, message: 'Failed to get calls' });
    }
  });

  /**
   * GET /api/ringing-calls - Get ringing calls from phone system
   */
  app.get('/api/ringing-calls', requireDispatcher, async (_req: Request, res: Response) => {
    // TODO: Integrate with phone system
    res.json([]);
  });

  // Continue with more routes in the next section...
  registerAdditionalRoutes(app);
}

/**
 * Register additional routes (Part 2)
 */
function registerAdditionalRoutes(app: Express) {
  
  // ============================================================================
  // DRAFT ROUTES
  // ============================================================================

  app.get('/api/drafts', requireDispatcher, async (req: Request, res: Response) => {
    try {
      const drafts = await draftStorage.findByUser(req.user!.id);
      res.json(drafts);
    } catch (error) {
      console.error('Get drafts error:', error);
      res.status(500).json({ error: true, message: 'Failed to get drafts' });
    }
  });

  app.get('/api/drafts/all', requireAdmin, async (_req: Request, res: Response) => {
    try {
      const drafts = await draftStorage.findAll();
      res.json(drafts);
    } catch (error) {
      console.error('Get all drafts error:', error);
      res.status(500).json({ error: true, message: 'Failed to get drafts' });
    }
  });

  app.post('/api/drafts', requireDispatcher, async (req: Request, res: Response) => {
    try {
      const draft = await draftStorage.create({
        userId: req.user!.id,
        formData: req.body.formData,
        locationType: req.body.locationType,
      });
      res.status(201).json(draft);
    } catch (error) {
      console.error('Create draft error:', error);
      res.status(500).json({ error: true, message: 'Failed to create draft' });
    }
  });

  app.patch('/api/drafts/:id', requireDispatcher, async (req: Request, res: Response) => {
    try {
      const draft = await draftStorage.update(req.params.id, req.body);
      res.json(draft);
    } catch (error) {
      console.error('Update draft error:', error);
      res.status(500).json({ error: true, message: 'Failed to update draft' });
    }
  });

  app.delete('/api/drafts/:id', requireDispatcher, async (req: Request, res: Response) => {
    try {
      await draftStorage.delete(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error('Delete draft error:', error);
      res.status(500).json({ error: true, message: 'Failed to delete draft' });
    }
  });

  // ============================================================================
  // SCHEDULE ROUTES
  // ============================================================================

  app.get('/api/schedules', requireAuth, async (_req: Request, res: Response) => {
    try {
      const schedules = await scheduleStorage.findAll();
      res.json(schedules);
    } catch (error) {
      console.error('Get schedules error:', error);
      res.status(500).json({ error: true, message: 'Failed to get schedules' });
    }
  });

  app.post('/api/schedules', requireAdmin, async (req: Request, res: Response) => {
    try {
      const schedule = await scheduleStorage.create(req.body);
      res.status(201).json(schedule);
    } catch (error) {
      console.error('Create schedule error:', error);
      res.status(500).json({ error: true, message: 'Failed to create schedule' });
    }
  });

  app.patch('/api/schedules/:id', requireAdmin, async (req: Request, res: Response) => {
    try {
      const schedule = await scheduleStorage.update(req.params.id, req.body);
      res.json(schedule);
    } catch (error) {
      console.error('Update schedule error:', error);
      res.status(500).json({ error: true, message: 'Failed to update schedule' });
    }
  });

  app.delete('/api/schedules/:id', requireAdmin, async (req: Request, res: Response) => {
    try {
      await scheduleStorage.delete(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error('Delete schedule error:', error);
      res.status(500).json({ error: true, message: 'Failed to delete schedule' });
    }
  });

  // ============================================================================
  // SHIFT OVERRIDE ROUTES
  // ============================================================================

  app.get('/api/shift-overrides', requireDispatcher, async (_req: Request, res: Response) => {
    try {
      const overrides = await shiftOverrideStorage.findAll();
      res.json(overrides);
    } catch (error) {
      console.error('Get overrides error:', error);
      res.status(500).json({ error: true, message: 'Failed to get overrides' });
    }
  });

  app.get('/api/my-shift-overrides', requireAuth, async (req: Request, res: Response) => {
    try {
      if (!req.user?.memberId) {
        return res.json([]);
      }
      const overrides = await shiftOverrideStorage.findByMember(req.user.memberId);
      res.json(overrides);
    } catch (error) {
      console.error('Get my overrides error:', error);
      res.status(500).json({ error: true, message: 'Failed to get overrides' });
    }
  });

  app.post('/api/shift-overrides', requireDispatcher, async (req: Request, res: Response) => {
    try {
      const override = await shiftOverrideStorage.create({
        ...req.body,
        createdBy: req.user!.id,
      });
      res.status(201).json(override);
    } catch (error) {
      console.error('Create override error:', error);
      res.status(500).json({ error: true, message: 'Failed to create override' });
    }
  });

  app.delete('/api/shift-overrides/:id', requireAdmin, async (req: Request, res: Response) => {
    try {
      await shiftOverrideStorage.delete(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error('Delete override error:', error);
      res.status(500).json({ error: true, message: 'Failed to delete override' });
    }
  });

  // ============================================================================
  // QUEUE SESSION ROUTES
  // ============================================================================

  app.get('/api/queue-sessions', requireDispatcher, async (_req: Request, res: Response) => {
    try {
      const sessions = await queueSessionStorage.findActive();
      res.json(sessions);
    } catch (error) {
      console.error('Get queue sessions error:', error);
      res.status(500).json({ error: true, message: 'Failed to get sessions' });
    }
  });

  app.get('/api/queue-sessions/active', requireDispatcher, async (_req: Request, res: Response) => {
    try {
      const sessions = await queueSessionStorage.findActive();
      res.json(sessions);
    } catch (error) {
      console.error('Get active sessions error:', error);
      res.status(500).json({ error: true, message: 'Failed to get sessions' });
    }
  });

  app.get('/api/queue-sessions/all-active', requireAdmin, async (_req: Request, res: Response) => {
    try {
      const sessions = await queueSessionStorage.findActive();
      res.json(sessions);
    } catch (error) {
      console.error('Get all active sessions error:', error);
      res.status(500).json({ error: true, message: 'Failed to get sessions' });
    }
  });

  app.post('/api/queue-sessions/clear', requireAdmin, async (_req: Request, res: Response) => {
    try {
      await queueSessionStorage.logoutAll();
      res.json({ success: true });
    } catch (error) {
      console.error('Clear sessions error:', error);
      res.status(500).json({ error: true, message: 'Failed to clear sessions' });
    }
  });

  app.delete('/api/queue-sessions/remove-member', requireAdmin, async (req: Request, res: Response) => {
    try {
      const { memberId, queue } = req.body;
      await queueSessionStorage.logoutMember(memberId, queue);
      res.json({ success: true });
    } catch (error) {
      console.error('Remove member error:', error);
      res.status(500).json({ error: true, message: 'Failed to remove member' });
    }
  });

  // ============================================================================
  // PHONE SYSTEM ROUTES
  // ============================================================================

  app.post('/api/phone-system/queue-login', requireDispatcher, async (req: Request, res: Response) => {
    try {
      const { memberId, queue, phoneNumbers } = req.body;
      
      // Check for existing session
      const existing = await queueSessionStorage.findActiveMemberSession(memberId, queue);
      if (existing) {
        return res.status(400).json({ error: true, message: 'Already logged in' });
      }
      
      const session = await queueSessionStorage.create({
        memberId,
        queue,
        phoneNumber: phoneNumbers?.[0],
        source: 'manual',
      });
      
      // TODO: Call actual phone system API
      
      res.status(201).json(session);
    } catch (error) {
      console.error('Queue login error:', error);
      res.status(500).json({ error: true, message: 'Login failed' });
    }
  });

  app.post('/api/phone-system/queue-logout', requireDispatcher, async (req: Request, res: Response) => {
    try {
      const { memberId, queue } = req.body;
      await queueSessionStorage.logoutMember(memberId, queue);
      
      // TODO: Call actual phone system API
      
      res.json({ success: true });
    } catch (error) {
      console.error('Queue logout error:', error);
      res.status(500).json({ error: true, message: 'Logout failed' });
    }
  });

  app.get('/api/phone-system/queue-members', requireDispatcher, async (_req: Request, res: Response) => {
    try {
      const sessions = await queueSessionStorage.findActive();
      
      const result: Record<string, any[]> = {
        primary: [],
        secondary: [],
        third: [],
      };
      
      for (const session of sessions) {
        const member = await memberStorage.findById(session.memberId);
        if (member && result[session.queue]) {
          result[session.queue].push({
            memberId: session.memberId,
            name: `${member.firstName} ${member.lastName}`,
            unitNumber: member.unitNumber,
            phoneNumber: session.phoneNumber,
            loggedInAt: session.loginTime,
          });
        }
      }
      
      res.json(result);
    } catch (error) {
      console.error('Get queue members error:', error);
      res.status(500).json({ error: true, message: 'Failed to get members' });
    }
  });

  app.post('/api/phone-system/callout', requireDispatcher, async (req: Request, res: Response) => {
    try {
      const { to, from, callId } = req.body;
      // TODO: Implement actual callout via phone system API
      console.log(`Callout: ${from} -> ${to} for call ${callId}`);
      res.json({ success: true });
    } catch (error) {
      console.error('Callout error:', error);
      res.status(500).json({ error: true, message: 'Callout failed' });
    }
  });

  app.get('/api/phone-system/test', requireAdmin, async (_req: Request, res: Response) => {
    // TODO: Implement phone system connection test
    res.json({ connected: true, message: 'Phone system test not implemented' });
  });

  app.get('/api/dispatcher-phones', requireAdmin, async (_req: Request, res: Response) => {
    try {
      const phones = await dispatcherPhoneStorage.findAll();
      res.json(phones);
    } catch (error) {
      console.error('Get dispatcher phones error:', error);
      res.status(500).json({ error: true, message: 'Failed to get phones' });
    }
  });

  app.get('/api/dispatcher-buckets/status', requireAdmin, async (_req: Request, res: Response) => {
    // TODO: Implement bucket status
    res.json({ buckets: [] });
  });

  // Register remaining routes
  registerReferenceDataRoutes(app);
}

/**
 * Register reference data routes (Part 3)
 */
function registerReferenceDataRoutes(app: Express) {
  
  // ============================================================================
  // HIGHWAY ROUTES
  // ============================================================================

  app.get('/api/highways', async (_req: Request, res: Response) => {
    try {
      const highways = await highwayStorage.findAll();
      res.json(highways);
    } catch (error) {
      console.error('Get highways error:', error);
      res.status(500).json({ error: true, message: 'Failed to get highways' });
    }
  });

  app.post('/api/highways', requireAdmin, async (req: Request, res: Response) => {
    try {
      const highway = await highwayStorage.create(req.body);
      res.status(201).json(highway);
    } catch (error) {
      console.error('Create highway error:', error);
      res.status(500).json({ error: true, message: 'Failed to create highway' });
    }
  });

  app.patch('/api/highways/:id', requireAdmin, async (req: Request, res: Response) => {
    try {
      const highway = await highwayStorage.update(req.params.id, req.body);
      res.json(highway);
    } catch (error) {
      console.error('Update highway error:', error);
      res.status(500).json({ error: true, message: 'Failed to update highway' });
    }
  });

  app.delete('/api/highways/:id', requireAdmin, async (req: Request, res: Response) => {
    try {
      await highwayStorage.delete(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error('Delete highway error:', error);
      res.status(500).json({ error: true, message: 'Failed to delete highway' });
    }
  });

  app.post('/api/highways/reorder', requireAdmin, async (req: Request, res: Response) => {
    try {
      const { orderedIds } = req.body;
      await highwayStorage.reorder(orderedIds);
      res.json({ success: true });
    } catch (error) {
      console.error('Reorder highways error:', error);
      res.status(500).json({ error: true, message: 'Failed to reorder' });
    }
  });

  app.post('/api/highways/discover-us-highways', requireAdmin, async (_req: Request, res: Response) => {
    // TODO: Implement AI highway discovery
    res.json({ discovered: [] });
  });

  app.post('/api/highways/add-discovered', requireAdmin, async (req: Request, res: Response) => {
    try {
      const { highways: newHighways } = req.body;
      const created = [];
      
      for (const hw of newHighways) {
        const highway = await highwayStorage.create(hw);
        created.push(highway);
      }
      
      res.status(201).json(created);
    } catch (error) {
      console.error('Add discovered highways error:', error);
      res.status(500).json({ error: true, message: 'Failed to add highways' });
    }
  });

  // ============================================================================
  // HIGHWAY EXIT ROUTES
  // ============================================================================

  app.get('/api/highway-exits', async (req: Request, res: Response) => {
    try {
      const highwayId = req.query.highwayId as string;
      if (!highwayId) {
        return res.status(400).json({ error: true, message: 'highwayId required' });
      }
      const exits = await highwayExitStorage.findByHighway(highwayId);
      res.json(exits);
    } catch (error) {
      console.error('Get exits error:', error);
      res.status(500).json({ error: true, message: 'Failed to get exits' });
    }
  });

  app.post('/api/highway-exits', requireAdmin, async (req: Request, res: Response) => {
    try {
      const exit = await highwayExitStorage.create(req.body);
      res.status(201).json(exit);
    } catch (error) {
      console.error('Create exit error:', error);
      res.status(500).json({ error: true, message: 'Failed to create exit' });
    }
  });

  app.get('/api/highway-exits/template', requireAdmin, (_req: Request, res: Response) => {
    const template = 'exitNumber,exitName,latitude,longitude,direction\n105,Lakewood / Route 88,40.0,-74.2,North';
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=highway-exits-template.csv');
    res.send(template);
  });

  const upload = multer({ storage: multer.memoryStorage() });
  
  app.post('/api/highway-exits/upload', requireAdmin, upload.single('file'), async (req: Request, res: Response) => {
    try {
      // TODO: Parse CSV and create exits
      res.json({ success: true, message: 'Upload not fully implemented' });
    } catch (error) {
      console.error('Upload exits error:', error);
      res.status(500).json({ error: true, message: 'Upload failed' });
    }
  });

  // ============================================================================
  // VEHICLE ROUTES
  // ============================================================================

  app.get('/api/car-makes', async (_req: Request, res: Response) => {
    try {
      const makes = await carMakeStorage.findAll();
      res.json(makes);
    } catch (error) {
      console.error('Get makes error:', error);
      res.status(500).json({ error: true, message: 'Failed to get makes' });
    }
  });

  app.post('/api/car-makes', requireAdmin, async (req: Request, res: Response) => {
    try {
      const make = await carMakeStorage.create(req.body);
      res.status(201).json(make);
    } catch (error) {
      console.error('Create make error:', error);
      res.status(500).json({ error: true, message: 'Failed to create make' });
    }
  });

  app.get('/api/car-models', async (req: Request, res: Response) => {
    try {
      const makeId = req.query.makeId as string;
      const models = makeId 
        ? await carModelStorage.findByMake(makeId)
        : await carModelStorage.findAll();
      res.json(models);
    } catch (error) {
      console.error('Get models error:', error);
      res.status(500).json({ error: true, message: 'Failed to get models' });
    }
  });

  app.post('/api/car-models', requireAdmin, async (req: Request, res: Response) => {
    try {
      const model = await carModelStorage.create(req.body);
      res.status(201).json(model);
    } catch (error) {
      console.error('Create model error:', error);
      res.status(500).json({ error: true, message: 'Failed to create model' });
    }
  });

  app.post('/api/cars/discover-cars', requireAdmin, async (_req: Request, res: Response) => {
    // TODO: Implement AI car discovery
    res.json({ discovered: [] });
  });

  app.post('/api/cars/add-discovered', requireAdmin, async (req: Request, res: Response) => {
    try {
      const { makes } = req.body;
      // TODO: Add discovered makes and models
      res.status(201).json({ success: true });
    } catch (error) {
      console.error('Add discovered cars error:', error);
      res.status(500).json({ error: true, message: 'Failed to add cars' });
    }
  });

  app.post('/api/vehicles/fetch-new', requireAdmin, async (_req: Request, res: Response) => {
    res.json({ fetched: [] });
  });

  app.post('/api/vehicles/add-selected', requireAdmin, async (req: Request, res: Response) => {
    res.json({ success: true });
  });

  app.post('/api/seed-vehicles', requireAdmin, async (_req: Request, res: Response) => {
    // TODO: Seed with common vehicles
    res.json({ success: true, message: 'Seeding not implemented' });
  });

  app.post('/api/fuzzy-match-vehicle', requireDispatcher, async (req: Request, res: Response) => {
    try {
      const { text } = req.body;
      // TODO: Implement fuzzy matching
      res.json({ makeId: null, modelId: null, color: null, confidence: 0 });
    } catch (error) {
      console.error('Fuzzy match error:', error);
      res.status(500).json({ error: true, message: 'Match failed' });
    }
  });

  app.get('/api/excluded-manufacturers', requireAdmin, async (_req: Request, res: Response) => {
    // TODO: Implement excluded manufacturers
    res.json([]);
  });

  // ============================================================================
  // AGENCY ROUTES
  // ============================================================================

  app.get('/api/agencies', async (_req: Request, res: Response) => {
    try {
      const agencies = await agencyStorage.findAll();
      res.json(agencies);
    } catch (error) {
      console.error('Get agencies error:', error);
      res.status(500).json({ error: true, message: 'Failed to get agencies' });
    }
  });

  app.post('/api/agencies', requireAdmin, async (req: Request, res: Response) => {
    try {
      const agency = await agencyStorage.create(req.body);
      res.status(201).json(agency);
    } catch (error) {
      console.error('Create agency error:', error);
      res.status(500).json({ error: true, message: 'Failed to create agency' });
    }
  });

  app.patch('/api/agencies/:id', requireAdmin, async (req: Request, res: Response) => {
    try {
      const agency = await agencyStorage.update(req.params.id, req.body);
      res.json(agency);
    } catch (error) {
      console.error('Update agency error:', error);
      res.status(500).json({ error: true, message: 'Failed to update agency' });
    }
  });

  app.delete('/api/agencies/:id', requireAdmin, async (req: Request, res: Response) => {
    try {
      await agencyStorage.delete(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error('Delete agency error:', error);
      res.status(500).json({ error: true, message: 'Failed to delete agency' });
    }
  });

  // ============================================================================
  // PROBLEM CODE ROUTES
  // ============================================================================

  app.get('/api/problem-codes', async (_req: Request, res: Response) => {
    try {
      const codes = await problemCodeStorage.findAll();
      res.json(codes);
    } catch (error) {
      console.error('Get problem codes error:', error);
      res.status(500).json({ error: true, message: 'Failed to get codes' });
    }
  });

  app.post('/api/problem-codes', requireAdmin, async (req: Request, res: Response) => {
    try {
      const code = await problemCodeStorage.create(req.body);
      res.status(201).json(code);
    } catch (error) {
      console.error('Create problem code error:', error);
      res.status(500).json({ error: true, message: 'Failed to create code' });
    }
  });

  app.patch('/api/problem-codes/:id', requireAdmin, async (req: Request, res: Response) => {
    try {
      const code = await problemCodeStorage.update(req.params.id, req.body);
      res.json(code);
    } catch (error) {
      console.error('Update problem code error:', error);
      res.status(500).json({ error: true, message: 'Failed to update code' });
    }
  });

  app.delete('/api/problem-codes/:id', requireAdmin, async (req: Request, res: Response) => {
    try {
      await problemCodeStorage.delete(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error('Delete problem code error:', error);
      res.status(500).json({ error: true, message: 'Failed to delete code' });
    }
  });

  // Register system routes
  registerSystemRoutes(app);
}

/**
 * Register system routes (Part 4)
 */
function registerSystemRoutes(app: Express) {
  
  // ============================================================================
  // IMPORTANT PHONES ROUTES
  // ============================================================================

  app.get('/api/important-phones', async (_req: Request, res: Response) => {
    try {
      const phones = await importantPhoneStorage.findAll();
      res.json(phones);
    } catch (error) {
      console.error('Get important phones error:', error);
      res.status(500).json({ error: true, message: 'Failed to get phones' });
    }
  });

  app.post('/api/important-phones', requireAdmin, async (req: Request, res: Response) => {
    try {
      const phone = await importantPhoneStorage.create(req.body);
      res.status(201).json(phone);
    } catch (error) {
      console.error('Create important phone error:', error);
      res.status(500).json({ error: true, message: 'Failed to create phone' });
    }
  });

  app.patch('/api/important-phones/:id', requireAdmin, async (req: Request, res: Response) => {
    try {
      const phone = await importantPhoneStorage.update(req.params.id, req.body);
      res.json(phone);
    } catch (error) {
      console.error('Update important phone error:', error);
      res.status(500).json({ error: true, message: 'Failed to update phone' });
    }
  });

  app.delete('/api/important-phones/:id', requireAdmin, async (req: Request, res: Response) => {
    try {
      await importantPhoneStorage.delete(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error('Delete important phone error:', error);
      res.status(500).json({ error: true, message: 'Failed to delete phone' });
    }
  });

  app.get('/api/phone-categories', async (_req: Request, res: Response) => {
    try {
      const categories = await phoneCategoryStorage.findAll();
      res.json(categories);
    } catch (error) {
      console.error('Get phone categories error:', error);
      res.status(500).json({ error: true, message: 'Failed to get categories' });
    }
  });

  app.post('/api/phone-categories', requireAdmin, async (req: Request, res: Response) => {
    try {
      const category = await phoneCategoryStorage.create(req.body);
      res.status(201).json(category);
    } catch (error) {
      console.error('Create phone category error:', error);
      res.status(500).json({ error: true, message: 'Failed to create category' });
    }
  });

  // ============================================================================
  // AI & SMART FEATURES ROUTES
  // ============================================================================

  app.post('/api/ai/search-dispatcher-guide', requireAuth, async (req: Request, res: Response) => {
    try {
      const { question } = req.body;
      // TODO: Implement AI search using OpenAI
      res.json({ answer: 'AI search not implemented yet. Please refer to the documentation.' });
    } catch (error) {
      console.error('AI search error:', error);
      res.status(500).json({ error: true, message: 'Search failed' });
    }
  });

  app.post('/api/extract-text-from-image', requireDispatcher, upload.single('image'), async (req: Request, res: Response) => {
    try {
      // TODO: Implement OCR
      res.json({ text: '', confidence: 0 });
    } catch (error) {
      console.error('OCR error:', error);
      res.status(500).json({ error: true, message: 'OCR failed' });
    }
  });

  app.post('/api/ocr/process', requireDispatcher, upload.single('image'), async (req: Request, res: Response) => {
    try {
      // TODO: Implement OCR
      res.json({ text: '', confidence: 0 });
    } catch (error) {
      console.error('OCR error:', error);
      res.status(500).json({ error: true, message: 'OCR failed' });
    }
  });

  app.post('/api/convert-waze-url', requireDispatcher, async (req: Request, res: Response) => {
    try {
      const { wazeUrl } = req.body;
      
      // Extract coordinates from Waze URL
      const llMatch = wazeUrl.match(/ll=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
      const navigateMatch = wazeUrl.match(/navigate=yes.*?ll=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
      
      let lat: number | null = null;
      let lng: number | null = null;
      
      if (llMatch) {
        lat = parseFloat(llMatch[1]);
        lng = parseFloat(llMatch[2]);
      } else if (navigateMatch) {
        lat = parseFloat(navigateMatch[1]);
        lng = parseFloat(navigateMatch[2]);
      }
      
      if (lat && lng) {
        res.json({
          success: true,
          googleMapsUrl: `https://maps.google.com/?q=${lat},${lng}`,
          latitude: lat,
          longitude: lng,
        });
      } else {
        res.status(400).json({ error: true, message: 'Could not extract coordinates from Waze URL' });
      }
    } catch (error) {
      console.error('Convert Waze URL error:', error);
      res.status(500).json({ error: true, message: 'Conversion failed' });
    }
  });

  // ============================================================================
  // OUTGOING CALLS & BROADCASTS
  // ============================================================================

  app.get('/api/active-outgoing', requireDispatcher, async (_req: Request, res: Response) => {
    // TODO: Implement active outgoing tracking
    res.json([]);
  });

  app.get('/api/recent-outgoing', requireDispatcher, async (req: Request, res: Response) => {
    // TODO: Implement recent outgoing tracking
    res.json([]);
  });

  app.post('/api/admin/broadcast', requireAdmin, async (req: Request, res: Response) => {
    try {
      const { message, channels, recipientGroups } = req.body;
      // TODO: Implement broadcast
      console.log('Admin broadcast:', { message, channels, recipientGroups });
      res.json({ success: true });
    } catch (error) {
      console.error('Admin broadcast error:', error);
      res.status(500).json({ error: true, message: 'Broadcast failed' });
    }
  });

  // ============================================================================
  // SETTINGS ROUTES
  // ============================================================================

  app.get('/api/settings', requireAdmin, async (_req: Request, res: Response) => {
    try {
      const settings = await settingStorage.findAll();
      const result: Record<string, string> = {};
      for (const s of settings) {
        result[s.key] = s.value || '';
      }
      res.json(result);
    } catch (error) {
      console.error('Get settings error:', error);
      res.status(500).json({ error: true, message: 'Failed to get settings' });
    }
  });

  app.patch('/api/settings', requireAdmin, async (req: Request, res: Response) => {
    try {
      for (const [key, value] of Object.entries(req.body)) {
        await settingStorage.upsert(key, value as string);
      }
      res.json({ success: true });
    } catch (error) {
      console.error('Update settings error:', error);
      res.status(500).json({ error: true, message: 'Failed to update settings' });
    }
  });

  app.get('/api/config/google-places', requireAuth, async (_req: Request, res: Response) => {
    res.json({
      apiKey: process.env.GOOGLE_MAPS_API_KEY || '',
      restrictions: { country: 'us' },
    });
  });

  // ============================================================================
  // APP VERSIONS
  // ============================================================================

  app.get('/api/app-versions', requireAdmin, async (_req: Request, res: Response) => {
    try {
      const versions = await appVersionStorage.findAll();
      res.json(versions);
    } catch (error) {
      console.error('Get versions error:', error);
      res.status(500).json({ error: true, message: 'Failed to get versions' });
    }
  });

  app.post('/api/app-versions', requireAdmin, async (req: Request, res: Response) => {
    try {
      const version = await appVersionStorage.create(req.body);
      res.status(201).json(version);
    } catch (error) {
      console.error('Create version error:', error);
      res.status(500).json({ error: true, message: 'Failed to create version' });
    }
  });

  app.get('/api/network-stats', requireAdmin, (_req: Request, res: Response) => {
    res.json({ stats: {} });
  });

  // ============================================================================
  // WEBHOOK LOGS
  // ============================================================================

  app.get('/api/webhook-logs', requireAdmin, async (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const logs = await webhookLogStorage.findAll(limit);
      res.json(logs);
    } catch (error) {
      console.error('Get webhook logs error:', error);
      res.status(500).json({ error: true, message: 'Failed to get logs' });
    }
  });

  app.get('/api/incoming-webhook-logs', requireAdmin, async (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const logs = await incomingWebhookLogStorage.findAll(limit);
      res.json(logs);
    } catch (error) {
      console.error('Get incoming webhook logs error:', error);
      res.status(500).json({ error: true, message: 'Failed to get logs' });
    }
  });

  app.get('/api/admin/shift-monitor/events', requireAdmin, async (_req: Request, res: Response) => {
    // TODO: Implement shift monitor events
    res.json([]);
  });

  // ============================================================================
  // FILE STORAGE ROUTES
  // ============================================================================

  app.post('/api/objects/upload', requireAuth, upload.single('file'), async (req: Request, res: Response) => {
    try {
      // TODO: Implement file storage (S3, local, etc.)
      res.json({ success: true, path: '', url: '' });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ error: true, message: 'Upload failed' });
    }
  });

  app.get('/api/objects/get-download-url', requireAuth, async (req: Request, res: Response) => {
    try {
      const path = req.query.path as string;
      // TODO: Generate signed URL
      res.json({ url: path, expiresAt: new Date(Date.now() + 3600000) });
    } catch (error) {
      console.error('Get download URL error:', error);
      res.status(500).json({ error: true, message: 'Failed to get URL' });
    }
  });

  app.post('/api/objects/normalize-path', requireAuth, (req: Request, res: Response) => {
    const { path } = req.body;
    res.json({ normalizedPath: path?.replace(/\\/g, '/') });
  });

  // ============================================================================
  // FEEDBACK ROUTES
  // ============================================================================

  app.get('/api/feedback', requireAdmin, async (_req: Request, res: Response) => {
    try {
      const feedback = await feedbackStorage.findAll();
      res.json(feedback);
    } catch (error) {
      console.error('Get feedback error:', error);
      res.status(500).json({ error: true, message: 'Failed to get feedback' });
    }
  });

  app.post('/api/feedback', requireAuth, async (req: Request, res: Response) => {
    try {
      const fb = await feedbackStorage.create({
        ...req.body,
        userId: req.user!.id,
      });
      res.status(201).json(fb);
    } catch (error) {
      console.error('Create feedback error:', error);
      res.status(500).json({ error: true, message: 'Failed to submit feedback' });
    }
  });

  app.patch('/api/feedback/:id', requireAdmin, async (req: Request, res: Response) => {
    try {
      const fb = await feedbackStorage.update(req.params.id, req.body);
      res.json(fb);
    } catch (error) {
      console.error('Update feedback error:', error);
      res.status(500).json({ error: true, message: 'Failed to update feedback' });
    }
  });

  app.get('/api/feedback/unread-count', requireAdmin, async (_req: Request, res: Response) => {
    try {
      const count = await feedbackStorage.findUnreadCount();
      res.json({ count });
    } catch (error) {
      console.error('Get unread count error:', error);
      res.status(500).json({ error: true, message: 'Failed to get count' });
    }
  });

  // ============================================================================
  // EMAIL TESTING ROUTES
  // ============================================================================

  app.get('/api/test-email', requireAdmin, (_req: Request, res: Response) => {
    res.json({
      configured: !!process.env.SENDGRID_API_KEY,
      provider: 'sendgrid',
      fromEmail: process.env.EMAIL_FROM || 'dispatch@chaveirim.org',
    });
  });

  app.post('/api/test-email-send', requireAdmin, async (req: Request, res: Response) => {
    try {
      const { to, subject, body } = req.body;
      // TODO: Send test email via SendGrid
      console.log('Test email:', { to, subject, body });
      res.json({ success: true, messageId: 'test-' + Date.now() });
    } catch (error) {
      console.error('Test email error:', error);
      res.status(500).json({ error: true, message: 'Email send failed' });
    }
  });
}
