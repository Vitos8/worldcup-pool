"use client"

import { useRouter } from "next/navigation"
import { DashboardHeader, type PoolUser } from "@workspace/ui/components/pool/dashboard-header"
import { authClient } from "@/lib/auth-client"
import { DashboardNav } from "./dashboard-nav"

export function DashboardChrome({ user }: { user: PoolUser }) {
  const router = useRouter()

  async function handleSignOut() {
    await authClient.signOut()
    router.push("/login")
  }

  return (
    <>
      <DashboardHeader user={user} onSignOut={handleSignOut} />
      <DashboardNav />
    </>
  )
}
