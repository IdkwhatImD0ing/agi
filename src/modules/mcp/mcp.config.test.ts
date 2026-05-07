import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { mcpToolsToAixTools, normalizeMcpToolResultForAix } from './mcp.aixTools';
import { parseMcpConfigText } from './mcp.config';


describe('MCP config parsing', () => {
  it('parses Cursor-style stdio server config', () => {
    const parsed = parseMcpConfigText(JSON.stringify({
      mcpServers: {
        weather: {
          command: 'npx',
          args: ['-y', '@dangahagan/weather-mcp@latest'],
          env: { ENABLED_TOOLS: 'full' },
        },
      },
    }));

    assert.equal(parsed.success, true);
    assert.equal(parsed.config.servers[0]?.transport, 'stdio');
    assert.equal(parsed.config.servers[0]?.id, 'weather');
  });
});

describe('MCP AIX tool mapping', () => {
  it('creates stable AIX function tools and object-shaped responses', () => {
    const { aixTools, toolMapping } = mcpToolsToAixTools([{
      serverId: 'weather',
      toolName: 'get forecast',
      aixName: 'mcp_weather_get_forecast',
      description: 'Get a forecast.',
      inputSchema: {
        type: 'object',
        properties: { city: { type: 'string' } },
        required: ['city'],
      },
    }]);

    assert.equal(aixTools[0]?.function_call.name, 'mcp_weather_get_forecast');
    assert.deepEqual(toolMapping.mcp_weather_get_forecast, { serverId: 'weather', toolName: 'get forecast' });

    const result = normalizeMcpToolResultForAix({
      serverId: 'weather',
      toolName: 'get forecast',
      isError: false,
      content: [{ type: 'text', text: 'Sunny' }],
    });

    assert.equal(JSON.parse(result).isError, false);
  });
});
