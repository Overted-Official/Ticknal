export function DesktopOrdersSkeleton() {
  return (
    <>
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <tr key={i} className="animate-pulse">
          <td className="px-6 py-3.5">
            <div className="h-4 w-16 bg-white/[0.08] rounded mb-1"></div>
            <div className="h-3 w-24 bg-white/[0.04] rounded"></div>
          </td>
          <td className="px-6 py-3.5">
            <div className="h-4 w-12 bg-white/[0.06] rounded-md"></div>
          </td>
          <td className="px-6 py-3.5">
            <div className="h-4 w-20 bg-white/[0.08] rounded mb-1"></div>
            <div className="h-3 w-16 bg-white/[0.04] rounded"></div>
          </td>
          <td className="px-6 py-3.5 text-right flex flex-col items-end justify-center">
            <div className="h-4 w-16 bg-white/[0.08] rounded mb-1"></div>
            <div className="h-3 w-12 bg-white/[0.04] rounded"></div>
          </td>
          <td className="px-6 py-3.5 text-right">
            <div className="h-4 w-10 bg-white/[0.08] rounded inline-block"></div>
          </td>
          <td className="px-6 py-3.5 text-right">
            <div className="h-4 w-16 bg-white/[0.08] rounded inline-block"></div>
          </td>
          <td className="px-6 py-3.5 text-right">
            <div className="h-4 w-16 bg-white/[0.08] rounded inline-block mb-1"></div>
            <div className="h-3 w-10 bg-white/[0.04] rounded inline-block"></div>
          </td>
          <td className="px-6 py-3.5">
            <div className="flex justify-end gap-2">
              <div className="h-6 w-16 bg-white/[0.06] rounded-lg"></div>
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
        <div key={i} className="glass-panel rounded-xl p-6 shadow-xl animate-pulse">
          <div className="flex justify-between items-start border-b border-white/[0.06] pb-2.5 mb-2.5">
            <div>
              <div className="h-4 w-20 bg-white/[0.08] rounded mb-1"></div>
              <div className="h-3 w-32 bg-white/[0.04] rounded"></div>
            </div>
            <div className="h-4 w-12 bg-white/[0.06] rounded-md"></div>
          </div>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div>
              <div className="h-3 w-10 bg-white/[0.04] rounded mb-1"></div>
              <div className="h-4 w-16 bg-white/[0.08] rounded"></div>
            </div>
            <div className="text-right flex flex-col items-end">
              <div className="h-3 w-10 bg-white/[0.04] rounded mb-1"></div>
              <div className="h-4 w-16 bg-white/[0.08] rounded"></div>
            </div>
          </div>
        </div>
      ))}
    </>
  );
}
