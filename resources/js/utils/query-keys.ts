export const CHAT_CONVERSATIONS_QUERY_KEY = ["chat-conversations"] as const;

export const chatMessagesQueryKey = (conversationId: number | null) =>
  ["chat-messages", conversationId] as const;
