import { BackendClientService } from '@app/backend-client/backend-client.service';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PromptGeneratorService {
  private readonly logger = new Logger(PromptGeneratorService.name);
  private readonly model: ChatGoogleGenerativeAI;
  private generationPromise: Promise<string> | null = null;

  constructor(
    private readonly backendClient: BackendClientService,
    private readonly configService: ConfigService,
  ) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      throw new Error('Missing GEMINI_API_KEY for PromptGeneratorService');
    }

    this.model = new ChatGoogleGenerativeAI({
      apiKey,
      model:
        this.configService.get<string>('GEMINI_PROMPT_GENERATOR_MODEL') ||
        'gemini-3.1-pro-preview',
      temperature: 0.2,
      thinkingConfig: {
        thinkingLevel: 'HIGH',
      },
      maxRetries: 2,
    });
  }

  async ensureCustomPrompt(): Promise<string> {
    if (this.generationPromise) {
      return this.generationPromise;
    }

    this.generationPromise = this.ensureCustomPromptInternal();

    try {
      return await this.generationPromise;
    } finally {
      this.generationPromise = null;
    }
  }

  private async ensureCustomPromptInternal(): Promise<string> {
    const current = await this.backendClient.getAgentCustomPrompt();
    const existingPrompt = current?.customDescriptionPrompt?.trim();

    if (existingPrompt) {
      return existingPrompt;
    }

    const [products, snapshot] = await Promise.all([
      this.backendClient.getSampleProducts(20, 3),
      this.backendClient.getAgentSnapshot(),
    ]);

    if (products.length === 0) {
      throw new Error('No products available to generate custom prompt');
    }

    const categories = Array.from(
      new Set(
        products
          .map((product) => product.category?.trim())
          .filter((category): category is string => Boolean(category)),
      ),
    );

    const businessContext = snapshot.businessContext?.trim() || null;

    const prompt = this.buildMetaPrompt(products, categories, businessContext);

    this.logger.log(
      `Generating custom image description prompt from ${products.length} sample products${businessContext ? ' with business context' : ''}`,
    );

    this.logger.debug('Invoking Gemini model with thinking level HIGH...');

    try {
      const result = await this.model.invoke([
        new SystemMessage(
          'You are an expert prompt engineer for multimodal product identification. Return only the final prompt text.',
        ),
        new HumanMessage(prompt),
      ]);

      this.logger.debug('Gemini model responded successfully');

      const finalPrompt = String(result.content).trim();

      if (!finalPrompt) {
        throw new Error('Prompt generator returned an empty prompt');
      }

      this.logger.debug(
        `Generated prompt preview: ${finalPrompt.substring(0, 150)}...`,
      );

      await this.backendClient.updateAgentCustomPrompt({
        customDescriptionPrompt: finalPrompt,
        promptBasedOnProductsCount: products.length,
      });

      this.logger.log(`Custom prompt generated (${finalPrompt.length} chars)`);

      return finalPrompt;
    } catch (error) {
      this.logger.error('Failed to generate custom prompt with Gemini:', error);
      throw error;
    }
  }

  private buildMetaPrompt(
    products: Array<{
      name: string;
      description?: string | null;
      category?: string | null;
      retailer_id?: string | null;
    }>,
    categories: string[],
    businessContext: string | null,
  ) {
    const productsList = products
      .map((product, index) => {
        const fragments = [
          `${index + 1}. ${product.name}`,
          product.description ? `- ${product.description}` : '',
          product.category ? `(category: ${product.category})` : '',
          product.retailer_id ? `(retailer_id: ${product.retailer_id})` : '',
        ].filter(Boolean);

        return fragments.join(' ');
      })
      .join('\n');

    const contextSection = businessContext
      ? `\nBusiness Context (what the company does):\n${businessContext}\n`
      : '';

    return `CRITICAL MISSION:
You must generate an image identification prompt that will be used by Gemini Vision to consistently describe products from this catalog. This prompt will then be used to automatically identify products in photos sent by the merchant's WhatsApp customers.

WHY THIS IS CRUCIAL:
- When a customer sends a product photo via WhatsApp, the system must automatically identify it
- Gemini Vision will use YOUR prompt to describe the image sent by the customer
- This description will then be compared vectorially (via Qdrant) to the catalog product descriptions
- For identification to work, descriptions must be CONSISTENT (same format, same structure)
- Good consistency = 90-95% confidence in identification
- Poor consistency = 60-70% confidence = identification failure

CONCRETE EXAMPLE:
1. Your prompt describes catalog image: "Jersey FC Barcelona Home 2024/2025 Blue and Garnet"
2. Customer sends Instagram screenshot of the same jersey
3. Gemini Vision uses YOUR SAME prompt to describe the customer's image
4. If prompt is well-made → similar description → identification successful ✅
5. If prompt is poorly made → different descriptions → failure ❌

THIS IS A COMPANY'S DESCRIPTION:
${contextSection}

Catalog sample (${products.length} items):
${productsList}

Categories: ${categories.length > 0 ? categories.join(', ') : 'Not specified'}

REQUIREMENTS FOR THE PROMPT YOU GENERATE:

1. MAXIMUM COHERENCE (90%+ similarity required):
   - Use a STRICT and REPRODUCIBLE format for each product type
   - Same order of information every time
   - Standardized and consistent vocabulary

2. KEY DISCRIMINATORS:
   - Identify visual attributes that differentiate products
   - Depending on domain: brand/model, colors, materials, dimensions, distinctive features

3. IGNORE UI NOISE:
   - The prompt must explicitly state to ignore interface elements (buttons, menus, UI text)
   - Focus only on the visible product

4. COMPACT & NORMALIZED:
   - Short and structured format (max 1-2 sentences per description)
   - No stylistic variation (always the same tone)

5. STRICT OUTPUT FORMAT:
   - Define a clear format adapted to the product type
   - Concrete examples in the prompt based on real catalog products

IMPORTANT:
- The prompt must be directly usable by Gemini Vision (start with a clear instruction)
- It must be in ENGLISH (better precision for AI models)
- It must contain 3-5 concrete examples based on the products above
- It must maximize similarity between descriptions of the same product (target: >90%)

Return ONLY the final prompt text in English (no preamble, no explanation).`;
  }
}
