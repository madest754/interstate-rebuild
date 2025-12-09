/**
 * Authentication Module
 * 
 * Sets up Passport.js with local strategy for email/password authentication.
 * Handles login, logout, and session management.
 */

import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import bcrypt from 'bcrypt';
import type { Express, Request, Response, NextFunction } from 'express';
import { db } from '../shared/db';
import { users, members } from '../shared/schema';
import { eq } from 'drizzle-orm';

// Extend Express types for session user
declare global {
  namespace Express {
    interface User {
      id: string;
      email: string;
      role: string;
      memberId: string | null;
      unitNumber?: string;
      firstName?: string;
      lastName?: string;
    }
  }
}

/**
 * Setup Passport authentication
 */
export function setupAuth(app: Express) {
  app.use(passport.initialize());
  app.use(passport.session());

  // Local strategy for email/password authentication
  passport.use(new LocalStrategy(
    {
      usernameField: 'email',
      passwordField: 'password',
    },
    async (email, password, done) => {
      try {
        // Find user by email
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, email.toLowerCase()))
          .limit(1);

        if (!user) {
          return done(null, false, { message: 'Invalid email or password' });
        }

        if (!user.isActive) {
          return done(null, false, { message: 'Account is disabled' });
        }

        // Verify password
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
          return done(null, false, { message: 'Invalid email or password' });
        }

        // Update last login
        await db
          .update(users)
          .set({ lastLogin: new Date() })
          .where(eq(users.id, user.id));

        // Get member info if linked
        let memberInfo = null;
        if (user.memberId) {
          const [member] = await db
            .select()
            .from(members)
            .where(eq(members.id, user.memberId))
            .limit(1);
          memberInfo = member;
        }

        return done(null, {
          id: user.id,
          email: user.email,
          role: user.role,
          memberId: user.memberId,
          unitNumber: memberInfo?.unitNumber,
          firstName: memberInfo?.firstName,
          lastName: memberInfo?.lastName,
        });
      } catch (error) {
        return done(error);
      }
    }
  ));

  // Serialize user to session
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  // Deserialize user from session
  passport.deserializeUser(async (id: string, done) => {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);

      if (!user || !user.isActive) {
        return done(null, false);
      }

      // Get member info if linked
      let memberInfo = null;
      if (user.memberId) {
        const [member] = await db
          .select()
          .from(members)
          .where(eq(members.id, user.memberId))
          .limit(1);
        memberInfo = member;
      }

      done(null, {
        id: user.id,
        email: user.email,
        role: user.role,
        memberId: user.memberId,
        unitNumber: memberInfo?.unitNumber,
        firstName: memberInfo?.firstName,
        lastName: memberInfo?.lastName,
      });
    } catch (error) {
      done(error);
    }
  });
}

/**
 * Middleware to require authentication
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: true, message: 'Authentication required' });
}

/**
 * Middleware to require dispatcher role or higher
 */
export function requireDispatcher(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: true, message: 'Authentication required' });
  }
  
  if (req.user.role === 'admin' || req.user.role === 'dispatcher') {
    return next();
  }
  
  res.status(403).json({ error: true, message: 'Dispatcher access required' });
}

/**
 * Middleware to require admin role
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: true, message: 'Authentication required' });
  }
  
  if (req.user.role === 'admin') {
    return next();
  }
  
  res.status(403).json({ error: true, message: 'Admin access required' });
}

/**
 * Hash a password
 */
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

/**
 * Verify a password
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
