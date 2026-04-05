import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.thecareaudit.com';
const SLUG = 'medicare-assisted-living';

export const metadata: Metadata = {
  title: 'Does Medicare Cover Assisted Living? (The Real Answer)',
  description:
    'Medicare does not cover assisted living costs. Learn what Medicare does and does not pay for, plus what programs can help pay for assisted living.',
  alternates: { canonical: `${SITE_URL}/resources/${SLUG}` },
  openGraph: {
    title: 'Does Medicare Cover Assisted Living? (The Real Answer)',
    description:
      'Medicare does not cover assisted living costs. Learn what Medicare does and does not pay for, plus what programs can help pay for assisted living.',
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
      name: 'Does Medicare cover assisted living?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'No. Medicare does not cover the cost of assisted living. Medicare is health insurance, not long-term care insurance. It covers medically necessary services like doctor visits, hospital stays, and some home health care — but it does not pay for room and board, personal care, or supervision at an assisted living facility.',
      },
    },
    {
      '@type': 'Question',
      name: 'Does Medicaid pay for assisted living?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Medicaid may cover some assisted living costs, but coverage varies widely by state. Some states have Medicaid waiver programs that pay for personal care services in an assisted living setting. Medicaid does not typically cover room and board.',
      },
    },
    {
      '@type': 'Question',
      name: 'What does Medicare cover for seniors in assisted living?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'If a resident of an assisted living facility has a Medicare-covered event — such as a hospitalization followed by skilled nursing care — Medicare can cover that event. Medicare covers skilled nursing facility stays up to 100 days after a qualifying hospital stay. It also covers physician visits, prescription drugs (Part D), and some home health services, but none of the assisted living costs themselves.',
      },
    },
    {
      '@type': 'Question',
      name: 'What is the best way to pay for assisted living?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Most families pay for assisted living through a combination of personal savings, Social Security income, pension benefits, proceeds from selling a home, long-term care insurance, and veterans benefits (for eligible veterans). Medicaid waivers may help low-income seniors in some states.',
      },
    },
    {
      '@type': 'Question',
      name: 'How much does assisted living cost per month?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'The national median cost of assisted living is approximately $4,500 to $5,000 per month as of 2026, though costs vary significantly by state and city. Some states average under $3,500/month while others exceed $7,000/month.',
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
    {
      '@type': 'ListItem',
      position: 3,
      name: 'Does Medicare Cover Assisted Living?',
      item: `${SITE_URL}/resources/${SLUG}`,
    },
  ],
};

const articleSchema = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'Does Medicare Cover Assisted Living? (The Real Answer)',
  description:
    'Medicare does not cover assisted living costs. Learn what Medicare does and does not pay for, plus what programs can help pay for assisted living.',
  url: `${SITE_URL}/resources/${SLUG}`,
  publisher: {
    '@type': 'Organization',
    name: 'The Care Audit',
    url: SITE_URL,
  },
  datePublished: '2026-04-02',
  dateModified: '2026-04-02',
};

