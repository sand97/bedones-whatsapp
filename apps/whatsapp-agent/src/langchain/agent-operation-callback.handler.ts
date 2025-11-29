import { BaseCallbackHandler } from '@langchain/core/callbacks/base';
import type { Serialized } from '@langchain/core/load/serializable';
import type { LLMResult } from '@langchain/core/outputs';
import { Logger } from '@nestjs/common';

/**
 * Metrics captured during agent execution
 */
export interface AgentOperationMetrics {
  // Context
  chatId: string;
  agentId?: string;
  userId?: string;

  // Messages
  userMessage: string;
  agentResponse: string;
  systemPrompt: string;

  // Timing
  startTime: number;
  endTime?: number;
  durationMs?: number;

  // Tokens
  totalTokens?: number;
  promptTokens?: number;
  completionTokens?: number;

  // Model
  modelName?: string;

  // Tools
  toolsUsed: Array<{
    name: string;
    args: any;
    result?: any;
    error?: string;
    startTime: number;
    endTime?: number;
    durationMs?: number;
  }>;

  // Status
  status: 'success' | 'error' | 'rate_limited';
  error?: string;
}

/**
 * Custom LangChain callback handler to capture agent operation metrics
 * Automatically tracks tokens, tools, duration, and errors
 */
export class AgentOperationCallbackHandler extends BaseCallbackHandler {
  private readonly logger = new Logger(AgentOperationCallbackHandler.name);
  public metrics: AgentOperationMetrics;

  name = 'AgentOperationCallbackHandler';

  constructor(
    chatId: string,
    userMessage: string,
    systemPrompt: string,
    agentId?: string,
    userId?: string,
  ) {
    super();
    this.metrics = {
      chatId,
      agentId,
      userId,
      userMessage,
      agentResponse: '',
      systemPrompt,
      startTime: Date.now(),
      toolsUsed: [],
      status: 'success',
    };
  }

  /**
   * Called when LLM starts running
   */
  async handleLLMStart(
    llm: Serialized,
    _prompts: string[],
    _runId: string,
  ): Promise<void> {
    if (llm.id && llm.id.length > 0) {
      this.metrics.modelName = llm.id[llm.id.length - 1];
    }
  }

  /**
   * Called when LLM finishes running
   * Captures token usage
   */
  async handleLLMEnd(output: LLMResult, _runId: string): Promise<void> {
    const tokenUsage = output.llmOutput?.tokenUsage;
    if (tokenUsage) {
      this.metrics.totalTokens = tokenUsage.totalTokens;
      this.metrics.promptTokens = tokenUsage.promptTokens;
      this.metrics.completionTokens = tokenUsage.completionTokens;
    }
  }

  /**
   * Called when LLM encounters an error
   */
  async handleLLMError(err: Error, _runId: string): Promise<void> {
    this.metrics.status = 'error';
    this.metrics.error = err.message;
    this.logger.error(`LLM Error: ${err.message}`, err.stack);
  }

  /**
   * Called when a tool starts running
   */
  async handleToolStart(
    tool: Serialized,
    input: string,
    _runId: string,
  ): Promise<void> {
    const toolName = tool.id?.[tool.id.length - 1] || 'unknown';

    let parsedInput: any;
    try {
      parsedInput = JSON.parse(input);
    } catch {
      parsedInput = input;
    }

    this.metrics.toolsUsed.push({
      name: toolName,
      args: parsedInput,
      startTime: Date.now(),
    });
  }

  /**
   * Called when a tool finishes running
   */
  async handleToolEnd(output: string, _runId: string): Promise<void> {
    const lastTool = this.metrics.toolsUsed[this.metrics.toolsUsed.length - 1];
    if (lastTool) {
      lastTool.endTime = Date.now();
      lastTool.durationMs = lastTool.endTime - lastTool.startTime;

      // Try to parse output
      try {
        lastTool.result = JSON.parse(output);
      } catch {
        lastTool.result = output;
      }
    }
  }

  /**
   * Called when a tool encounters an error
   */
  async handleToolError(err: Error, _runId: string): Promise<void> {
    const lastTool = this.metrics.toolsUsed[this.metrics.toolsUsed.length - 1];
    if (lastTool) {
      lastTool.error = err.message;
      lastTool.endTime = Date.now();
      lastTool.durationMs = lastTool.endTime - lastTool.startTime;
    }

    this.logger.warn(`Tool Error: ${err.message}`);
  }

  /**
   * Called when agent finishes
   */
  async handleAgentEnd(
    output: { returnValues: any },
    _runId: string,
  ): Promise<void> {
    this.metrics.endTime = Date.now();
    this.metrics.durationMs = this.metrics.endTime - this.metrics.startTime;

    // Extract agent response from output
    if (output.returnValues) {
      const messages = output.returnValues.messages || [];
      const lastMessage = messages[messages.length - 1];
      if (lastMessage) {
        this.metrics.agentResponse =
          typeof lastMessage.content === 'string'
            ? lastMessage.content
            : String(lastMessage.content);
      }
    }
  }

  /**
   * Called when chain encounters an error
   */
  async handleChainError(err: Error, _runId: string): Promise<void> {
    this.metrics.status = 'error';
    this.metrics.error = err.message;
    this.metrics.endTime = Date.now();
    this.metrics.durationMs = this.metrics.endTime - this.metrics.startTime;
    this.logger.error(`Chain Error: ${err.message}`, err.stack);
  }

  /**
   * Get the final metrics
   */
  getMetrics(): AgentOperationMetrics {
    // Ensure endTime and durationMs are set
    if (!this.metrics.endTime) {
      this.metrics.endTime = Date.now();
      this.metrics.durationMs = this.metrics.endTime - this.metrics.startTime;
    }

    return this.metrics;
  }
}
