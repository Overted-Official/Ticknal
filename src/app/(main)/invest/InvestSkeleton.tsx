export default function InvestSkeleton() {
  return (
    <div className="flex-1 h-full w-full flex flex-row bg-plt-base animate-pulse overflow-hidden">
      <div className="flex-1 h-full flex flex-col bg-plt-chart p-4">
        <div className="h-8 bg-plt-hover rounded-xl w-48 mb-4" />
        <div className="flex-1 bg-plt-hover/30 rounded-lg" />
      </div>
      <div className="hidden lg:flex w-72 h-full bg-plt-raised border-l border-plt-border flex-col p-3 space-y-3">
        <div className="h-8 bg-plt-hover rounded-xl w-full" />
        <div className="h-8 bg-plt-hover rounded-xl w-full" />
        <div className="flex-1 bg-plt-hover/20 rounded-lg" />
      </div>
    </div>
  );
}
