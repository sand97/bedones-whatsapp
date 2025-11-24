import { z } from 'zod';

/**
 * Schema Zod pour l'objet user dans le contexte
 */
export const userSchema = z.object({
  id: z.string(),
  phoneNumber: z.string(),
  status: z.string(),
  createdAt: z.date(),
});

/**
 * Schema Zod pour le contexte runtime de l'agent
 * Définit les données statiques passées à chaque invocation
 */
export const contextSchema = z.object({
  userId: z.string(),
  user: userSchema.optional(),
});

/**
 * Type TypeScript inféré du schema Zod
 * Utilisé pour typer le runtime context dans les tools et middleware
 */
export type AgentContext = z.infer<typeof contextSchema>;

/**
 * Type pour l'objet user (non-optional)
 */
export type UserContext = z.infer<typeof userSchema>;
