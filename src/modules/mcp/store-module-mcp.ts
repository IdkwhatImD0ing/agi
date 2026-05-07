import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { parseMcpConfigText, stringifyMcpConfig } from './mcp.config';
import type { McpClientConfig, McpServerConfig } from './mcp.types';
import type { McpRegistryValidationResult } from './mcp.registry.match';


interface ModuleMcpStore {
  enableMcpToolsInChat: boolean;
  setEnableMcpToolsInChat: (enable: boolean) => void;

  rawConfigText: string;
  config: McpClientConfig;
  parseError: string | null;
  parseWarnings: string[];
  setRawConfigText: (text: string) => void;
  addServerConfig: (server: McpServerConfig) => void;

  disabledServerIds: string[];
  setServerEnabled: (serverId: string, enabled: boolean) => void;

  validationResult: McpRegistryValidationResult | null;
  setValidationResult: (result: McpRegistryValidationResult | null) => void;
}

const EMPTY_CONFIG: McpClientConfig = { servers: [] };

export const useMcpStore = create<ModuleMcpStore>()(
  persist(
    (set) => ({
      enableMcpToolsInChat: false,
      setEnableMcpToolsInChat: (enableMcpToolsInChat: boolean) => set({ enableMcpToolsInChat }),

      rawConfigText: '',
      config: EMPTY_CONFIG,
      parseError: null,
      parseWarnings: [],
      setRawConfigText: (rawConfigText: string) => {
        const parsed = parseMcpConfigText(rawConfigText);
        if (parsed.success)
          set({
            rawConfigText,
            config: parsed.config,
            parseError: null,
            parseWarnings: parsed.warnings,
            validationResult: null,
          });
        else
          set({
            rawConfigText,
            config: EMPTY_CONFIG,
            parseError: parsed.error,
            parseWarnings: parsed.warnings,
            validationResult: null,
          });
      },
      addServerConfig: (server: McpServerConfig) => set(state => {
        const config: McpClientConfig = {
          servers: [
            ...state.config.servers.filter(existing => existing.id !== server.id),
            server,
          ],
        };
        return {
          rawConfigText: stringifyMcpConfig(config),
          config,
          parseError: null,
          parseWarnings: [],
          validationResult: null,
          disabledServerIds: state.disabledServerIds.filter(id => id !== server.id),
        };
      }),

      disabledServerIds: [],
      setServerEnabled: (serverId: string, enabled: boolean) => set(state => ({
        disabledServerIds: enabled
          ? state.disabledServerIds.filter(id => id !== serverId)
          : Array.from(new Set([...state.disabledServerIds, serverId])),
      })),

      validationResult: null,
      setValidationResult: (validationResult: McpRegistryValidationResult | null) => set({ validationResult }),
    }),
    {
      name: 'app-module-mcp',
      merge: (persistedState, currentState) => {
        const merged = { ...currentState, ...(persistedState as Partial<ModuleMcpStore>) };
        const parsed = parseMcpConfigText(merged.rawConfigText || '');
        return {
          ...merged,
          config: parsed.success ? parsed.config : EMPTY_CONFIG,
          parseError: parsed.success ? null : parsed.error,
          parseWarnings: parsed.warnings,
        };
      },
    },
  ),
);

export function getMcpConfigForChat(): McpClientConfig | null {
  const { enableMcpToolsInChat, config, disabledServerIds } = useMcpStore.getState();
  if (!enableMcpToolsInChat)
    return null;
  const servers = config.servers.filter(server => !disabledServerIds.includes(server.id));
  return servers.length ? { servers } : null;
}
