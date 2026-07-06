export function PageTitle({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="mb-4 flex items-baseline justify-between flex-col">
      <h2 className="font-display text-3xl font-bold tracking-tight text-white uppercase">
        {children}
      </h2>
      {hint && <span className="text-sm text-white/75">{hint}</span>}
    </div>
  )
}
