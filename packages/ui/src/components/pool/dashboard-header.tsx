"use client"

import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowDown01Icon, LogoutIcon } from "@hugeicons/core-free-icons"
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { PoolLogo } from "./pool-logo"

export interface PoolUser {
  name: string
  group: string
  initials: string
  image?: string | null
}

export function DashboardHeader({
  user,
  onSignOut,
}: {
  user: PoolUser
  onSignOut?: () => void
}) {
  return (
    <header className="flex h-[78px] items-center justify-between px-4 md:px-8">
      <PoolLogo />
      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-2.5 rounded-full py-1 pr-2 pl-1 transition-colors outline-none hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/50 md:gap-3 md:pr-3">
          <Avatar className="size-[44px] bg-white md:size-[52px]">
            {user.image && <AvatarImage src={user.image} alt={user.name} className="object-top" />}
            <AvatarFallback className="bg-white font-display text-base font-bold tracking-[0.06em] text-brand-green">
              {user.initials}
            </AvatarFallback>
          </Avatar>
          <span className="hidden text-[15px] font-semibold text-white md:block">{user.name}</span>
          <HugeiconsIcon icon={ArrowDown01Icon} className="-ml-2 size-4 text-white/75" strokeWidth={2} />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[180px]">
          <DropdownMenuLabel className="md:hidden">{user.name}</DropdownMenuLabel>
          <DropdownMenuSeparator className="md:hidden" />
          {onSignOut && (
            <DropdownMenuItem onSelect={onSignOut}>
              <HugeiconsIcon icon={LogoutIcon} data-icon="inline-start" />
              Sign out
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
