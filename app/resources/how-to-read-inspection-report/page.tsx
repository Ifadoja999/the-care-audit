import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.thecareaudit.com';
const SLUG = 'how-to-read-inspection-report';

export const metadata: Metadata = {
  title: 'How to Read an Assisted Living Inspection Report',
  description:
    'Assisted living inspection reports document official state findings about a facility\'s safety, care quality, and compliance. Learn what the sections mean and what to look for.',
  alternates: { canonical: `${SITE_URL}/resources/${SLUG}` },
  openGraph: {
    title: 'How to Read an Assisted Living Inspection Report',
    description:
      'Assisted living inspection reports document official state findings about a facility\'s safety, care quality, and compliance. Learn what the sections mean and what to look for.',
    url: `${SITE_URL}/resources/${SLUG}`,
    siteName: 'The Care Audit',
    type: 'article',
  },
};

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'What is an assisted living inspection report?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'An assisted living inspection report is an official document produced by a state health department after conducting an unannounced survey of an assisted living facility. It documents any violations, deficiencies, or non-compliance findings identified during the inspection, along with required corrective actions.',
      },
    },
    {
      '@type': 'Question',
      name: 'What do violation levels or tags mean in an inspection report?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Violations are typically categorized by scope (how many residents were affected) and severity (how serious the harm was or could have been). Severity levels range from minimal harm with low likelihood of recurring, to immediate jeopardy — a situation where the safety or health of a resident is at serious and immediate risk. The most serious violations involve immediate jeopardy situations.',
      },
    },
    {
      '@type': 'Question',
      name: 'How often are assisted living facilities inspected?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Most states require annual unannounced inspections of assisted living facilities, plus complaint-driven investigations when issues are reported. Some states inspect more frequently, especially if a facility has a history of violations. Inspection frequency and processes vary by state.',
      },
    },
    {
      '@type': 'Question',
      name: 'How do I find assisted living inspection reports?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Inspection reports are public records. You can find them through your state health department\'s website, or through The Care Audit, which aggregates inspection data from all 50 states and presents it in plain English for easy review.',
      },
    },
    {
      '@type': 'Question',
      name: 'What are red flags in an assisted living inspection report?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Red flags include: immediate jeopardy citations, repeated violations across multiple inspections, violations related to abuse or neglect, findings of inadequate staffing, medication errors, and violations that resulted in actual resident harm. A pattern of violations across inspections is more concerning than a single isolated finding.',
      },
    },
  ],
};

const breadcrumbSchema = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
    { '@type': 'ListItem', position: 2, name: 'Resources', item: `${SITE_URL}/resources` },
    { '@type': 'ListItem', position: 3, name: 'How to Read an Assisted Living Inspection Report', item: `${SITE_URL}/resources/${SLUG}` },
  ],
};

const articleSchema = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'How to Read an Assisted Living Inspection Report',
  url: `${SITE_URL}/resources/${SLUG}`,
  publisher: { '@type': 'Organization', name: 'The Care Audit', url: SITE_URL },
  datePublished: '2026-04-02',
  dateModified: '2026-04-02',
};

