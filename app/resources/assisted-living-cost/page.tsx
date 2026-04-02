import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.thecareaudit.com';
const SLUG = 'assisted-living-cost';

export const metadata: Metadata = {
  title: 'How Much Does Assisted Living Cost Per Month in 2026?',
  description:
    'The national median cost of assisted living is $4,500–$5,000/month in 2026. Learn what drives costs, how costs vary by state, and how families pay for it.',
  alternates: { canonical: `${SITE_URL}/resources/${SLUG}` },
  openGraph: {
    title: 'How Much Does Assisted Living Cost Per Month in 2026?',
    description:
      'The national median cost of assisted living is $4,500–$5,000/month in 2026. Learn what drives costs, how costs vary by state, and how families pay for it.',
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
      name: 'How much does assisted living cost per month?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'The national median cost of assisted living is approximately $4,500 to $5,000 per month in 2026. Costs vary significantly by state, city, and the level of care needed. The most expensive states (California, New York, Massachusetts) can average over $6,000–$7,000 per month. Less expensive states in the South and Midwest may average $3,000–$4,000 per month.',
      },
    },
    {
      '@type': 'Question',
      name: 'What is included in assisted living costs?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Basic assisted living fees typically include a private or semi-private room, three meals per day, housekeeping and laundry, transportation to appointments, social activities and programming, and 24-hour staff availability. Additional charges are common for higher levels of personal care assistance, medication management, and specialized services like memory care.',
      },
    },
    {
      '@type': 'Question',
      name: 'What is the most expensive state for assisted living?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Hawaii, Massachusetts, and Washington DC are typically among the most expensive states for assisted living, with median monthly costs exceeding $7,000. Alaska and California also rank among the most costly. Southern and Midwestern states tend to have lower average costs.',
      },
    },
    {
      '@type': 'Question',
      name: 'Does Medicare pay for assisted living costs?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'No. Medicare does not cover the cost of assisted living. Medicare covers health care services like doctor visits, hospital stays, and skilled nursing care — not housing, meals, or personal care assistance in an assisted living setting.',
      },
    },
    {
      '@type': 'Question',
      name: 'How can I reduce assisted living costs?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Strategies to reduce costs include: choosing a semi-private room instead of private, selecting a facility with a tiered care model where you only pay for the care level needed, using veterans benefits (Aid and Attendance) if eligible, applying for Medicaid HCBS waivers if income-eligible, and comparing multiple facilities in different zip codes or neighborhoods.',
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
      name: 'Assisted Living Cost 2026',
      item: `${SITE_URL}/resources/${SLUG}`,
    },
  ],
};

const articleSchema = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'How Much Does Assisted Living Cost Per Month in 2026?',
  description:
    'The national median cost of assisted living is $4,500–$5,000/month in 2026. Learn what drives costs, how costs vary by state, and how families pay for it.',
  url: `${SITE_URL}/resources/${SLUG}`,
  publisher: {
    '@type': 'Organization',
    name: 'The Care Audit',
    url: SITE_URL,
  },
  datePublished: '2026-04-02',
  dateModified: '2026-04-02',
};

