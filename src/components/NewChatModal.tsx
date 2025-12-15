"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { FaTimes, FaSearch } from "react-icons/fa";

export default function NewChatModal({
    currentUserId,
    onClose,
    onChatCreated,
}: {
    currentUserId: string;
    onClose: () => void;
    onChatCreated: (chatId: string) => void;
}) {
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [selectedUsers, setSelectedUsers] = useState<any[]>([]);
    const [groupName, setGroupName] = useState("");
    const [isGroup, setIsGroup] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const searchUsers = async () => {
            if (searchQuery.length < 3) {
                setSearchResults([]);
                return;
            }

            const { data, error } = await supabase
                .from("profiles")
                .select("*")
                .ilike("username", `%${searchQuery}%`)
                .neq("id", currentUserId)
                .limit(5);

            if (data) {
                setSearchResults(data);
            }
        };

        const timeoutId = setTimeout(searchUsers, 300);
        return () => clearTimeout(timeoutId);
    }, [searchQuery, currentUserId]);

    const handleCreateChat = async () => {
        if (selectedUsers.length === 0) return;
        if (isGroup && !groupName) return;

        setLoading(true);

        try {
            const participantIds = [currentUserId, ...selectedUsers.map(u => u.id)];

            const { data: chatId, error } = await supabase.rpc('create_chat', {
                type: isGroup ? "group" : "direct",
                name: isGroup ? groupName : null,
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
            if (!isGroup) {
                setSelectedUsers([user]);
            } else {
                setSelectedUsers([...selectedUsers, user]);
            }
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-dracula-current p-6 rounded-lg w-96 shadow-xl border border-dracula-comment">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-dracula-purple">New Chat</h2>
                    <button onClick={onClose} className="text-dracula-comment hover:text-dracula-red">
                        <FaTimes />
                    </button>
                </div>

                <div className="mb-4">
                    <div className="flex gap-4 mb-4">
                        <button
                            onClick={() => { setIsGroup(false); setSelectedUsers([]); }}
                            className={`flex-1 py-1 rounded ${!isGroup ? "bg-dracula-purple text-dracula-bg" : "bg-dracula-bg text-dracula-fg"}`}
                        >
                            Direct Message
                        </button>
                        <button
                            onClick={() => { setIsGroup(true); setSelectedUsers([]); }}
                            className={`flex-1 py-1 rounded ${isGroup ? "bg-dracula-purple text-dracula-bg" : "bg-dracula-bg text-dracula-fg"}`}
                        >
                            Group Chat
                        </button>
                    </div>

                    {isGroup && (
                        <input
                            type="text"
                            placeholder="Group Name"
                            value={groupName}
                            onChange={(e) => setGroupName(e.target.value)}
                            className="w-full p-2 mb-4 rounded bg-dracula-bg border border-dracula-comment text-dracula-fg focus:outline-none focus:border-dracula-purple"
                        />
                    )}

                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Search users..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full p-2 rounded bg-dracula-bg border border-dracula-comment text-dracula-fg focus:outline-none focus:border-dracula-purple pl-8"
                        />
                        <FaSearch className="absolute left-2 top-3 text-dracula-comment" />
                    </div>

                    {/* Search Results */}
                    <div className="mt-2 max-h-40 overflow-y-auto">
                        {searchResults.map((user) => (
                            <div
                                key={user.id}
                                onClick={() => toggleUserSelection(user)}
                                className={`p-2 flex items-center gap-2 cursor-pointer hover:bg-dracula-comment/20 rounded ${selectedUsers.find((u) => u.id === user.id) ? "bg-dracula-purple/20" : ""
                                    }`}
                            >
                                <img src={user.avatar_url} alt={user.username} className="w-8 h-8 rounded-full" />
                                <span>{user.username}</span>
                            </div>
                        ))}
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
                    disabled={loading || selectedUsers.length === 0 || (isGroup && !groupName)}
                    className="w-full py-2 bg-dracula-green text-dracula-bg font-bold rounded hover:bg-green-400 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? "Creating..." : "Create Chat"}
                </button>
            </div>
        </div>
    );
}
