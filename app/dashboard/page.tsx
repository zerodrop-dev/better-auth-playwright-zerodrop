"use client";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ email: string; name?: string } | null>(null);

  useEffect(() => {
    authClient.getSession().then(({ data }) => {
      if (!data?.user) router.push("/login");
      else setUser(data.user);
    });
  }, [router]);

  async function handleSignOut() {
    await authClient.signOut();
    router.push("/login");
  }

  if (!user) return null;

  return (
    <main>
      <h1>Welcome</h1>
      <p>Signed in as {user.email}</p>
      <button onClick={handleSignOut}>Sign out</button>
    </main>
  );
}
