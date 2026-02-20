import Link from 'next/link';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

export default function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-sm text-gray-500">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <span className="text-gray-300 select-none">›</span>}
          {item.href ? (
            <Link
              href={item.href}
              className="hover:text-navy transition-colors hover:underline"
            >
              {item.label}
            </Link>
          ) : (
            <span className="font-medium text-gray-900">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
