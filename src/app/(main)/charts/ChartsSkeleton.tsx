export default function ChartsSkeleton() {
  return (
    <div className="flex-1 flex flex-col bg-black text-white overflow-hidden animate-pulse">

      {/* Skeleton TopBar */}
      <div className="h-12 border-b border-white/[0.09] flex items-center justify-between px-4 shrink-0 bg-black">
        {/* Left: logo placeholder + ticker info */}
        <div className="flex items-center space-x-3">
          <div className="w-6 h-6 rounded-md bg-white/[0.06]" />
          <div className="w-28 h-4 rounded-md bg-white/[0.06]" />
          <div className="w-16 h-5 rounded-md bg-white/[0.04]" />
        </div>
        {/* Right: buttons */}
        <div className="flex items-center space-x-2">
          <div className="w-24 h-7 rounded-md bg-white/[0.04] border border-white/[0.09]" />
          <div className="w-20 h-7 rounded-md bg-white/[0.04] border border-white/[0.09]" />
          <div className="w-24 h-7 rounded-md bg-white/[0.06] border border-white/[0.09]" />
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 flex overflow-hidden min-h-0">

        {/* Chart + Strategy Card area */}
        <div className="flex-1 flex flex-col min-w-0 relative">

          {/* Chart canvas area */}
          <div className="flex-1 relative bg-black overflow-hidden">
            {/* Strategy card (top-left floating) */}
            <div className="absolute top-3 left-3 z-10 w-52 bg-black border border-white/[0.09] rounded-md p-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="w-24 h-3 rounded bg-white/[0.06]" />
                <div className="w-3 h-3 rounded bg-white/[0.04]" />
              </div>
              <div className="w-full h-6 rounded-md bg-white/[0.04] border border-white/[0.09]" />
              <div className="grid grid-cols-2 gap-1.5">
                {[1,2,3,4].map(i => (
                  <div key={i} className="h-8 rounded-md bg-white/[0.03] border border-white/[0.09]" />
                ))}
              </div>
              <div className="w-full h-6 rounded-md bg-white/[0.04]" />
            </div>

            {/* Fake candlestick grid lines */}
            <div className="absolute inset-0 flex flex-col justify-between py-8 px-4 opacity-30">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="w-full h-px bg-white/[0.08]" />
              ))}
            </div>

            {/* Fake candlestick bars */}
            <div className="absolute bottom-12 left-1/4 right-4 h-2/3 flex items-end gap-1 px-2 opacity-20">
              {[40,65,55,80,50,70,60,90,45,75,85,60,72,55,88,65,48,78,62,95,
                55,70,45,80,60,85,50,68,77,58].map((h, i) => (
                <div key={i} className="flex-1 bg-white/[0.5] rounded-[1px]" style={{ height: `${h}%` }} />
              ))}
            </div>

            {/* Performance pill (bottom-left floating) */}
            <div className="absolute bottom-4 left-3 z-10">
              <div className="w-40 h-7 rounded-md bg-black border border-white/[0.09]" />
            </div>

            {/* Replay toolbar (center-bottom floating) */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
              <div className="h-8 w-72 rounded-md bg-black border border-white/[0.09]" />
            </div>
          </div>

          {/* Bottom Toolbar */}
          <div className="h-8 border-t border-white/[0.09] flex items-center justify-between px-3 shrink-0 bg-black">
            <div className="flex items-center gap-2">
              <div className="w-28 h-5 rounded-md bg-white/[0.04] border border-white/[0.09]" />
              <div className="w-6 h-5 rounded-md bg-white/[0.04]" />
            </div>
            <div className="flex items-center gap-3">
              <div className="w-20 h-3 rounded bg-white/[0.04]" />
              <div className="w-10 h-5 rounded-md bg-white/[0.04]" />
            </div>
          </div>
        </div>

        {/* Skeleton Right Sidebar */}
        <div className="hidden lg:flex flex-col w-[280px] border-l border-white/[0.09] bg-black shrink-0">
          {/* Header */}
          <div className="h-10 border-b border-white/[0.09] flex items-center px-3">
            <div className="w-24 h-6 rounded-md bg-white/[0.04] border border-white/[0.09]" />
          </div>
          {/* Column headers */}
          <div className="h-7 border-b border-white/[0.04] flex items-center px-3 gap-2">
            <div className="flex-1 h-2 rounded bg-white/[0.04]" />
            <div className="w-10 h-2 rounded bg-white/[0.04]" />
            <div className="w-10 h-2 rounded bg-white/[0.04]" />
            <div className="w-8 h-2 rounded bg-white/[0.04]" />
          </div>
          {/* Sector label */}
          <div className="px-3 py-2">
            <div className="w-20 h-2 rounded bg-white/[0.04]" />
          </div>
          {/* Watchlist rows */}
          {[1,2,3,4,5,6,7,8,9,10,11,12].map(i => (
            <div key={i} className="flex items-center px-3 py-2 gap-2 mx-1 my-0.5 rounded-md border border-transparent">
              <div className="w-4 h-4 rounded-md bg-white/[0.06] shrink-0" />
              <div className="flex-1 h-3 rounded bg-white/[0.04]" />
              <div className="w-10 h-3 rounded bg-white/[0.04]" />
              <div className="w-10 h-3 rounded bg-white/[0.04]" />
              <div className="w-8 h-3 rounded bg-white/[0.04]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
