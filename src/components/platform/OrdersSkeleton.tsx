export function DesktopOrdersSkeleton() {
  return (
    <>
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <tr key={i} className="animate-pulse">
          <td className="px-5 py-3">
            <div className="h-4 w-16 bg-plt-card rounded mb-1"></div>
            <div className="h-3 w-24 bg-plt-card/50 rounded"></div>
          </td>
          <td className="px-5 py-3">
            <div className="h-4 w-12 bg-plt-card/80 rounded"></div>
          </td>
          <td className="px-5 py-3">
            <div className="h-4 w-20 bg-plt-card rounded mb-1"></div>
            <div className="h-3 w-16 bg-plt-card/50 rounded"></div>
          </td>
          <td className="px-5 py-3 text-right flex flex-col items-end justify-center">
            <div className="h-4 w-16 bg-plt-card rounded mb-1"></div>
            <div className="h-3 w-12 bg-plt-card/50 rounded"></div>
          </td>
          <td className="px-5 py-3 text-right">
            <div className="h-4 w-10 bg-plt-card rounded inline-block"></div>
          </td>
          <td className="px-5 py-3 text-right">
            <div className="h-4 w-16 bg-plt-card rounded inline-block mb-1"></div>
          </td>
          <td className="px-5 py-3 text-right">
            <div className="h-4 w-16 bg-plt-card rounded inline-block mb-1"></div>
            <div className="h-3 w-10 bg-plt-card/50 rounded inline-block"></div>
          </td>
          <td className="px-5 py-3">
            <div className="flex justify-end gap-2">
              <div className="h-6 w-16 bg-plt-card rounded"></div>
              <div className="h-6 w-12 bg-plt-card rounded"></div>
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
        <div key={i} className="bg-plt-card border border-plt-border rounded-tv-lg p-3 shadow-sm animate-pulse">
          <div className="flex justify-between items-start border-b border-plt-border pb-2 mb-2">
            <div>
              <div className="h-4 w-20 bg-plt-surface rounded mb-1"></div>
              <div className="h-3 w-32 bg-plt-surface/50 rounded"></div>
            </div>
            <div className="h-4 w-12 bg-plt-surface/80 rounded"></div>
          </div>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div>
              <div className="h-3 w-10 bg-plt-surface/50 rounded mb-1"></div>
              <div className="h-4 w-16 bg-plt-surface rounded"></div>
            </div>
            <div className="text-right flex flex-col items-end">
              <div className="h-3 w-10 bg-plt-surface/50 rounded mb-1"></div>
              <div className="h-4 w-16 bg-plt-surface rounded"></div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div>
              <div className="h-3 w-10 bg-plt-surface/50 rounded mb-1"></div>
              <div className="h-4 w-10 bg-plt-surface rounded"></div>
            </div>
            <div className="text-right flex flex-col items-end">
              <div className="h-3 w-10 bg-plt-surface/50 rounded mb-1"></div>
              <div className="h-4 w-20 bg-plt-surface rounded mb-0.5"></div>
              <div className="h-3 w-12 bg-plt-surface/50 rounded"></div>
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t border-plt-border pt-2">
            <div className="h-7 w-16 bg-plt-surface rounded"></div>
            <div className="h-7 w-16 bg-plt-surface rounded"></div>
            <div className="h-7 w-8 bg-plt-surface rounded"></div>
          </div>
        </div>
      ))}
    </>
  );
}
