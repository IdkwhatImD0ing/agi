import * as React from 'react';
import { useShallow } from 'zustand/react/shallow';

import { Alert, Box, Button, Chip, Divider, FormControl, FormHelperText, Input, List, ListItem, ListItemContent, Sheet, Stack, Switch, Textarea, Typography } from '@mui/joy';
import AddIcon from '@mui/icons-material/Add';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ExtensionIcon from '@mui/icons-material/Extension';
import SearchIcon from '@mui/icons-material/Search';
import WarningRoundedIcon from '@mui/icons-material/WarningRounded';

import { apiAsyncNode } from '~/common/util/trpc.client';

import { mcpServerConfigFromRegistryEntry, summarizeMcpServer } from './mcp.config';
import type { McpRegistryServerEntry, McpToolMetadata } from './mcp.types';
import { useMcpStore } from './store-module-mcp';


const EXAMPLE_MCP_CONFIG = `{
  "mcpServers": {
    "weather": {
      "command": "npx",
      "args": ["-y", "@dangahagan/weather-mcp@latest"],
      "env": {
        "ENABLED_TOOLS": "full"
      }
    }
  }
}`;

export function McpSettings() {

  const {
    enableMcpToolsInChat, setEnableMcpToolsInChat,
    rawConfigText, setRawConfigText,
    config, parseError, parseWarnings,
    disabledServerIds, setServerEnabled,
    validationResult, setValidationResult,
    addServerConfig,
  } = useMcpStore(useShallow(state => ({
    enableMcpToolsInChat: state.enableMcpToolsInChat, setEnableMcpToolsInChat: state.setEnableMcpToolsInChat,
    rawConfigText: state.rawConfigText, setRawConfigText: state.setRawConfigText,
    config: state.config, parseError: state.parseError, parseWarnings: state.parseWarnings,
    disabledServerIds: state.disabledServerIds, setServerEnabled: state.setServerEnabled,
    validationResult: state.validationResult, setValidationResult: state.setValidationResult,
    addServerConfig: state.addServerConfig,
  })));

  const [registrySearch, setRegistrySearch] = React.useState('');
  const [registryResults, setRegistryResults] = React.useState<McpRegistryServerEntry[]>([]);
  const [registryError, setRegistryError] = React.useState<string | null>(null);
  const [isRegistryBusy, setIsRegistryBusy] = React.useState(false);
  const [tools, setTools] = React.useState<McpToolMetadata[]>([]);
  const [toolsError, setToolsError] = React.useState<string | null>(null);
  const [isToolsBusy, setIsToolsBusy] = React.useState(false);

  const hasServers = config.servers.length > 0;
  const stdioServers = config.servers.filter(server => server.transport === 'stdio');

  const handleValidateConfig = React.useCallback(async () => {
    if (!hasServers) return;
    setToolsError(null);
    try {
      const result = await apiAsyncNode.mcp.validateConfig.mutate({ config });
      setValidationResult(result);
    } catch (error: any) {
      setValidationResult(null);
      setToolsError(error?.message || 'Could not validate MCP config.');
    }
  }, [config, hasServers, setValidationResult]);

  const handleListTools = React.useCallback(async () => {
    if (!hasServers) return;
    setIsToolsBusy(true);
    setToolsError(null);
    try {
      setTools(await apiAsyncNode.mcp.listTools.mutate({ config }));
    } catch (error: any) {
      setTools([]);
      setToolsError(error?.message || 'Could not list MCP tools.');
    } finally {
      setIsToolsBusy(false);
    }
  }, [config, hasServers]);

  const handleSearchRegistry = React.useCallback(async () => {
    setIsRegistryBusy(true);
    setRegistryError(null);
    try {
      setRegistryResults(await apiAsyncNode.mcp.listRegistryServers.query({ search: registrySearch }));
    } catch (error: any) {
      setRegistryResults([]);
      setRegistryError(error?.message || 'Could not search the MCP registry.');
    } finally {
      setIsRegistryBusy(false);
    }
  }, [registrySearch]);

  const handleAddRegistryServer = React.useCallback((entry: McpRegistryServerEntry) => {
    const server = mcpServerConfigFromRegistryEntry(entry);
    if (!server) {
      setRegistryError('This registry entry does not expose a supported Streamable HTTP or package configuration.');
      return;
    }
    addServerConfig(server);
  }, [addServerConfig]);

  return <Stack gap={2}>

    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
      <Box>
        <Typography level='title-sm'>MCP Tools</Typography>
        <Typography level='body-xs' sx={{ color: 'text.secondary' }}>
          Let function-calling models use configured Model Context Protocol servers during normal chat.
        </Typography>
      </Box>
      <Switch
        checked={enableMcpToolsInChat}
        onChange={event => setEnableMcpToolsInChat(event.target.checked)}
      />
    </Box>

    {!!stdioServers.length && (
      <Alert color='warning' startDecorator={<WarningRoundedIcon />}>
        Stdio MCPs run commands on the Big-AGI server. Use this for local/self-hosted setups or registry-verified packages you trust.
      </Alert>
    )}

    <FormControl>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
        <ExtensionIcon fontSize='small' />
        <Typography level='title-sm'>Paste Cursor-style config</Typography>
      </Box>
      <Textarea
        minRows={8}
        placeholder={EXAMPLE_MCP_CONFIG}
        value={rawConfigText}
        onChange={event => setRawConfigText(event.target.value)}
        sx={{ fontFamily: 'monospace', fontSize: 'sm' }}
      />
      <FormHelperText>
        Config is stored locally in this browser and sent to the Node backend only when listing or calling tools.
      </FormHelperText>
    </FormControl>

    {parseError && <Alert color='danger'>{parseError}</Alert>}
    {parseWarnings.map(warning => <Alert key={warning} color='warning'>{warning}</Alert>)}

    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
      <Button disabled={!hasServers || !!parseError} onClick={handleValidateConfig} variant='soft' startDecorator={<CheckCircleIcon />}>
        Validate Registry Match
      </Button>
      <Button disabled={!hasServers || !!parseError || isToolsBusy} onClick={handleListTools} variant='soft' startDecorator={<ExtensionIcon />}>
        {isToolsBusy ? 'Listing...' : 'List Tools'}
      </Button>
    </Box>

    {!!validationResult?.issues.length && (
      <Stack gap={1}>
        {validationResult.issues.map(issue => (
          <Alert key={`${issue.serverId}-${issue.message}`} color={issue.severity === 'info' ? 'success' : issue.severity === 'warning' ? 'warning' : 'danger'}>
            {issue.message}
          </Alert>
        ))}
      </Stack>
    )}

    {toolsError && <Alert color='danger'>{toolsError}</Alert>}

    {!!config.servers.length && (
      <Sheet variant='soft' sx={{ p: 1.5, borderRadius: 'md' }}>
        <Typography level='title-sm' sx={{ mb: 1 }}>Configured Servers</Typography>
        <List size='sm'>
          {config.servers.map(server => {
            const enabled = !disabledServerIds.includes(server.id);
            const verified = validationResult?.verifiedServerIds.includes(server.id);
            return <ListItem key={server.id} endAction={
              <Switch checked={enabled} onChange={event => setServerEnabled(server.id, event.target.checked)} />
            }>
              <ListItemContent>
                <Typography level='body-sm'>
                  {server.label || server.id} <Chip size='sm' color={server.transport === 'stdio' ? 'warning' : 'primary'}>{server.transport}</Chip>
                  {verified && <Chip size='sm' color='success' sx={{ ml: 0.5 }}>registry</Chip>}
                </Typography>
                <Typography level='body-xs' sx={{ color: 'text.secondary', wordBreak: 'break-all' }}>
                  {summarizeMcpServer(server)}
                </Typography>
              </ListItemContent>
            </ListItem>;
          })}
        </List>
      </Sheet>
    )}

    {!!tools.length && (
      <Sheet variant='outlined' sx={{ p: 1.5, borderRadius: 'md' }}>
        <Typography level='title-sm' sx={{ mb: 1 }}>Available Tools</Typography>
        <Stack direction='row' gap={1} flexWrap='wrap'>
          {tools.map(tool => <Chip key={`${tool.serverId}-${tool.toolName}`} size='sm' variant='soft'>{tool.aixName}</Chip>)}
        </Stack>
      </Sheet>
    )}

    <Divider />

    <Stack gap={1}>
      <Typography level='title-sm'>Official MCP Registry</Typography>
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Input
          value={registrySearch}
          onChange={event => setRegistrySearch(event.target.value)}
          placeholder='Search registry, e.g. weather, github, slack'
          startDecorator={<SearchIcon />}
          sx={{ flex: 1 }}
        />
        <Button onClick={handleSearchRegistry} loading={isRegistryBusy}>Search</Button>
      </Box>
      {registryError && <Alert color='danger'>{registryError}</Alert>}
      {!!registryResults.length && (
        <List size='sm' sx={{ '--ListItemDecorator-size': '0px' }}>
          {registryResults.slice(0, 8).map(entry => <ListItem key={entry.server.name} endAction={
            <Button size='sm' variant='soft' startDecorator={<AddIcon />} onClick={() => handleAddRegistryServer(entry)}>Add</Button>
          }>
            <ListItemContent>
              <Typography level='body-sm'>{entry.server.title || entry.server.name}</Typography>
              <Typography level='body-xs' sx={{ color: 'text.secondary' }}>{entry.server.description || entry.server.name}</Typography>
            </ListItemContent>
          </ListItem>)}
        </List>
      )}
    </Stack>

  </Stack>;
}
