import { UserStatus } from '@prisma/client';
import { Request as ExpressRequest } from 'express';

/**
 * Type representing the authenticated user attached to req.user
 * This matches the return type of AuthService.validateUser()
 */
export interface AuthenticatedUser {
  id: string;
  phoneNumber: string;
  status: UserStatus;
  whatsappProfile: any; // JSON from Prisma
  businessInfo: {
    id: string;
    user_id: string;
    is_business: boolean;
    whatsapp_id: string | null;
    tag: string | null;
    profile_name: string | null;
    avatar_url: string | null;
    name: string | null;
    description: string | null;
    address: string | null;
    city: string | null;
    country: string | null;
    website: string | null;
    email: string | null;
    categories: any; // JSON
    business_hours: any; // JSON
    profile_options: any; // JSON
    latitude: number | null;
    longitude: number | null;
    phone_numbers: string[];
    created_at: Date;
    updated_at: Date;
  } | null;
  contextScore: number;
  agentConfig: {
    testPhoneNumbers: string[];
    testLabels: string[];
    labelsToNotReply: string[];
    productionEnabled: boolean;
  } | null;
}

/**
 * Custom Request type with properly typed user property
 * Use this instead of Express.Request in controllers
 */
export interface AuthenticatedRequest extends ExpressRequest {
  user: AuthenticatedUser;
}
