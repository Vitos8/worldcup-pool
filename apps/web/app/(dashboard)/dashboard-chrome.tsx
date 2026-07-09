"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { DashboardHeader, type PoolUser } from "@workspace/ui/components/pool/dashboard-header"
import { UsernameModal } from "@/components/username-modal"
import { authClient } from "@/lib/auth-client"
import { DashboardNav } from "./dashboard-nav"

export function DashboardChrome({ user, showNav = true }: { user: PoolUser; showNav?: boolean }) {
  const router = useRouter()
  const [editingName, setEditingName] = useState(false)

  async function handleSignOut() {
    await authClient.signOut()
    router.push("/login")
  }

  return (
    <>
      <DashboardHeader
        user={user}
        onSignOut={handleSignOut}
        onEditName={() => setEditingName(true)}
      />
      {showNav && <DashboardNav />}
      {editingName && (
        <UsernameModal initialUsername={user.name} onClose={() => setEditingName(false)} />
      )}
    </>
  )
}
