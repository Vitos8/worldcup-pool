"use client"

import { useState } from "react"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"
import { authClient } from "@/lib/auth-client"
import { PoolLogo } from "@workspace/ui/components/pool/pool-logo"

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  )
}

function Ball({ className }: { className?: string }) {
  return (
    <div className={cn("relative h-[34px] w-[34px] rounded-full bg-white", className)}>
      <div className="absolute inset-0 rounded-full bg-[#0b3d22] [mask:radial-gradient(circle_at_50%_32%,#000_6px,transparent_7px),radial-gradient(circle_at_24%_70%,#000_5px,transparent_6px),radial-gradient(circle_at_76%_70%,#000_5px,transparent_6px)]" />
    </div>
  )
}

export function LoginPitch() {
  const [isPending, setIsPending] = useState(false)

  async function handleGoogleLogin() {
    setIsPending(true)
    await authClient.signIn.social({ provider: "google", callbackURL: "/" })
  }

  return (
    <div className="flex min-h-svh flex-1">
      {/* Desktop: split hero + panel */}
      <div className="hidden flex-1 lg:flex">
        <div className="relative w-[52%] overflow-hidden bg-[#0b7a41]">
          <div className="absolute inset-0 [background:repeating-linear-gradient(180deg,rgba(255,255,255,.05)_0_60px,rgba(0,0,0,.05)_60px_120px)]" />
          <div className="animate-flood absolute -top-40 -right-32 h-[520px] w-[520px] rounded-full [background:radial-gradient(circle,rgba(230,255,240,.45),rgba(230,255,240,0)_62%)]" />
          <div className="absolute top-1/2 -left-56 h-[460px] w-[460px] -translate-y-1/2 rounded-full border-[3px] border-white/30" />
          <div className="absolute top-1/2 left-0 h-full w-[3px] -translate-y-1/2 bg-white/30" />
          <div className="absolute -right-14 -rotate-[90deg] bottom-[40%] h-[150px] w-[260px] rounded-t-lg border-[3px] border-b-0 border-white/25" />

          <div className="absolute inset-0 flex flex-col justify-between p-14">
            <PoolLogo/>
            <div>
              <div className="font-display text-sm font-semibold tracking-[.22em] text-white/70 uppercase">
                World Cup 2026 Pool
              </div>
              <h1 className="font-display mt-3 text-[68px] leading-[.92] font-bold text-white uppercase">
                Predict
                <br />
                every
                <br />
                match.
              </h1>
              <p className="mt-5 max-w-sm text-[17px] leading-relaxed text-white/80">
                Pick winners, call the scorelines, and settle who really knows their football.
              </p>
            </div>
            <div />
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center bg-[#fbfcfb]">
          <div className="w-[380px] px-2 py-5">
            <div className="font-display text-sm font-semibold tracking-[.2em] text-[#0b7a41] uppercase">
              Welcome back
            </div>
            <h2 className="font-display mt-2 mb-1.5 text-4xl leading-none font-bold text-[#12181a] uppercase">
              Sign in
            </h2>
            <p className="mb-8 text-base leading-relaxed text-[#63706a]">
              Use your Google account to save picks across devices.
            </p>

            <Button
              variant="outline"
              disabled={isPending}
              onClick={handleGoogleLogin}
              className="h-auto w-full gap-3 rounded-xl border-[#dae0dc] bg-white py-[15px] text-base font-semibold text-[#1f2328] hover:bg-[#f4f6f4]"
            >
              <GoogleIcon /> Continue with Google
            </Button>

            <p className="mt-8 text-center text-[13px] leading-relaxed text-[#8a938d]">
              New here? Signing in with Google
              <br />
              creates your account automatically.
            </p>
          </div>
        </div>
      </div>

      {/* Mobile: hero + bottom sheet */}
      <div className="relative flex flex-1 flex-col overflow-hidden bg-[#0b7a41] lg:hidden">
        <div className="absolute inset-0 [background:repeating-linear-gradient(180deg,rgba(255,255,255,.05)_0_54px,rgba(0,0,0,.05)_54px_108px)]" />
        <div className="animate-flood absolute -top-28 -right-20 h-[380px] w-[380px] rounded-full [background:radial-gradient(circle,rgba(230,255,240,.45),rgba(230,255,240,0)_62%)]" />
        <div className="absolute top-52 -left-36 h-80 w-80 rounded-full border-[3px] border-white/25" />
        <div className="absolute top-52 left-0 h-80 w-[3px] bg-white/25" />

        <div className="relative z-10 px-7 pt-14">
          <div className="flex items-center gap-3">
            <Ball className="h-8 w-8" />
            <span className="font-display text-xl font-bold tracking-[.16em] text-white uppercase">
              Kickoff
            </span>
          </div>
          <div className="mt-12">
            <div className="font-display text-xs font-semibold tracking-[.22em] text-white/70 uppercase">
              World Cup 2026 Pool
            </div>
            <h1 className="font-display mt-2.5 text-[56px] leading-[.9] font-bold text-white uppercase">
              Predict
              <br />
              every
              <br />
              match.
            </h1>
          </div>
        </div>

        <div className="relative z-10 mt-auto h-[45%] rounded-t-[30px] bg-[#fbfcfb] px-7 pt-6 pb-9 shadow-[0_-20px_50px_-24px_rgba(0,0,0,.4)]">
          <div className="mx-auto mb-5 h-[5px] w-10 rounded-full bg-[#e0e5e1]" />
          <div className="">
          <h2 className="font-display mb-1 text-3xl leading-none font-bold text-[#12181a] uppercase">
            Sign in to play
          </h2>
          <p className="mb-5 text-[15px] leading-snug text-[#63706a]">
            Save your picks across every device.
          </p>

          <Button
            variant="outline"
            disabled={isPending}
            onClick={handleGoogleLogin}
            className="h-auto w-full gap-3 rounded-2xl border-[#dae0dc] bg-white py-[15px] text-base font-semibold text-[#1f2328] hover:bg-[#f4f6f4]"
          >
            <GoogleIcon /> Continue with Google
          </Button>

          <p className="mt-6 text-center text-[13px] leading-relaxed text-[#8a938d]">
            New here? Signing in with Google creates your account automatically.
          </p>
          </div>

        </div>
      </div>
    </div>
  )
}
