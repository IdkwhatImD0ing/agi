import * as z from 'zod/v4';


export const MCP_REGISTRY_BASE_URL = 'https://registry.modelcontextprotocol.io';

const mcpEnvSchema = z.record(z.string(), z.string());

export const mcpStdioServerConfigSchema = z.object({
  id: z.string().min(1),
  label: z.string().optional(),
  transport: z.literal('stdio'),
  command: z.string().min(1),
  args: z.array(z.string()).default([]),
  env: mcpEnvSchema.optional(),
  registry: z.object({
    serverName: z.string(),
    version: z.string().optional(),
    packageIdentifier: z.string().optional(),
  }).optional(),
});

export const mcpStreamableHttpServerConfigSchema = z.object({
  id: z.string().min(1),
  label: z.string().optional(),
  transport: z.literal('streamable-http'),
  url: z.url(),
  headers: mcpEnvSchema.optional(),
  registry: z.object({
    serverName: z.string(),
    version: z.string().optional(),
  }).optional(),
});

export const mcpServerConfigSchema = z.discriminatedUnion('transport', [
  mcpStdioServerConfigSchema,
  mcpStreamableHttpServerConfigSchema,
]);

export const mcpClientConfigSchema = z.object({
  servers: z.array(mcpServerConfigSchema),
});

export type McpServerConfig = z.infer<typeof mcpServerConfigSchema>;
export type McpClientConfig = z.infer<typeof mcpClientConfigSchema>;

export type McpRegistryPackageArgument = {
  type?: 'positional' | 'named' | string;
  name?: string;
  value?: string;
  valueHint?: string;
  description?: string;
  default?: string;
  isRequired?: boolean;
  isRepeated?: boolean;
  choices?: string[];
};

export type McpRegistryEnvironmentVariable = {
  name: string;
  description?: string;
  default?: string;
  isRequired?: boolean;
  isSecret?: boolean;
};

export type McpRegistryPackage = {
  registryType?: 'npm' | 'pypi' | 'nuget' | 'oci' | string;
  registryBaseUrl?: string;
  identifier?: string;
  version?: string;
  runtimeHint?: string;
  transport?: {
    type?: 'stdio' | 'streamable-http' | 'sse' | string;
    url?: string;
  };
  packageArguments?: McpRegistryPackageArgument[];
  runtimeArguments?: McpRegistryPackageArgument[];
  environmentVariables?: McpRegistryEnvironmentVariable[];
};

export type McpRegistryRemote = {
  type?: 'streamable-http' | 'sse' | string;
  url?: string;
  headers?: McpRegistryEnvironmentVariable[];
  variables?: Record<string, McpRegistryEnvironmentVariable>;
};

export type McpRegistryServer = {
  name: string;
  title?: string;
  description?: string;
  version?: string;
  websiteUrl?: string;
  repository?: {
    url?: string;
    source?: string;
    subfolder?: string;
  };
  packages?: McpRegistryPackage[];
  remotes?: McpRegistryRemote[];
};

export type McpRegistryServerEntry = {
  server: McpRegistryServer;
  _meta?: Record<string, unknown>;
};

export type McpToolMetadata = {
  serverId: string;
  serverLabel?: string;
  toolName: string;
  aixName: string;
  title?: string;
  description?: string;
  inputSchema?: {
    type: 'object';
    properties?: Record<string, object>;
    required?: string[];
    [key: string]: unknown;
  };
};

export type McpCallToolResult = {
  serverId: string;
  toolName: string;
  isError: boolean;
  content: unknown[];
  structuredContent?: unknown;
};
