const PageLoader = () => (
  <div className="mx-auto flex min-h-[55vh] max-w-7xl items-center justify-center px-4">
    <div className="w-full max-w-3xl space-y-4">
      <div className="h-8 w-1/3 animate-pulse rounded bg-slate-200" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="aspect-square animate-pulse rounded-xl bg-slate-200" />
        ))}
      </div>
    </div>
  </div>
);

export default PageLoader;
