import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { FaBell, FaUserCircle, FaSignOutAlt, FaCog } from "react-icons/fa";
import SettingsModal from "./SettingsModal";

export default function TopBar({ currentUserId }: { currentUserId: string }) {
    const [userProfile, setUserProfile] = useState<any>(null);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [showNotifications, setShowNotifications] = useState(false);
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const [showSettings, setShowSettings] = useState(false);

    useEffect(() => {
        const fetchProfile = async () => {
            const { data } = await supabase
                .from("profiles")
                .select("*")
                .eq("id", currentUserId)
                .single();
            setUserProfile(data);

            // Apply saved theme
            const savedTheme = localStorage.getItem("theme") || "dracula";
            document.documentElement.setAttribute("data-theme", savedTheme);
        };

        const fetchNotifications = async () => {
            const { data } = await supabase
                .from("notifications")
                .select("*")
                .eq("user_id", currentUserId)
                .eq("is_read", false)
                .order("created_at", { ascending: false });
            setNotifications(data || []);
        };

        fetchProfile();
        fetchNotifications();

        // Realtime notifications
        const channel = supabase
            .channel("public:notifications")
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "notifications",
                    filter: `user_id=eq.${currentUserId}`,
                },
                (payload) => {
                    setNotifications((prev) => [payload.new, ...prev]);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [currentUserId]);

    const handleSignOut = async () => {
        await supabase.auth.signOut();
    };

    const markAsRead = async (id: string) => {
        await supabase.from("notifications").update({ is_read: true }).eq("id", id);
        setNotifications(notifications.filter((n) => n.id !== id));
    };

    const handleAcceptFriend = async (notification: any) => {
        try {
            // Update friend status to accepted
            const { error } = await supabase
                .from("friends")
                .update({ status: 'accepted' })
                .eq("user_id", notification.sender_id)
                .eq("friend_id", currentUserId);

            if (error) throw error;

            // Mark notification as read
            await markAsRead(notification.id);
            alert("Friend request accepted!");
        } catch (error) {
            console.error("Error accepting friend:", error);
            alert("Error accepting friend request");
        }
    };

    const handleDismissFriend = async (notification: any) => {
        try {
            // Delete friend request
            const { error } = await supabase
                .from("friends")
                .delete()
                .eq("user_id", notification.sender_id)
                .eq("friend_id", currentUserId);

            if (error) throw error;

            await markAsRead(notification.id);
        } catch (error) {
            console.error("Error dismissing friend:", error);
        }
    };

    const handleBlockFriend = async (notification: any) => {
        try {
            // Update status to blocked
            const { error } = await supabase
                .from("friends")
                .update({ status: 'blocked' })
                .eq("user_id", notification.sender_id)
                .eq("friend_id", currentUserId);

            if (error) throw error;

            await markAsRead(notification.id);
            alert("User blocked.");
        } catch (error) {
            console.error("Error blocking user:", error);
        }
    };

    return (
        <>
            <div className="h-16 bg-dracula-current border-b border-dracula-comment flex justify-end items-center px-6 gap-4">
                {/* Notifications */}
                <div className="relative">
                    <button
                        onClick={() => setShowNotifications(!showNotifications)}
                        className="relative p-2 text-dracula-comment hover:text-dracula-purple transition-colors"
                    >
                        <FaBell size={20} />
                        {notifications.length > 0 && (
                            <span className="absolute top-0 right-0 w-4 h-4 bg-dracula-red text-dracula-bg text-xs rounded-full flex items-center justify-center font-bold">
                                {notifications.length}
                            </span>
                        )}
                    </button>

                    {showNotifications && (
                        <div className="absolute right-0 top-12 w-80 bg-dracula-bg border border-dracula-comment rounded shadow-xl z-50">
                            <div className="p-3 border-b border-dracula-comment font-bold text-dracula-purple">
                                Notifications
                            </div>
                            <div className="max-h-64 overflow-y-auto">
                                {notifications.length === 0 ? (
                                    <div className="p-4 text-center text-dracula-comment text-sm">
                                        No new notifications
                                    </div>
                                ) : (
                                    notifications.map((notif) => (
                                        <div key={notif.id} className="p-3 border-b border-dracula-comment/50 hover:bg-dracula-current/50 group">
                                            <p className="text-sm text-dracula-fg">{notif.content}</p>

                                            {notif.type === 'friend_request' && notif.sender_id ? (
                                                <div className="flex gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => handleAcceptFriend(notif)}
                                                        className="px-2 py-1 bg-dracula-green text-dracula-bg text-xs rounded hover:bg-green-400"
                                                    >
                                                        Accept
                                                    </button>
                                                    <button
                                                        onClick={() => handleDismissFriend(notif)}
                                                        className="px-2 py-1 bg-dracula-comment text-dracula-fg text-xs rounded hover:bg-gray-500"
                                                    >
                                                        Dismiss
                                                    </button>
                                                    <button
                                                        onClick={() => handleBlockFriend(notif)}
                                                        className="px-2 py-1 bg-dracula-red text-dracula-bg text-xs rounded hover:bg-red-400"
                                                    >
                                                        Block
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => markAsRead(notif.id)}
                                                    className="text-xs text-dracula-cyan mt-1 hover:underline"
                                                >
                                                    Mark as read
                                                </button>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Profile */}
                <div className="relative">
                    <button
                        onClick={() => setShowProfileMenu(!showProfileMenu)}
                        className="flex items-center gap-2 hover:bg-dracula-comment/20 p-2 rounded transition-colors"
                    >
                        {userProfile?.avatar_url ? (
                            <img src={userProfile.avatar_url} alt="Avatar" className="w-8 h-8 rounded-full border border-dracula-purple" />
                        ) : (
                            <FaUserCircle size={32} className="text-dracula-purple" />
                        )}
                        <span className="font-semibold text-dracula-fg hidden md:block">
                            {userProfile?.username}
                            <span className="text-dracula-comment text-xs ml-1">#{userProfile?.tag}</span>
                        </span>
                    </button>

                    {showProfileMenu && (
                        <div className="absolute right-0 top-12 w-48 bg-dracula-bg border border-dracula-comment rounded shadow-xl z-50">
                            <div className="p-4 border-b border-dracula-comment">
                                <p className="font-bold text-dracula-purple">{userProfile?.username}</p>
                                <p className="text-xs text-dracula-comment">#{userProfile?.tag}</p>
                            </div>
                            <button
                                onClick={() => { setShowSettings(true); setShowProfileMenu(false); }}
                                className="w-full text-left p-3 text-dracula-fg hover:bg-dracula-current/50 flex items-center gap-2"
                            >
                                <FaCog /> Settings
                            </button>
                            <button
                                onClick={handleSignOut}
                                className="w-full text-left p-3 text-dracula-red hover:bg-dracula-current/50 flex items-center gap-2"
                            >
                                <FaSignOutAlt /> Sign Out
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {showSettings && (
                <SettingsModal
                    currentUserId={currentUserId}
                    onClose={() => setShowSettings(false)}
                />
            )}
        </>
    );
}
