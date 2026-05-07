import { MCP_REGISTRY_BASE_URL, McpRegistryServerEntry } from './mcp.types';


type RegistryListResponse = {
  servers?: McpRegistryServerEntry[];
  nextCursor?: string;
};

type RegistryDetailResponse = McpRegistryServerEntry;

async function registryFetchJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${MCP_REGISTRY_BASE_URL}${path}`, {
    headers: { accept: 'application/json' },
    signal,
  });
  if (!response.ok)
    throw new Error(`MCP registry request failed (${response.status})`);
  return await response.json() as T;
}

export async function mcpRegistrySearchServers(search: string, signal?: AbortSignal): Promise<McpRegistryServerEntry[]> {
  const params = new URLSearchParams();
  params.set('version', 'latest');
  const query = search.trim();
  if (query)
    params.set('search', query);

  const data = await registryFetchJson<RegistryListResponse>(`/v0.1/servers?${params.toString()}`, signal);
  return data.servers || [];
}

export async function mcpRegistryGetServer(serverName: string, version: string = 'latest', signal?: AbortSignal): Promise<McpRegistryServerEntry> {
  const encodedName = encodeURIComponent(serverName);
  const encodedVersion = encodeURIComponent(version);
  return await registryFetchJson<RegistryDetailResponse>(`/v0.1/servers/${encodedName}/versions/${encodedVersion}`, signal);
}
