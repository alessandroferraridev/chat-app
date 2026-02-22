export type ChatConversation = {
  id: number;
  title: string;
  email: string;
  preview: string;
  updatedAt: string;
};

export type ChatMessage = {
  id: number;
  author: "me" | "other";
  text: string;
  time: string;
};
