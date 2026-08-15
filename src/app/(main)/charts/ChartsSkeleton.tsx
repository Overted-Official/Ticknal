export default function ChartsSkeleton() {
  return (
    <div className="flex-1 flex flex-col bg-plt-base text-plt-muted overflow-hidden animate-pulse">
      {/* Skeleton TopBar */}
      <div className="h-14 border-b border-plt-border flex items-center justify-between px-4">
        <div className="flex items-center space-x-4">
          <div className="w-8 h-8 rounded-full bg-plt-surface"></div>
          <div className="w-32 h-6 rounded bg-plt-surface"></div>
        </div>
        <div className="flex space-x-2">
          <div className="w-24 h-8 rounded bg-plt-surface"></div>
          <div className="w-24 h-8 rounded bg-plt-surface"></div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Skeleton Chart Area */}
        <div className="flex-1 flex flex-col min-w-0 relative">
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="w-full h-full border border-plt-border rounded-lg bg-plt-card p-4 flex flex-col justify-between">
              <div className="w-full h-[1px] bg-plt-border"></div>
              <div className="w-full h-[1px] bg-plt-border"></div>
              <div className="w-full h-[1px] bg-plt-border"></div>
              <div className="w-full h-[1px] bg-plt-border"></div>
              <div className="w-full h-[1px] bg-plt-border"></div>
            </div>
          </div>
          {/* Skeleton Bottom Toolbar */}
          <div className="h-10 border-t border-plt-border flex items-center px-4">
            <div className="w-48 h-4 rounded bg-plt-surface"></div>
          </div>
        </div>

        {/* Skeleton Right Sidebar */}
        <div className="hidden lg:flex flex-col w-[320px] border-l border-plt-border bg-plt-surface p-4 space-y-6">
          <div className="space-y-2">
            <div className="w-24 h-4 rounded bg-plt-card"></div>
            <div className="w-full h-24 rounded bg-plt-card"></div>
          </div>
          
          <div className="space-y-4">
            <div className="w-32 h-4 rounded bg-plt-card"></div>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="flex justify-between items-center">
                <div className="w-16 h-4 rounded bg-plt-card"></div>
                <div className="w-20 h-4 rounded bg-plt-card"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
