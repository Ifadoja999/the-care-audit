import Link from 'next/link';
import { stateCodeToSlug, stateCodeToName } from '@/lib/states';

interface Props {
  stateCode: string;
  facilityCount: number;
}

export default function StateCard({ stateCode, facilityCount }: Props) {
  const slug = stateCodeToSlug(stateCode);
  const name = stateCodeToName(stateCode);
  const hasData = facilityCount > 0;

  const card = (
    <div
      className={`flex flex-col gap-1 rounded-lg border p-3 transition-all ${
        hasData
          ? 'border-navy/30 bg-white shadow-sm hover:border-navy hover:shadow-md cursor-pointer'
          : 'border-gray-100 bg-gray-50/50 cursor-default opacity-60'
      }`}
    >
      <span className={`text-[10px] font-bold uppercase tracking-wider ${hasData ? 'text-navy/50' : 'text-gray-300'}`}>
        {stateCode}
      </span>
      <span className={`text-sm font-semibold ${hasData ? 'text-gray-900' : 'text-gray-400'}`}>
        {name}
      </span>
      {hasData ? (
        <span className="text-xs text-gray-500">
          {facilityCount.toLocaleString()} {facilityCount === 1 ? 'facility' : 'facilities'}
        </span>
      ) : (
        <span className="text-[11px] font-medium uppercase tracking-wide text-gray-300">
          Coming Soon
        </span>
      )}
    </div>
  );

  return hasData ? <Link href={`/${slug}`}>{card}</Link> : card;
}
