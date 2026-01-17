import { PrismaService } from '@app/prisma/prisma.service';
import { PromptsService } from '@app/prompts/prompts.service';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatXAI } from '@langchain/xai';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Sentry from '@sentry/nestjs';
import {
  createAgent,
  createMiddleware,
  modelCallLimitMiddleware,
  modelFallbackMiddleware,
} from 'langchain';

import { OnboardingGateway } from './onboarding.gateway';
import { DbToolsService, WaJsToolsService } from './tools';
import {
  AgentContext,
  UserContext,
  contextSchema,
} from './types/context.types';

/**
 * Service handling onboarding logic with AI conversation
 * Uses Grok (primary) with Gemini fallback via LangChain createAgent with middleware
 * Agent is created once and reuses tools, with userId passed via runtime context
 */
@Injectable()
export class OnboardingService {
  private readonly logger = new Logger(OnboardingService.name);
  private readonly primaryModel: ChatXAI | null = null;
  private readonly fallbackModel: ChatGoogleGenerativeAI | null = null;
  private readonly agent: ReturnType<typeof createAgent> | null = null;
  private activeControllers: Map<string, AbortController> = new Map();

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly onboardingGateway: OnboardingGateway,
    private readonly promptsService: PromptsService,
    private readonly dbToolsService: DbToolsService,
    private readonly waJsToolsService: WaJsToolsService,
  ) {
    // Initialize models
    const xaiApiKey = this.configService.get<string>('ai.xai.apiKey');
    const xaiModelName = this.configService.get<string>('ai.xai.model');
    const geminiApiKey = this.configService.get<string>('ai.gemini.apiKey');
    const geminiModelName = this.configService.get<string>('ai.gemini.model');

    // Create primary model (Grok via xAI)
    if (xaiApiKey) {
      this.primaryModel = new ChatXAI({
        apiKey: xaiApiKey,
        model: xaiModelName,
        temperature: 0.7,
        maxRetries: 0, // Fail fast to trigger fallback
      });
      this.logger.log(`✅ Grok model initialized: ${xaiModelName}`);
    } else {
      this.logger.warn('⚠️ No xAI API key provided (XAI_API_KEY)');
    }

    // Create fallback model (Gemini)
    if (geminiApiKey) {
      this.fallbackModel = new ChatGoogleGenerativeAI({
        apiKey: geminiApiKey,
        model: geminiModelName || 'gemini-2.5-pro',
        temperature: 0.7,
        maxRetries: 2,
      });
      this.logger.log(
        `✅ Gemini model initialized: ${geminiModelName || 'gemini-2.5-pro'}`,
      );
    } else {
      this.logger.warn('⚠️ No Gemini API key provided (GEMINI_API_KEY)');
    }

    if (!this.primaryModel && !this.fallbackModel) {
      this.logger.error(
        '❌ No AI model configured - agent will not be created',
      );
      return; // Don't create agent if no models configured
    }

    // Create the agent once with all tools
    // Tools will access userId via runtime context
    const tools = [
      ...this.dbToolsService.createTools(),
      ...this.waJsToolsService.createTools(),
    ];

    const primaryModel = this.primaryModel || this.fallbackModel;
    if (!primaryModel) {
      this.logger.error('❌ No primary model available for agent creation');
      return;
    }

    // Build middleware array
    // contextSchema imported from types/context.types.ts
    const middleware = [
      // Model call limit middleware (max 6 iterations)
      modelCallLimitMiddleware({
        runLimit: 6,
        exitBehavior: 'end',
      }),
      // Tool execution tracking middleware
      createMiddleware({
        name: 'ToolTracking',
        contextSchema,
        wrapToolCall: async (request, handler) => {
          const userId = request.runtime.context?.userId;
          if (userId) {
            this.onboardingGateway.emitToolExecuting(
              userId,
              request.toolCall.name,
            );
          }
          this.logger.log(`🛠️ Executing tool: ${request.toolCall.name}`);
          try {
            return await handler(request);
          } catch (error) {
            this.logger.error(
              `Tool execution failed: ${request.toolCall.name}`,
              error,
            );
            throw error;
          }
        },
      }),
    ];

    // Add fallback middleware if we have both models
    if (this.primaryModel && this.fallbackModel) {
      middleware.unshift(modelFallbackMiddleware(this.fallbackModel));
    }

    // Create the agent once
    this.agent = createAgent({
      model: primaryModel,
      tools,
      middleware,
      contextSchema,
    }) as ReturnType<typeof createAgent>;

    this.logger.log('✅ Agent created successfully with all tools');
  }

  /**
   * Cancel ongoing AI processing for a user
   * Returns the last user message content if cancelled successfully
   */
  async cancelProcessing(userId: string): Promise<string | null> {
    const controller = this.activeControllers.get(userId);
    if (controller) {
      this.logger.log(`🛑 Cancelling processing for user ${userId}`);
      controller.abort();
      this.activeControllers.delete(userId);

      // Get the last user message to restore it
      const lastMessage = await this.prisma.threadMessage.findFirst({
        where: {
          thread: { userId },
          role: 'user',
        },
        orderBy: { createdAt: 'desc' },
      });

      if (lastMessage) {
        // Delete the last user message
        await this.prisma.threadMessage.delete({
          where: { id: lastMessage.id },
        });

        this.logger.log(
          `✅ Deleted last message and returning content for restore`,
        );
        return lastMessage.content;
      }
    }
    return null;
  }

  /**
   * Check if processing is active for a user
   */
  isProcessingActive(userId: string): boolean {
    return this.activeControllers.has(userId);
  }

  /**
   * Create thread if not exists
   */
  async createThreadIfNotExists(userId: string) {
    const existing = await this.prisma.onboardingThread.findUnique({
      where: { userId },
    });

    if (existing) {
      return existing;
    }

    return this.prisma.onboardingThread.create({
      data: {
        userId,
        score: 0,
        status: 'in_progress',
      },
    });
  }

  /**
   * Get thread with messages for user
   */
  async getThreadWithMessages(userId: string) {
    return this.prisma.onboardingThread.findUnique({
      where: { userId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  /**
   * Fetch user's business data for prompt building
   */
  private async fetchUserBusinessData(userId: string) {
    // Get business info
    const businessInfo = await this.prisma.businessInfo.findUnique({
      where: { user_id: userId },
    });

    // Get all collections with their first 5 products (including metadata)
    const collections = await this.prisma.collection.findMany({
      where: { user_id: userId },
      include: {
        products: {
          take: 5,
          where: { is_hidden: false },
          include: {
            metadata: {
              where: { is_visible: true },
              select: { key: true, value: true },
            },
          },
        },
      },
    });

    // Transform to the format expected by PromptsService
    const businessData = businessInfo
      ? {
          is_business: businessInfo.is_business,
          profile_name: businessInfo.profile_name || undefined,
          name: businessInfo.name || undefined,
          description: businessInfo.description || undefined,
          address: businessInfo.address || undefined,
          city: businessInfo.city || undefined,
          country: businessInfo.country || undefined,
          email: businessInfo.email || undefined,
          categories: businessInfo.categories as
            | { id: string; localized_display_name: string }[]
            | undefined,
          business_hours: businessInfo.business_hours as
            | {
                config?: Record<
                  string,
                  { mode: string; open_time?: string; close_time?: string }
                >;
                timezone?: string;
              }
            | undefined,
          profile_options: businessInfo.profile_options as
            | {
                commerceExperience?: string;
                cartEnabled?: boolean;
              }
            | undefined,
          phone_numbers: businessInfo.phone_numbers || undefined,
        }
      : {};

    const collectionsData = collections.map((c) => ({
      name: c.name,
      description: c.description || undefined,
      products: c.products.map((p) => ({
        name: p.name,
        description: p.description || undefined,
        price: p.price || undefined,
        currency: p.currency || undefined,
        category: p.category || undefined,
        availability: p.availability || undefined,
        max_available: p.max_available || undefined,
        is_hidden: p.is_hidden,
        metadata: p.metadata.map((m) => ({ key: m.key, value: m.value })),
      })),
    }));

    return { businessData, collectionsData };
  }

  /**
   * Perform initial evaluation after sync completed
   */
  async performInitialEvaluation(userId: string): Promise<void> {
    this.logger.log(`🤖 Starting initial AI evaluation for user: ${userId}`);

    try {
      // Create thread
      const thread = await this.createThreadIfNotExists(userId);

      // Fetch all business data
      const { businessData, collectionsData } =
        await this.fetchUserBusinessData(userId);

      // Build prompt using PromptsService
      const prompt = this.promptsService.buildInitialEvaluationPrompt(
        businessData,
        collectionsData,
      );

      // Call AI (LangChain handles fallback automatically)
      let aiResponse: string;
      try {
        if (!this.primaryModel && !this.fallbackModel) {
          throw new Error('No AI model configured');
        }
        this.logger.log(
          `🤖 [User ${userId}] Starting initial evaluation with AI`,
        );
        aiResponse = await this.executeToolsLoop(userId, prompt);
        this.logger.log(
          `✅ [User ${userId}] Initial evaluation completed successfully`,
        );
      } catch (error) {
        this.logger.error(`❌ [User ${userId}] Initial AI evaluation failed:`, {
          errorName: error instanceof Error ? error.name : 'Unknown',
          errorMessage: error instanceof Error ? error.message : String(error),
          primaryModelAvailable: !!this.primaryModel,
          fallbackModelAvailable: !!this.fallbackModel,
        });

        // Capture in Sentry
        Sentry.captureException(error, {
          tags: {
            component: 'onboarding',
            phase: 'initial_evaluation',
            userId,
            primaryModel: this.primaryModel ? 'available' : 'unavailable',
            fallbackModel: this.fallbackModel ? 'available' : 'unavailable',
          },
        });

        // For initial evaluation, we use a generic fallback to not block the user
        this.logger.warn(
          `⚠️ [User ${userId}] Using generic fallback for initial evaluation`,
        );
        aiResponse = JSON.stringify({
          score: 20,
          context:
            '## Informations de base récupérées\n\n- Profil WhatsApp Business connecté\n- Catalogue synchronisé',
          needs: [
            'Politique de livraison',
            'Moyens de paiement acceptés',
            'Politique de retour',
          ],
          question:
            'Proposez-vous la livraison à vos clients ? Si oui, dans quelles villes ?',
        });
      }

      // Parse AI response
      const evaluation = this.parseAIResponse(aiResponse);

      // Update thread
      await this.prisma.onboardingThread.update({
        where: { id: thread.id },
        data: {
          score: evaluation.score,
          context: evaluation.context,
          needs: evaluation.needs,
        },
      });

      // Create first message
      await this.prisma.threadMessage.create({
        data: {
          threadId: thread.id,
          role: 'assistant',
          content: evaluation.question,
          metadata: {
            score: evaluation.score,
            context: evaluation.context,
            needs: evaluation.needs,
          },
        },
      });

      // Emit AI message (includes score, no need for separate emitScoreUpdate)
      this.onboardingGateway.emitAIMessage(userId, {
        message: evaluation.question,
        score: evaluation.score,
        context: evaluation.context,
        needs: evaluation.needs,
        question: evaluation.question,
      });

      this.onboardingGateway.emitThreadReady(userId);

      this.logger.log(`✅ Initial evaluation completed for user: ${userId}`);
    } catch (error) {
      this.logger.error(`Failed initial evaluation for user: ${userId}`, error);
      throw error;
    }
  }

  /**
   * Handle user message and generate AI response
   * @param user - Full user object from req.user (avoids DB query in tools)
   * @param content - User message content
   */
  async handleUserMessage(user: UserContext, content: string): Promise<void> {
    const userId = user.id;
    this.logger.log(`💬 Handling user message for: ${userId}`);

    // Create and store AbortController for this request
    const controller = new AbortController();
    this.activeControllers.set(userId, controller);

    try {
      const thread = await this.prisma.onboardingThread.findUnique({
        where: { userId },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
            take: 20, // Last 20 messages for context
          },
        },
      });

      if (!thread) {
        throw new Error('Thread not found');
      }

      // Save user message
      const newMessage = await this.prisma.threadMessage.create({
        data: {
          threadId: thread.id,
          role: 'user',
          content,
        },
      });

      thread.messages.push(newMessage);

      // Fetch all business data
      const { businessData, collectionsData } =
        await this.fetchUserBusinessData(userId);

      // Build conversation history
      const conversationHistory = thread.messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      // Build prompt using PromptsService
      const prompt = this.promptsService.buildConversationPrompt(
        businessData,
        collectionsData,
        conversationHistory,
        thread.score,
        thread.context,
        thread.needs as string[] | null,
        content,
      );

      // Call AI (LangChain handles fallback automatically)
      let aiResponse: string;
      try {
        if (!this.primaryModel && !this.fallbackModel) {
          throw new Error('No AI model configured');
        }
        this.logger.log(
          `🤖 [User ${userId}] Calling AI agent (message count: ${thread.messages.length})`,
        );
        this.logger.debug(
          `📝 Prompt length: ${prompt.length} chars, conversation history: ${conversationHistory.length} messages`,
        );

        aiResponse = await this.executeToolsLoop(
          userId,
          prompt,
          controller.signal,
          user, // Pass full user object to avoid DB queries in tools
        );

        this.logger.log(
          `✅ [User ${userId}] AI response received successfully`,
        );
        this.logger.debug(`📤 AI response length: ${aiResponse.length} chars`);
      } catch (error) {
        // Check if this was an abort
        if (error instanceof Error && error.name === 'AbortError') {
          this.logger.log(`⏹️ Processing cancelled for user ${userId}`);
          return; // Exit without sending response
        }

        // Log detailed error information
        this.logger.error(`❌ [User ${userId}] AI invocation failed:`, {
          errorName: error instanceof Error ? error.name : 'Unknown',
          errorMessage: error instanceof Error ? error.message : String(error),
          errorStack:
            error instanceof Error
              ? error.stack?.split('\n').slice(0, 3).join('\n')
              : undefined,
          userId,
          messageCount: thread.messages.length,
          primaryModelAvailable: !!this.primaryModel,
          fallbackModelAvailable: !!this.fallbackModel,
        });

        // Capture error in Sentry with context
        Sentry.captureException(error, {
          tags: {
            component: 'onboarding',
            userId,
            primaryModel: this.primaryModel ? 'available' : 'unavailable',
            fallbackModel: this.fallbackModel ? 'available' : 'unavailable',
          },
          extra: {
            messageCount: thread.messages.length,
            threadScore: thread.score,
            userMessage: content,
          },
        });

        // Emit error to user via WebSocket
        this.onboardingGateway.emitError(userId, {
          message:
            "Désolé, l'IA rencontre actuellement un problème technique. Notre équipe a été notifiée. Veuillez réessayer dans quelques instants.",
          type: 'ai_failure',
          retryable: true,
        });

        // Don't save any fallback message - exit the function
        return;
      }

      const evaluation = this.parseAIResponse(aiResponse);

      // Update thread
      await this.prisma.onboardingThread.update({
        where: { id: thread.id },
        data: {
          score: evaluation.score,
          context: evaluation.context,
          needs: evaluation.needs,
        },
      });

      // Save AI response
      await this.prisma.threadMessage.create({
        data: {
          threadId: thread.id,
          role: 'assistant',
          content: evaluation.question,
          metadata: evaluation,
        },
      });

      // Emit AI message (includes score)
      this.onboardingGateway.emitAIMessage(userId, {
        message: evaluation.question,
        score: evaluation.score,
        context: evaluation.context,
        needs: evaluation.needs,
        question: evaluation.question,
      });

      // Note: Score >= 80 means the user CAN complete onboarding,
      // but they can continue to improve the context if they want.
      // The user must explicitly complete the onboarding via the UI.
    } catch (error) {
      this.logger.error(`Failed to handle user message for: ${userId}`, error);
      throw error;
    } finally {
      // Clean up the controller
      this.activeControllers.delete(userId);
    }
  }

  /**
   * Complete onboarding manually
   * User decides they're ready to activate the system
   */
  async completeOnboarding(userId: string) {
    const thread = await this.prisma.onboardingThread.findUnique({
      where: { userId },
    });

    if (!thread) {
      throw new Error('No onboarding thread found for user');
    }

    if (thread.status === 'completed') {
      return {
        message: 'Onboarding already completed',
        score: thread.score,
        warning: null,
      };
    }

    // Check score for warning
    let warning: string | null = null;
    if (thread.score < 80) {
      warning = `Le score actuel est de ${thread.score}%. Il est recommandé d'avoir au moins 80% pour une expérience optimale. Vous pouvez continuer à améliorer le contexte plus tard.`;
    }

    // Mark as completed
    await this.prisma.onboardingThread.update({
      where: { id: thread.id },
      data: { status: 'completed' },
    });

    // Activate user
    await this.prisma.user.update({
      where: { id: userId },
      data: { status: 'ACTIVE' },
    });

    this.logger.log(
      `✅ User ${userId} completed onboarding (score: ${thread.score}%)`,
    );

    return {
      message: 'Onboarding terminé avec succès !',
      score: thread.score,
      warning,
    };
  }

  /**
   * Parse AI response with cleanup
   */
  private parseAIResponse(response: string): {
    score: number;
    context: string;
    needs: string[];
    question: string;
  } {
    try {
      const cleaned = response
        .replace(/```json\n?/g, '')
        .replace(/```/g, '')
        .trim();

      return JSON.parse(cleaned);
    } catch (error) {
      this.logger.error('Failed to parse AI response', error);
      return {
        score: 20,
        context: '',
        needs: [],
        question: 'Pouvez-vous me parler de votre politique de livraison ?',
      };
    }
  }

  /**
   * Execute the AI agent with userId passed via runtime context
   * Agent is already created in constructor
   * @param userId - User ID for context
   * @param prompt - Prompt to send to the agent
   * @param signal - Optional abort signal
   * @param user - Optional full user object (avoids DB query in tools)
   */
  private async executeToolsLoop(
    userId: string,
    prompt: string,
    signal?: AbortSignal,
    user?: UserContext,
  ): Promise<string> {
    if (!this.agent) {
      throw new Error('Agent not initialized');
    }

    // Emit thinking status
    this.onboardingGateway.emitThinking(userId, true);

    // Check if already aborted
    if (signal?.aborted) {
      const error = new Error('AbortError');
      error.name = 'AbortError';
      throw error;
    }

    // Invoke the agent with userId (and optionally user) in runtime context
    const result = await this.agent.invoke(
      {
        messages: [{ role: 'user', content: prompt }],
      },
      {
        context: {
          userId,
          ...(user && { user }), // Pass full user object if available
        },
        ...(signal && { signal }),
      },
    );

    // Extract the final message content
    const messages = result.messages;
    const lastMessage = messages[messages.length - 1];

    if (typeof lastMessage.content === 'string') {
      return lastMessage.content;
    }

    // Handle content blocks (for multimodal responses)
    if (Array.isArray(lastMessage.content)) {
      return lastMessage.content
        .filter(
          (block): block is { type: 'text'; text: string } =>
            typeof block === 'object' &&
            block !== null &&
            'type' in block &&
            block.type === 'text',
        )
        .map((block) => block.text)
        .join('');
    }

    return String(lastMessage.content);
  }
}
