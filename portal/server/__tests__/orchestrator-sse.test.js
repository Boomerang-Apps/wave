// ═══════════════════════════════════════════════════════════════════════════════
// ORCHESTRATOR SSE STREAM TESTS
// ═══════════════════════════════════════════════════════════════════════════════
// TDD tests for Server-Sent Events endpoint for real-time status updates
// ═══════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { addSSERoutes } from '../routes/orchestrator-sse.js';

describe('Orchestrator SSE Stream', () => {
  let app;
  let mockClient;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    mockClient = {
      getRunStatus: vi.fn(),
      pollRunStatus: vi.fn()
    };

    app = express();
    addSSERoutes(app, mockClient);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('GET /api/orchestrator/runs/:runId/stream', () => {
    it('should set SSE headers', async () => {
      mockClient.getRunStatus.mockResolvedValue({
        success: true,
        runId: 'run-123',
        status: 'completed'
      });

      const response = await request(app)
        .get('/api/orchestrator/runs/run-123/stream')
        .expect(200);

      expect(response.headers['content-type']).toContain('text/event-stream');
      expect(response.headers['cache-control']).toBe('no-cache');
      expect(response.headers['connection']).toBe('keep-alive');
    });

    it('should send initial status event with completed state', async () => {
      // Use completed state so the stream ends and we can verify the response
      mockClient.getRunStatus.mockResolvedValue({
        success: true,
        runId: 'run-123',
        status: 'completed',
        currentAgent: 'qa',
        actionsCount: 15
      });

      const response = await request(app)
        .get('/api/orchestrator/runs/run-123/stream')
        .expect(200);

      // Parse SSE data
      const events = parseSSEEvents(response.text);
      expect(events.length).toBeGreaterThan(0);

      const statusEvent = events.find(e => e.event === 'status');
      expect(statusEvent).toBeDefined();
      expect(statusEvent.data.runId).toBe('run-123');
      expect(statusEvent.data.status).toBe('completed');
      expect(statusEvent.data.currentAgent).toBe('qa');
    });

    it('should send done event for completed runs', async () => {
      mockClient.getRunStatus.mockResolvedValue({
        success: true,
        runId: 'run-123',
        status: 'completed',
        actionsCount: 20
      });

      const response = await request(app)
        .get('/api/orchestrator/runs/run-123/stream')
        .expect(200);

      const events = parseSSEEvents(response.text);
      const doneEvent = events.find(e => e.event === 'done');
      expect(doneEvent).toBeDefined();
    });

    it('should send done event for failed runs', async () => {
      mockClient.getRunStatus.mockResolvedValue({
        success: true,
        runId: 'run-123',
        status: 'failed',
        error: 'Task failed'
      });

      const response = await request(app)
        .get('/api/orchestrator/runs/run-123/stream')
        .expect(200);

      const events = parseSSEEvents(response.text);
      const doneEvent = events.find(e => e.event === 'done');
      expect(doneEvent).toBeDefined();
    });

    it('should return 404 for non-existent run', async () => {
      mockClient.getRunStatus.mockResolvedValue({
        success: false,
        notFound: true,
        error: 'Run not found'
      });

      const response = await request(app)
        .get('/api/orchestrator/runs/nonexistent/stream')
        .expect(404);

      expect(response.body.error).toBe('Run not found');
    });

    it('should return 500 for orchestrator errors', async () => {
      mockClient.getRunStatus.mockResolvedValue({
        success: false,
        error: 'Internal error'
      });

      const response = await request(app)
        .get('/api/orchestrator/runs/run-123/stream')
        .expect(500);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('SSE Event Format', () => {
    it('should format events with event type and JSON data', async () => {
      // Use terminal state so connection closes
      mockClient.getRunStatus.mockResolvedValue({
        success: true,
        runId: 'run-123',
        status: 'completed',
        currentAgent: 'qa'
      });

      const response = await request(app)
        .get('/api/orchestrator/runs/run-123/stream')
        .expect(200);

      // Verify raw SSE format
      expect(response.text).toContain('event: status');
      expect(response.text).toContain('data: {');
      expect(response.text).toContain('event: done');
    });
  });
});

describe('SSE Route Export', () => {
  it('should export addSSERoutes function', () => {
    expect(typeof addSSERoutes).toBe('function');
  });
});

/**
 * Helper to parse SSE event stream
 */
function parseSSEEvents(text) {
  const events = [];
  const lines = text.split('\n');
  let currentEvent = {};

  for (const line of lines) {
    if (line.startsWith('event: ')) {
      currentEvent.event = line.substring(7).trim();
    } else if (line.startsWith('data: ')) {
      try {
        currentEvent.data = JSON.parse(line.substring(6));
      } catch {
        currentEvent.data = line.substring(6);
      }
    } else if (line === '' && currentEvent.event) {
      events.push(currentEvent);
      currentEvent = {};
    }
  }

  // Handle last event
  if (currentEvent.event) {
    events.push(currentEvent);
  }

  return events;
}
