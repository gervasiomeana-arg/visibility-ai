import type { Request } from 'express';
import { getSupabaseConfig } from './runtimeConfig';
import { bearerToken } from './supabaseAuth';

export type UsageEventType =
  | 'seo_audit'
  | 'ai_assistant'
  | 'ai_content'
  | 'search_console_query';

export type UsageEventInput = {
  workspaceId?: string;
  businessId?: string;
  userId?: string;
  eventType: UsageEventType;
  units?: number;
  metadata?: Record<string, unknown>;
};

function safeUnits(value: number | undefined): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(Math.floor(value || 0), 10_000_000));
}

export async function recordUsageEvent(
  req: Request,
  input: UsageEventInput
): Promise<boolean> {
  const config = getSupabaseConfig();
  const accessToken = bearerToken(req);

  if (
    !config.configured ||
    !accessToken ||
    !input.userId ||
    !input.workspaceId
  ) {
    return false;
  }

  const response = await fetch(
    `${config.url}/rest/v1/usage_events`,
    {
      method: 'POST',
      headers: {
        apikey: config.anonKey,
        authorization: `Bearer ${accessToken}`,
        'content-type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        workspace_id: input.workspaceId,
        user_id: input.userId,
        business_id: input.businessId || null,
        event_type: input.eventType,
        units: safeUnits(input.units),
        metadata: input.metadata || {},
      }),
    }
  );

  if (!response.ok) {
    const details = await response.text().catch(() => '');
    throw new Error(
      `Usage telemetry insert failed (HTTP ${response.status})${details ? `: ${details.slice(0, 200)}` : ''}`
    );
  }

  return true;
}

export function recordUsageEventSafe(
  req: Request,
  input: UsageEventInput
): void {
  void recordUsageEvent(req, input).catch((error) => {
    console.warn(
      JSON.stringify({
        type: 'usage_telemetry_error',
        eventType: input.eventType,
        message:
          error instanceof Error
            ? error.message
            : 'Unknown telemetry error',
      })
    );
  });
}
