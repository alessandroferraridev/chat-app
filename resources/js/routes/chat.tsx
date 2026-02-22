import { Head } from "@inertiajs/react";
import { useState } from "react";
import ConversationPanel from "../components/chat/conversation-panel";
import ConversationsSidebar from "../components/chat/conversations-sidebar";
import type { ChatConversation } from "../utils/types";

const ChatPage = () => {
  const [selectedConversation, setSelectedConversation] = useState<ChatConversation | null>(null);
  const [isMobileChatOpen, setIsMobileChatOpen] = useState(false);

  const handleSelectConversation = (conversation: ChatConversation) => {
    setSelectedConversation(conversation);
    setIsMobileChatOpen(true);
  };

  return (
    <main className="min-h-screen bg-slate-100 bg-linear-to-b from-slate-50 to-slate-100 px-4 py-6 sm:py-8">
      <Head title="Chat" />

      <section className="mx-auto h-[calc(100vh-4rem)] w-full max-w-6xl">
        <div className="hidden h-full gap-4 lg:grid lg:grid-cols-[320px_minmax(0,1fr)]">
          <ConversationsSidebar
            selectedConversationId={selectedConversation?.id ?? null}
            onSelectConversation={handleSelectConversation}
          />
          <ConversationPanel conversation={selectedConversation} isMobile={false} onBack={() => setIsMobileChatOpen(false)} />
        </div>

        <div className="h-full lg:hidden">
          {!isMobileChatOpen ? (
            <ConversationsSidebar
              selectedConversationId={selectedConversation?.id ?? null}
              onSelectConversation={handleSelectConversation}
            />
          ) : (
            <ConversationPanel conversation={selectedConversation} isMobile onBack={() => setIsMobileChatOpen(false)} />
          )}
        </div>
      </section>
    </main>
  );
};

export default ChatPage;
