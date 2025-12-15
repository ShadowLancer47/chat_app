"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Session } from "@supabase/supabase-js";
import Auth from "@/components/Auth";
import Sidebar from "@/components/Sidebar";
import ChatArea from "@/components/ChatArea";

export default function Home() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-dracula-bg text-dracula-purple">
        Loading...
      </div>
    );
  }

  if (!session) {
    return <Auth />;
  }

  return (
    <div className="flex h-screen bg-dracula-bg text-dracula-fg overflow-hidden">
      <Sidebar
        currentUserId={session.user.id}
        onSelectChat={setSelectedChatId}
      />

      {selectedChatId ? (
        <ChatArea
          chatId={selectedChatId}
          currentUserId={session.user.id}
        />
      ) : (
        <div className="flex-1 flex items-center justify-center flex-col text-dracula-comment">
          <h2 className="text-2xl font-bold mb-2">Welcome to Chat App</h2>
          <p>Select a chat to start messaging</p>
          <button
            onClick={() => supabase.auth.signOut()}
            className="mt-8 px-4 py-2 bg-dracula-red text-white rounded hover:bg-red-600"
          >
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}
