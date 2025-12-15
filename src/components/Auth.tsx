"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function Auth() {
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [username, setUsername] = useState("");
    const [isSignUp, setIsSignUp] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (isSignUp) {
                const { data, error: signUpError } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            username,
                        },
                    },
                });
                if (signUpError) throw signUpError;

                if (data.user && !data.session) {
                    setError("Please check your email to confirm your account.");
                    return;
                }

            } else {
                const { error: signInError } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (signInError) throw signInError;
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-dracula-bg text-dracula-fg p-4">
            <div className="w-full max-w-md bg-dracula-current p-8 rounded-lg shadow-lg">
                <h1 className="text-3xl font-bold mb-6 text-center text-dracula-purple">
                    {isSignUp ? "Create Account" : "Welcome Back"}
                </h1>

                {error && (
                    <div className="bg-dracula-red/20 text-dracula-red p-3 rounded mb-4 text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleAuth} className="space-y-4">
                    {isSignUp && (
                        <div>
                            <label className="block text-sm font-medium mb-1 text-dracula-cyan">Username</label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full p-2 rounded bg-dracula-bg border border-dracula-comment focus:border-dracula-purple focus:outline-none text-dracula-fg"
                                required
                            />
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium mb-1 text-dracula-cyan">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full p-2 rounded bg-dracula-bg border border-dracula-comment focus:border-dracula-purple focus:outline-none text-dracula-fg"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1 text-dracula-cyan">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full p-2 rounded bg-dracula-bg border border-dracula-comment focus:border-dracula-purple focus:outline-none text-dracula-fg"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-2 px-4 bg-dracula-purple hover:bg-dracula-pink text-dracula-bg font-bold rounded transition-colors disabled:opacity-50"
                    >
                        {loading ? "Loading..." : isSignUp ? "Sign Up" : "Login"}
                    </button>
                </form>

                <div className="mt-4 text-center text-sm">
                    <span className="text-dracula-comment">
                        {isSignUp ? "Already have an account? " : "Don't have an account? "}
                    </span>
                    <button
                        onClick={() => setIsSignUp(!isSignUp)}
                        className="text-dracula-cyan hover:underline"
                    >
                        {isSignUp ? "Login" : "Sign Up"}
                    </button>
                </div>
            </div>
        </div>
    );
}
