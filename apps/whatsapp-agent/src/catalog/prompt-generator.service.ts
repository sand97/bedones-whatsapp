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
        'gemini-3-pro',
      temperature: 0.2,
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

    const products = await this.backendClient.getSampleProducts(20, 3);
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

    const prompt = this.buildMetaPrompt(products, categories);

    this.logger.log(
      `Generating custom image description prompt from ${products.length} sample products`,
    );

    const result = await this.model.invoke([
      new SystemMessage(
        'You are an expert prompt engineer for multimodal product identification. Return only the final prompt text.',
      ),
      new HumanMessage(prompt),
    ]);

    const finalPrompt = String(result.content).trim();

    if (!finalPrompt) {
      throw new Error('Prompt generator returned an empty prompt');
    }

    await this.backendClient.updateAgentCustomPrompt({
      customDescriptionPrompt: finalPrompt,
      promptBasedOnProductsCount: products.length,
    });

    this.logger.log(`Custom prompt generated (${finalPrompt.length} chars)`);

    return finalPrompt;
  }

  private buildMetaPrompt(
    products: Array<{
      name: string;
      description?: string | null;
      category?: string | null;
      retailer_id?: string | null;
    }>,
    categories: string[],
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

    return `Analyze this catalog sample and generate one robust image-description prompt adapted to this business.

Catalog sample (${products.length} items):
${productsList}

Categories: ${categories.length > 0 ? categories.join(', ') : 'Not specified'}

Requirements for the prompt you generate:
1. It must produce consistent descriptions for visually similar products.
2. It must mention key discriminators useful for product matching.
3. It must explicitly ignore irrelevant screenshot UI noise.
4. It must return a compact, normalized text style.
5. It must include a strict output format section.

Return only the final prompt, in French.`;
  }
}
