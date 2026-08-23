export function DesktopOrdersSkeleton() {
  return (
    <>
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <tr key={i} className="animate-pulse">
          <td className="px-2 py-2">
            <div className="h-4 w-16 bg-plt-hover rounded-xl mb-2"></div>
            <div className="h-4 w-24 bg-plt-hover rounded-xl"></div>
          </td>
          <td className="px-2 py-2">
            <div className="h-4 w-12 bg-plt-hover rounded-xl"></div>
          </td>
          <td className="px-2 py-2">
            <div className="h-4 w-20 bg-plt-hover rounded-xl mb-2"></div>
            <div className="h-4 w-16 bg-plt-hover rounded-xl"></div>
          </td>
          <td className="px-2 py-2 text-right flex flex-col items-end justify-center">
            <div className="h-4 w-16 bg-plt-hover rounded-xl mb-2"></div>
            <div className="h-4 w-12 bg-plt-hover rounded-xl"></div>
          </td>
          <td className="px-2 py-2 text-right">
            <div className="h-4 w-10 bg-plt-hover rounded-xl inline-block"></div>
          </td>
          <td className="px-2 py-2 text-right">
            <div className="h-4 w-16 bg-plt-hover rounded-xl inline-block"></div>
          </td>
          <td className="px-2 py-2 text-right">
            <div className="h-4 w-20 bg-plt-hover rounded-xl inline-block"></div>
          </td>
          <td className="px-2 py-2 text-right">
            <div className="h-4 w-16 bg-plt-hover rounded-xl inline-block mb-2"></div>
            <div className="h-4 w-10 bg-plt-hover rounded-xl inline-block"></div>
          </td>
          <td className="px-2 py-2">
            <div className="flex justify-end gap-2">
              <div className="h-6 w-16 bg-plt-hover rounded-xl"></div>
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
        <div key={i} className="card-shell animate-pulse">
          <div className="flex justify-between items-start border-b border-plt-border pb-2 mb-2">
            <div>
              <div className="h-4 w-20 bg-plt-hover rounded-xl mb-2"></div>
              <div className="h-4 w-32 bg-plt-hover rounded-xl"></div>
            </div>
            <div className="h-4 w-12 bg-plt-hover rounded-xl"></div>
          </div>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div>
              <div className="h-4 w-10 bg-plt-hover rounded-xl mb-2"></div>
              <div className="h-4 w-16 bg-plt-hover rounded-xl"></div>
            </div>
            <div className="text-right flex flex-col items-end">
              <div className="h-4 w-10 bg-plt-hover rounded-xl mb-2"></div>
              <div className="h-4 w-16 bg-plt-hover rounded-xl"></div>
            </div>
          </div>
        </div>
      ))}
    </>
  );
}
