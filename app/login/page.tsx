"use client";
import { authClient } from "@/lib/auth-client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [mode, setMode] = useState<"password" | "magic-link" | "otp">("password");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (mode === "password") {
      const { error } = await authClient.signIn.email({ email, password });
      if (error) setError(error.message || "Sign in failed");
      else router.push("/dashboard");
    }

    if (mode === "magic-link") {
      const { error } = await authClient.signIn.magicLink({
        email,
        callbackURL: "/dashboard",
      });
      if (error) setError(error.message || "Failed to send magic link");
      else setMessage("Magic link sent — check your email.");
    }

    if (mode === "otp") {
      if (!otp) {
        // Send OTP
        const { error } = await authClient.emailOtp.sendVerificationOtp({
          email,
          type: "sign-in",
        });
        if (error) setError(error.message || "Failed to send code");
        else setMessage("Code sent — check your email.");
      } else {
        // Verify OTP
        const { error } = await authClient.signIn.emailOtp({ email, otp });
        if (error) setError(error.message || "Invalid code");
        else router.push("/dashboard");
      }
    }
  }

  return (
    <main>
      <h1>Log In</h1>
      {message && <p>{message}</p>}
      {error && <p className="error-message">{error}</p>}
      <form onSubmit={handleSubmit}>
        <input
          name="email"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        {mode === "password" && (
          <input
            name="password"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        )}
        {mode === "otp" && message && (
          <input
            name="otp"
            type="text"
            placeholder="Enter code"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
          />
        )}
        <button type="submit">
          {mode === "password" && "Sign in"}
          {mode === "magic-link" && "Send magic link"}
          {mode === "otp" && !message && "Send code"}
          {mode === "otp" && message && "Verify code"}
        </button>
      </form>
      <div>
        <button onClick={() => setMode("magic-link")}>Use magic link</button>
        <button onClick={() => setMode("otp")}>Use one-time code</button>
        <button onClick={() => setMode("password")}>Use password</button>
      </div>
    </main>
  );
}
