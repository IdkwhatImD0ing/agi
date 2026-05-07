import * as z from 'zod/v4';

import { McpClientConfig, McpRegistryServerEntry, McpServerConfig, mcpClientConfigSchema } from './mcp.types';


const cursorMcpServerSchema = z.object({
  command: z.string().optional(),
  args: z.array(z.string()).optional(),
  env: z.record(z.string(), z.string()).optional(),
  url: z.url().optional(),
  headers: z.record(z.string(), z.string()).optional(),
  type: z.string().optional(),
}).passthrough();

const cursorMcpConfigSchema = z.object({
  mcpServers: z.record(z.string(), cursorMcpServerSchema),
});

export type McpConfigParseResult =
  | { success: true; config: McpClientConfig; warnings: string[] }
  | { success: false; config?: undefined; warnings: string[]; error: string };

export function mcpServerIdFromLabel(label: string): string {
  const clean = label.trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
  return clean || 'mcp-server';
}

export function parseMcpConfigText(text: string): McpConfigParseResult {
  const trimmed = text.trim();
  if (!trimmed)
    return { success: true, config: { servers: [] }, warnings: [] };

  let json: unknown;
  try {
    json = JSON.parse(trimmed);
  } catch (error: any) {
    return { success: false, warnings: [], error: error?.message || 'Invalid JSON' };
  }

  return parseMcpConfigObject(json);
}

export function parseMcpConfigObject(value: unknown): McpConfigParseResult {
  const normalized = mcpClientConfigSchema.safeParse(value);
  if (normalized.success)
    return { success: true, config: normalized.data, warnings: [] };

  const cursor = cursorMcpConfigSchema.safeParse(value);
  if (!cursor.success)
    return { success: false, warnings: [], error: 'Expected a Cursor-style { "mcpServers": { ... } } object.' };

  const warnings: string[] = [];
  const servers: McpServerConfig[] = [];

  for (const [label, server] of Object.entries(cursor.data.mcpServers)) {
    const id = mcpServerIdFromLabel(label);

    if (server.command) {
      servers.push({
        id,
        label,
        transport: 'stdio',
        command: server.command,
        args: server.args || [],
        ...(server.env && { env: server.env }),
      });
      continue;
    }

    if (server.url) {
      const transport = server.type === 'sse' ? undefined : 'streamable-http';
      if (!transport) {
        warnings.push(`${label}: SSE transport is not supported yet; use Streamable HTTP.`);
        continue;
      }
      servers.push({
        id,
        label,
        transport,
        url: server.url,
        ...(server.headers && { headers: server.headers }),
      });
      continue;
    }

    warnings.push(`${label}: skipped because it has neither command nor url.`);
  }

  return { success: true, config: { servers }, warnings };
}

export function stringifyMcpConfig(config: McpClientConfig): string {
  return JSON.stringify(config, null, 2);
}

export function summarizeMcpServer(server: McpServerConfig): string {
  switch (server.transport) {
    case 'stdio':
      return [server.command, ...server.args].join(' ');
    case 'streamable-http':
      return server.url;
  }
}

export function mcpServerConfigFromRegistryEntry(entry: McpRegistryServerEntry): McpServerConfig | null {
  const { server } = entry;
  const label = server.title || server.name;
  const base = {
    id: mcpServerIdFromLabel(server.name),
    label,
    registry: {
      serverName: server.name,
      version: server.version,
    },
  };

  const remote = server.remotes?.find(remote => remote.type === 'streamable-http' && remote.url);
  if (remote?.url)
    return {
      ...base,
      transport: 'streamable-http',
      url: remote.url,
    };

  const pkg = server.packages?.find(pkg => pkg.identifier);
  if (!pkg?.identifier)
    return null;

  const packageRef = pkg.version && !pkg.identifier.endsWith(`@${pkg.version}`)
    ? `${pkg.identifier}@${pkg.version}`
    : pkg.identifier;

  return {
    ...base,
    transport: 'stdio',
    command: pkg.runtimeHint || (pkg.registryType === 'pypi' ? 'uvx' : 'npx'),
    args: pkg.registryType === 'pypi'
      ? [packageRef]
      : ['-y', packageRef],
    env: Object.fromEntries((pkg.environmentVariables || [])
      .filter(variable => variable.default !== undefined)
      .map(variable => [variable.name, variable.default || ''])),
    registry: {
      ...base.registry,
      packageIdentifier: pkg.identifier,
    },
  };
}
