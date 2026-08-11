export default function BottomToolbar() {
  const ranges = ['1D', '5D', '1M', '3M', '6M', 'YTD', '1Y', '5Y', 'All'];

  return (
    <div className="h-8 w-full bg-tv-base border-t border-tv-border flex items-center justify-between px-4 font-weight-medium select-none text-[0.75rem]">
      <div className="flex items-center space-x-1">
        {ranges.map((r) => (
          <button 
            key={r}
            className={`px-2 py-0.5 rounded-tv-sm transition-colors ${
              r === '6M' ? 'text-tv-accent bg-tv-hover' : 'text-tv-muted hover:text-tv-text hover:bg-tv-hover'
            }`}
          >
            {r}
          </button>
        ))}
      </div>
      
      <div className="flex items-center space-x-4 text-tv-muted">
        <button className="hover:text-tv-text transition-colors">09:38:57 UTC</button>
        <button className="hover:text-tv-text transition-colors">%</button>
        <button className="hover:text-tv-text transition-colors">log</button>
        <button className="hover:text-tv-text transition-colors">auto</button>
      </div>
    </div>
  );
}
