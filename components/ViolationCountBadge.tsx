import { CheckCircle2, HelpCircle } from 'lucide-react';

interface Props {
  totalViolations: number | null;
  size?: 'sm' | 'md';
}

export default function ViolationCountBadge({ totalViolations, size = 'md' }: Props) {
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
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center ${
        isSm ? 'text-xs' : 'text-sm'
      } font-medium text-gray-600`}
      aria-label={`${totalViolations} violation${totalViolations === 1 ? '' : 's'} cited`}
      role="img"
    >
      {totalViolations} violation{totalViolations === 1 ? '' : 's'}
    </span>
  );
}
