"use client"

import { useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { authClient } from "@/lib/auth-client"

/**
 * First-login mode (no props): forced, can't be dismissed until a username is
 * saved. Edit mode (`onClose` provided): regular dismissable dialog, prefilled.
 */
export function UsernameModal({
  initialUsername = "",
  onClose,
}: {
  initialUsername?: string
  onClose?: () => void
}) {
  const router = useRouter()
  const [username, setUsername] = useState(initialUsername)
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)

  const isEdit = onClose !== undefined

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setIsPending(true)

    const { error } = await authClient.updateUser({
      username,
      displayUsername: username,
    })

    if (error) {
      setError(error.message ?? "Something went wrong, try a different username.")
      setIsPending(false)
      return
    }

    // Bypass the session cookie cache so the header shows the new name
    // immediately instead of up to five minutes later.
    await authClient.getSession({ query: { disableCookieCache: true } })

    router.refresh()
    onClose?.()
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose?.()}>
      <DialogContent
        showCloseButton={isEdit}
        onEscapeKeyDown={(event) => !isEdit && event.preventDefault()}
        onInteractOutside={(event) => !isEdit && event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{isEdit ? "Change your username" : "Choose a username"}</DialogTitle>
          <DialogDescription>
            This is how your friends will see you on the leaderboard.
          </DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoFocus
              required
              minLength={3}
              maxLength={30}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button
              type="submit"
              disabled={isPending || username.length < 3 || (isEdit && username === initialUsername)}
            >
              {isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
