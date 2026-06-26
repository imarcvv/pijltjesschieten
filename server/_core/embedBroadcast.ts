/**
 * embedBroadcast.ts
 * Singleton that holds all connected SSE embed clients and exposes
 * broadcastDartEvent() so any part of the server can trigger a broadcast.
 */
import type { ServerResponse } from "http";

// In-memory set of active SSE response streams
export const sseClients = new Set<ServerResponse>();

export interface DartBroadcastPayload {
  sponsorId:       number | null;
  sponsorName:     string | null;
  sponsorLogoUrl:  string | null;
  sponsorColor:    string | null;
  sponsorMessage:  string | null;
  sponsorClickUrl: string | null;
  shooterName:     string | null;
  /** Inspirational quote — set when this dart is a quote dart (no sponsor) */
  quoteText:       string | null;
  quoteAuthor:     string | null;
  /** Dart color variant: 0=geel, 1=blauw, 2=wit — must match what was shown on the main site */
  dartVariant:     0 | 1 | 2;
  /** Optional flag text shown below the dart (max 4 words / 30 chars) */
  flagText:        string | null;
}

export function broadcastDartEvent(payload: DartBroadcastPayload): void {
  const data = `data: ${JSON.stringify({ type: "dart", ...payload, ts: Date.now() })}\n\n`;
  for (const client of Array.from(sseClients)) {
    try {
      client.write(data);
    } catch {
      sseClients.delete(client);
    }
  }
}
