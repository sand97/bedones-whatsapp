/**
 * Définitions de types pour les scripts exécutés dans la page WhatsApp Web
 * Ces types permettent l'auto-complétion et la vérification de types dans les scripts
 */

declare global {
  interface Window {
    WPP: WPPInterface;
  }

  // WPP disponible globalement (window.WPP)
  const WPP: WPPInterface;

  // Fonctions disponibles dans le navigateur
  function fetch(input: RequestInfo, init?: RequestInit): Promise<Response>;
  const FormData: {
    new (): FormData;
  };
  const navigator: Navigator;
  const console: Console;
}

interface WPPInterface {
  conn: {
    getMyUserId(): { _serialized: string } | undefined;
    isAuthenticated(): boolean;
  };
  catalog: {
    getProducts(userId: string, quantity: number): Promise<any[]>;
    getCollections(
      userId?: string,
      qnt?: number,
      productsCount?: number,
    ): Promise<any[]>;
    getProductsFromCollection(
      collectionId: string,
      limit?: number,
    ): Promise<any[]>;
    getMyCatalog(): Promise<any | undefined>;
    getProductById(chatId: string, productId: number): Promise<any>;
    sendProductWithCatalog(to: string, productId: string): Promise<any>;
    sendCatalog(to: string, collectionId: string): Promise<any>;
  };
  contact: {
    getBusinessProfile(userId: string): Promise<any>;
  };
  chat: {
    // Existing functions
    getMessages(
      chatId: string,
      options?:
        | number
        | {
            count?: number;
            onlyUnread?: boolean;
            direction?: 'before' | 'after';
            id?: string;
          },
    ): Promise<any[]>;
    forwardMessage(
      to: string,
      originalChatId: string,
      messageIds: string[],
    ): Promise<any>;

    // New messaging functions
    sendTextMessage(
      chatId: string,
      content: string,
      options?: any,
    ): Promise<any>;
    sendCatalogMessage(to: string, catalogOwnerId: string): Promise<any>;
    sendReactionToMessage(
      messageId: string,
      reaction: string | false | null,
    ): Promise<{ sendMsgResult: string }>;
    sendLocationMessage(chatId: string, options: any): Promise<any>;
    editMessage(
      messageId: string,
      newText: string,
      options?: any,
    ): Promise<any>;
    sendScheduledCallMessage(chatId: string, options: any): Promise<any>;
    sendGroupInviteMessage(chatId: string, options: any): Promise<any>;

    // Chat management functions
    markIsRead(chatId: string): Promise<{ unreadCount: number; wid: any }>;
    markIsUnread(chatId: string): Promise<{ wid: any }>;
    markIsComposing(chatId: string, duration?: number): Promise<void>;
    setNotes(chatId: string, content: string): Promise<any | null>;
    getQuotedMsg(messageId: string): Promise<any>;
  };
  labels: {
    getChatLabels(contactId: string): Promise<any[]>;
    addLabel(contactId: string, labelId: string): Promise<any>;
    addOrRemoveLabels(
      contactId: string,
      labelIds: string[],
      action: 'add' | 'remove',
    ): Promise<any>;
  };
  isReady: boolean;
}

export {};
