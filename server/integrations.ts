/**
 * External Integrations Service
 * 
 * Handles integrations with external services:
 * - Email (SendGrid)
 * - SMS (Twilio)
 * - WhatsApp (WAHA API)
 * - Phone System
 * - AI (OpenAI)
 */

import { webhookLogStorage } from './storage';

// ============================================================================
// EMAIL SERVICE (SendGrid)
// ============================================================================

interface EmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  from?: string;
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  const apiKey = process.env.SENDGRID_API_KEY;
  
  if (!apiKey) {
    console.warn('SendGrid API key not configured');
    return false;
  }

  const fromEmail = options.from || process.env.EMAIL_FROM || 'dispatch@chaveirim.org';
  const toAddresses = Array.isArray(options.to) ? options.to : [options.to];

  try {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: toAddresses.map(email => ({ email })) }],
        from: { email: fromEmail },
        subject: options.subject,
        content: [
          options.text ? { type: 'text/plain', value: options.text } : null,
          options.html ? { type: 'text/html', value: options.html } : null,
        ].filter(Boolean),
      }),
    });

    // Log the webhook
    await webhookLogStorage.create({
      url: 'https://api.sendgrid.com/v3/mail/send',
      method: 'POST',
      requestBody: JSON.stringify({ to: toAddresses, subject: options.subject }),
      statusCode: response.status,
      responseBody: response.ok ? 'Success' : await response.text(),
    });

    return response.ok;
  } catch (error) {
    console.error('SendGrid error:', error);
    return false;
  }
}

// ============================================================================
// SMS SERVICE (Twilio)
// ============================================================================

interface SmsOptions {
  to: string;
  body: string;
  from?: string;
}

export async function sendSms(options: SmsOptions): Promise<boolean> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = options.from || process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    console.warn('Twilio not configured');
    return false;
  }

  try {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: options.to,
          From: fromNumber,
          Body: options.body,
        }),
      }
    );

    const result = await response.json();

    await webhookLogStorage.create({
      url: `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      method: 'POST',
      requestBody: JSON.stringify({ to: options.to, body: options.body.substring(0, 100) }),
      statusCode: response.status,
      responseBody: JSON.stringify(result),
    });

    return response.ok;
  } catch (error) {
    console.error('Twilio error:', error);
    return false;
  }
}

// ============================================================================
// WHATSAPP SERVICE (WAHA API)
// ============================================================================

interface WhatsAppOptions {
  chatId: string;
  message: string;
}

export async function sendWhatsApp(options: WhatsAppOptions): Promise<boolean> {
  const apiUrl = process.env.WHATSAPP_API_URL;
  const apiToken = process.env.WHATSAPP_API_TOKEN;

  if (!apiUrl || !apiToken) {
    console.warn('WhatsApp API not configured');
    return false;
  }

  try {
    const response = await fetch(`${apiUrl}/api/sendText`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chatId: options.chatId,
        text: options.message,
        session: 'default',
      }),
    });

    const result = await response.json();

    await webhookLogStorage.create({
      url: `${apiUrl}/api/sendText`,
      method: 'POST',
      requestBody: JSON.stringify({ chatId: options.chatId }),
      statusCode: response.status,
      responseBody: JSON.stringify(result),
    });

    return response.ok;
  } catch (error) {
    console.error('WhatsApp error:', error);
    return false;
  }
}

export async function sendWhatsAppToGroup(groupId: string, message: string): Promise<boolean> {
  return sendWhatsApp({
    chatId: `${groupId}@g.us`,
    message,
  });
}

// ============================================================================
// PHONE SYSTEM INTEGRATION
// ============================================================================

interface PhoneQueueLoginOptions {
  extension: string;
  queue: string;
  phoneNumbers: string[];
}

interface PhoneCalloutOptions {
  from: string;
  to: string;
  callerId?: string;
}

export async function phoneQueueLogin(options: PhoneQueueLoginOptions): Promise<boolean> {
  const apiUrl = process.env.VOIP_API_URL;
  const apiKey = process.env.VOIP_API_KEY;
  const apiSecret = process.env.VOIP_API_SECRET;

  if (!apiUrl || !apiKey) {
    console.warn('VoIP API not configured');
    // Return true to allow manual queue management
    return true;
  }

  try {
    const response = await fetch(`${apiUrl}/queue/login`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${apiKey}:${apiSecret}`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(options),
    });

    return response.ok;
  } catch (error) {
    console.error('Phone queue login error:', error);
    return false;
  }
}

export async function phoneQueueLogout(extension: string, queue?: string): Promise<boolean> {
  const apiUrl = process.env.VOIP_API_URL;
  const apiKey = process.env.VOIP_API_KEY;
  const apiSecret = process.env.VOIP_API_SECRET;

  if (!apiUrl || !apiKey) {
    return true;
  }

  try {
    const response = await fetch(`${apiUrl}/queue/logout`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${apiKey}:${apiSecret}`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ extension, queue }),
    });

    return response.ok;
  } catch (error) {
    console.error('Phone queue logout error:', error);
    return false;
  }
}

export async function initiateCallout(options: PhoneCalloutOptions): Promise<{ success: boolean; callId?: string }> {
  const apiUrl = process.env.VOIP_API_URL;
  const apiKey = process.env.VOIP_API_KEY;
  const apiSecret = process.env.VOIP_API_SECRET;

  if (!apiUrl || !apiKey) {
    return { success: false };
  }

  try {
    const response = await fetch(`${apiUrl}/call/originate`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${apiKey}:${apiSecret}`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(options),
    });

    if (response.ok) {
      const result = await response.json() as { callId?: string };
      return { success: true, callId: result.callId };
    }

    return { success: false };
  } catch (error) {
    console.error('Callout error:', error);
    return { success: false };
  }
}

