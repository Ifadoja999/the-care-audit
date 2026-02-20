export default function Footer() {
  return (
    <footer className="mt-auto border-t border-gray-200 bg-gray-50 py-8">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex flex-col items-center gap-2 text-center text-sm sm:flex-row sm:justify-between sm:text-left">
          <span className="font-semibold text-navy">The Care Audit</span>
          <span className="text-gray-500">
            Data sourced from official state health department inspection records.
          </span>
        </div>
        <p className="mt-3 text-center text-xs text-gray-400">
          This site is not affiliated with any government agency. Information is provided for
          educational purposes only and may not reflect the most current inspection status.
        </p>
      </div>
    </footer>
  );
}
