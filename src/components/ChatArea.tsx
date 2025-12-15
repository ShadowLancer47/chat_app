"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { FaPaperPlane, FaPaperclip } from "react-icons/fa";
import { format } from "date-fns";

interface Message {
    id: string;
    content: string;
    sender_id: string;
    created_at: string;
    type: "text" | "image" | "file";
    file_url?: string;
}

export default function ChatArea({
    chatId,
    currentUserId,
}: {
    chatId: string;
    currentUserId: string;
}) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [loading, setLoading] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        const fetchMessages = async () => {
            setLoading(true);
            const { data, error } = await supabase
                .from("messages")
                .select("*")
                .eq("chat_id", chatId)
                .order("created_at", { ascending: true });

            if (error) {
                console.error("Error fetching messages:", error);
            } else {
                setMessages(data || []);
            }
            setLoading(false);
            scrollToBottom();
        };

        fetchMessages();

        const channel = supabase
            .channel(`chat:${chatId}`)
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "messages",
                    filter: `chat_id=eq.${chatId}`,
                },
                (payload) => {
                    setMessages((prev) => [...prev, payload.new as Message]);
                    scrollToBottom();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [chatId]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        const { error } = await supabase.from("messages").insert([
            {
                chat_id: chatId,
                sender_id: currentUserId,
                content: newMessage,
                type: "text",
            },
        ]);

        if (error) {
            console.error("Error sending message:", error);
            alert(`Error sending message: ${error.message}`);
        } else {
            setNewMessage("");
        }
    };

    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;

        const file = e.target.files[0];
        setUploading(true);

        try {
            const fileExt = file.name.split(".").pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `${chatId}/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from("chat-files")
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from("chat-files")
                .getPublicUrl(filePath);

            const type = file.type.startsWith("image/") ? "image" : "file";

            const { error: msgError } = await supabase.from("messages").insert([
                {
                    chat_id: chatId,
                    sender_id: currentUserId,
                    content: file.name,
                    type: type,
                    file_url: publicUrl,
                },
            ]);

            if (msgError) throw msgError;
        } catch (error) {
            console.error("Error uploading file:", error);
            alert("Error uploading file");
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-dracula-bg">
            {/* Chat Header (Placeholder) */}
            <div className="p-4 border-b border-dracula-comment bg-dracula-current">
                <h2 className="font-bold text-dracula-fg">Chat</h2>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {loading ? (
                    <div className="text-center text-dracula-comment">Loading messages...</div>
                ) : messages.length === 0 ? (
                    <div className="text-center text-dracula-comment">No messages yet. Say hello!</div>
                ) : (
                    messages.map((msg) => {
                        const isMe = msg.sender_id === currentUserId;
                        return (
                            <div
                                key={msg.id}
                                className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                            >
                                <div
                                    className={`max-w-[70%] p-3 rounded-lg ${isMe
                                        ? "bg-dracula-purple text-dracula-bg rounded-br-none"
                                        : "bg-dracula-current text-dracula-fg rounded-bl-none"
                                        }`}
                                >
                                    {msg.type === "text" && <p>{msg.content}</p>}
                                    {msg.type === "image" && (
                                        <div className="mb-1">
                                            <img src={msg.file_url} alt="Shared image" className="max-w-full rounded" />
                                        </div>
                                    )}
                                    {msg.type === "file" && (
                                        <a href={msg.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 underline">
                                            <FaPaperclip />
                                            {msg.content}
                                        </a>
                                    )}
                                    <span className="text-xs opacity-70 block text-right mt-1">
                                        {format(new Date(msg.created_at), "HH:mm")}
                                    </span>
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <form onSubmit={handleSendMessage} className="p-4 bg-dracula-current border-t border-dracula-comment flex gap-2">
                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    onChange={handleFileUpload}
                />
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="p-2 text-dracula-comment hover:text-dracula-fg transition-colors disabled:opacity-50"
                >
                    <FaPaperclip />
                </button>
                <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 bg-dracula-bg text-dracula-fg p-2 rounded focus:outline-none focus:ring-1 focus:ring-dracula-purple"
                />
                <button
                    type="submit"
                    className="p-2 bg-dracula-purple text-dracula-bg rounded hover:bg-dracula-pink transition-colors"
                >
                    <FaPaperPlane />
                </button>
            </form>
        </div>
    );
}
