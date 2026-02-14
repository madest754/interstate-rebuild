/**
 * Vercel Serverless API Handler
 * 
 * Full API for Vercel serverless deployment - no authentication required.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Get path - remove /api prefix if present
  let path = req.url || '/';
  if (path.startsWith('/api')) {
    path = path.substring(4);
  }
  // Remove query string for routing, but keep for parsing
  const queryIndex = path.indexOf('?');
  const queryString = queryIndex > -1 ? path.substring(queryIndex) : '';
  path = queryIndex > -1 ? path.substring(0, queryIndex) : path;
  
  // Check DATABASE_URL
  if (!process.env.DATABASE_URL) {
    return res.status(500).json({ 
      error: 'Database not configured',
      message: 'Please set DATABASE_URL environment variable in Vercel project settings'
    });
  }

  const sql = neon(process.env.DATABASE_URL);
  const method = req.method || 'GET';
  const body = req.body || {};

  try {
    // ==================== HEALTH ====================
    if (path === '/health' || path === '/' || path === '') {
      return res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        mode: 'serverless-full'
      });
    }

    // ==================== USER (mock) ====================
    if (path === '/user' && method === 'GET') {
      return res.json({
        id: 'default-user',
        email: 'dispatcher@chaveirim.org',
        role: 'dispatcher',
        memberId: null,
        firstName: 'Dispatcher',
        lastName: '',
        unitNumber: '000',
      });
    }

    // ==================== CALLS ====================
    if (path === '/calls' && method === 'GET') {
      const result = await sql`
        SELECT * FROM calls 
        ORDER BY urgent DESC, created_at DESC
        LIMIT 100
      `;
      return res.json(result);
    }

    if (path === '/calls/active' && method === 'GET') {
      const result = await sql`
        SELECT * FROM calls 
        WHERE status = 'active'
        ORDER BY urgent DESC, created_at DESC
      `;
      return res.json(result);
    }

    if (path.match(/^\/calls\/[^/]+$/) && method === 'GET') {
      const id = path.split('/')[2];
      const result = await sql`SELECT * FROM calls WHERE id = ${id}`;
      if (result.length === 0) {
        return res.status(404).json({ error: 'Call not found' });
      }
      return res.json(result[0]);
    }

    if (path === '/calls' && method === 'POST') {
      const { 
        callNumber, nature, callerPhone, callerName, callbackPhone,
        highwayId, direction, betweenExit, andExit,
        address, city, state, zip, latitude, longitude, freeTextLocation,
        vehicleMake, vehicleModel, vehicleColor, vehicleLicensePlate, vehicleState,
        urgent, dispatcherId, notes
      } = body;
      
      const result = await sql`
        INSERT INTO calls (
          call_number, nature, caller_phone, caller_name, callback_phone,
          highway_id, direction, between_exit, and_exit,
          address, city, state, zip, latitude, longitude, free_text_location,
          vehicle_make, vehicle_model, vehicle_color, vehicle_license_plate, vehicle_state,
          urgent, dispatcher_id, notes, status
        ) VALUES (
          ${callNumber || `C${Date.now()}`}, ${nature}, ${callerPhone}, ${callerName}, ${callbackPhone},
          ${highwayId}, ${direction}, ${betweenExit}, ${andExit},
          ${address}, ${city}, ${state}, ${zip}, ${latitude}, ${longitude}, ${freeTextLocation},
          ${vehicleMake}, ${vehicleModel}, ${vehicleColor}, ${vehicleLicensePlate}, ${vehicleState},
          ${urgent || false}, ${dispatcherId}, ${notes}, 'active'
        )
        RETURNING *
      `;
      return res.status(201).json(result[0]);
    }

    if (path.match(/^\/calls\/[^/]+$/) && method === 'PATCH') {
      const id = path.split('/')[2];
      const updates = body;
      
      // Build dynamic update
      const setClauses: string[] = [];
      const values: any[] = [];
      
      Object.entries(updates).forEach(([key, value]) => {
        // Convert camelCase to snake_case
        const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        setClauses.push(`${snakeKey} = $${values.length + 1}`);
        values.push(value);
      });
      
      if (setClauses.length === 0) {
        return res.status(400).json({ error: 'No updates provided' });
      }
      
      setClauses.push(`updated_at = NOW()`);
      values.push(id);
      
      const result = await sql`
        UPDATE calls 
        SET ${sql.unsafe(setClauses.join(', '))}
        WHERE id = ${id}
        RETURNING *
      `;
      
      if (result.length === 0) {
        return res.status(404).json({ error: 'Call not found' });
      }
      return res.json(result[0]);
    }

    if (path.match(/^\/calls\/[^/]+\/close$/) && method === 'POST') {
      const id = path.split('/')[2];
      const { closeReason, closeNotes } = body;
      
      const result = await sql`
        UPDATE calls 
        SET status = 'closed', close_reason = ${closeReason}, close_notes = ${closeNotes}, 
            closed_at = NOW(), updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `;
      
      if (result.length === 0) {
        return res.status(404).json({ error: 'Call not found' });
      }
      return res.json(result[0]);
    }

    // ==================== ASSIGNMENTS ====================
    if (path.match(/^\/calls\/[^/]+\/assignments$/) && method === 'GET') {
      const callId = path.split('/')[2];
      const result = await sql`
        SELECT ca.*, m.unit_number, m.first_name, m.last_name, m.cell_phone
        FROM call_assignments ca
        LEFT JOIN members m ON ca.member_id = m.id
        WHERE ca.call_id = ${callId}
        ORDER BY ca.assigned_at
      `;
      return res.json(result);
    }

    if (path.match(/^\/calls\/[^/]+\/assignments$/) && method === 'POST') {
      const callId = path.split('/')[2];
      const { memberId, role, notes } = body;
      
      const result = await sql`
        INSERT INTO call_assignments (call_id, member_id, role, notes)
        VALUES (${callId}, ${memberId}, ${role || 'responder'}, ${notes})
        RETURNING *
      `;
      return res.status(201).json(result[0]);
    }

    if (path.match(/^\/assignments\/[^/]+$/) && method === 'DELETE') {
      const id = path.split('/')[2];
      await sql`DELETE FROM call_assignments WHERE id = ${id}`;
      return res.json({ success: true });
    }

    // ==================== MEMBERS ====================
    if (path === '/members' && method === 'GET') {
      const result = await sql`
        SELECT * FROM members 
        WHERE active = true 
        ORDER BY unit_number
      `;
      return res.json(result);
    }

    if (path === '/members/dispatchers' && method === 'GET') {
      const result = await sql`
        SELECT * FROM members 
        WHERE active = true AND is_dispatcher = true
        ORDER BY unit_number
      `;
      return res.json(result);
    }

    if (path === '/members/search' && method === 'GET') {
      const params = new URLSearchParams(queryString);
      const q = params.get('q') || '';
      const result = await sql`
        SELECT * FROM members 
        WHERE active = true 
        AND (
          unit_number ILIKE ${'%' + q + '%'}
          OR first_name ILIKE ${'%' + q + '%'}
          OR last_name ILIKE ${'%' + q + '%'}
          OR cell_phone ILIKE ${'%' + q + '%'}
        )
        ORDER BY unit_number
        LIMIT 20
      `;
      return res.json(result);
    }

    if (path.match(/^\/members\/[^/]+$/) && method === 'GET') {
      const id = path.split('/')[2];
      const result = await sql`SELECT * FROM members WHERE id = ${id}`;
      if (result.length === 0) {
        return res.status(404).json({ error: 'Member not found' });
      }
      return res.json(result[0]);
    }

    if (path === '/members' && method === 'POST') {
      const { unitNumber, firstName, lastName, cellPhone, homePhone, email, address, city, state, zip, isDispatcher, isCoordinator } = body;
      
      const result = await sql`
        INSERT INTO members (unit_number, first_name, last_name, cell_phone, home_phone, email, address, city, state, zip, is_dispatcher, is_coordinator)
        VALUES (${unitNumber}, ${firstName}, ${lastName}, ${cellPhone}, ${homePhone}, ${email}, ${address}, ${city}, ${state}, ${zip}, ${isDispatcher || false}, ${isCoordinator || false})
        RETURNING *
      `;
      return res.status(201).json(result[0]);
    }

    if (path.match(/^\/members\/[^/]+$/) && method === 'PATCH') {
      const id = path.split('/')[2];
      const { unitNumber, firstName, lastName, cellPhone, homePhone, email, address, city, state, zip, isDispatcher, isCoordinator, active } = body;
      
      const result = await sql`
        UPDATE members 
        SET unit_number = COALESCE(${unitNumber}, unit_number),
            first_name = COALESCE(${firstName}, first_name),
            last_name = COALESCE(${lastName}, last_name),
            cell_phone = COALESCE(${cellPhone}, cell_phone),
            home_phone = COALESCE(${homePhone}, home_phone),
            email = COALESCE(${email}, email),
            address = COALESCE(${address}, address),
            city = COALESCE(${city}, city),
            state = COALESCE(${state}, state),
            zip = COALESCE(${zip}, zip),
            is_dispatcher = COALESCE(${isDispatcher}, is_dispatcher),
            is_coordinator = COALESCE(${isCoordinator}, is_coordinator),
            active = COALESCE(${active}, active),
            updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `;
      
      if (result.length === 0) {
        return res.status(404).json({ error: 'Member not found' });
      }
      return res.json(result[0]);
    }

    // ==================== HIGHWAYS ====================
    if (path === '/highways' && method === 'GET') {
      const result = await sql`SELECT * FROM highways WHERE active = true ORDER BY sort_order, name`;
      return res.json(result);
    }

    if (path.match(/^\/highways\/[^/]+\/exits$/) && method === 'GET') {
      const highwayId = path.split('/')[2];
      const result = await sql`SELECT * FROM highway_exits WHERE highway_id = ${highwayId} AND active = true ORDER BY sort_order, exit_number`;
      return res.json(result);
    }

    // ==================== CAR MAKES/MODELS ====================
    if (path === '/car-makes' && method === 'GET') {
      const result = await sql`SELECT * FROM car_makes WHERE active = true ORDER BY sort_order, name`;
      return res.json(result);
    }

    if (path.match(/^\/car-models\/[^/]+$/) && method === 'GET') {
      const makeId = path.split('/')[2];
      const result = await sql`SELECT * FROM car_models WHERE make_id = ${makeId} AND active = true ORDER BY name`;
      return res.json(result);
    }

    // ==================== AGENCIES ====================
    if (path === '/agencies' && method === 'GET') {
      const result = await sql`SELECT * FROM agencies WHERE active = true ORDER BY sort_order, name`;
      return res.json(result);
    }

    // ==================== PROBLEM CODES ====================
    if (path === '/problem-codes' && method === 'GET') {
      const result = await sql`SELECT * FROM problem_codes WHERE active = true ORDER BY sort_order, code`;
      return res.json(result);
    }

    // ==================== IMPORTANT PHONES ====================
    if (path === '/important-phones' && method === 'GET') {
      const result = await sql`SELECT * FROM important_phones WHERE active = true ORDER BY sort_order, name`;
      return res.json(result);
    }

    if (path === '/phone-categories' && method === 'GET') {
      const result = await sql`SELECT * FROM phone_categories ORDER BY sort_order, name`;
      return res.json(result);
    }

    // ==================== SCHEDULES ====================
    if (path === '/schedules' && method === 'GET') {
      const result = await sql`SELECT * FROM schedules WHERE active = true ORDER BY day_of_week, start_time`;
      return res.json(result);
    }

    // ==================== DRAFTS ====================
    if (path === '/drafts' && method === 'GET') {
      const result = await sql`SELECT * FROM drafts ORDER BY updated_at DESC`;
      return res.json(result);
    }

    if (path === '/drafts' && method === 'POST') {
      const { data, notes, userId } = body;
      const result = await sql`
        INSERT INTO drafts (data, notes, user_id)
        VALUES (${JSON.stringify(data)}, ${notes}, ${userId || 'default-user'})
        RETURNING *
      `;
      return res.status(201).json(result[0]);
    }

    if (path.match(/^\/drafts\/[^/]+$/) && method === 'DELETE') {
      const id = path.split('/')[2];
      await sql`DELETE FROM drafts WHERE id = ${id}`;
      return res.json({ success: true });
    }

    // ==================== QUEUE ====================
    if (path === '/queue/members' && method === 'GET') {
      const result = await sql`
        SELECT qs.*, m.unit_number, m.first_name, m.last_name, m.cell_phone
        FROM queue_sessions qs
        JOIN members m ON qs.member_id = m.id
        WHERE qs.logged_out_at IS NULL
        ORDER BY qs.logged_in_at
      `;
      return res.json(result);
    }

    // ==================== INTERNAL NOTES ====================
    if (path.match(/^\/calls\/[^/]+\/notes$/) && method === 'GET') {
      const callId = path.split('/')[2];
      const result = await sql`
        SELECT * FROM internal_notes 
        WHERE call_id = ${callId}
        ORDER BY created_at DESC
      `;
      return res.json(result);
    }

    if (path.match(/^\/calls\/[^/]+\/notes$/) && method === 'POST') {
      const callId = path.split('/')[2];
      const { note, userId } = body;
      
      const result = await sql`
        INSERT INTO internal_notes (call_id, note, user_id)
        VALUES (${callId}, ${note}, ${userId || 'default-user'})
        RETURNING *
      `;
      return res.status(201).json(result[0]);
    }

    // ==================== 404 ====================
    return res.status(404).json({ 
      error: 'Not found',
      path: path,
      method: method
    });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
