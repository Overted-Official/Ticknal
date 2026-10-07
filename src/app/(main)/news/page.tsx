import NewsPageView from '@/components/platform/news/NewsPageView';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Market Wire & Disclosures | Ticknal',
  description: 'Real-time Egyptian market news, EGX corporate disclosures, Central Bank of Egypt policy notices, and macroeconomic intelligence.',
};

export default function NewsPage() {
  return (
    <div className="flex-1 h-full w-full flex flex-col bg-plt-base text-plt-text overflow-hidden">
      <NewsPageView />
    </div>
  );
}