export default function AssistedLivingCostPage() {
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
            <li className="text-gray-700">Assisted Living Cost</li>
          </ol>
        </nav>

        <header className="mb-8">
          <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-accent">Financial Guide</p>
          <h1 className="text-3xl font-bold leading-tight text-navy sm:text-4xl" style={{ fontFamily: 'var(--font-heading)' }}>
            How Much Does Assisted Living Cost Per Month in 2026?
          </h1>
          <p className="mt-3 text-sm text-gray-500">Updated April 2026 &middot; 7 min read</p>
        </header>

        {/* Direct Answer Box */}
        <div className="mb-8 rounded-xl border-l-4 border-accent bg-warm-100 p-5">
          <h2 className="mb-1 text-lg font-bold text-navy">How Much Does Assisted Living Cost Per Month?</h2>
          <p className="text-gray-800 leading-relaxed">
            The national median cost of assisted living is approximately{' '}
            <strong>$4,500 to $5,000 per month</strong> as of 2026. Costs vary significantly
            by state, city, and level of care. The most expensive states average over $6,000–$7,000
            per month. Affordable states average $3,000–$4,000 per month.
          </p>
        </div>

        <div className="prose prose-gray max-w-none space-y-8 text-gray-800 leading-relaxed">

          <section>
            <h2 className="text-2xl font-bold text-navy">Assisted Living Costs by Region (2026)</h2>
            <p>
              Costs vary more by geography than almost any other factor. Here is a general breakdown
              of average monthly costs by region:
            </p>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-navy text-white">
                    <th className="border border-gray-200 px-4 py-2 text-left">Region</th>
                    <th className="border border-gray-200 px-4 py-2 text-left">Avg Monthly Cost</th>
                    <th className="border border-gray-200 px-4 py-2 text-left">Examples</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="bg-white">
                    <td className="border border-gray-200 px-4 py-2 font-medium">Northeast</td>
                    <td className="border border-gray-200 px-4 py-2">$5,500 – $7,500+</td>
                    <td className="border border-gray-200 px-4 py-2">
                      <Link href="/ma" className="text-accent hover:underline">Massachusetts</Link>,{' '}
                      <Link href="/ny" className="text-accent hover:underline">New York</Link>,{' '}
                      <Link href="/ct" className="text-accent hover:underline">Connecticut</Link>
                    </td>
                  </tr>
                  <tr className="bg-warm-50">
                    <td className="border border-gray-200 px-4 py-2 font-medium">West Coast</td>
                    <td className="border border-gray-200 px-4 py-2">$5,000 – $7,000+</td>
                    <td className="border border-gray-200 px-4 py-2">
                      <Link href="/ca" className="text-accent hover:underline">California</Link>,{' '}
                      <Link href="/wa" className="text-accent hover:underline">Washington</Link>,{' '}
                      <Link href="/or" className="text-accent hover:underline">Oregon</Link>
                    </td>
                  </tr>
                  <tr className="bg-white">
                    <td className="border border-gray-200 px-4 py-2 font-medium">Midwest</td>
                    <td className="border border-gray-200 px-4 py-2">$3,500 – $5,000</td>
                    <td className="border border-gray-200 px-4 py-2">
                      <Link href="/il" className="text-accent hover:underline">Illinois</Link>,{' '}
                      <Link href="/oh" className="text-accent hover:underline">Ohio</Link>,{' '}
                      <Link href="/mi" className="text-accent hover:underline">Michigan</Link>
                    </td>
                  </tr>
                  <tr className="bg-warm-50">
                    <td className="border border-gray-200 px-4 py-2 font-medium">South</td>
                    <td className="border border-gray-200 px-4 py-2">$3,000 – $4,500</td>
                    <td className="border border-gray-200 px-4 py-2">
                      <Link href="/tx" className="text-accent hover:underline">Texas</Link>,{' '}
                      <Link href="/fl" className="text-accent hover:underline">Florida</Link>,{' '}
                      <Link href="/ga" className="text-accent hover:underline">Georgia</Link>
                    </td>
                  </tr>
                  <tr className="bg-white">
                    <td className="border border-gray-200 px-4 py-2 font-medium">Mountain/Great Plains</td>
                    <td className="border border-gray-200 px-4 py-2">$3,500 – $5,000</td>
                    <td className="border border-gray-200 px-4 py-2">
                      <Link href="/co" className="text-accent hover:underline">Colorado</Link>,{' '}
                      <Link href="/az" className="text-accent hover:underline">Arizona</Link>,{' '}
                      <Link href="/nm" className="text-accent hover:underline">New Mexico</Link>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-sm text-gray-500">
              Note: These are general ranges. Costs within a single state can vary by $1,000–$2,000
              per month depending on the city and facility.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-navy">What Is Included in the Monthly Fee?</h2>
            <p>
              Most assisted living facilities charge a base rate that includes:
            </p>
            <ul className="mt-3 space-y-2 pl-5 list-disc">
              <li>A private or semi-private room with utilities</li>
              <li>Three meals per day plus snacks</li>
              <li>Housekeeping and laundry services</li>
              <li>Scheduled transportation to medical appointments and errands</li>
              <li>Social activities, programming, and fitness classes</li>
              <li>24-hour staff availability and emergency call systems</li>
              <li>Basic safety monitoring</li>
            </ul>
            <p className="mt-4">
              What is <em>not</em> included in the base rate — and can add significantly to monthly
              costs — includes:
            </p>
            <ul className="mt-3 space-y-2 pl-5 list-disc">
              <li><strong>Higher levels of personal care:</strong> Help with bathing, dressing, grooming, and toileting is often tiered and billed separately based on the number of assists needed per day.</li>
              <li><strong>Medication management:</strong> Having staff administer or manage medications often incurs an additional monthly fee ($100–$500+).</li>
              <li><strong>Memory care:</strong> Specialized secured units for residents with Alzheimer&apos;s or dementia typically add $1,000–$2,000 per month to the base rate.</li>
              <li><strong>Incontinence supplies:</strong> Products and assistance with incontinence care are frequently billed separately.</li>
              <li><strong>Beauty and personal care services:</strong> Haircuts, manicures, and salon services are typically add-ons.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-navy">What Drives the Price of Assisted Living?</h2>
            <p>
              The monthly cost of assisted living is influenced by several key factors:
            </p>
            <ol className="mt-3 space-y-3 pl-5 list-decimal">
              <li>
                <strong>Location:</strong> Urban facilities in high cost-of-living cities charge more
                than rural or suburban facilities. A facility in San Francisco or New York City will
                cost significantly more than one in rural Georgia or Iowa.
              </li>
              <li>
                <strong>Room type:</strong> Private rooms cost more than semi-private. Some facilities
                offer studio, one-bedroom, and two-bedroom configurations at different price points.
              </li>
              <li>
                <strong>Level of care:</strong> The more assistance a resident needs with daily
                activities, the higher the monthly cost. Most facilities use a tiered or point-based
                system to assess and price care needs.
              </li>
              <li>
                <strong>Amenities:</strong> Facilities with upscale amenities — restaurant-style dining,
                swimming pools, movie theaters, concierge services — charge premium rates.
              </li>
              <li>
                <strong>Ownership type:</strong> For-profit corporate chains, non-profit facilities,
                and independent locally-owned facilities often have different pricing structures and
                philosophies.
              </li>
            </ol>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-navy">How to Compare Costs When Evaluating Facilities</h2>
            <p>
              When comparing facilities, asking for the base monthly rate is only the starting point.
              Ask for the full pricing schedule including:
            </p>
            <ul className="mt-3 space-y-2 pl-5 list-disc">
              <li>The care level assessment process and how care tiers are priced</li>
              <li>What services trigger additional fees</li>
              <li>Whether rates are locked in or subject to annual increases</li>
              <li>What happens to pricing if care needs increase over time</li>
              <li>Move-in fees, community fees, or deposits</li>
            </ul>
            <p className="mt-4">
              Beyond pricing, review each facility&apos;s inspection history. State health departments
              conduct regular unannounced inspections of assisted living facilities. Those records
              are public, and The Care Audit has them in plain English for{' '}
              <Link href="/fl" className="text-accent hover:underline">Florida</Link>,{' '}
              <Link href="/tx" className="text-accent hover:underline">Texas</Link>,{' '}
              <Link href="/ca" className="text-accent hover:underline">California</Link>,{' '}
              and all 50 states.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-navy">How Families Pay for Assisted Living</h2>
            <p>
              Because Medicare does not cover assisted living, families must plan ahead. The most
              common funding sources include:
            </p>
            <ol className="mt-3 space-y-3 pl-5 list-decimal">
              <li>
                <strong>Personal savings and investments:</strong> The most common funding source.
                Families draw from retirement accounts, brokerage accounts, and cash savings.
              </li>
              <li>
                <strong>Selling the family home:</strong> Home equity is often the largest asset
                families can use. Proceeds from selling a home can fund several years of assisted
                living, depending on cost.
              </li>
              <li>
                <strong>Social Security and pension income:</strong> Monthly income from Social
                Security, pensions, and retirement accounts offsets a portion of monthly costs.
              </li>
              <li>
                <strong>Long-term care insurance:</strong> Policies purchased before retirement can
                provide a daily or monthly benefit to help cover assisted living costs. Benefit
                amounts and terms vary widely by policy.
              </li>
              <li>
                <strong>Veterans benefits:</strong> The VA&apos;s Aid and Attendance benefit provides
                monthly payments to eligible veterans and surviving spouses to help pay for assisted
                living. A single veteran can receive up to ~$2,300/month; a married veteran up to
                ~$2,700/month in 2026.
              </li>
              <li>
                <strong>Medicaid HCBS waivers:</strong> Some states offer Medicaid-funded Home and
                Community Based Services waivers that cover personal care services in an assisted
                living setting. Medicaid does not cover room and board.
              </li>
            </ol>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-navy">Assisted Living vs. Other Senior Care Options: A Cost Comparison</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-navy text-white">
                    <th className="border border-gray-200 px-4 py-2 text-left">Care Type</th>
                    <th className="border border-gray-200 px-4 py-2 text-left">Est. Monthly Cost</th>
                    <th className="border border-gray-200 px-4 py-2 text-left">Best For</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="bg-white">
                    <td className="border border-gray-200 px-4 py-2 font-medium">Independent Living</td>
                    <td className="border border-gray-200 px-4 py-2">$2,000 – $4,000</td>
                    <td className="border border-gray-200 px-4 py-2">Active seniors, no daily care needed</td>
                  </tr>
                  <tr className="bg-warm-50">
                    <td className="border border-gray-200 px-4 py-2 font-medium">Assisted Living</td>
                    <td className="border border-gray-200 px-4 py-2">$3,000 – $7,000+</td>
                    <td className="border border-gray-200 px-4 py-2">Seniors needing help with daily activities</td>
                  </tr>
                  <tr className="bg-white">
                    <td className="border border-gray-200 px-4 py-2 font-medium">Memory Care</td>
                    <td className="border border-gray-200 px-4 py-2">$4,500 – $9,000+</td>
                    <td className="border border-gray-200 px-4 py-2">Seniors with Alzheimer&apos;s or dementia</td>
                  </tr>
                  <tr className="bg-warm-50">
                    <td className="border border-gray-200 px-4 py-2 font-medium">Skilled Nursing Facility</td>
                    <td className="border border-gray-200 px-4 py-2">$7,000 – $10,000+</td>
                    <td className="border border-gray-200 px-4 py-2">Seniors needing 24-hour skilled nursing</td>
                  </tr>
                  <tr className="bg-white">
                    <td className="border border-gray-200 px-4 py-2 font-medium">In-Home Care (40 hrs/week)</td>
                    <td className="border border-gray-200 px-4 py-2">$4,000 – $7,000</td>
                    <td className="border border-gray-200 px-4 py-2">Seniors who prefer to stay home</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-xl bg-navy/5 p-6">
            <h2 className="mb-4 text-xl font-bold text-navy">Key Takeaways</h2>
            <ol className="space-y-2 pl-5 list-decimal text-gray-800">
              <li>The national median cost of assisted living is $4,500–$5,000 per month as of 2026.</li>
              <li>Costs vary significantly by state, city, room type, and level of care needed.</li>
              <li>Base rates often do not include medication management, high-level personal care, or memory care.</li>
              <li>Medicare does not cover assisted living costs. Most families pay with savings, home equity, and income.</li>
              <li>Review inspection records before choosing a facility — quality varies, and The Care Audit makes those records easy to find.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-navy">Frequently Asked Questions</h2>
            <div className="mt-6 space-y-6">
              <div>
                <h3 className="font-bold text-gray-900">How much does assisted living cost per month?</h3>
                <p className="mt-1 text-gray-700">The national median is $4,500–$5,000/month in 2026. Costs range from under $3,000 to over $7,000 depending on state, city, and care level.</p>
              </div>
              <div>
                <h3 className="font-bold text-gray-900">What is included in assisted living costs?</h3>
                <p className="mt-1 text-gray-700">Base rates typically include room, meals, housekeeping, transportation, activities, and 24-hour staff. Higher care levels, medication management, and memory care are usually additional.</p>
              </div>
              <div>
                <h3 className="font-bold text-gray-900">What is the most expensive state for assisted living?</h3>
                <p className="mt-1 text-gray-700">Hawaii, Massachusetts, and Washington DC are typically the most expensive, with median monthly costs over $7,000.</p>
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Does Medicare pay for assisted living?</h3>
                <p className="mt-1 text-gray-700">No. Medicare covers health care services, not the room, board, or personal care costs of assisted living.</p>
              </div>
              <div>
                <h3 className="font-bold text-gray-900">How can I reduce assisted living costs?</h3>
                <p className="mt-1 text-gray-700">Choose a semi-private room, compare facilities in different neighborhoods, use a tiered care model, and explore veterans benefits, long-term care insurance, and Medicaid waivers.</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-navy">Related Resources</h2>
            <ul className="mt-4 space-y-3">
              <li>
                <Link href="/resources/medicare-assisted-living" className="font-medium text-accent hover:underline">
                  Does Medicare Cover Assisted Living? (The Real Answer)
                </Link>
              </li>
              <li>
                <Link href="/resources/assisted-living-vs-memory-care" className="font-medium text-accent hover:underline">
                  Assisted Living vs. Memory Care: What&apos;s the Difference?
                </Link>
              </li>
              <li>
                <Link href="/resources/signs-its-time-for-assisted-living" className="font-medium text-accent hover:underline">
                  Signs It&apos;s Time for Assisted Living: A Family Guide
                </Link>
              </li>
              <li>
                <Link href="/resources/how-to-read-inspection-report" className="font-medium text-accent hover:underline">
                  How to Read an Assisted Living Inspection Report
                </Link>
              </li>
            </ul>
          </section>

          <div className="rounded-xl bg-navy p-6 text-center text-white">
            <p className="text-lg font-semibold">Compare facilities in your area</p>
            <p className="mt-1 text-blue-200 text-sm">Free inspection records for 44,000+ facilities across all 50 states.</p>
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