export default function MedicarePage() {
  return (
    <div className="flex min-h-screen flex-col bg-warm-50">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />

      <Header />

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12">
        {/* Breadcrumb */}
        <nav className="mb-6 text-sm text-gray-500" aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-1">
            <li><Link href="/" className="hover:text-navy hover:underline">Home</Link></li>
            <li aria-hidden="true">/</li>
            <li><Link href="/resources" className="hover:text-navy hover:underline">Resources</Link></li>
            <li aria-hidden="true">/</li>
            <li className="text-gray-700">Medicare &amp; Assisted Living</li>
          </ol>
        </nav>

        {/* Article Header */}
        <header className="mb-8">
          <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-accent">Family Guide</p>
          <h1 className="text-3xl font-bold leading-tight text-navy sm:text-4xl" style={{ fontFamily: 'var(--font-heading)' }}>
            Does Medicare Cover Assisted Living? (The Real Answer)
          </h1>
          <p className="mt-3 text-sm text-gray-500">Updated April 2026 &middot; 6 min read</p>
        </header>

        {/* Direct Answer Box (AEO Featured Snippet Bait) */}
        <div className="mb-8 rounded-xl border-l-4 border-accent bg-warm-100 p-5">
          <h2 className="mb-1 text-lg font-bold text-navy">Does Medicare Cover Assisted Living?</h2>
          <p className="text-gray-800 leading-relaxed">
            <strong>No. Medicare does not cover the cost of assisted living.</strong> Medicare is health
            insurance, not long-term care insurance. It pays for medically necessary care — doctor visits,
            hospital stays, and limited home health services — but it does not pay for room and board,
            personal care, or supervision at an assisted living facility.
          </p>
        </div>

        {/* Body */}
        <div className="prose prose-gray max-w-none space-y-8 text-gray-800 leading-relaxed">

          <section>
            <h2 className="text-2xl font-bold text-navy">What Medicare Actually Covers</h2>
            <p>
              Medicare is divided into parts, each covering different types of health services:
            </p>
            <ul className="mt-3 space-y-2 pl-5 list-disc">
              <li><strong>Part A (Hospital Insurance):</strong> Inpatient hospital care, skilled nursing facility care (short-term, up to 100 days after a qualifying hospital stay), hospice, and some home health care.</li>
              <li><strong>Part B (Medical Insurance):</strong> Doctor visits, outpatient services, preventive care, durable medical equipment, and some home health services.</li>
              <li><strong>Part C (Medicare Advantage):</strong> Private insurance plans that bundle Parts A and B, often with added benefits. Some Advantage plans include modest supplemental benefits like vision or dental — but still do not cover assisted living room and board.</li>
              <li><strong>Part D (Prescription Drug Coverage):</strong> Prescription medications.</li>
            </ul>
            <p className="mt-4">
              None of these parts cover what families typically need to pay for at an assisted living
              facility: the monthly rent, meals, housekeeping, and 24-hour personal care assistance.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-navy">What Medicare Will Pay For — Even in Assisted Living</h2>
            <p>
              Just because a loved one lives in an assisted living facility does not mean they lose
              their Medicare coverage. Medicare still covers covered health services regardless of
              where someone lives. That includes:
            </p>
            <ul className="mt-3 space-y-2 pl-5 list-disc">
              <li>Physician and specialist visits (whether in-person or via telehealth)</li>
              <li>Prescription drugs through Part D</li>
              <li>Skilled nursing facility (SNF) care after a qualifying hospital stay of 3 or more days</li>
              <li>Home health care visits by nurses or therapists (if medically necessary)</li>
              <li>Hospice services for residents at end of life</li>
              <li>Medical equipment like walkers, wheelchairs, or oxygen</li>
            </ul>
            <p className="mt-4">
              The key distinction: Medicare covers healthcare. Assisted living is a housing and
              personal care arrangement — not a medical service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-navy">What About Medicaid?</h2>
            <p>
              Medicaid is different from Medicare. It is a joint federal and state program that provides
              health coverage to people with limited income and assets. In some states, Medicaid can
              help cover some assisted living costs.
            </p>
            <p className="mt-4">
              Medicaid coverage for assisted living varies significantly by state. Some states have
              created <strong>Home and Community Based Services (HCBS) waiver programs</strong> that
              use Medicaid funding to pay for personal care and support services in assisted living
              settings. However, Medicaid generally does not cover room and board — only the personal
              care component.
            </p>
            <p className="mt-4">
              To qualify for Medicaid, a person must typically meet both medical and financial
              eligibility requirements. Income and asset limits differ by state. Applying for Medicaid
              while already in assisted living can be complex — a local elder law attorney can help
              navigate the process.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-navy">How Most Families Pay for Assisted Living</h2>
            <p>
              Since Medicare does not cover assisted living, families typically piece together funding
              from multiple sources:
            </p>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-navy text-white">
                    <th className="border border-gray-200 px-4 py-2 text-left">Funding Source</th>
                    <th className="border border-gray-200 px-4 py-2 text-left">What It Covers</th>
                    <th className="border border-gray-200 px-4 py-2 text-left">Who Qualifies</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="bg-white">
                    <td className="border border-gray-200 px-4 py-2 font-medium">Personal savings / investments</td>
                    <td className="border border-gray-200 px-4 py-2">All costs</td>
                    <td className="border border-gray-200 px-4 py-2">Anyone</td>
                  </tr>
                  <tr className="bg-warm-50">
                    <td className="border border-gray-200 px-4 py-2 font-medium">Social Security / pension</td>
                    <td className="border border-gray-200 px-4 py-2">Partial costs</td>
                    <td className="border border-gray-200 px-4 py-2">Anyone receiving SS or pension</td>
                  </tr>
                  <tr className="bg-white">
                    <td className="border border-gray-200 px-4 py-2 font-medium">Home equity (sale of home)</td>
                    <td className="border border-gray-200 px-4 py-2">All costs</td>
                    <td className="border border-gray-200 px-4 py-2">Homeowners</td>
                  </tr>
                  <tr className="bg-warm-50">
                    <td className="border border-gray-200 px-4 py-2 font-medium">Long-term care insurance</td>
                    <td className="border border-gray-200 px-4 py-2">Daily benefit amount</td>
                    <td className="border border-gray-200 px-4 py-2">Those who purchased a policy</td>
                  </tr>
                  <tr className="bg-white">
                    <td className="border border-gray-200 px-4 py-2 font-medium">Veterans benefits (Aid &amp; Attendance)</td>
                    <td className="border border-gray-200 px-4 py-2">Monthly cash benefit</td>
                    <td className="border border-gray-200 px-4 py-2">Veterans and surviving spouses</td>
                  </tr>
                  <tr className="bg-warm-50">
                    <td className="border border-gray-200 px-4 py-2 font-medium">Medicaid HCBS waiver</td>
                    <td className="border border-gray-200 px-4 py-2">Personal care services (not room/board)</td>
                    <td className="border border-gray-200 px-4 py-2">Low-income seniors, varies by state</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-navy">What About Skilled Nursing Facilities vs. Assisted Living?</h2>
            <p>
              A common source of confusion: Medicare <em>does</em> cover skilled nursing facility (SNF)
              care in certain situations. A SNF (sometimes called a nursing home) provides a higher
              level of medical care than assisted living. If a senior requires 24-hour skilled nursing
              care following a hospital stay, Medicare will pay for up to 100 days at a skilled nursing
              facility.
            </p>
            <p className="mt-4">
              Assisted living facilities are a different level of care. They provide housing, meals,
              and help with activities of daily living — not skilled medical care. That is why Medicare
              does not cover them.
            </p>
            <p className="mt-4">
              If a loved one is considering a move, understanding the distinction between assisted living
              and skilled nursing is critical for financial planning.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-navy">Why Inspection Records Matter for This Decision</h2>
            <p>
              Since families pay for assisted living almost entirely out of pocket, choosing the right
              facility is one of the most significant financial and personal decisions they will make.
              Beyond cost, the quality and safety record of a facility matters deeply.
            </p>
            <p className="mt-4">
              Every state inspects assisted living facilities and publishes those results publicly.
              The Care Audit aggregates those inspection records — violations, deficiencies, and
              survey outcomes — for facilities in{' '}
              <Link href="/alabama" className="text-accent hover:underline">Alabama</Link>,{' '}
              <Link href="/florida" className="text-accent hover:underline">Florida</Link>,{' '}
              <Link href="/texas" className="text-accent hover:underline">Texas</Link>,{' '}
              <Link href="/california" className="text-accent hover:underline">California</Link>, and{' '}
              <Link href="/" className="text-accent hover:underline">all 50 states</Link>.
            </p>
            <p className="mt-4">
              Before signing a contract at any facility, review its inspection history. It is public
              information — and The Care Audit puts it in plain English.
            </p>
          </section>

          {/* Key Takeaways */}
          <section className="rounded-xl bg-navy/5 p-6">
            <h2 className="mb-4 text-xl font-bold text-navy">Key Takeaways</h2>
            <ol className="space-y-2 pl-5 list-decimal text-gray-800">
              <li>Medicare does not cover assisted living room and board, personal care, or supervision.</li>
              <li>Medicare does cover health services a resident receives while living in assisted living.</li>
              <li>Medicaid may help cover some services in some states through HCBS waiver programs.</li>
              <li>Most families pay for assisted living using savings, Social Security, home equity, long-term care insurance, or veterans benefits.</li>
              <li>Research facility inspection records before making a decision — it is free at The Care Audit.</li>
            </ol>
          </section>

          {/* FAQ Section */}
          <section>
            <h2 className="text-2xl font-bold text-navy">Frequently Asked Questions</h2>

            <div className="mt-6 space-y-6">
              <div>
                <h3 className="font-bold text-gray-900">Does Medicare cover assisted living?</h3>
                <p className="mt-1 text-gray-700">No. Medicare does not cover the cost of assisted living. It covers health care services, not housing or personal care.</p>
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Does Medicaid pay for assisted living?</h3>
                <p className="mt-1 text-gray-700">Medicaid may cover some personal care services in assisted living through HCBS waiver programs, but this varies by state. Medicaid does not cover room and board.</p>
              </div>
              <div>
                <h3 className="font-bold text-gray-900">What does Medicare cover for seniors in assisted living?</h3>
                <p className="mt-1 text-gray-700">Medicare covers doctor visits, prescriptions, hospital care, skilled nursing facility stays (up to 100 days after a qualifying hospital stay), and home health services — regardless of where a senior lives.</p>
              </div>
              <div>
                <h3 className="font-bold text-gray-900">What is the best way to pay for assisted living?</h3>
                <p className="mt-1 text-gray-700">Most families use a combination of personal savings, Social Security income, pension benefits, proceeds from selling a home, long-term care insurance, and veterans benefits.</p>
              </div>
              <div>
                <h3 className="font-bold text-gray-900">How much does assisted living cost per month?</h3>
                <p className="mt-1 text-gray-700">The national median is approximately $4,500 to $5,000 per month as of 2026. Costs vary significantly by state, city, and level of care needed.</p>
              </div>
            </div>
          </section>

          {/* Related Articles */}
          <section>
            <h2 className="text-2xl font-bold text-navy">Related Resources</h2>
            <ul className="mt-4 space-y-3">
              <li>
                <Link href="/resources/assisted-living-cost" className="font-medium text-accent hover:underline">
                  How Much Does Assisted Living Cost Per Month in 2026?
                </Link>
              </li>
              <li>
                <Link href="/resources/assisted-living-vs-memory-care" className="font-medium text-accent hover:underline">
                  Assisted Living vs. Memory Care: What's the Difference?
                </Link>
              </li>
              <li>
                <Link href="/resources/signs-its-time-for-assisted-living" className="font-medium text-accent hover:underline">
                  Signs It's Time for Assisted Living: A Family Guide
                </Link>
              </li>
              <li>
                <Link href="/resources/how-to-read-inspection-report" className="font-medium text-accent hover:underline">
                  How to Read an Assisted Living Inspection Report
                </Link>
              </li>
            </ul>
          </section>

          {/* CTA */}
          <div className="rounded-xl bg-navy p-6 text-center text-white">
            <p className="text-lg font-semibold">Researching facilities in your area?</p>
            <p className="mt-1 text-blue-200 text-sm">Search free inspection reports for assisted living facilities across all 50 states.</p>
            <Link
              href="/"
              className="mt-4 inline-block rounded-lg bg-accent px-6 py-3 font-semibold text-white transition-opacity hover:opacity-90"
            >
              Search Facilities
            </Link>
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
}
