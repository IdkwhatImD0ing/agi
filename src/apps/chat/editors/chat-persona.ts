import { aixChatGenerateContent_DMessage_FromConversation, AixChatGenerateContent_DMessageGuts } from '~/modules/aix/client/aix.client';
import type { AixAPIChatGenerate_Request } from '~/modules/aix/server/api/aix.wiretypes';
import { autoChatFollowUps } from '~/modules/aifn/auto-chat-follow-ups/autoChatFollowUps';
import { autoConversationTitle } from '~/modules/aifn/autotitle/autoTitle';
import { mcpToolsToAixTools, normalizeMcpToolResultForAix, type McpAixToolMapping } from '~/modules/mcp/mcp.aixTools';
import { getMcpConfigForChat } from '~/modules/mcp/store-module-mcp';

import { DConversationId, splitSystemMessageFromHistory } from '~/common/stores/chat/chat.conversation';
import { createErrorContentFragment, create_FunctionCallResponse_ContentFragment, DMessageContentFragment, isToolInvocationPart } from '~/common/stores/chat/chat.fragments';
import { findLLMOrThrow } from '~/common/stores/llms/store-llms';
import { LLM_IF_OAI_Fn, type DLLMId } from '~/common/stores/llms/llms.types';
import { AudioGenerator } from '~/common/util/audio/AudioGenerator';
import { ConversationsManager } from '~/common/chat-overlay/ConversationsManager';
import { DMessage, MESSAGE_FLAG_NOTIFY_COMPLETE, messageWasInterruptedAtStart } from '~/common/stores/chat/chat.message';
import { getLabsHighPerformance } from '~/common/stores/store-ux-labs';
import { apiAsyncNode } from '~/common/util/trpc.client';

import { PersonaChatMessageSpeak } from './persona/PersonaChatMessageSpeak';
import { getChatAutoAI, getChatThinkingPolicy, getIsNotificationEnabledForModel } from '../store-app-chat';
import { getInstantAppChatPanesCount } from '../components/panes/store-panes-manager';


// configuration
export const CHATGENERATE_RESPONSE_PLACEHOLDER = '...'; // 💫 ..., 🖊️ ...


export interface PersonaProcessorInterface {
  handleMessage(accumulatedMessage: AixChatGenerateContent_DMessageGuts, messageComplete: boolean): void;
}

const MCP_MAX_TOOL_STEPS = 6;
const MCP_MAX_TOOL_CALLS_PER_TURN = 12;

type McpChatRuntime = {
  config: NonNullable<ReturnType<typeof getMcpConfigForChat>>;
  toolMapping: McpAixToolMapping;
  tools: NonNullable<AixAPIChatGenerate_Request['tools']>;
};


/**
 * The main "chat" function.
 * @returns `true` if the operation was successful, `false` otherwise.
 */