export default function HowToReadInspectionReportPage() {
  return (
    <div className="flex min-h-screen flex-col bg-warm-50">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />

      <Header />

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12">
        <nav className="mb-6 text-sm text-gray-500" aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-1">
            <li><Link href="/" className="hover:text-navy hover:underline">Home</Link></li>
            <li aria-hidden="true">/</li>
            <li><Link href="/resources" className="hover:text-navy hover:underline">Resources</Link></li>
            <li aria-hidden="true">/</li>
            <li className="text-gray-700">How to Read an Inspection Report</li>
          </ol>
        </nav>

        <header className="mb-8">
          <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-accent">Research Guide</p>
          <h1 className="text-3xl font-bold leading-tight text-navy sm:text-4xl" style={{ fontFamily: 'var(--font-heading)' }}>
            How to Read an Assisted Living Inspection Report
          </h1>
          <p className="mt-3 text-sm text-gray-500">Updated April 2026 &middot; 9 min read</p>
        </header>

        {/* Direct Answer Box */}
        <div className="mb-8 rounded-xl border-l-4 border-accent bg-warm-100 p-5">
          <h2 className="mb-1 text-lg font-bold text-navy">What Is an Assisted Living Inspection Report?</h2>
          <p className="text-gray-800 leading-relaxed">
            An assisted living inspection report is an <strong>official document from a state health
            department</strong> that records what inspectors found during an unannounced visit to a facility.
            It lists any violations or deficiencies — areas where the facility was not meeting state
            regulations — along with the severity of those findings and what the facility was required
            to do to correct them.
          </p>
        </div>

        <div className="prose prose-gray max-w-none space-y-8 text-gray-800 leading-relaxed">

          <section>
            <h2 className="text-2xl font-bold text-navy">Why Inspection Reports Matter</h2>
            <p>
              Most families choose an assisted living facility based on a tour, marketing materials,
              online reviews, and word of mouth. Those are all useful — but they give an incomplete
              picture. An inspection report gives you something else: an official, objective record
              of what state inspectors actually found when they walked through the door unannounced.
            </p>
            <p className="mt-4">
              A facility can look beautiful in person and on its website while having a history of
              serious violations. The inverse is also true: a modest facility can have an excellent
              inspection record. Inspection data does not replace a tour, but it adds critical
              context that no amount of brochures can provide.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-navy">How Assisted Living Inspections Work</h2>
            <p>
              Every state&apos;s inspection process is slightly different, but the general structure is
              consistent:
            </p>
            <ol className="mt-3 space-y-3 pl-5 list-decimal">
              <li>
                <strong>Unannounced annual surveys:</strong> State inspectors arrive without notice,
                typically once per year. They review records, observe operations, interview staff and
                residents, and assess the physical environment against state licensing standards.
              </li>
              <li>
                <strong>Complaint investigations:</strong> When a complaint is filed — by a resident,
                family member, staff member, or anyone else — the state may conduct a separate,
                complaint-driven investigation to determine if the allegation was substantiated.
              </li>
              <li>
                <strong>Follow-up visits:</strong> If violations are cited, inspectors often return
                to verify that corrective actions were completed.
              </li>
            </ol>
            <p className="mt-4">
              All findings from these inspections become part of the facility&apos;s public record.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-navy">Anatomy of an Inspection Report</h2>
            <p>
              While formats vary by state, most inspection reports include these core sections:
            </p>

            <div className="mt-4 space-y-4">
              <div className="rounded-lg border border-warm-200 bg-white p-4">
                <h3 className="font-bold text-navy">Facility Information</h3>
                <p className="mt-1 text-sm text-gray-700">
                  The facility name, license number, address, capacity, and inspection date. Use this
                  to confirm you are looking at the right facility.
                </p>
              </div>

              <div className="rounded-lg border border-warm-200 bg-white p-4">
                <h3 className="font-bold text-navy">Survey Type</h3>
                <p className="mt-1 text-sm text-gray-700">
                  Whether this was a standard annual survey, a complaint investigation, or a follow-up
                  revisit. Complaint investigations that were &quot;substantiated&quot; are the most concerning —
                  they mean a specific allegation was confirmed by inspectors.
                </p>
              </div>

              <div className="rounded-lg border border-warm-200 bg-white p-4">
                <h3 className="font-bold text-navy">Deficiency Citations</h3>
                <p className="mt-1 text-sm text-gray-700">
                  Each violation found is listed as a deficiency. Each citation typically includes:
                  the regulation violated, a description of what the inspector observed, scope
                  (how many residents were affected), severity (how serious the harm was or could
                  have been), and the required plan of correction.
                </p>
              </div>

              <div className="rounded-lg border border-warm-200 bg-white p-4">
                <h3 className="font-bold text-navy">Plan of Correction</h3>
                <p className="mt-1 text-sm text-gray-700">
                  The facility&apos;s response to each deficiency — what they committed to do to fix
                  the problem and by when. This section is important: it shows how seriously the
                  facility takes the findings and how quickly they respond.
                </p>
              </div>

              <div className="rounded-lg border border-warm-200 bg-white p-4">
                <h3 className="font-bold text-navy">Compliance Status</h3>
                <p className="mt-1 text-sm text-gray-700">
                  The final determination — whether the facility was found to be in compliance,
                  partial compliance, or non-compliance with state regulations.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-navy">Understanding Violation Severity</h2>
            <p>
              Not all violations are equal. Most states use a framework that rates violations by
              both <strong>scope</strong> (how many residents were affected) and <strong>severity</strong>
              (how serious the harm was or could have been).
            </p>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-navy text-white">
                    <th className="border border-gray-200 px-4 py-2 text-left">Severity Level</th>
                    <th className="border border-gray-200 px-4 py-2 text-left">What It Means</th>
                    <th className="border border-gray-200 px-4 py-2 text-left">How Concerned Should You Be?</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="bg-white">
                    <td className="border border-gray-200 px-4 py-2 font-medium">Minimal harm, low risk</td>
                    <td className="border border-gray-200 px-4 py-2">A paperwork or minor procedural issue; no actual harm</td>
                    <td className="border border-gray-200 px-4 py-2">Low concern. Look for patterns across inspections.</td>
                  </tr>
                  <tr className="bg-warm-50">
                    <td className="border border-gray-200 px-4 py-2 font-medium">Potential for minimal harm</td>
                    <td className="border border-gray-200 px-4 py-2">No harm occurred but the situation could cause minimal harm</td>
                    <td className="border border-gray-200 px-4 py-2">Moderate concern. Depends on the violation type.</td>
                  </tr>
                  <tr className="bg-white">
                    <td className="border border-gray-200 px-4 py-2 font-medium">Actual harm</td>
                    <td className="border border-gray-200 px-4 py-2">A resident experienced harm as a result of the deficiency</td>
                    <td className="border border-gray-200 px-4 py-2">High concern. Especially if it involved falls, medication errors, or neglect.</td>
                  </tr>
                  <tr className="bg-warm-50">
                    <td className="border border-gray-200 px-4 py-2 font-medium text-red-600">Immediate Jeopardy</td>
                    <td className="border border-gray-200 px-4 py-2 text-red-600">The facility&apos;s actions placed residents at risk of serious injury, harm, or death</td>
                    <td className="border border-gray-200 px-4 py-2 text-red-600 font-semibold">Very high concern. Requires follow-up and investigation.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-navy">What Common Violations Look Like</h2>
            <p>
              Inspection violations fall into several common categories. Here is what each area
              covers in a typical report:
            </p>
            <ul className="mt-3 space-y-3 pl-5 list-disc">
              <li>
                <strong>Resident care and safety:</strong> Falls prevention, supervision of residents
                with cognitive impairment, emergency call systems, infection control practices.
              </li>
              <li>
                <strong>Medication management:</strong> Proper administration, storage, documentation,
                and disposal of medications. Errors here can be serious.
              </li>
              <li>
                <strong>Staffing:</strong> Inadequate staffing levels, staff-to-resident ratios below
                the required minimum, insufficient training documentation.
              </li>
              <li>
                <strong>Physical environment:</strong> Cleanliness, maintenance, safety hazards, fire
                safety compliance, pest control.
              </li>
              <li>
                <strong>Abuse and neglect:</strong> Incidents of physical, emotional, or sexual abuse,
                or neglect of resident needs. These are among the most serious findings.
              </li>
              <li>
                <strong>Documentation and records:</strong> Incomplete or missing care plans, resident
                files, incident reports, or medication administration records.
              </li>
              <li>
                <strong>Nutrition and hydration:</strong> Inadequate meals, residents not receiving
                required special diets, dehydration concerns.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-navy">What to Look For: Red Flags and Green Flags</h2>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                <p className="mb-2 font-semibold text-red-800">Red Flags</p>
                <ul className="space-y-1 pl-4 list-disc text-sm text-red-700">
                  <li>Immediate jeopardy citations in any inspection</li>
                  <li>Repeated violations across multiple inspections</li>
                  <li>Abuse or neglect findings</li>
                  <li>Staffing violations, especially understaffing</li>
                  <li>Medication errors that caused harm</li>
                  <li>Slow or inadequate plans of correction</li>
                  <li>Multiple substantiated complaint investigations</li>
                </ul>
              </div>
              <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                <p className="mb-2 font-semibold text-green-800">Positive Signs</p>
                <ul className="space-y-1 pl-4 list-disc text-sm text-green-700">
                  <li>No violations or minimal-severity findings only</li>
                  <li>Consistent clean records across multiple years</li>
                  <li>Quick, thorough plans of correction when violations are cited</li>
                  <li>No substantiated abuse or neglect complaints</li>
                  <li>Violations that are paperwork or procedural, not care-related</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-navy">How to Look Up Inspection Records</h2>
            <p>
              Assisted living inspection reports are public records. You can access them two ways:
            </p>
            <ol className="mt-3 space-y-3 pl-5 list-decimal">
              <li>
                <strong>State health department websites:</strong> Each state&apos;s health or social
                services agency maintains a database of licensed assisted living facilities and
                their inspection histories. These can be difficult to navigate and vary widely
                in usability.
              </li>
              <li>
                <strong>The Care Audit:</strong> We aggregate inspection data from all 50 states
                and present it in plain English — organized by facility, searchable by location,
                and designed for families rather than regulators. Search facilities in{' '}
                <Link href="/florida" className="text-accent hover:underline">Florida</Link>,{' '}
                <Link href="/texas" className="text-accent hover:underline">Texas</Link>,{' '}
                <Link href="/california" className="text-accent hover:underline">California</Link>,{' '}
                <Link href="/new-york" className="text-accent hover:underline">New York</Link>,{' '}
                or{' '}
                <Link href="/" className="text-accent hover:underline">any state</Link>.
              </li>
            </ol>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-navy">Questions to Ask a Facility About Its Inspection Record</h2>
            <p>
              After reviewing the inspection report, use it as the basis for a direct conversation
              with the facility. Good facilities will engage honestly and thoroughly.
            </p>
            <ul className="mt-3 space-y-2 pl-5 list-disc">
              <li>&quot;I reviewed your most recent inspection report and noticed [specific violation]. Can you walk me through what happened and what changed?&quot;</li>
              <li>&quot;Are there any outstanding citations that have not yet been resolved?&quot;</li>
              <li>&quot;Has there been a change in management or ownership since the last inspection?&quot;</li>
              <li>&quot;What is your typical staffing ratio during daytime and overnight hours?&quot;</li>
              <li>&quot;How do you handle resident complaints?&quot;</li>
            </ul>
          </section>

          <section className="rounded-xl bg-navy/5 p-6">
            <h2 className="mb-4 text-xl font-bold text-navy">Key Takeaways</h2>
            <ol className="space-y-2 pl-5 list-decimal text-gray-800">
              <li>Inspection reports are official state records of what inspectors found during unannounced visits to a facility.</li>
              <li>Violations range from minor paperwork issues to immediate jeopardy — situations that put residents at serious risk.</li>
              <li>Red flags include immediate jeopardy citations, repeated violations, and abuse/neglect findings.</li>
              <li>A pattern of violations across multiple inspections is more concerning than a single isolated finding.</li>
              <li>The Care Audit makes it easy to find and read inspection records for facilities in all 50 states — in plain English.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-navy">Frequently Asked Questions</h2>
            <div className="mt-6 space-y-6">
              <div>
                <h3 className="font-bold text-gray-900">What is an assisted living inspection report?</h3>
                <p className="mt-1 text-gray-700">An official document from a state health department that records any violations or deficiencies found during an unannounced inspection of an assisted living facility.</p>
              </div>
              <div>
                <h3 className="font-bold text-gray-900">What do violation levels mean in an inspection report?</h3>
                <p className="mt-1 text-gray-700">Violations are rated by scope (how many residents were affected) and severity (how serious the harm was or could have been). The most serious level — immediate jeopardy — means residents were at risk of serious injury or death.</p>
              </div>
              <div>
                <h3 className="font-bold text-gray-900">How often are assisted living facilities inspected?</h3>
                <p className="mt-1 text-gray-700">Most states require annual unannounced inspections, plus additional complaint-driven investigations. Frequency and processes vary by state.</p>
              </div>
              <div>
                <h3 className="font-bold text-gray-900">How do I find assisted living inspection reports?</h3>
                <p className="mt-1 text-gray-700">Through your state health department&apos;s website, or via The Care Audit, which aggregates and presents inspection data from all 50 states in plain English.</p>
              </div>
              <div>
                <h3 className="font-bold text-gray-900">What are red flags in an assisted living inspection report?</h3>
                <p className="mt-1 text-gray-700">Immediate jeopardy citations, repeated violations across multiple inspections, abuse or neglect findings, and substantiated complaint investigations.</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-navy">Related Resources</h2>
            <ul className="mt-4 space-y-3">
              <li><Link href="/resources/medicare-assisted-living" className="font-medium text-accent hover:underline">Does Medicare Cover Assisted Living?</Link></li>
              <li><Link href="/resources/assisted-living-cost" className="font-medium text-accent hover:underline">How Much Does Assisted Living Cost Per Month in 2026?</Link></li>
              <li><Link href="/resources/assisted-living-vs-memory-care" className="font-medium text-accent hover:underline">Assisted Living vs. Memory Care: What&apos;s the Difference?</Link></li>
              <li><Link href="/resources/signs-its-time-for-assisted-living" className="font-medium text-accent hover:underline">Signs It&apos;s Time for Assisted Living: A Family Guide</Link></li>
            </ul>
          </section>

          <div className="rounded-xl bg-navy p-6 text-center text-white">
            <p className="text-lg font-semibold">Look up a facility&apos;s inspection record right now</p>
            <p className="mt-1 text-blue-200 text-sm">44,000+ facilities across all 50 states. Plain English. Free.</p>
            <Link href="/" className="mt-4 inline-block rounded-lg bg-accent px-6 py-3 font-semibold text-white transition-opacity hover:opacity-90">
              Search Facilities
            </Link>
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
}
