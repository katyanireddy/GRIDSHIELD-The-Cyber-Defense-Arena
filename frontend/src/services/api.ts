const API_BASE =
  import.meta.env.VITE_API_BASE_URL || '/api';

export interface BackendNode {
  id: string;
  name: string;
  voltage: number;
  frequency: number;
  load: number;
  expected_voltage: number;
  expected_frequency: number;
  expected_load: number;
  status: string;
  compromised: boolean;
  isolated: boolean;
}

export interface GridResponse {
  running: boolean;
  nodes: Record<string, BackendNode>;
  node_count: number;
  attack_active: boolean;
}

export interface Detection {
  node_id: string;
  prediction: string;
  anomaly_score: number;
  voltage_residual: number;
  frequency_residual: number;
  load_residual: number;
  confidence: number;
  reason: string;
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `API error: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export const gridAPI = {
  getGrid: () => request<GridResponse>('/grid'),

  reset: () =>
    request('/simulation/reset', {
      method: 'POST',
    }),

  attack: (nodeIds: string[], voltageShift = 0.12) =>
    request('/attack', {
      method: 'POST',
      body: JSON.stringify({
        node_ids: nodeIds,
        voltage_shift: voltageShift,
      }),
    }),

  detect: () => request<{ detections: Detection[] }>('/detect', {
    method: 'POST',
  }),

  mitigate: (nodeIds: string[]) =>
    request('/mitigate', {
      method: 'POST',
      body: JSON.stringify({ node_ids: nodeIds }),
    }),

    activateIslandMode: () =>
  request('/api/island-mode', {
    method: 'POST',
  }),

  verifyHash: () =>
  request<{
    integrity_ok: boolean;
    baseline_hash: string;
    current_hash: string;
    message: string;
  }>('/api/verify-hash', {
    method: 'POST',
  }),

  recover: () =>
    request('/recover', {
      method: 'POST',
    }),

  getIncidents: () => request('/incidents'),

  getTimeline: () => request('/timeline'),
};

import type { GridNode } from '../types/grid';

const NODE_LAYOUT: Record<
  string,
  { x: number; y: number; type: GridNode['type'] }
> = {
  'G-01': { x: 50, y: 10, type: 'generation' },
  'S-01': { x: 20, y: 28, type: 'renewable' },
  'B-01': { x: 80, y: 28, type: 'storage' },
  'N-01': { x: 50, y: 42, type: 'substation' },
  'N-02': { x: 20, y: 65, type: 'feeder' },
  'E-01': { x: 80, y: 65, type: 'feeder' },
  'W-01': { x: 20, y: 88, type: 'feeder' },
  'C-01': { x: 80, y: 88, type: 'feeder' },
};

export function mapBackendNode(
  node: BackendNode,
  id: string
): GridNode {
  const layout = NODE_LAYOUT[id] ?? {
    x: 50,
    y: 50,
    type: 'feeder' as const,
  };

  const status: GridNode['status'] = node.isolated
    ? 'isolated'
    : node.compromised || node.status === 'under_attack'
      ? 'alert'
      : node.status === 'warning'
        ? 'warning'
        : 'nominal';

  return {
    id,
    name: node.name,
    code: id,
    type: layout.type,
    x: layout.x,
    y: layout.y,
    voltageKv: node.voltage,
    frequencyHz: node.frequency,
    activePowerMw: node.load,
    maxPowerMw: Math.max(node.load * 1.25, 100),
    status,
    scadaProtocol: 'IEC 61850',
    ipAddress: 'SIMULATED',
    temperatureC: 25,
    threatDetails: status === 'alert'
      ? {
          vector: 'False Data Injection',
          cve: 'SIM-FDI',
          mitreId: 'T0855',
          payloadSnippet: 'SIMULATED TELEMETRY',
          detectedAt: 'LIVE SIMULATION',
          packetCount: 0,
        }
      : undefined,
  };
}