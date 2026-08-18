export default function InvestSkeleton() {
  return (
    <div className="flex-1 w-full p-4 lg:p-6 space-y-6 animate-pulse">
      <div className="h-10 bg-white/5 rounded-lg w-1/3" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 h-[450px] bg-white/5 rounded-xl" />
        <div className="h-[450px] bg-white/5 rounded-xl" />
      </div>
    </div>
  );
}
