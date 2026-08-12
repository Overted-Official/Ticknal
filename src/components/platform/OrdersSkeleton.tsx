export function DesktopOrdersSkeleton() {
  return (
    <>
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <tr key={i} className="animate-pulse">
          <td className="px-5 py-3">
            <div className="h-4 w-16 bg-tv-border rounded mb-1"></div>
            <div className="h-3 w-24 bg-tv-border/50 rounded"></div>
          </td>
          <td className="px-5 py-3">
            <div className="h-4 w-12 bg-tv-border/80 rounded"></div>
          </td>
          <td className="px-5 py-3">
            <div className="h-4 w-20 bg-tv-border rounded mb-1"></div>
            <div className="h-3 w-16 bg-tv-border/50 rounded"></div>
          </td>
          <td className="px-5 py-3 text-right flex flex-col items-end justify-center">
            <div className="h-4 w-16 bg-tv-border rounded mb-1"></div>
            <div className="h-3 w-12 bg-tv-border/50 rounded"></div>
          </td>
          <td className="px-5 py-3 text-right">
            <div className="h-4 w-10 bg-tv-border rounded inline-block"></div>
          </td>
          <td className="px-5 py-3 text-right">
            <div className="h-4 w-16 bg-tv-border rounded inline-block mb-1"></div>
          </td>
          <td className="px-5 py-3 text-right">
            <div className="h-4 w-16 bg-tv-border rounded inline-block mb-1"></div>
            <div className="h-3 w-10 bg-tv-border/50 rounded inline-block"></div>
          </td>
          <td className="px-5 py-3">
            <div className="flex justify-end gap-2">
              <div className="h-6 w-16 bg-tv-border rounded"></div>
              <div className="h-6 w-12 bg-tv-border rounded"></div>
            </div>
          </td>
        </tr>
      ))}
    </>
  );
}

export function MobileOrdersSkeleton() {
  return (
    <>
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="bg-tv-base border border-tv-border rounded-tv-lg p-3 shadow-sm animate-pulse">
          <div className="flex justify-between items-start border-b border-tv-border pb-2 mb-2">
            <div>
              <div className="h-4 w-20 bg-tv-border rounded mb-1"></div>
              <div className="h-3 w-32 bg-tv-border/50 rounded"></div>
            </div>
            <div className="h-4 w-12 bg-tv-border/80 rounded"></div>
          </div>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div>
              <div className="h-3 w-10 bg-tv-border/50 rounded mb-1"></div>
              <div className="h-4 w-16 bg-tv-border rounded"></div>
            </div>
            <div className="text-right flex flex-col items-end">
              <div className="h-3 w-10 bg-tv-border/50 rounded mb-1"></div>
              <div className="h-4 w-16 bg-tv-border rounded"></div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div>
              <div className="h-3 w-10 bg-tv-border/50 rounded mb-1"></div>
              <div className="h-4 w-10 bg-tv-border rounded"></div>
            </div>
            <div className="text-right flex flex-col items-end">
              <div className="h-3 w-10 bg-tv-border/50 rounded mb-1"></div>
              <div className="h-4 w-20 bg-tv-border rounded mb-0.5"></div>
              <div className="h-3 w-12 bg-tv-border/50 rounded"></div>
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t border-tv-border pt-2">
            <div className="h-7 w-16 bg-tv-border rounded"></div>
            <div className="h-7 w-16 bg-tv-border rounded"></div>
            <div className="h-7 w-8 bg-tv-border rounded"></div>
          </div>
        </div>
      ))}
    </>
  );
}
