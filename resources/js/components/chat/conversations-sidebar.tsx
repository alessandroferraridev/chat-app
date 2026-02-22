import { type FormEvent, type UIEvent, useEffect, useMemo, useState } from "react";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { router, usePage } from "@inertiajs/react";
import axios from "axios";
import { CHAT_CONVERSATIONS_QUERY_KEY } from "../../utils/query-keys";
import type { ChatConversation } from "../../utils/types";

type ApiConversation = {
  id: number;
  title: string;
  email: string;
  preview: string;
  updated_at: string;
};

type ConversationsResponse = {
  data: ApiConversation[];
  current_page: number;
  last_page: number;
  per_page: number;
};

type ConversationsSidebarProps = {
  selectedConversationId: number | null;
  onSelectConversation: (conversation: ChatConversation) => void;
};

const CONVERSATIONS_LIMIT = 50;

const toConversation = (conversation: ApiConversation): ChatConversation => {
  return {
    id: conversation.id,
    title: conversation.title,
    email: conversation.email,
    preview: conversation.preview,
    updatedAt: new Date(conversation.updated_at).toLocaleTimeString("it-IT", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
};

const ConversationsSidebar = ({ selectedConversationId, onSelectConversation }: ConversationsSidebarProps) => {
  const queryClient = useQueryClient();
  const { props } = usePage<{ auth?: { user?: { id: number; email: string } } }>();
  const authUserId = props.auth?.user?.id ?? null;
  const authUserEmail = props.auth?.user?.email ?? "";

  const [searchTerm, setSearchTerm] = useState("");
  const [isCreatingConversation, setIsCreatingConversation] = useState(false);
  const [newConversationEmail, setNewConversationEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [unreadConversationIds, setUnreadConversationIds] = useState<Set<number>>(new Set());

  const conversationsQuery = useInfiniteQuery({
    queryKey: CHAT_CONVERSATIONS_QUERY_KEY,
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const response = await axios.get<ConversationsResponse>("/api/chat/conversations", {
        params: {
          page: pageParam,
          per_page: CONVERSATIONS_LIMIT,
        },
      });

      return response.data;
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.current_page >= lastPage.last_page) {
        return undefined;
      }

      return lastPage.current_page + 1;
    },
  });

  const createConversationMutation = useMutation({
    mutationFn: async (email: string) => {
      const response = await axios.post<{ data: ApiConversation }>("/api/chat/conversations", { email });
      return response.data.data;
    },
    onSuccess: (createdConversation) => {
      const normalizedConversation = toConversation(createdConversation);
      onSelectConversation(normalizedConversation);
      setIsCreatingConversation(false);
      setNewConversationEmail("");
      setEmailError("");
      queryClient.invalidateQueries({ queryKey: CHAT_CONVERSATIONS_QUERY_KEY });
    },
    onError: (error: unknown) => {
      if (axios.isAxiosError<{ errors?: Record<string, string[]> }>(error)) {
        const backendEmailError = error.response?.data?.errors?.email?.[0];
        if (backendEmailError) {
          setEmailError(backendEmailError);
          return;
        }
      }

      setEmailError("Impossibile creare la conversazione.");
    },
  });

  const conversations = useMemo(() => {
    const flattened = conversationsQuery.data?.pages.flatMap((page) => page.data.map(toConversation)) ?? [];
    const deduped = new Map<number, ChatConversation>();

    flattened.forEach((conversation) => {
      deduped.set(conversation.id, conversation);
    });

    return [...deduped.values()];
  }, [conversationsQuery.data]);

  useEffect(() => {
    if (!authUserId || !window.Echo) {
      return;
    }

    const channelName = `user.${authUserId}`;
    const channel = window.Echo.channel(channelName);
    const refreshConversations = () => {
      queryClient.invalidateQueries({ queryKey: CHAT_CONVERSATIONS_QUERY_KEY });
    };

    channel.listen(".chat.conversation.created", refreshConversations);
    channel.listen(
      ".chat.message.sent",
      (payload: { conversation_id: number; message: { sender_user_id: number } }) => {
        refreshConversations();

        if (payload.message.sender_user_id === authUserId || payload.conversation_id === selectedConversationId) {
          return;
        }

        setUnreadConversationIds((current) => {
          const next = new Set(current);
          next.add(payload.conversation_id);
          return next;
        });
      },
    );

    return () => {
      channel.stopListening(".chat.conversation.created");
      channel.stopListening(".chat.message.sent");
      window.Echo.leave(channelName);
    };
  }, [authUserId, queryClient, selectedConversationId]);

  useEffect(() => {
    if (!selectedConversationId) {
      return;
    }

    setUnreadConversationIds((current) => {
      if (!current.has(selectedConversationId)) {
        return current;
      }

      const next = new Set(current);
      next.delete(selectedConversationId);
      return next;
    });
  }, [selectedConversationId]);

  const filteredConversations = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    if (!normalizedSearch) {
      return conversations;
    }

    return conversations.filter((conversation) => {
      return (
        conversation.title.toLowerCase().includes(normalizedSearch) ||
        conversation.email.toLowerCase().includes(normalizedSearch) ||
        conversation.preview.toLowerCase().includes(normalizedSearch)
      );
    });
  }, [conversations, searchTerm]);

  const handleCreateConversation = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedEmail = newConversationEmail.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(normalizedEmail)) {
      setEmailError("Inserisci un'email valida.");
      return;
    }

    createConversationMutation.mutate(normalizedEmail);
  };

  const handleListScroll = (event: UIEvent<HTMLElement>) => {
    if (!conversationsQuery.hasNextPage || conversationsQuery.isFetchingNextPage) {
      return;
    }

    const container = event.currentTarget;
    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;

    if (distanceFromBottom < 120) {
      conversationsQuery.fetchNextPage();
    }
  };

  return (
    <aside className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-4 py-3">
        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Account</p>
        <div className="mt-2 flex items-center justify-between gap-2">
          <p className="truncate text-sm font-medium text-slate-900">{authUserEmail}</p>
          <button
            type="button"
            onClick={() => router.post("/logout")}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Logout
          </button>
        </div>
      </div>

      <header className="border-b border-slate-100 px-4 py-3">
        <h1 className="text-base font-semibold tracking-tight text-slate-900">Conversazioni</h1>

        <div className="mt-3">
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Cerca per email o nome"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
          />
        </div>
      </header>

      <section className="border-b border-slate-800 bg-slate-950 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-300">Nuova chat</p>
          <button
            type="button"
            onClick={() => {
              setIsCreatingConversation((value) => !value);
              setEmailError("");
            }}
            className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 transition hover:bg-slate-100"
          >
            {isCreatingConversation ? "Chiudi" : "Apri"}
          </button>
        </div>

        {isCreatingConversation && (
          <form onSubmit={handleCreateConversation} className="mt-3 space-y-2">
            <label htmlFor="new-chat-email" className="block text-xs font-medium text-slate-200">
              Crea da email
            </label>
            <input
              id="new-chat-email"
              type="email"
              value={newConversationEmail}
              onChange={(event) => {
                setNewConversationEmail(event.target.value);
                if (emailError) {
                  setEmailError("");
                }
              }}
              placeholder="nome@esempio.com"
              className="w-full rounded-lg border border-slate-600 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-300"
            />
            {emailError && <p className="text-xs text-rose-300">{emailError}</p>}
            <button
              type="submit"
              className="w-full rounded-lg bg-white px-3 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
            >
              Avvia conversazione
            </button>
          </form>
        )}
      </section>

      <nav className="flex-1 overflow-y-auto p-2" onScroll={handleListScroll}>
        <ul className="space-y-1">
          {filteredConversations.map((conversation) => {
            const isActive = conversation.id === selectedConversationId;
            const hasUnread = unreadConversationIds.has(conversation.id) && !isActive;

            return (
              <li key={conversation.id}>
                <button
                  type="button"
                  onClick={() => {
                    setUnreadConversationIds((current) => {
                      if (!current.has(conversation.id)) {
                        return current;
                      }

                      const next = new Set(current);
                      next.delete(conversation.id);
                      return next;
                    });
                    onSelectConversation(conversation);
                  }}
                  className={`w-full rounded-xl border px-3 py-2 text-left transition ${
                    isActive
                      ? "border-slate-300 bg-slate-100"
                      : "border-transparent bg-white hover:border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium text-slate-900">{conversation.title}</p>
                    <div className="flex items-center gap-2">
                      {hasUnread && <span className="h-2.5 w-2.5 rounded-full bg-rose-500" aria-label="Nuovi messaggi" />}
                      <span className="text-xs text-slate-500">{conversation.updatedAt}</span>
                    </div>
                  </div>
                  <p className="mt-1 truncate text-xs text-slate-600">{conversation.email}</p>
                  <p className="mt-1 truncate text-xs text-slate-500">{conversation.preview}</p>
                </button>
              </li>
            );
          })}

          {filteredConversations.length === 0 && (
            <li className="px-3 py-4 text-center text-sm text-slate-500">Nessuna conversazione trovata.</li>
          )}

          {conversationsQuery.isFetchingNextPage && (
            <li className="px-3 py-3 text-center text-xs text-slate-500">Caricamento conversazioni...</li>
          )}
        </ul>
      </nav>
    </aside>
  );
};

export default ConversationsSidebar;
