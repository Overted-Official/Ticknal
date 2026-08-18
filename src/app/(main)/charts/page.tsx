import { redirect } from 'next/navigation';

export default async function LegacyChartsRedirect(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const searchParams = await props.searchParams;
  const params = new URLSearchParams();
  
  if (searchParams) {
    for (const [key, val] of Object.entries(searchParams)) {
      if (typeof val === 'string') {
        params.set(key, val);
      } else if (Array.isArray(val)) {
        val.forEach(v => params.append(key, v));
      }
    }
  }

  if (!params.has('view')) {
    params.set('view', params.has('ticker') || params.has('symbol') ? 'chart' : 'sectors');
  }

  const queryStr = params.toString();
  redirect(`/invest?${queryStr}`);
}
