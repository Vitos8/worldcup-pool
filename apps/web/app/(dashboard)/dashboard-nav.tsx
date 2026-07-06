"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@workspace/ui/lib/utils"

const TABS = [
  { href: "/", label: "Rules" },
  { href: "/matches", label: "Matches" },
  { href: "/scores", label: "Score table" },
] as const

export function DashboardNav() {
  const pathname = usePathname()

  return (
    <div className="flex h-[62px] items-center justify-center">
      <div className="flex gap-0 rounded-[13px] bg-white/15 p-1">
        {TABS.map((tab) => {
          const active = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href)
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "rounded-[10px]  px-6 md:px-7.5 py-2.5 font-display text-[15px] font-bold tracking-[0.09em] text-white/85 uppercase transition-colors",
                active && "text-brand-green bg-white"
              )}
            >
              {tab.label}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
