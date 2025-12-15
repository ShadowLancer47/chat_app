"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { FaTimes, FaSearch, FaUserPlus } from "react-icons/fa";

export default function AddFriendModal({
    currentUserId,
    onClose,
}: {
    currentUserId: string;
    onClose: () => void;
}) {
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [sentRequests, setSentRequests] = useState<string[]>([]);

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
                // Filter out existing friends (optional, but good UX)
                // For now just show all results
                setSearchResults(data);
            }
        };

        const timeoutId = setTimeout(searchUsers, 300);
        return () => clearTimeout(timeoutId);
    }, [searchQuery, currentUserId]);

    const handleAddFriend = async (friendId: string) => {
        try {
            const { error } = await supabase
                .from("friends")
                .insert([
                    { user_id: currentUserId, friend_id: friendId, status: 'pending' }
                ]);

            if (error) {
                if (error.code === '23505') { // Unique violation
                    alert("Friend request already sent or you are already friends.");
                } else {
                    throw error;
                }
            } else {
                setSentRequests([...sentRequests, friendId]);

                // Send notification
                await supabase.from("notifications").insert([
                    {
                        user_id: friendId,
                        type: 'friend_request',
                        content: `You have a new friend request from someone!`, // Ideally fetch username
                    }
                ]);
            }
        } catch (error) {
            console.error("Error adding friend:", error);
            alert("Error sending friend request");
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-dracula-current p-6 rounded-lg w-96 shadow-xl border border-dracula-comment">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-dracula-purple">Add Friend</h2>
                    <button onClick={onClose} className="text-dracula-comment hover:text-dracula-red">
                        <FaTimes />
                    </button>
                </div>

                <div className="relative mb-4">
                    <input
                        type="text"
                        placeholder="Search users by username..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full p-2 rounded bg-dracula-bg border border-dracula-comment text-dracula-fg focus:outline-none focus:border-dracula-purple pl-8"
                    />
                    <FaSearch className="absolute left-2 top-3 text-dracula-comment" />
                </div>

                <div className="mt-2 max-h-60 overflow-y-auto space-y-2">
                    {searchResults.length === 0 && searchQuery.length >= 3 && (
                        <p className="text-center text-dracula-comment text-sm">No users found.</p>
                    )}
                    {searchResults.map((user) => (
                        <div
                            key={user.id}
                            className="p-3 flex items-center justify-between bg-dracula-bg/50 rounded hover:bg-dracula-bg transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <img src={user.avatar_url} alt={user.username} className="w-8 h-8 rounded-full" />
                                <span className="font-semibold text-dracula-fg">{user.username}</span>
                            </div>
                            <button
                                onClick={() => handleAddFriend(user.id)}
                                disabled={sentRequests.includes(user.id)}
                                className="p-2 bg-dracula-purple text-dracula-bg rounded-full hover:bg-dracula-pink disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Add Friend"
                            >
                                <FaUserPlus />
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
