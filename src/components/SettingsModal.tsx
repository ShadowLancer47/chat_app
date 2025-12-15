"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { FaTimes, FaCamera, FaPalette, FaUser } from "react-icons/fa";

export default function SettingsModal({
    currentUserId,
    onClose,
}: {
    currentUserId: string;
    onClose: () => void;
}) {
    const [profile, setProfile] = useState<any>(null);
    const [username, setUsername] = useState("");
    const [avatarUrl, setAvatarUrl] = useState("");
    const [theme, setTheme] = useState("dracula");
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        const fetchProfile = async () => {
            const { data } = await supabase
                .from("profiles")
                .select("*")
                .eq("id", currentUserId)
                .single();

            if (data) {
                setProfile(data);
                setUsername(data.username);
                setAvatarUrl(data.avatar_url);
                // Load theme from local storage or default
                const savedTheme = localStorage.getItem("theme") || "dracula";
                setTheme(savedTheme);
            }
        };
        fetchProfile();
    }, [currentUserId]);

    const handleSave = async () => {
        setLoading(true);
        try {
            const { error } = await supabase
                .from("profiles")
                .update({
                    username: username,
                    avatar_url: avatarUrl,
                })
                .eq("id", currentUserId);

            if (error) throw error;

            // Apply theme
            document.documentElement.setAttribute("data-theme", theme);
            localStorage.setItem("theme", theme);

            onClose();
            // Force reload to update UI (simplest way to propagate changes everywhere)
            window.location.reload();
        } catch (error) {
            console.error("Error updating profile:", error);
            alert("Error updating profile. Username might be taken (with this tag).");
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;

        setUploading(true);
        const file = e.target.files[0];
        const fileExt = file.name.split('.').pop();
        const fileName = `${currentUserId}-${Math.random()}.${fileExt}`;
        const filePath = `avatars/${fileName}`;

        try {
            const { error: uploadError } = await supabase.storage
                .from('chat-files') // Reusing chat-files for avatars for simplicity, or create 'avatars' bucket
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data } = supabase.storage.from('chat-files').getPublicUrl(filePath);
            setAvatarUrl(data.publicUrl);
        } catch (error) {
            console.error("Error uploading avatar:", error);
            alert("Error uploading avatar");
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-dracula-current p-6 rounded-lg w-96 shadow-xl border border-dracula-comment max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-dracula-purple">Settings</h2>
                    <button onClick={onClose} className="text-dracula-comment hover:text-dracula-red">
                        <FaTimes />
                    </button>
                </div>

                {/* Avatar Section */}
                <div className="flex flex-col items-center mb-6">
                    <div className="relative w-24 h-24 mb-2">
                        <img
                            src={avatarUrl || "https://via.placeholder.com/150"}
                            alt="Avatar"
                            className="w-full h-full rounded-full object-cover border-2 border-dracula-purple"
                        />
                        <label className="absolute bottom-0 right-0 bg-dracula-purple text-dracula-bg p-2 rounded-full cursor-pointer hover:bg-purple-400 transition-colors">
                            <FaCamera size={14} />
                            <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} disabled={uploading} />
                        </label>
                    </div>
                    {uploading && <p className="text-xs text-dracula-comment">Uploading...</p>}
                    <p className="text-dracula-fg font-bold text-lg">
                        {profile?.username}
                        <span className="text-dracula-comment text-sm ml-1">#{profile?.tag}</span>
                    </p>
                </div>

                {/* Username Input */}
                <div className="mb-4">
                    <label className="block text-sm text-dracula-comment mb-1 flex items-center gap-2">
                        <FaUser size={12} /> Username
                    </label>
                    <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full p-2 rounded bg-dracula-bg border border-dracula-comment text-dracula-fg focus:outline-none focus:border-dracula-purple"
                    />
                </div>

                {/* Theme Selection */}
                <div className="mb-6">
                    <label className="block text-sm text-dracula-comment mb-2 flex items-center gap-2">
                        <FaPalette size={12} /> Theme
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                        <button
                            onClick={() => setTheme("dracula")}
                            className={`p-2 rounded border ${theme === "dracula" ? "border-dracula-purple bg-dracula-bg" : "border-transparent bg-dracula-bg/50"} text-xs text-center`}
                        >
                            Dracula
                        </button>
                        <button
                            onClick={() => setTheme("light")}
                            className={`p-2 rounded border ${theme === "light" ? "border-dracula-purple bg-white text-black" : "border-transparent bg-white/50 text-black"} text-xs text-center`}
                        >
                            Light
                        </button>
                        <button
                            onClick={() => setTheme("midnight")}
                            className={`p-2 rounded border ${theme === "midnight" ? "border-dracula-purple bg-slate-900 text-white" : "border-transparent bg-slate-900/50 text-white"} text-xs text-center`}
                        >
                            Midnight
                        </button>
                    </div>
                </div>

                <button
                    onClick={handleSave}
                    disabled={loading || uploading}
                    className="w-full py-2 bg-dracula-green text-dracula-bg font-bold rounded hover:bg-green-400 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? "Saving..." : "Save Changes"}
                </button>
            </div>
        </div>
    );
}
