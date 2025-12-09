/**
 * Vite Integration
 * 
 * Sets up Vite for development (with HMR) and serves static files in production.
 */

import type { Express } from 'express';
import express from 'express';
import type { Server } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Setup Vite development server with HMR
 */
export async function setupVite(app: Express, server: Server) {
  const { createServer: createViteServer } = await import('vite');
  
  const vite = await createViteServer({
    root: path.resolve(__dirname, '../client'),
    server: {
      middlewareMode: true,
      hmr: {
        server,
      },
    },
    appType: 'spa',
  });
  
  app.use(vite.middlewares);
  
  // Handle SPA routing - serve index.html for all non-API routes
  app.use('*', async (req, res, next) => {
    if (req.originalUrl.startsWith('/api')) {
      return next();
    }
    
    try {
      const url = req.originalUrl;
      let template = fs.readFileSync(
        path.resolve(__dirname, '../client/index.html'),
        'utf-8'
      );
      
      template = await vite.transformIndexHtml(url, template);
      
      res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
  
  console.log('⚡ Vite development server ready');
}

/**
 * Serve static files in production
 */
export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, '../dist/client');
  
  // Serve static assets
  app.use(
    '/assets',
    express.static(path.join(distPath, 'assets'), {
      maxAge: '1y',
      immutable: true,
    })
  );
  
  // Serve other static files
  app.use(express.static(distPath));
  
  // Handle SPA routing
  app.get('*', (req, res, next) => {
    if (req.originalUrl.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });
  
  console.log('📦 Serving static files from dist/client');
}
