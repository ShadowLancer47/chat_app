"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { FaTimes } from "react-icons/fa";

export default function NewChatModal({
    currentUserId,
    onClose,
    onChatCreated,
}: {
    currentUserId: string;
    onClose: () => void;
    onChatCreated: (chatId: string) => void;
}) {
    const [friends, setFriends] = useState<any[]>([]);
    const [selectedUsers, setSelectedUsers] = useState<any[]>([]);
    const [groupName, setGroupName] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchFriends = async () => {
            const { data: friendsData } = await supabase
                .from("friends")
                .select("friend_id, profiles!friends_friend_id_fkey(username, avatar_url, tag)")
                .eq("user_id", currentUserId)
                .eq("status", "accepted");

            const { data: inverseFriendsData } = await supabase
                .from("friends")
                .select("user_id, profiles!friends_user_id_fkey(username, avatar_url, tag)")
                .eq("friend_id", currentUserId)
                .eq("status", "accepted");

            const allFriendsRaw = [
                ...(friendsData?.map(f => ({ id: f.friend_id, ...f.profiles })) || []),
                ...(inverseFriendsData?.map(f => ({ id: f.user_id, ...f.profiles })) || [])
            ];
            const uniqueFriends = Array.from(new Map(allFriendsRaw.map(item => [item.id, item])).values());
            setFriends(uniqueFriends);
        };
        fetchFriends();
    }, [currentUserId]);

    const handleCreateChat = async () => {
        if (selectedUsers.length === 0) return;
        if (!groupName) return;

        setLoading(true);

        try {
            const participantIds = [currentUserId, ...selectedUsers.map(u => u.id)];

            const { data: chatId, error } = await supabase.rpc('create_chat', {
                type: "group",
                name: groupName,
                participant_ids: participantIds
            });

            if (error) throw error;

            onChatCreated(chatId);
            onClose();
        } catch (error) {
            console.error("Error creating chat:", error);
        } finally {
            setLoading(false);
        }
    };

    const toggleUserSelection = (user: any) => {
        if (selectedUsers.find((u) => u.id === user.id)) {
            setSelectedUsers(selectedUsers.filter((u) => u.id !== user.id));
        } else {
            setSelectedUsers([...selectedUsers, user]);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-dracula-current p-6 rounded-lg w-96 shadow-xl border border-dracula-comment">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-dracula-purple">New Group Chat</h2>
                    <button onClick={onClose} className="text-dracula-comment hover:text-dracula-red">
                        <FaTimes />
                    </button>
                </div>

                <div className="mb-4">
                    <input
                        type="text"
                        placeholder="Group Name"
                        value={groupName}
                        onChange={(e) => setGroupName(e.target.value)}
                        className="w-full p-2 mb-4 rounded bg-dracula-bg border border-dracula-comment text-dracula-fg focus:outline-none focus:border-dracula-purple"
                    />

                    <h3 className="text-sm text-dracula-comment mb-2">Select Friends:</h3>
                    <div className="max-h-60 overflow-y-auto space-y-2 border border-dracula-comment/30 rounded p-2">
                        {friends.length === 0 ? (
                            <p className="text-center text-dracula-comment text-sm">No friends found.</p>
                        ) : (
                            friends.map((user) => (
                                <div
                                    key={user.id}
                                    onClick={() => toggleUserSelection(user)}
                                    className={`p-2 flex items-center gap-2 cursor-pointer hover:bg-dracula-comment/20 rounded ${selectedUsers.find((u) => u.id === user.id) ? "bg-dracula-purple/20 border border-dracula-purple" : ""
                                        }`}
                                >
                                    <img src={user.avatar_url} alt={user.username} className="w-8 h-8 rounded-full" />
                                    <div className="flex flex-col">
                                        <span className="font-semibold text-dracula-fg">{user.username}</span>
                                        <span className="text-xs text-dracula-comment">#{user.tag}</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Selected Users */}
                    {selectedUsers.length > 0 && (
                        <div className="mt-4">
                            <h3 className="text-sm text-dracula-comment mb-2">Selected:</h3>
                            <div className="flex flex-wrap gap-2">
                                {selectedUsers.map(u => (
                                    <span key={u.id} className="bg-dracula-purple text-dracula-bg px-2 py-1 rounded-full text-xs flex items-center gap-1">
                                        {u.username}
                                        <FaTimes className="cursor-pointer" onClick={() => toggleUserSelection(u)} />
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <button
                    onClick={handleCreateChat}
                    disabled={loading || selectedUsers.length === 0 || !groupName}
                    className="w-full py-2 bg-dracula-green text-dracula-bg font-bold rounded hover:bg-green-400 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? "Creating..." : "Create Group"}
                </button>
            </div>
        </div>
    );
}
