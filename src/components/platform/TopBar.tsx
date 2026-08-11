import { Search, BarChart2, Bell, RotateCcw, Layout, Settings, Maximize, Camera } from '@/components/ui/icons';
import Link from 'next/link';

export default function TopBar({ symbol, timeframe, replay = false }: { symbol: string, timeframe: string, replay?: boolean }) {
  const timeframes = ['D', 'W', 'M'];
  const displaySymbol = symbol.replace('.CA', '');
  const replayQuery = replay ? '&replay=1' : '';

  return (
    <div className="h-12 w-full bg-tv-base border-b border-tv-border flex items-center px-3 justify-between select-none">
      {/* Left section */}
      <div className="flex items-center space-x-4">
        {/* Logo / Symbol */}
        <div className="flex items-center space-x-2 font-weight-medium cursor-pointer hover:bg-tv-hover p-1.5 rounded-tv-md transition-colors">
          <div className="text-tv-accent">Q</div>
          <span className="text-tv-text">{displaySymbol}</span>
          <span className="text-tv-muted font-weight-light">EGX</span>
          <Search size={16} className="text-tv-muted ml-2" />
        </div>

        <div className="h-5 w-px bg-tv-border" />

        {/* Timeframes */}
        <div className="flex items-center space-x-1">
          {timeframes.map((tf) => (
            <Link
              key={tf}
              href={`?ticker=${symbol}&timeframe=${tf}${replayQuery}`}
              className={`px-2 py-1 rounded-tv-sm hover:bg-tv-hover transition-colors ${
                tf === timeframe ? 'text-tv-accent' : 'text-tv-text'
              }`}
            >
              {tf}
            </Link>
          ))}
        </div>

        <div className="h-5 w-px bg-tv-border" />

        {/* Indicators & Tools */}
        <div className="flex items-center space-x-2">
          <button className="flex items-center space-x-1 hover:bg-tv-hover px-2 py-1 rounded-tv-sm transition-colors text-tv-text">
            <BarChart2 size={16} />
            <span className="hidden md:inline">Indicators</span>
          </button>
          <button className="flex items-center space-x-1 hover:bg-tv-hover px-2 py-1 rounded-tv-sm transition-colors text-tv-text">
            <Bell size={16} />
            <span className="hidden md:inline">Alert</span>
          </button>
          <Link
            href={`?ticker=${symbol}&timeframe=${timeframe}&replay=1`}
            className={`flex items-center space-x-1 hover:bg-tv-hover px-2 py-1 rounded-tv-sm transition-colors ${
              replay ? 'text-tv-accent' : 'text-tv-text'
            }`}
          >
            <RotateCcw size={16} />
            <span className="hidden md:inline">Replay</span>
          </Link>
        </div>
      </div>

      {/* Right section */}
      <div className="flex items-center space-x-2">
        <button className="hover:bg-tv-hover p-1.5 rounded-tv-sm transition-colors text-tv-muted hover:text-tv-text">
          <Layout size={18} />
        </button>
        <button className="hover:bg-tv-hover p-1.5 rounded-tv-sm transition-colors text-tv-muted hover:text-tv-text">
          <Settings size={18} />
        </button>
        <button className="hover:bg-tv-hover p-1.5 rounded-tv-sm transition-colors text-tv-muted hover:text-tv-text">
          <Maximize size={18} />
        </button>
        <button className="hover:bg-tv-hover p-1.5 rounded-tv-sm transition-colors text-tv-muted hover:text-tv-text">
          <Camera size={18} />
        </button>
        <button className="bg-tv-accent hover:bg-tv-accent-hover text-tv-text px-4 py-1.5 rounded-tv-sm font-weight-medium ml-2 transition-colors">
          Publish
        </button>
      </div>
    </div>
  );
}
