type Grade = 'A' | 'B' | 'C' | 'F';

const gradeConfig: Record<Grade, { bg: string; text: string }> = {
  A: { bg: 'bg-green-100',  text: 'text-green-800' },
  B: { bg: 'bg-blue-100',   text: 'text-blue-800'  },
  C: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
  F: { bg: 'bg-red-100',    text: 'text-red-800'   },
};

const sizeConfig = {
  sm:  'h-7  w-7  text-sm  font-bold',
  md:  'h-10 w-10 text-lg  font-bold',
  lg:  'h-16 w-16 text-3xl font-bold',
};

interface Props {
  grade: Grade | null | undefined;
  size?: 'sm' | 'md' | 'lg';
}

export default function SafetyGradeBadge({ grade, size = 'md' }: Props) {
  if (!grade || !(grade in gradeConfig)) return null;
  const { bg, text } = gradeConfig[grade];
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full ${sizeConfig[size]} ${bg} ${text}`}
    >
      {grade}
    </span>
  );
}
