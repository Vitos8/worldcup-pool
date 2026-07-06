import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { UsernameModal } from "@/components/username-modal"
import { PitchBackdrop } from "@workspace/ui/components/pool/pitch-backdrop"
import { DashboardChrome } from "./dashboard-chrome"

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("")
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session) {
    redirect("/login")
  }

  const displayName = session.user.displayUsername ?? session.user.username ?? session.user.name

  return (
    <div className="relative flex h-svh flex-col overflow-hidden">
      <PitchBackdrop />
      <div className="relative flex h-full flex-col">
        <DashboardChrome
          user={{
            name: displayName,
            group: "",
            initials: getInitials(displayName),
            image: session.user.image,
          }}
        />
        <main className="flex-1 overflow-y-auto px-4 py-7 md:px-8">{children}</main>
      </div>
      {!session.user.username && <UsernameModal />}
    </div>
  )
}
