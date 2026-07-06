export function PitchBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-pitch-from via-pitch to-pitch-to" />
      {/* mowing stripes */}
      <div className="absolute inset-0 [background:repeating-linear-gradient(180deg,rgba(255,255,255,0.055)_0_96px,rgba(0,0,0,0.045)_96px_192px)]" />
      {/* floodlight */}
      <div className="animate-flood absolute -top-[200px] left-1/2 h-[520px] w-[900px] -translate-x-1/2 [background:radial-gradient(60%_100%_at_50%_0%,rgba(230,255,240,0.3),transparent_70%)] blur-[10px]" />
      {/* centre circle + halfway line + penalty boxes */}
      {/* <div className="animate-spin-slow absolute top-1/2 left-1/2 size-[640px] rounded-full border-2 border-white/15" /> */}
      <div className="absolute top-1/2 left-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/40" />
      <div className="absolute inset-y-0 left-1/2 w-0.5 bg-white/[0.13]" />
      <div className="absolute top-1/2 left-0 h-80 w-[150px] -translate-y-1/2 rounded-r-md border-2 border-l-0 border-white/[0.13]" />
      <div className="absolute top-1/2 right-0 h-80 w-[150px] -translate-y-1/2 rounded-l-md border-2 border-r-0 border-white/[0.13]" />
      {/* depth vignette */}
      <div className="absolute inset-0 [background:radial-gradient(120%_90%_at_50%_24%,transparent_52%,rgba(4,40,22,0.34))]" />
    </div>
  )
}
