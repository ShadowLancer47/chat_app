"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { FaUser, FaUsers, FaPlus, FaUserPlus } from "react-icons/fa";
import NewChatModal from "./NewChatModal";
import AddFriendModal from "./AddFriendModal";

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
    const [friends, setFriends] = useState<any[]>([]);
    const [groups, setGroups] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddFriend, setShowAddFriend] = useState(false);
    const [showNewGroup, setShowNewGroup] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            // 1. Fetch Friends (accepted)
            const { data: friendsData } = await supabase
                .from("friends")
                .select("friend_id, profiles!friends_friend_id_fkey(username, avatar_url)")
                .eq("user_id", currentUserId)
                .eq("status", "accepted");

            const { data: inverseFriendsData } = await supabase
                .from("friends")
                .select("user_id, profiles!friends_user_id_fkey(username, avatar_url)")
                .eq("friend_id", currentUserId)
                .eq("status", "accepted");

            const allFriendsRaw = [
                ...(friendsData?.map(f => ({ id: f.friend_id, ...f.profiles })) || []),
                ...(inverseFriendsData?.map(f => ({ id: f.user_id, ...f.profiles })) || [])
            ];
            const uniqueFriends = Array.from(new Map(allFriendsRaw.map(item => [item.id, item])).values());

            // 2. Fetch All Chats
            const { data: participations } = await supabase
                .from("chat_participants")
                .select("chat_id")
                .eq("user_id", currentUserId);

            const chatIds = participations?.map(p => p.chat_id) || [];
            let allChats: any[] = [];

            if (chatIds.length > 0) {
                const { data: chatsData } = await supabase
                    .from("chats")
                    .select("*, chat_participants(user_id)")
                    .in("id", chatIds);
                allChats = chatsData || [];
            }

            // 3. Separate Groups and Map Friends to Chats
            const groupsList = allChats.filter(c => c.type === 'group');
            setGroups(groupsList);

            const friendsList = uniqueFriends.map((friend: any) => {
                // Find a direct chat with this friend
                // A direct chat has 2 participants: me and friend
                const chat = allChats.find(c =>
                    c.type === 'direct' &&
                    c.chat_participants.some((p: any) => p.user_id === friend.id)
                );
                return { ...friend, chatId: chat?.id };
            });
            setFriends(friendsList);

        } catch (error) {
            console.error("Error fetching sidebar data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();

        // Realtime subscriptions
        const friendSub = supabase
            .channel("public:friends")
            .on("postgres_changes", { event: "*", schema: "public", table: "friends" }, fetchData)
            .subscribe();

        const chatSub = supabase
            .channel("public:chats")
            .on("postgres_changes", { event: "*", schema: "public", table: "chats" }, fetchData)
            .subscribe();

        return () => {
            supabase.removeChannel(friendSub);
            supabase.removeChannel(chatSub);
        };
    }, [currentUserId]);

    const handleFriendClick = async (friend: any) => {
        if (friend.chatId) {
            onSelectChat(friend.chatId);
        } else {
            // Create new direct chat
            const { data: chatId, error } = await supabase.rpc('create_chat', {
                type: 'direct',
                name: null,
                participant_ids: [currentUserId, friend.id]
            });

            if (chatId) {
                onSelectChat(chatId);
                fetchData(); // Refresh to link the chat to the friend
            }
        }
    };

    return (
        <>
            <div className="w-80 bg-dracula-current flex flex-col border-r border-dracula-comment h-full">
                <div className="p-4 border-b border-dracula-comment flex justify-between items-center">
                    <h2 className="text-xl font-bold text-dracula-purple">Friends & Groups</h2>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setShowAddFriend(true)}
                            className="p-2 bg-dracula-pink text-dracula-bg rounded-full hover:bg-pink-400"
                            title="Add Friend"
                        >
                            <FaUserPlus />
                        </button>
                        <button
                            onClick={() => setShowNewGroup(true)}
                            className="p-2 bg-dracula-cyan text-dracula-bg rounded-full hover:bg-cyan-400"
                            title="New Group"
                        >
                            <FaUsers />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="p-4 text-center text-dracula-comment">Loading...</div>
                    ) : (
                        <>
                            {/* Friends Section */}
                            <div className="p-2">
                                <h3 className="text-xs font-bold text-dracula-comment uppercase mb-2 px-2">Friends</h3>
                                {friends.length === 0 ? (
                                    <p className="text-sm text-dracula-comment px-2">No friends yet.</p>
                                ) : (
                                    friends.map((friend) => (
                                        <div
                                            key={friend.id}
                                            onClick={() => handleFriendClick(friend)}
                                            className="p-3 flex items-center gap-3 hover:bg-dracula-comment/20 rounded cursor-pointer transition-colors"
                                        >
                                            <div className="relative">
                                                <img src={friend.avatar_url} alt="Avatar" className="w-10 h-10 rounded-full object-cover" />
                                                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-dracula-current"></div>
                                            </div>
                                            <span className="font-semibold text-dracula-fg">{friend.username}</span>
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* Groups Section */}
                            <div className="p-2 mt-2 border-t border-dracula-comment/30">
                                <h3 className="text-xs font-bold text-dracula-comment uppercase mb-2 px-2">Groups</h3>
                                {groups.length === 0 ? (
                                    <p className="text-sm text-dracula-comment px-2">No groups yet.</p>
                                ) : (
                                    groups.map((group) => (
                                        <div
                                            key={group.id}
                                            onClick={() => onSelectChat(group.id)}
                                            className="p-3 flex items-center gap-3 hover:bg-dracula-comment/20 rounded cursor-pointer transition-colors"
                                        >
                                            <div className="w-10 h-10 rounded-full bg-dracula-purple flex items-center justify-center text-dracula-bg">
                                                <FaUsers />
                                            </div>
                                            <span className="font-semibold text-dracula-fg">{group.name}</span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {showAddFriend && (
                <AddFriendModal
                    currentUserId={currentUserId}
                    onClose={() => setShowAddFriend(false)}
                />
            )}

            {showNewGroup && (
                <NewChatModal
                    currentUserId={currentUserId}
                    onClose={() => setShowNewGroup(false)}
                    onChatCreated={(chatId) => {
                        onSelectChat(chatId);
                        fetchData();
                    }}
                />
            )}
        </>
    );
}
