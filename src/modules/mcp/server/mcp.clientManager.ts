import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { getDefaultEnvironment, StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

import { createMcpAixToolName } from '../mcp.aixTools';
import type { McpCallToolResult, McpClientConfig, McpServerConfig, McpToolMetadata } from '../mcp.types';


const MCP_CLIENT_VERSION = '1.0.0';
const MCP_CALL_TIMEOUT_MS = 30_000;
const MCP_LIST_TIMEOUT_MS = 20_000;
const MCP_RESULT_MAX_CHARS = 80_000;

type ManagedClient = {
  client: Client;
  transport: StdioClientTransport | StreamableHTTPClientTransport;
  lastUsed: number;
};

const clients = new Map<string, Promise<ManagedClient>>();

export async function listMcpTools(config: McpClientConfig): Promise<McpToolMetadata[]> {
  const allTools: McpToolMetadata[] = [];

  for (const server of config.servers) {
    const managed = await getManagedClient(server);
    const serverTools: Awaited<ReturnType<Client['listTools']>>['tools'] = [];
    let cursor: string | undefined;

    do {
      const result = await managed.client.listTools(cursor ? { cursor } : undefined, { timeout: MCP_LIST_TIMEOUT_MS });
      serverTools.push(...result.tools);
      cursor = result.nextCursor;
    } while (cursor);

    managed.lastUsed = Date.now();
    allTools.push(...serverTools.map(tool => ({
      serverId: server.id,
      serverLabel: server.label,
      toolName: tool.name,
      aixName: createMcpAixToolName(server.id, tool.name),
      title: tool.title,
      description: tool.description,
      inputSchema: tool.inputSchema,
    })));
  }

  return allTools;
}

export async function callMcpTool(
  config: McpClientConfig,
  serverId: string,
  toolName: string,
  args: Record<string, unknown> | undefined,
): Promise<McpCallToolResult> {
  const server = config.servers.find(s => s.id === serverId);
  if (!server)
    throw new Error(`MCP server not found: ${serverId}`);

  const managed = await getManagedClient(server);
  const result = await managed.client.callTool({
    name: toolName,
    arguments: args || {},
  }, undefined, {
    timeout: MCP_CALL_TIMEOUT_MS,
    maxTotalTimeout: MCP_CALL_TIMEOUT_MS,
  });
  managed.lastUsed = Date.now();

  return trimToolResult({
    serverId,
    toolName,
    isError: !!result.isError,
    content: Array.isArray(result.content) ? result.content : [],
    structuredContent: result.structuredContent,
  });
}

async function getManagedClient(server: McpServerConfig): Promise<ManagedClient> {
  const key = JSON.stringify(server);
  const existing = clients.get(key);
  if (existing)
    return await existing;

  const created = connectServer(server).catch(error => {
    clients.delete(key);
    throw error;
  });
  clients.set(key, created);
  return await created;
}

async function connectServer(server: McpServerConfig): Promise<ManagedClient> {
  const client = new Client({ name: 'big-agi', version: MCP_CLIENT_VERSION });
  const transport = createTransport(server);

  await client.connect(transport);

  return {
    client,
    transport,
    lastUsed: Date.now(),
  };
}

function createTransport(server: McpServerConfig): StdioClientTransport | StreamableHTTPClientTransport {
  switch (server.transport) {
    case 'stdio':
      return new StdioClientTransport({
        command: server.command,
        args: server.args,
        env: {
          ...getDefaultEnvironment(),
          ...server.env,
        },
        stderr: 'pipe',
      });

    case 'streamable-http':
      return new StreamableHTTPClientTransport(new URL(server.url), {
        requestInit: server.headers ? { headers: server.headers } : undefined,
      });
  }
}

function trimToolResult(result: McpCallToolResult): McpCallToolResult {
  const serialized = JSON.stringify(result);
  if (serialized.length <= MCP_RESULT_MAX_CHARS)
    return result;

  return {
    ...result,
    isError: true,
    content: [{
      type: 'text',
      text: `MCP tool result exceeded ${MCP_RESULT_MAX_CHARS} characters and was truncated.`,
    }],
    structuredContent: undefined,
  };
}
