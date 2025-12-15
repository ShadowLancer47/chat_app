"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { FaUser, FaUsers, FaPlus } from "react-icons/fa";
import NewChatModal from "./NewChatModal";

interface Chat {
    id: string;
    type: "direct" | "group";
    name?: string;
    participants: { username: string; avatar_url: string }[];
}

export default function Sidebar({
    currentUserId,
    onSelectChat,
}: {
    currentUserId: string;
    onSelectChat: (chatId: string) => void;
}) {
    const [chats, setChats] = useState<Chat[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchChats = async () => {
            // This is a simplified query. In a real app, you'd join with profiles.
            // For now, we'll just fetch chats where the user is a participant.
            // Note: Supabase JS client doesn't support deep joins easily without views or RPCs.
            // We will fetch chats then fetch participants.

            const { data: participations, error } = await supabase
                .from("chat_participants")
                .select("chat_id")
                .eq("user_id", currentUserId);

            if (error) {
                console.error("Error fetching chats:", error);
                setLoading(false);
                return;
            }

            const chatIds = participations.map((p) => p.chat_id);

            if (chatIds.length === 0) {
                setChats([]);
                setLoading(false);
                return;
            }

            const { data: chatsData } = await supabase
                .from("chats")
                .select("*")
                .in("id", chatIds)
                .order("created_at", { ascending: false });

            if (chatsData) {
                // Fetch participants for these chats to display names/avatars
                const chatsWithDetails = await Promise.all(
                    chatsData.map(async (chat) => {
                        const { data: parts } = await supabase
                            .from("chat_participants")
                            .select("user_id, profiles(username, avatar_url)")
                            .eq("chat_id", chat.id);

                        // Filter out self from participants for direct messages to show the other person's name
                        const otherParticipants = parts?.map((p: any) => p.profiles).filter((p: any) => p.username) || [];

                        return {
                            ...chat,
                            participants: otherParticipants,
                        };
                    })
                );
                setChats(chatsWithDetails);
            }
            setLoading(false);
        };

        fetchChats();

        // Realtime subscription for new chats
        const channel = supabase
            .channel("public:chat_participants")
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "chat_participants",
                    filter: `user_id=eq.${currentUserId}`,
                },
                (payload) => {
                    fetchChats();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [currentUserId]);

    const [userProfile, setUserProfile] = useState<any>(null);
    const [showNewChatModal, setShowNewChatModal] = useState(false);

    useEffect(() => {
        const fetchProfile = async () => {
            const { data } = await supabase
                .from("profiles")
                .select("*")
                .eq("id", currentUserId)
                .single();
            setUserProfile(data);
        };
        fetchProfile();
    }, [currentUserId]);

    return (
        <>
            <div className="w-80 bg-dracula-current flex flex-col border-r border-dracula-comment h-full">
                <div className="p-4 border-b border-dracula-comment flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        {userProfile && (
                            <div className="relative group">
                                <img
                                    src={userProfile.avatar_url}
                                    alt="Profile"
                                    className="w-8 h-8 rounded-full border border-dracula-purple cursor-pointer"
                                />
                                <div className="absolute left-0 top-10 bg-dracula-bg border border-dracula-comment p-2 rounded shadow-xl hidden group-hover:block z-50 w-48">
                                    <p className="font-bold text-dracula-purple">{userProfile.username}</p>
                                    <p className="text-xs text-dracula-comment mb-2 truncate">{currentUserId}</p>
                                    <button
                                        onClick={() => supabase.auth.signOut()}
                                        className="w-full text-left text-sm text-dracula-red hover:underline"
                                    >
                                        Sign Out
                                    </button>
                                </div>
                            </div>
                        )}
                        <h2 className="text-xl font-bold text-dracula-purple">Chats</h2>
                    </div>
                    <button
                        onClick={() => setShowNewChatModal(true)}
                        className="p-2 bg-dracula-cyan text-dracula-bg rounded-full hover:bg-cyan-400"
                        title="New Chat"
                    >
                        <FaPlus />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="p-4 text-center text-dracula-comment">Loading chats...</div>
                    ) : chats.length === 0 ? (
                        <div className="p-4 text-center text-dracula-comment">No chats yet. Start one!</div>
                    ) : (
                        chats.map((chat) => (
                            <div
                                key={chat.id}
                                onClick={() => onSelectChat(chat.id)}
                                className="p-4 hover:bg-dracula-comment/20 cursor-pointer border-b border-dracula-comment/50 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-dracula-purple flex items-center justify-center overflow-hidden">
                                        {chat.type === "group" ? (
                                            <FaUsers className="text-dracula-bg" />
                                        ) : chat.participants[0]?.avatar_url ? (
                                            <img src={chat.participants[0].avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                                        ) : (
                                            <FaUser className="text-dracula-bg" />
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-dracula-fg">
                                            {chat.type === "group"
                                                ? chat.name
                                                : chat.participants.find((p: any) => p.username !== "Me")?.username || "Unknown User"}
                                        </h3>
                                        <p className="text-xs text-dracula-comment">
                                            {chat.type === "direct" ? "Direct Message" : "Group Chat"}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {showNewChatModal && (
                <NewChatModal
                    currentUserId={currentUserId}
                    onClose={() => setShowNewChatModal(false)}
                    onChatCreated={(chatId) => {
                        onSelectChat(chatId);
                        // The realtime subscription will update the list
                    }}
                />
            )}
        </>
    );
}
