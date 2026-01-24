/**
 * Types for backend API endpoints
 * These types complement the auto-generated types from openapi-ts
 */

export interface AuthorizedGroup {
  whatsappGroupId: string; // ID WhatsApp du groupe (ex: "12345@g.us")
  usage: string; // Usage du groupe (ex: "Support client", "Ventes")
  name?: string; // Nom du groupe (optionnel)
}

export interface ContactLabel {
  id: string;
  name: string;
  hexColor: string;
}

export interface CanProcessRequest {
  userId: string; // ID of the connected WhatsApp account (e.g., "237657888690@c.us")
  chatId: string; // ID of the chat where the message was received
  message: string;
  contactLabels?: ContactLabel[]; // Labels of the contact sending the message
  timestamp: string;
}

export interface CanProcessResponse {
  allowed: boolean;
  reason?: string;
  agentContext?: string;
  managementGroupId?: string;
  agentId?: string;
  authorizedGroups?: AuthorizedGroup[];
}

export interface ToolExecution {
  name: string;
  args: any;
  result?: any;
  error?: string;
  durationMs?: number;
}

export interface LogOperationRequest {
  // Context
  chatId: string;
  agentId?: string;
  userId?: string;

  // Messages
  userMessage: string;
  agentResponse: string;
  systemPrompt: string;

  // Metrics
  totalTokens?: number;
  promptTokens?: number;
  completionTokens?: number;
  durationMs: number;
  modelName?: string;

  // Tools
  toolsUsed?: ToolExecution[];

  // Status
  status: 'success' | 'error' | 'rate_limited';
  error?: string;

  // Metadata
  metadata?: Record<string, any>;

  timestamp: string;
}

export interface LogOperationResponse {
  success: boolean;
  operationId?: string;
}
