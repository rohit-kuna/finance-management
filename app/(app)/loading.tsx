export default function AppLoading() {
  return (
    <main className="mx-auto w-full max-w-7xl p-4 sm:p-6">
      <div className="mb-6 flex flex-col items-stretch gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="h-10 w-full max-w-56 rounded-md bg-muted/60" />
        <div className="h-10 w-full max-w-40 rounded-md bg-muted/60" />
      </div>

      <section className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="rounded-2xl border bg-background p-4 shadow-sm sm:p-8">
          <div className="h-8 w-full max-w-64 rounded-md bg-muted/60" />
          <div className="mt-3 h-4 w-full max-w-96 rounded-md bg-muted/50" />
          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-24 rounded-xl border bg-muted/20" />
            ))}
          </div>
        </div>

        <div className="rounded-2xl border bg-background p-4 shadow-sm sm:p-8">
          <div className="h-6 w-full max-w-44 rounded-md bg-muted/60" />
          <div className="mt-3 h-4 w-full max-w-56 rounded-md bg-muted/50" />
          <div className="mt-6 space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-20 rounded-xl border bg-muted/20" />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
