export default function ChartsSkeleton() {
  return (
    <div className="flex-1 flex flex-col bg-[#06101A] text-gray-300 overflow-hidden animate-pulse">
      {/* Skeleton TopBar */}
      <div className="h-14 border-b border-[#121C26] flex items-center justify-between px-4">
        <div className="flex items-center space-x-4">
          <div className="w-8 h-8 rounded-full bg-[#121C26]"></div>
          <div className="w-32 h-6 rounded bg-[#121C26]"></div>
        </div>
        <div className="flex space-x-2">
          <div className="w-24 h-8 rounded bg-[#121C26]"></div>
          <div className="w-24 h-8 rounded bg-[#121C26]"></div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Skeleton Chart Area */}
        <div className="flex-1 flex flex-col min-w-0 relative">
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="w-full h-full border border-[#121C26] rounded-lg bg-[#0A131C] p-4 flex flex-col justify-between">
              <div className="w-full h-[1px] bg-[#121C26]"></div>
              <div className="w-full h-[1px] bg-[#121C26]"></div>
              <div className="w-full h-[1px] bg-[#121C26]"></div>
              <div className="w-full h-[1px] bg-[#121C26]"></div>
              <div className="w-full h-[1px] bg-[#121C26]"></div>
            </div>
          </div>
          {/* Skeleton Bottom Toolbar */}
          <div className="h-10 border-t border-[#121C26] flex items-center px-4">
            <div className="w-48 h-4 rounded bg-[#121C26]"></div>
          </div>
        </div>

        {/* Skeleton Right Sidebar */}
        <div className="hidden lg:flex flex-col w-[320px] border-l border-[#121C26] bg-[#0A131C] p-4 space-y-6">
          <div className="space-y-2">
            <div className="w-24 h-4 rounded bg-[#121C26]"></div>
            <div className="w-full h-24 rounded bg-[#121C26]"></div>
          </div>
          
          <div className="space-y-4">
            <div className="w-32 h-4 rounded bg-[#121C26]"></div>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="flex justify-between items-center">
                <div className="w-16 h-4 rounded bg-[#121C26]"></div>
                <div className="w-20 h-4 rounded bg-[#121C26]"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
