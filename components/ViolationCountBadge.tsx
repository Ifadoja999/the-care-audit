import { CheckCircle2, HelpCircle, Info } from 'lucide-react';

interface Props {
  totalViolations: number | null;
  size?: 'sm' | 'md';
  state?: string;
}

export default function ViolationCountBadge({ totalViolations, size = 'md', state }: Props) {
  const isSm = size === 'sm';

  // NULL = no inspection data available for this state
  if (totalViolations === null) {
    return (
      <span
        className={`inline-flex items-center gap-1 ${
          isSm ? 'text-xs' : 'text-sm'
        } text-gray-400`}
        aria-label="Inspection data not yet available"
        role="img"
      >
        <HelpCircle className={isSm ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
        Data pending
      </span>
    );
  }

  if (totalViolations === 0) {
    return (
      <span
        className={`inline-flex items-center gap-1 ${
          isSm ? 'text-xs' : 'text-sm'
        } text-gray-500`}
        aria-label="No violations cited"
        role="img"
      >
        <CheckCircle2 className={isSm ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
        No violations
        {state === 'TX' && (
          <span
            className={`inline-flex items-center gap-0.5 ${isSm ? 'text-[10px]' : 'text-xs'} font-normal text-amber-700`}
            title="Texas: reflects complaint investigation citations only, not comprehensive inspection violations"
          >
            <Info className={isSm ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
            complaints only
          </span>
        )}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 ${
        isSm ? 'text-xs' : 'text-sm'
      } font-medium text-gray-600`}
      aria-label={`${totalViolations} violation${totalViolations === 1 ? '' : 's'} cited`}
      role="img"
    >
      {totalViolations} violation{totalViolations === 1 ? '' : 's'}
      {state === 'TX' && (
        <span
          className={`inline-flex items-center gap-0.5 ${isSm ? 'text-[10px]' : 'text-xs'} font-normal text-amber-700`}
          title="Texas: reflects complaint investigation citations only, not comprehensive inspection violations"
        >
          <Info className={isSm ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
          complaints only
        </span>
      )}
    </span>
  );
}
