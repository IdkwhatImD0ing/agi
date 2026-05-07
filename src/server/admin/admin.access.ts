import { TRPCError } from '@trpc/server';

import { isMasterAdminEmail, normalizeAdminEmail } from '~/common/admin/admin.config';
import type { ChatGenerateContentContext } from '~/server/trpc/trpc.server';


export async function requireMasterAdmin(ctx: ChatGenerateContentContext): Promise<string> {
  const userEmail = await ctx.getUserEmail();

  if (!isMasterAdminEmail(userEmail))
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Only the master admin can manage user access.' });

  return normalizeAdminEmail(userEmail ?? '');
}
