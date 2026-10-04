'use client';

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
} from '@/components/ui/icon-library';
import { useTranslation } from '@/lib/i18n';

export default function LeftToolbar() {
  const { locale } = useTranslation();
  const isAr = locale === 'ar';

  const tools = [
    { icon: Crosshair, id: 'cursor', title: isAr ? 'المؤشر' : 'Cursor' },
    { icon: TrendingUp, id: 'trendline', title: isAr ? 'خط الاتجاه' : 'Trendline' },
    { icon: Menu, id: 'gann-fib', title: isAr ? 'فيبوناتشي وجان' : 'Gann & Fibonacci' },
    { icon: Pencil, id: 'brush', title: isAr ? 'فرشاة الرسم' : 'Brush' },
    { icon: Type, id: 'text', title: isAr ? 'نص' : 'Text' },
    { icon: Shapes, id: 'patterns', title: isAr ? 'النماذج الفنية' : 'Patterns' },
    { icon: Ruler, id: 'measure', title: isAr ? 'قياس' : 'Measure' },
    { icon: ZoomIn, id: 'zoom', title: isAr ? 'تكبير' : 'Zoom' },
    { icon: Magnet, id: 'magnet', title: isAr ? 'المغناطيس' : 'Magnet' },
  ];

  const bottomTools = [
    { icon: Lock, id: 'lock', title: isAr ? 'قفل أدوات الرسم' : 'Lock drawing tools' },
    { icon: EyeOff, id: 'hide', title: isAr ? 'إخفاء الرسومات' : 'Hide drawings' },
    { icon: Trash2, id: 'delete', title: isAr ? 'حذف الرسومات' : 'Delete drawings' },
  ];

  return (
    <div className="w-12 bg-tv-base flex flex-col items-center py-2 ltr:border-r rtl:border-l border-tv-border">
      <div className="flex-1 flex flex-col space-y-4 w-full items-center">
        {tools.map((Tool) => (
          <button 
            key={Tool.id} 
            title={Tool.title}
            aria-label={Tool.title}
            className={`p-2 rounded-full transition-colors cursor-pointer ${
              Tool.id === 'cursor' ? 'text-tv-accent bg-tv-hover' : 'text-tv-muted hover:text-tv-text hover:bg-tv-hover'
            }`}
          >
            <Tool.icon size={24} strokeWidth={1.5} />
          </button>
        ))}
      </div>
      
      <div className="flex flex-col space-y-4 w-full items-center pb-4">
        {bottomTools.map((Tool) => (
          <button 
            key={Tool.id} 
            title={Tool.title}
            aria-label={Tool.title}
            className="p-2 rounded-full transition-colors text-tv-muted hover:text-tv-text hover:bg-tv-hover cursor-pointer"
          >
            <Tool.icon size={24} strokeWidth={1.5} />
          </button>
        ))}
      </div>
    </div>
  );
}
