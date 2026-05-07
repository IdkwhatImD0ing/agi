import type { AixTools_ToolDefinition } from '~/modules/aix/server/api/aix.wiretypes';

import type { McpCallToolResult, McpToolMetadata } from './mcp.types';


export type McpAixToolMapping = Record<string, { serverId: string; toolName: string }>;

export function mcpToolsToAixTools(tools: McpToolMetadata[]): {
  aixTools: AixTools_ToolDefinition[];
  toolMapping: McpAixToolMapping;
} {
  const toolMapping: McpAixToolMapping = {};
  const usedNames = new Set<string>();

  const aixTools = tools.map(tool => {
    let aixName = sanitizeAixToolName(tool.aixName);
    let suffix = 2;
    while (usedNames.has(aixName))
      aixName = sanitizeAixToolName(`${tool.aixName}_${suffix++}`);
    usedNames.add(aixName);

    toolMapping[aixName] = { serverId: tool.serverId, toolName: tool.toolName };

    return {
      type: 'function_call' as const,
      function_call: {
        name: aixName,
        description: [
          tool.description || tool.title || `Call MCP tool ${tool.toolName}.`,
          `MCP server: ${tool.serverLabel || tool.serverId}.`,
          'Use this tool only when it directly helps answer the user request.',
        ].join(' '),
        input_schema: normalizeInputSchema(tool.inputSchema),
      },
    };
  });

  return { aixTools, toolMapping };
}

export function createMcpAixToolName(serverId: string, toolName: string): string {
  return sanitizeAixToolName(`mcp_${serverId}_${toolName}`);
}

export function normalizeMcpToolResultForAix(result: McpCallToolResult): string {
  return JSON.stringify({
    serverId: result.serverId,
    toolName: result.toolName,
    isError: result.isError,
    content: result.content,
    structuredContent: result.structuredContent ?? null,
  });
}

function sanitizeAixToolName(name: string): string {
  const clean = name
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 64);
  return clean || 'mcp_tool';
}

type AixFunctionToolDefinition = Extract<AixTools_ToolDefinition, { type: 'function_call' }>;

function normalizeInputSchema(inputSchema: McpToolMetadata['inputSchema']): AixFunctionToolDefinition['function_call']['input_schema'] {
  if (!inputSchema?.properties)
    return undefined;

  return {
    properties: inputSchema.properties as any,
    ...(inputSchema.required?.length ? { required: inputSchema.required } : {}),
  };
}