export async function runPersonaOnConversationHead(
  assistantLlmId: DLLMId,
  conversationId: DConversationId,
): Promise<boolean> {

  const cHandler = ConversationsManager.getHandler(conversationId);

  const _history = cHandler.historyViewHeadOrThrow('runPersonaOnConversationHead') as Readonly<DMessage[]>;
  if (_history.length === 0)
    return false;

  // split pre dynamic-personas
  let { chatSystemInstruction, chatHistory } = splitSystemMessageFromHistory(_history);

  // assistant response placeholder
  const isNotifyEnabled = getIsNotificationEnabledForModel(assistantLlmId);
  const { assistantMessageId } = cHandler.messageAppendAssistantPlaceholder(
    CHATGENERATE_RESPONSE_PLACEHOLDER,
    {
      purposeId: chatSystemInstruction?.purposeId,
      generator: { mgt: 'named', name: assistantLlmId },
      ...(isNotifyEnabled ? { userFlags: [MESSAGE_FLAG_NOTIFY_COMPLETE] } : {}),
    },
  );

  const parallelViewCount = getLabsHighPerformance() ? 0 : getInstantAppChatPanesCount();

  // ai follow-up operations (fire/forget)
  const { autoSpeak, autoSuggestDiagrams, autoSuggestHTMLUI, autoSuggestQuestions, autoTitleChat } = getChatAutoAI();

  // AutoSpeak
  const autoSpeaker: PersonaProcessorInterface | null = autoSpeak !== 'off' ? new PersonaChatMessageSpeak(autoSpeak) : null;

  // when an abort controller is set, the UI switches to the "stop" mode
  const abortController = new AbortController();
  cHandler.setAbortController(abortController, 'chat-persona');

  // MCP tools are exposed only to models that advertise function-call support.
  const mcpRuntime = await prepareMcpChatRuntime(assistantLlmId).catch(error => {
    console.warn('[DEV] MCP tools unavailable:', error);
    return null;
  });

  let fixedMcpFragments: AixChatGenerateContent_DMessageGuts['fragments'] = [];
  let activeChatHistory = chatHistory;
  let messageStatus!: Awaited<ReturnType<typeof aixChatGenerateContent_DMessage_FromConversation>>;
  let lastDMessage: AixChatGenerateContent_DMessageGuts | null = null;
  let totalToolCalls = 0;

  const editAssistantMessage = (messageOverwrite: AixChatGenerateContent_DMessageGuts, messageComplete: boolean) => {
    const combinedMessage = fixedMcpFragments.length
      ? { ...messageOverwrite, fragments: [...fixedMcpFragments, ...messageOverwrite.fragments] }
      : messageOverwrite;

    // fragments and generator are already immutable (new refs per update) - no deep clone needed
    const { fragments, ...rest } = combinedMessage;

    // [Cosmetic Logic] if the content hasn't come yet, don't replace the fragments to still show the placeholder
    const includeFragments = !!fragments?.length || messageComplete || !combinedMessage.pendingIncomplete;

    // update the message
    cHandler.messageEdit(assistantMessageId, { ...(includeFragments && { fragments }), ...rest }, messageComplete, false);

    // if requested, speak the message
    autoSpeaker?.handleMessage(combinedMessage, messageComplete);

    return combinedMessage;
  };

  // stream the assistant's messages directly to the state store
  for (let step = 0; step <= MCP_MAX_TOOL_STEPS; step++) {

    messageStatus = await aixChatGenerateContent_DMessage_FromConversation(
      assistantLlmId,
      chatSystemInstruction,
      activeChatHistory,
      'conversation',
      conversationId,
      {
        abortSignal: abortController.signal,
        throttleParallelThreads: parallelViewCount,
        ...(mcpRuntime && mcpRuntime.tools.length ? { tools: mcpRuntime.tools } : {}),
      },
      (messageOverwrite: AixChatGenerateContent_DMessageGuts, messageComplete: boolean) => {

        // Note: there was an abort check here, but it removed the last packet, which contained the cause and final text.
        // if (abortController.signal.aborted)
        //   console.warn('runPersonaOnConversationHead: Aborted', { conversationId, assistantLlmId, messageOverwrite });

        lastDMessage = editAssistantMessage(messageOverwrite, messageComplete);

        // if (messageComplete)
        //   AudioGenerator.basicAstralChimes({ volume: 0.4 }, 0, 2, 250);
      },
    );

    lastDMessage = fixedMcpFragments.length
      ? { ...messageStatus.lastDMessage, fragments: [...fixedMcpFragments, ...messageStatus.lastDMessage.fragments] }
      : messageStatus.lastDMessage;

    if (!mcpRuntime || messageStatus.outcome === 'failed' || abortController.signal.aborted)
      break;

    const invocations = collectUnresolvedMcpInvocations(lastDMessage.fragments, mcpRuntime.toolMapping);
    if (!invocations.length)
      break;

    if (step >= MCP_MAX_TOOL_STEPS || totalToolCalls + invocations.length > MCP_MAX_TOOL_CALLS_PER_TURN) {
      fixedMcpFragments = [
        ...lastDMessage.fragments,
        createErrorContentFragment(`MCP tool limit reached. Stopped after ${totalToolCalls} tool calls.`),
      ];
      lastDMessage = { ...lastDMessage, fragments: fixedMcpFragments, pendingIncomplete: false };
      cHandler.messageEdit(assistantMessageId, lastDMessage, true, false);
      break;
    }

    const responseFragments: DMessageContentFragment[] = [];
    for (const invocation of invocations) {
      if (abortController.signal.aborted)
        break;

      totalToolCalls++;
      responseFragments.push(await executeMcpInvocation(mcpRuntime, invocation));
    }

    fixedMcpFragments = [...lastDMessage.fragments, ...responseFragments];
    lastDMessage = { ...lastDMessage, fragments: fixedMcpFragments, pendingIncomplete: false };
    cHandler.messageEdit(assistantMessageId, lastDMessage, false, false);

    activeChatHistory = [
      ...chatHistory,
      createAssistantMessageForMcpLoop(assistantMessageId, lastDMessage, chatSystemInstruction?.purposeId),
    ];
  }

  const finalDMessage = lastDMessage || messageStatus.lastDMessage;

  // final message update (needed only in case of error)
  if (messageStatus.outcome === 'failed')
    cHandler.messageEdit(assistantMessageId, finalDMessage, true, false);

  // special case: if the last message was aborted and had no content, delete it
  if (messageWasInterruptedAtStart(finalDMessage)) {
    cHandler.messagesDelete([assistantMessageId]);
    // NOTE: ok to exit here, as the abort was already done
    return false;
  }

  // notify when complete, if set
  if (cHandler.messageHasUserFlag(assistantMessageId, MESSAGE_FLAG_NOTIFY_COMPLETE)) {
    cHandler.messageSetUserFlag(assistantMessageId, MESSAGE_FLAG_NOTIFY_COMPLETE, false, false);
    AudioGenerator.chatNotifyResponse();
  }

  // check if aborted
  const hasBeenAborted = abortController.signal.aborted;

  // clear to send, again
  // FIXME: race condition? (for sure!)
  cHandler.clearAbortController('chat-persona');

  if (autoTitleChat) {
    // fire/forget, this will only set the title if it's not already set
    void autoConversationTitle(conversationId, false);
  }

  if (!hasBeenAborted && (autoSuggestDiagrams || autoSuggestHTMLUI || autoSuggestQuestions))
    void autoChatFollowUps(conversationId, assistantMessageId, autoSuggestDiagrams, autoSuggestHTMLUI, autoSuggestQuestions);

  const chatThinkingPolicy = getChatThinkingPolicy();
  if (chatThinkingPolicy === 'last-only')
    cHandler.historyStripThinking(1);
  else if (chatThinkingPolicy === 'discard-all')
    cHandler.historyStripThinking(0);

  // return true if this succeeded
  return messageStatus.outcome === 'completed';
}

