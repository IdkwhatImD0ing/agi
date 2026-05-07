import { McpClientConfig, McpRegistryServerEntry, McpServerConfig } from './mcp.types';


export type McpRegistryValidationIssue = {
  serverId: string;
  severity: 'info' | 'warning' | 'error';
  message: string;
};

export type McpRegistryValidationResult = {
  verifiedServerIds: string[];
  issues: McpRegistryValidationIssue[];
};

export function validateMcpConfigAgainstRegistry(config: McpClientConfig, registryEntries: McpRegistryServerEntry[]): McpRegistryValidationResult {
  const verifiedServerIds: string[] = [];
  const issues: McpRegistryValidationIssue[] = [];

  for (const server of config.servers) {
    const match = findRegistryMatchForServer(server, registryEntries);
    if (match) {
      verifiedServerIds.push(server.id);
      issues.push({
        serverId: server.id,
        severity: 'info',
        message: `Matched registry server ${match.server.title || match.server.name}.`,
      });
    } else {
      issues.push({
        serverId: server.id,
        severity: 'warning',
        message: 'This MCP server was not matched to the official registry.',
      });
    }
  }

  return { verifiedServerIds, issues };
}

export function findRegistryMatchForServer(server: McpServerConfig, registryEntries: McpRegistryServerEntry[]): McpRegistryServerEntry | undefined {
  if (server.registry?.serverName)
    return registryEntries.find(entry => entry.server.name === server.registry?.serverName);

  switch (server.transport) {
    case 'stdio':
      return registryEntries.find(entry => entry.server.packages?.some(pkg => {
        if (!pkg.identifier) return false;
        const commandText = [server.command, ...server.args].join(' ');
        return commandText.includes(pkg.identifier);
      }));

    case 'streamable-http':
      return registryEntries.find(entry => entry.server.remotes?.some(remote => remote.url === server.url));
  }
}
