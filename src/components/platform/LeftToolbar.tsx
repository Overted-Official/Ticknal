import { 
  Crosshair, 
  TrendingUp, 
  Menu, 
  Pencil, 
  Type, 
  Shapes, 
  Ruler, 
  ZoomIn, 
  Magnet, 
  Lock, 
  EyeOff, 
  Trash2 
} from '@/components/ui/icons';

export default function LeftToolbar() {
  const tools = [
    { icon: Crosshair, id: 'cursor' },
    { icon: TrendingUp, id: 'trendline' },
    { icon: Menu, id: 'gann-fib' },
    { icon: Pencil, id: 'brush' },
    { icon: Type, id: 'text' },
    { icon: Shapes, id: 'patterns' },
    { icon: Ruler, id: 'measure' },
    { icon: ZoomIn, id: 'zoom' },
    { icon: Magnet, id: 'magnet' },
  ];

  const bottomTools = [
    { icon: Lock, id: 'lock' },
    { icon: EyeOff, id: 'hide' },
    { icon: Trash2, id: 'delete' },
  ];

  return (
    <div className="w-12 bg-tv-base flex flex-col items-center py-2 border-r border-tv-border">
      <div className="flex-1 flex flex-col space-y-3 w-full items-center">
        {tools.map((Tool) => (
          <button 
            key={Tool.id} 
            className={`p-2 rounded-tv-sm transition-colors ${
              Tool.id === 'cursor' ? 'text-tv-accent bg-tv-hover' : 'text-tv-muted hover:text-tv-text hover:bg-tv-hover'
            }`}
          >
            <Tool.icon size={20} strokeWidth={1.5} />
          </button>
        ))}
      </div>
      
      <div className="flex flex-col space-y-3 w-full items-center pb-4">
        {bottomTools.map((Tool) => (
          <button 
            key={Tool.id} 
            className="p-2 rounded-tv-sm transition-colors text-tv-muted hover:text-tv-text hover:bg-tv-hover"
          >
            <Tool.icon size={20} strokeWidth={1.5} />
          </button>
        ))}
      </div>
    </div>
  );
}
