import { type FormEvent, type UIEvent, useEffect, useMemo, useRef, useState } from "react";
import { type InfiniteData, useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usePage } from "@inertiajs/react";
import axios from "axios";
import { CHAT_CONVERSATIONS_QUERY_KEY, chatMessagesQueryKey } from "../../utils/query-keys";
import type { ChatConversation, ChatMessage } from "../../utils/types";

type MessagesResponse = {
  data: ChatMessage[];
  has_more: boolean;
  next_before_id: number | null;
  limit: number;
};

type ConversationPanelProps = {
  conversation: ChatConversation | null;
  isMobile: boolean;
  onBack: () => void;
};

type PendingMessage = {
  id: string;
  text: string;
  time: string;
};

type RenderMessage = ChatMessage & {
  isPending?: boolean;
  pendingId?: string;
};

const MESSAGES_LIMIT = 50;

const ConversationPanel = ({ conversation, isMobile, onBack }: ConversationPanelProps) => {
  const queryClient = useQueryClient();
  const { props } = usePage<{ auth?: { user?: { id: number } } }>();
  const authUserId = props.auth?.user?.id ?? null;

  const [messageInput, setMessageInput] = useState("");
  const [sendError, setSendError] = useState("");
  const [pendingMessages, setPendingMessages] = useState<PendingMessage[]>([]);

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const previousScrollMetricsRef = useRef<{ top: number; height: number } | null>(null);
  const shouldStickToBottomRef = useRef(true);

  const messagesQuery = useInfiniteQuery({
    queryKey: chatMessagesQueryKey(conversation?.id ?? null),
    enabled: Boolean(conversation?.id),
    initialPageParam: null as number | null,
    queryFn: async ({ pageParam }) => {
      const response = await axios.get<MessagesResponse>(`/api/chat/conversations/${conversation?.id}/messages`, {
        params: {
          before_id: pageParam ?? undefined,
          limit: MESSAGES_LIMIT,
        },
      });

      return response.data;
    },
    getNextPageParam: (lastPage) => {
      if (!lastPage.has_more || !lastPage.next_before_id) {
        return undefined;
      }

      return lastPage.next_before_id;
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({ text }: { tempId: string; text: string }) => {
      if (!conversation?.id) {
        throw new Error("Nessuna conversazione selezionata.");
      }

      const response = await axios.post<{ data: ChatMessage }>(`/api/chat/conversations/${conversation.id}/messages`, {
        text,
      });

      return response.data.data;
    },
    onSuccess: (savedMessage, variables) => {
      setPendingMessages((current) => current.filter((message) => message.id !== variables.tempId));

      if (!conversation?.id || !savedMessage) {
        return;
      }

      queryClient.setQueryData<InfiniteData<MessagesResponse>>(chatMessagesQueryKey(conversation.id), (currentData) => {
        if (!currentData || currentData.pages.length === 0) {
          return currentData;
        }

        const [firstPage, ...restPages] = currentData.pages;
        if (!firstPage) {
          return currentData;
        }

        const alreadyExists = currentData.pages.some((page) => page.data.some((message) => message.id === savedMessage.id));

        if (alreadyExists) {
          return currentData;
        }

        return {
          ...currentData,
          pages: [
            {
              has_more: firstPage.has_more,
              next_before_id: firstPage.next_before_id,
              limit: firstPage.limit,
              data: [...firstPage.data, savedMessage],
            },
            ...restPages,
          ],
        };
      });

      queryClient.invalidateQueries({ queryKey: CHAT_CONVERSATIONS_QUERY_KEY });
    },
    onError: (_error, variables) => {
      setPendingMessages((current) => current.filter((message) => message.id !== variables.tempId));
      setSendError("Invio non riuscito. Riprova.");
    },
  });

  const messages = useMemo(() => {
    if (!messagesQuery.data) {
      return [];
    }

    const orderedPages = [...messagesQuery.data.pages].reverse();
    const flattened = orderedPages.flatMap((page) => page.data);
    const deduped = new Map<number, ChatMessage>();

    flattened.forEach((message) => {
      deduped.set(message.id, message);
    });

    return [...deduped.values()].sort((a, b) => a.id - b.id);
  }, [messagesQuery.data]);

  const renderedMessages = useMemo<RenderMessage[]>(() => {
    const normalizedPending: RenderMessage[] = pendingMessages.map((pendingMessage, index) => ({
      id: -(index + 1),
      author: "me",
      text: pendingMessage.text,
      time: pendingMessage.time,
      isPending: true,
      pendingId: pendingMessage.id,
    }));

    return [...messages, ...normalizedPending];
  }, [messages, pendingMessages]);

  useEffect(() => {
    setMessageInput("");
    setSendError("");
    setPendingMessages([]);
  }, [conversation?.id]);

  useEffect(() => {
    if (!conversation?.id || !window.Echo) {
      return;
    }

    const channelName = `conversation.${conversation.id}`;
    const channel = window.Echo.channel(channelName);

    channel.listen(
      ".chat.message.sent",
      (payload: {
        conversation_id: number;
        message: { id: number; sender_user_id: number; text: string; time: string };
      }) => {
        if (payload.conversation_id !== conversation.id) {
          return;
        }

        const normalizedMessage: ChatMessage = {
          id: payload.message.id,
          author: payload.message.sender_user_id === authUserId ? "me" : "other",
          text: payload.message.text,
          time: payload.message.time,
        };

        queryClient.setQueryData<InfiniteData<MessagesResponse>>(
          chatMessagesQueryKey(conversation.id),
          (currentData) => {
            if (!currentData || currentData.pages.length === 0) {
              return currentData;
            }

            const [firstPage, ...restPages] = currentData.pages;
            if (!firstPage) {
              return currentData;
            }

            const alreadyExists = currentData.pages.some((page) =>
              page.data.some((message) => message.id === normalizedMessage.id),
            );

            if (alreadyExists) {
              return currentData;
            }

            return {
              ...currentData,
              pages: [
                {
                  has_more: firstPage.has_more,
                  next_before_id: firstPage.next_before_id,
                  limit: firstPage.limit,
                  data: [...firstPage.data, normalizedMessage],
                },
                ...restPages,
              ],
            };
          },
        );

        queryClient.invalidateQueries({ queryKey: CHAT_CONVERSATIONS_QUERY_KEY });
      },
    );

    return () => {
      channel.stopListening(".chat.message.sent");
      window.Echo.leave(channelName);
    };
  }, [authUserId, conversation?.id, queryClient]);

  const handleMessagesScroll = (event: UIEvent<HTMLDivElement>) => {
    const container = event.currentTarget;
    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    shouldStickToBottomRef.current = distanceFromBottom < 120;

    if (!messagesQuery.hasNextPage || messagesQuery.isFetchingNextPage) {
      return;
    }

    if (container.scrollTop < 120) {
      previousScrollMetricsRef.current = {
        top: container.scrollTop,
        height: container.scrollHeight,
      };
      messagesQuery.fetchNextPage();
    }
  };

  useEffect(() => {
    const container = scrollContainerRef.current;

    if (!container) {
      return;
    }

    if (previousScrollMetricsRef.current) {
      const previous = previousScrollMetricsRef.current;
      const heightDiff = container.scrollHeight - previous.height;
      container.scrollTop = previous.top + heightDiff;
      previousScrollMetricsRef.current = null;
      return;
    }

    if (shouldStickToBottomRef.current) {
      container.scrollTop = container.scrollHeight;
    }
  }, [messages.length, pendingMessages.length, conversation?.id]);

  const handleSendMessage = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedText = messageInput.trim();

    if (!normalizedText || !conversation) {
      return;
    }

    const tempId = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const now = new Date().toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });

    setSendError("");
    setPendingMessages((current) => [...current, { id: tempId, text: normalizedText, time: now }]);
    setMessageInput("");
    sendMessageMutation.mutate({ tempId, text: normalizedText });
  };

  if (!conversation) {
    return (
      <section className="flex h-full items-center justify-center rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
        Seleziona o crea una conversazione.
      </section>
    );
  }

  return (
    <section className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <header className="border-b border-slate-100 px-4 py-3 sm:px-5 sm:py-4">
        <div className="flex items-center gap-3">
          {isMobile && (
            <button
              type="button"
              onClick={onBack}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700"
            >
              Indietro
            </button>
          )}
          <div>
            <h2 className="text-base font-semibold tracking-tight text-slate-900">{conversation.title}</h2>
            <p className="text-xs text-slate-500">{conversation.email}</p>
          </div>
        </div>
      </header>

      <div
        ref={scrollContainerRef}
        onScroll={handleMessagesScroll}
        className="flex-1 space-y-3 overflow-y-auto px-4 py-4 sm:px-5"
      >
        {messagesQuery.hasNextPage && (
          <p className="text-center text-xs text-slate-500">
            {messagesQuery.isFetchingNextPage ? "Caricamento..." : "Scorri su per altri messaggi"}
          </p>
        )}

        {renderedMessages.length === 0 && (
          <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
            Nessun messaggio ancora. Scrivi il primo messaggio a {conversation.email}.
          </p>
        )}

        {renderedMessages.map((message) => (
          <div
            key={message.isPending ? `${conversation.id}-${message.pendingId}` : `${conversation.id}-${message.id}`}
            className={`w-fit max-w-[78%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed sm:max-w-[68%] ${
              message.author === "me" ? "ml-auto bg-slate-900 text-white" : "bg-slate-100 text-slate-800"
            } ${message.isPending ? "opacity-55" : ""}`}
          >
            <p>{message.text}</p>
            <p className={`mt-1 text-[11px] ${message.author === "me" ? "text-slate-300" : "text-slate-500"}`}>
              {message.time}
            </p>
          </div>
        ))}
      </div>

      <footer className="border-t border-slate-100 px-4 py-3 sm:px-5">
        {sendError && <p className="mb-2 text-xs text-rose-600">{sendError}</p>}
        <form onSubmit={handleSendMessage} className="flex items-end gap-2">
          <input
            type="text"
            value={messageInput}
            onChange={(event) => setMessageInput(event.target.value)}
            placeholder={`Scrivi a ${conversation.email}`}
            className="min-h-11 flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
          />
          <button
            type="submit"
            disabled={!messageInput.trim()}
            className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            Invia
          </button>
        </form>
      </footer>
    </section>
  );
};

export default ConversationPanel;