// ============================================================================
// AI SERVICE (OpenAI)
// ============================================================================

interface AiChatOptions {
  prompt: string;
  systemPrompt?: string;
  maxTokens?: number;
}

export async function aiChat(options: AiChatOptions): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    console.warn('OpenAI API key not configured');
    return null;
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          options.systemPrompt ? { role: 'system', content: options.systemPrompt } : null,
          { role: 'user', content: options.prompt },
        ].filter(Boolean),
        max_tokens: options.maxTokens || 1000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      console.error('OpenAI error:', await response.text());
      return null;
    }

    const result = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    return result.choices?.[0]?.message?.content || null;
  } catch (error) {
    console.error('OpenAI error:', error);
    return null;
  }
}

export async function aiExtractVehicle(text: string): Promise<{
  make?: string;
  model?: string;
  color?: string;
  confidence: number;
} | null> {
  const prompt = `Extract vehicle information from this text. Return JSON with make, model, color fields.
Text: "${text}"
Return only valid JSON, no explanation.`;

  const result = await aiChat({
    prompt,
    systemPrompt: 'You are a helpful assistant that extracts vehicle information. Always return valid JSON.',
    maxTokens: 200,
  });

  if (!result) return null;

  try {
    const parsed = JSON.parse(result);
    return {
      make: parsed.make,
      model: parsed.model,
      color: parsed.color,
      confidence: parsed.confidence || 0.8,
    };
  } catch {
    return null;
  }
}

export async function aiSearchDispatcherGuide(question: string): Promise<string> {
  const systemPrompt = `You are a helpful dispatcher assistant for Chaveirim, an emergency roadside assistance organization.
Answer questions about dispatch procedures, call handling, and emergency response.
Be concise and practical. If you don't know the answer, say so.`;

  const result = await aiChat({
    prompt: question,
    systemPrompt,
    maxTokens: 500,
  });

  return result || 'I apologize, but I couldn\'t process your question. Please try again or consult the documentation.';
}

export async function aiOcrExtract(base64Image: string): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return null;
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Extract all text from this image. Return only the extracted text, nothing else.',
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`,
                },
              },
            ],
          },
        ],
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      return null;
    }

    const result = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    return result.choices?.[0]?.message?.content || null;
  } catch (error) {
    console.error('OCR error:', error);
    return null;
  }
}

// ============================================================================
// GOOGLE MAPS INTEGRATION
// ============================================================================

export async function geocodeAddress(address: string): Promise<{
  lat: number;
  lng: number;
  formattedAddress: string;
} | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return null;
  }

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`
    );

    const result = await response.json() as { 
      status: string; 
      results?: Array<{ 
        geometry: { location: { lat: number; lng: number } }; 
        formatted_address: string 
      }> 
    };

    if (result.status === 'OK' && result.results?.[0]) {
      const location = result.results[0].geometry.location;
      return {
        lat: location.lat,
        lng: location.lng,
        formattedAddress: result.results[0].formatted_address,
      };
    }

    return null;
  } catch (error) {
    console.error('Geocode error:', error);
    return null;
  }
}

export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return null;
  }

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`
    );

    const result = await response.json() as { 
      status: string; 
      results?: Array<{ formatted_address: string }> 
    };

    if (result.status === 'OK' && result.results?.[0]) {
      return result.results[0].formatted_address;
    }

    return null;
  } catch (error) {
    console.error('Reverse geocode error:', error);
    return null;
  }
}

export function convertWazeToGoogleMaps(wazeUrl: string): {
  lat: number;
  lng: number;
  googleMapsUrl: string;
} | null {
  // Try different Waze URL formats
  const patterns = [
    /ll=(-?\d+\.?\d*),(-?\d+\.?\d*)/,
    /navigate=yes.*?ll=(-?\d+\.?\d*),(-?\d+\.?\d*)/,
    /latlng=(-?\d+\.?\d*)%2C(-?\d+\.?\d*)/,
  ];

  for (const pattern of patterns) {
    const match = wazeUrl.match(pattern);
    if (match) {
      const lat = parseFloat(match[1]);
      const lng = parseFloat(match[2]);
      return {
        lat,
        lng,
        googleMapsUrl: `https://www.google.com/maps?q=${lat},${lng}`,
      };
    }
  }

  return null;
}

// ============================================================================
// BROADCAST SERVICE
// ============================================================================

interface BroadcastOptions {
  message: string;
  channels: {
    whatsapp?: boolean;
    sms?: boolean;
    email?: boolean;
  };
  recipients?: {
    whatsappGroups?: string[];
    phoneNumbers?: string[];
    emails?: string[];
  };
}

export async function broadcastMessage(options: BroadcastOptions): Promise<{
  whatsapp: boolean;
  sms: boolean;
  email: boolean;
}> {
  const results = {
    whatsapp: false,
    sms: false,
    email: false,
  };

  // WhatsApp broadcast
  if (options.channels.whatsapp && options.recipients?.whatsappGroups) {
    const whatsappResults = await Promise.all(
      options.recipients.whatsappGroups.map(groupId =>
        sendWhatsAppToGroup(groupId, options.message)
      )
    );
    results.whatsapp = whatsappResults.some(r => r);
  }

  // SMS broadcast
  if (options.channels.sms && options.recipients?.phoneNumbers) {
    const smsResults = await Promise.all(
      options.recipients.phoneNumbers.map(phone =>
        sendSms({ to: phone, body: options.message })
      )
    );
    results.sms = smsResults.some(r => r);
  }

  // Email broadcast
  if (options.channels.email && options.recipients?.emails) {
    results.email = await sendEmail({
      to: options.recipients.emails,
      subject: 'Chaveirim Dispatch Alert',
      text: options.message,
    });
  }

  return results;
}