async function prepareMcpChatRuntime(llmId: DLLMId): Promise<McpChatRuntime | null> {
  const config = getMcpConfigForChat();
  if (!config)
    return null;

  const llm = findLLMOrThrow(llmId);
  if (!llm.interfaces.includes(LLM_IF_OAI_Fn))
    return null;

  const tools = await apiAsyncNode.mcp.listTools.mutate({ config });
  if (!tools.length)
    return null;

  const { aixTools, toolMapping } = mcpToolsToAixTools(tools);
  return { config, toolMapping, tools: aixTools };
}

function collectUnresolvedMcpInvocations(fragments: AixChatGenerateContent_DMessageGuts['fragments'], toolMapping: McpAixToolMapping) {
  const responseIds = new Set(fragments
    .filter((fragment): fragment is DMessageContentFragment => fragment.ft === 'content')
    .map(fragment => fragment.part)
    .filter(part => part.pt === 'tool_response')
    .map(part => part.id));

  const invocations = fragments
    .filter((fragment): fragment is DMessageContentFragment => fragment.ft === 'content')
    .map(fragment => fragment.part)
    .filter(isToolInvocationPart)
    .flatMap(part => {
      if (part.invocation.type !== 'function_call')
        return [];
      if (!toolMapping[part.invocation.name] || responseIds.has(part.id))
        return [];
      return [{
        id: part.id,
        functionName: part.invocation.name,
        args: part.invocation.args,
      }];
    });

  return invocations;
}

async function executeMcpInvocation(
  runtime: McpChatRuntime,
  invocation: ReturnType<typeof collectUnresolvedMcpInvocations>[number],
): Promise<DMessageContentFragment> {
  const target = runtime.toolMapping[invocation.functionName];
  if (!target)
    return create_FunctionCallResponse_ContentFragment(invocation.id, true, invocation.functionName, JSON.stringify({ isError: true, content: 'Unknown MCP tool.' }), 'server');

  try {
    const args = parseFunctionCallArgs(invocation.args);
    const result = await apiAsyncNode.mcp.callTool.mutate({
      config: runtime.config,
      serverId: target.serverId,
      toolName: target.toolName,
      arguments: args,
    });
    return create_FunctionCallResponse_ContentFragment(
      invocation.id,
      result.isError,
      invocation.functionName,
      normalizeMcpToolResultForAix(result),
      'server',
    );
  } catch (error: any) {
    return create_FunctionCallResponse_ContentFragment(
      invocation.id,
      true,
      invocation.functionName,
      JSON.stringify({
        isError: true,
        content: error?.message || 'MCP tool call failed.',
      }),
      'server',
    );
  }
}

function parseFunctionCallArgs(args: string): Record<string, unknown> {
  if (!args)
    return {};
  const parsed = JSON.parse(args);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
    return {};
  return parsed;
}

function createAssistantMessageForMcpLoop(
  assistantMessageId: DMessage['id'],
  message: AixChatGenerateContent_DMessageGuts,
  purposeId: DMessage['purposeId'],
): DMessage {
  const now = Date.now();
  return {
    id: assistantMessageId,
    role: 'assistant',
    fragments: message.fragments,
    generator: message.generator,
    ...(purposeId && { purposeId }),
    tokenCount: 0,
    created: now,
    updated: now,
  };
}
