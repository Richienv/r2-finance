import { prisma } from '@/lib/prisma';

/**
 * Append an entry to the ActivityLog. Best-effort: never throws, so a logging
 * failure can never break the mutation it is auditing.
 */
export async function logActivity(args: {
  actor: string;
  action: string;
  entityId?: string;
  entityType?: string;
  payload?: unknown;
}): Promise<void> {
  try {
    await prisma.activityLog.create({
      data: {
        actor: args.actor,
        action: args.action,
        entityId: args.entityId ?? null,
        entityType: args.entityType ?? null,
        payload: (args.payload ?? undefined) as never,
      },
    });
  } catch {
    // swallow — auditing must never break the request
  }
}

/** Identity of the caller for audit purposes. Defaults to the web UI. */
export function getActor(req: Request): string {
  return req.headers.get('x-actor') || 'richie-web';
}
