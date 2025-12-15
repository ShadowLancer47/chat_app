"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { FaBell, FaUserCircle, FaSignOutAlt } from "react-icons/fa";

export default function TopBar({ currentUserId }: { currentUserId: string }) {
    const [userProfile, setUserProfile] = useState<any>(null);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [showNotifications, setShowNotifications] = useState(false);
    const [showProfileMenu, setShowProfileMenu] = useState(false);

    useEffect(() => {
        const fetchProfile = async () => {
            const { data } = await supabase
                .from("profiles")
                .select("*")
                .eq("id", currentUserId)
                .single();
            setUserProfile(data);
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

    return (
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
                                    <div key={notif.id} className="p-3 border-b border-dracula-comment/50 hover:bg-dracula-current/50">
                                        <p className="text-sm text-dracula-fg">{notif.content}</p>
                                        <button
                                            onClick={() => markAsRead(notif.id)}
                                            className="text-xs text-dracula-cyan mt-1 hover:underline"
                                        >
                                            Mark as read
                                        </button>
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
                    <span className="font-semibold text-dracula-fg hidden md:block">{userProfile?.username}</span>
                </button>

                {showProfileMenu && (
                    <div className="absolute right-0 top-12 w-48 bg-dracula-bg border border-dracula-comment rounded shadow-xl z-50">
                        <div className="p-4 border-b border-dracula-comment">
                            <p className="font-bold text-dracula-purple">{userProfile?.username}</p>
                            <p className="text-xs text-dracula-comment truncate">{currentUserId}</p>
                        </div>
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
    );
}
