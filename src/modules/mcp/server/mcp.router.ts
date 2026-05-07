import * as z from 'zod/v4';

import { createTRPCRouter, publicProcedure } from '~/server/trpc/trpc.server';

import { mcpRegistryGetServer, mcpRegistrySearchServers } from '../mcp.registry.client';
import { validateMcpConfigAgainstRegistry } from '../mcp.registry.match';
import { mcpClientConfigSchema } from '../mcp.types';
import { callMcpTool, listMcpTools } from './mcp.clientManager';


const callToolInputSchema = z.object({
  config: mcpClientConfigSchema,
  serverId: z.string(),
  toolName: z.string(),
  arguments: z.record(z.string(), z.unknown()).optional(),
});

export const mcpRouter = createTRPCRouter({

  listRegistryServers: publicProcedure
    .input(z.object({
      search: z.string().trim().max(200).default(''),
    }))
    .query(async ({ input, ctx }) =>
      await mcpRegistrySearchServers(input.search, ctx.reqSignal)),

  getRegistryServer: publicProcedure
    .input(z.object({
      serverName: z.string().min(1),
      version: z.string().optional(),
    }))
    .query(async ({ input, ctx }) =>
      await mcpRegistryGetServer(input.serverName, input.version || 'latest', ctx.reqSignal)),

  validateConfig: publicProcedure
    .input(z.object({
      config: mcpClientConfigSchema,
    }))
    .mutation(async ({ input, ctx }) => {
      const registryEntries = await Promise.all(input.config.servers.map(async server => {
        if (server.registry?.serverName)
          return await mcpRegistryGetServer(server.registry.serverName, server.registry.version || 'latest', ctx.reqSignal).catch(() => undefined);

        const query = registrySearchQueryForServer(server);
        if (!query)
          return undefined;

        const matches = await mcpRegistrySearchServers(query, ctx.reqSignal).catch(() => []);
        return matches[0];
      }));

      return validateMcpConfigAgainstRegistry(input.config, registryEntries.filter(Boolean) as any);
    }),

  listTools: publicProcedure
    .input(z.object({
      config: mcpClientConfigSchema,
    }))
    .mutation(async ({ input }) =>
      await listMcpTools(input.config)),

  callTool: publicProcedure
    .input(callToolInputSchema)
    .mutation(async ({ input }) =>
      await callMcpTool(input.config, input.serverId, input.toolName, input.arguments)),

});

function registrySearchQueryForServer(server: z.infer<typeof mcpClientConfigSchema>['servers'][number]): string | undefined {
  if (server.transport === 'streamable-http')
    return server.label || server.url;

  const packageArg = server.args.find(arg => !arg.startsWith('-') && (arg.includes('/') || arg.includes('@') || arg.includes('mcp')));
  return packageArg || server.label || server.command;
}
