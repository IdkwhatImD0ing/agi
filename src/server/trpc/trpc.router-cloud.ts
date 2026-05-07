import { createTRPCRouter } from './trpc.server';

import { adminRouter } from '~/server/admin/admin.router';
import { browseRouter } from '~/modules/browse/browse.router';
import { mcpRouter } from '~/modules/mcp/server/mcp.router';
import { tradeRouter } from '~/modules/trade/server/trade.router';

/**
 * Cloud rooter, which is geolocated in 1 location and separate from the other routers.
 * NOTE: at the time of writing, the location is aws|us-east-1
 */
export const appRouterCloud = createTRPCRouter({
  admin: adminRouter,
  browse: browseRouter,
  mcp: mcpRouter,
  trade: tradeRouter,
});

// export type definition of API
export type AppRouterCloud = typeof appRouterCloud;