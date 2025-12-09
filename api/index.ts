/**
 * Vercel Serverless API Handler
 * 
 * Simplified API for Vercel serverless deployment.
 * For full functionality (WebSocket, sessions), use Railway or Render.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Get path - remove /api prefix if present
  let path = req.url || '/';
  if (path.startsWith('/api')) {
    path = path.substring(4);
  }
  // Remove query string
  path = path.split('?')[0];
  
  // Check DATABASE_URL
  if (!process.env.DATABASE_URL) {
    return res.status(500).json({ 
      error: 'Database not configured',
      message: 'Please set DATABASE_URL environment variable in Vercel project settings'
    });
  }

  const sql = neon(process.env.DATABASE_URL);

  try {
    // Health check
    if (path === '/health' || path === '/' || path === '') {
      return res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        mode: 'serverless',
        note: 'For full functionality (login, WebSocket), deploy to Railway'
      });
    }

    // Get highways
    if (path === '/highways' && req.method === 'GET') {
      const result = await sql`SELECT * FROM highways WHERE active = true ORDER BY sort_order, name`;
      return res.json(result);
    }

    // Get car makes
    if (path === '/car-makes' && req.method === 'GET') {
      const result = await sql`SELECT * FROM car_makes WHERE active = true ORDER BY sort_order, name`;
      return res.json(result);
    }

    // Get car models
    if (path.startsWith('/car-models/') && req.method === 'GET') {
      const makeId = path.replace('/car-models/', '');
      const result = await sql`SELECT * FROM car_models WHERE make_id = ${makeId} AND active = true ORDER BY name`;
      return res.json(result);
    }

    // Get agencies
    if (path === '/agencies' && req.method === 'GET') {
      const result = await sql`SELECT * FROM agencies WHERE active = true ORDER BY sort_order, name`;
      return res.json(result);
    }

    // Get problem codes
    if (path === '/problem-codes' && req.method === 'GET') {
      const result = await sql`SELECT * FROM problem_codes WHERE active = true ORDER BY sort_order, code`;
      return res.json(result);
    }

    // Get active calls (public view)
    if (path === '/calls' && req.method === 'GET') {
      const result = await sql`
        SELECT id, call_number, nature, status, urgent, created_at,
               highway_id, direction, between_exit, and_exit,
               address, city, state, free_text_location
        FROM calls 
        WHERE status = 'active'
        ORDER BY urgent DESC, created_at DESC
        LIMIT 50
      `;
      return res.json(result);
    }

    // Get members (basic info only)
    if (path === '/members' && req.method === 'GET') {
      const result = await sql`
        SELECT id, unit_number, first_name, last_name, active, is_dispatcher, is_coordinator
        FROM members 
        WHERE active = true 
        ORDER BY unit_number
      `;
      return res.json(result);
    }

    // User endpoint - return not authenticated in serverless mode
    if (path === '/user' && req.method === 'GET') {
      return res.status(401).json({ 
        error: 'Not authenticated',
        message: 'Authentication requires session support. Deploy to Railway for full functionality.'
      });
    }

    // 404 for unknown routes
    return res.status(404).json({ 
      error: 'Not found',
      path: path,
      message: 'This endpoint may not be available in serverless mode.',
      availableEndpoints: [
        'GET /api/health',
        'GET /api/highways',
        'GET /api/car-makes',
        'GET /api/car-models/:makeId',
        'GET /api/agencies', 
        'GET /api/problem-codes',
        'GET /api/calls',
        'GET /api/members'
      ]
    });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
