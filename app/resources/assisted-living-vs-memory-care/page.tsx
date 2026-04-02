import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.thecareaudit.com';
const SLUG = 'assisted-living-vs-memory-care';

export const metadata: Metadata = {
  title: 'Assisted Living vs. Memory Care: What\'s the Difference?',
  description:
    'Assisted living provides help with daily activities for seniors who are largely independent. Memory care is a specialized, secured environment for people with Alzheimer\'s or dementia.',
  alternates: { canonical: `${SITE_URL}/resources/${SLUG}` },
  openGraph: {
    title: 'Assisted Living vs. Memory Care: What\'s the Difference?',
    description:
      'Assisted living provides help with daily activities for seniors who are largely independent. Memory care is a specialized, secured environment for people with Alzheimer\'s or dementia.',
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
      name: 'What is the difference between assisted living and memory care?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Assisted living provides housing, meals, and help with daily activities (bathing, dressing, medication) for seniors who are largely independent but need some support. Memory care is a specialized, secured unit designed for people with Alzheimer\'s disease or other forms of dementia. Memory care communities have locked or secured doors, higher staff-to-resident ratios, specially trained staff, and programming designed for cognitive impairment.',
      },
    },
    {
      '@type': 'Question',
      name: 'Does memory care cost more than assisted living?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. Memory care typically costs $1,000 to $2,000 more per month than standard assisted living due to the higher staffing ratios, specialized training, and secured environment required. The national average for memory care is approximately $5,500 to $7,000 per month in 2026.',
      },
    },
    {
      '@type': 'Question',
      name: 'When should someone transition from assisted living to memory care?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Common signs that a transition to memory care may be needed include: frequent wandering or elopement attempts, inability to recognize familiar people or places, significant decline in ability to manage daily tasks safely, aggressive behavior that poses a safety risk, and repeated falls or safety incidents related to cognitive decline.',
      },
    },
    {
      '@type': 'Question',
      name: 'Can a person with dementia live in assisted living?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Early-stage dementia patients can often live in assisted living with appropriate support. As dementia progresses and safety, wandering, and behavioral management become concerns, memory care is typically the safer option. Many assisted living facilities have memory care units on-site, making the transition easier for families.',
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
      name: 'Assisted Living vs. Memory Care',
      item: `${SITE_URL}/resources/${SLUG}`,
    },
  ],
};

const articleSchema = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'Assisted Living vs. Memory Care: What\'s the Difference?',
  url: `${SITE_URL}/resources/${SLUG}`,
  publisher: { '@type': 'Organization', name: 'The Care Audit', url: SITE_URL },
  datePublished: '2026-04-02',
  dateModified: '2026-04-02',
};

export default function AssistedLivingVsMemoryCarePage() {
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
            <li className="text-gray-700">Assisted Living vs. Memory Care</li>
          </ol>
        </nav>

        <header className="mb-8">
          <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-accent">Care Type Comparison</p>
          <h1 className="text-3xl font-bold leading-tight text-navy sm:text-4xl" style={{ fontFamily: 'var(--font-heading)' }}>
            Assisted Living vs. Memory Care: What&apos;s the Difference?
          </h1>
          <p className="mt-3 text-sm text-gray-500">Updated April 2026 &middot; 7 min read</p>
        </header>

        {/* Direct Answer Box */}
        <div className="mb-8 rounded-xl border-l-4 border-accent bg-warm-100 p-5">
          <h2 className="mb-1 text-lg font-bold text-navy">Assisted Living vs. Memory Care: The Core Difference</h2>
          <p className="text-gray-800 leading-relaxed">
            <strong>Assisted living</strong> provides housing, meals, and help with daily tasks for seniors
            who are largely independent but need some support. <strong>Memory care</strong> is a specialized,
            secured environment specifically designed for people with Alzheimer&apos;s disease or other
            forms of dementia. Memory care costs more, has higher staffing ratios, and restricts movement
            to prevent wandering.
          </p>
        </div>

        <div className="prose prose-gray max-w-none space-y-8 text-gray-800 leading-relaxed">

          <section>
            <h2 className="text-2xl font-bold text-navy">Side-by-Side Comparison</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-navy text-white">
                    <th className="border border-gray-200 px-4 py-2 text-left">Feature</th>
                    <th className="border border-gray-200 px-4 py-2 text-left">Assisted Living</th>
                    <th className="border border-gray-200 px-4 py-2 text-left">Memory Care</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Primary residents', 'Seniors needing help with daily activities', 'Seniors with Alzheimer\'s or dementia'],
                    ['Environment', 'Open campus or building; residents move freely', 'Secured, locked unit to prevent wandering'],
                    ['Staff-to-resident ratio', 'Generally 1:6 to 1:8', 'Generally 1:4 to 1:6 (higher)'],
                    ['Staff training', 'General senior care', 'Specialized dementia and behavioral care'],
                    ['Activities programming', 'Social, fitness, recreational', 'Designed for cognitive stimulation'],
                    ['Avg monthly cost (2026)', '$3,000 – $6,000', '$5,500 – $9,000+'],
                    ['Medication management', 'Available (add-on)', 'Typically included'],
                    ['Safety features', 'Standard', 'Enhanced: door alarms, secured exits, cameras'],
                  ].map(([feature, al, mc], i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-warm-50'}>
                      <td className="border border-gray-200 px-4 py-2 font-medium">{feature}</td>
                      <td className="border border-gray-200 px-4 py-2">{al}</td>
                      <td className="border border-gray-200 px-4 py-2">{mc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-navy">What Is Assisted Living?</h2>
            <p>
              Assisted living is a residential option for seniors who need some help with daily
              activities but do not require the 24-hour skilled medical care of a nursing home.
              Residents typically live in private or semi-private apartments and receive help with
              activities of daily living (ADLs) such as:
            </p>
            <ul className="mt-3 space-y-2 pl-5 list-disc">
              <li>Bathing and personal hygiene</li>
              <li>Dressing and grooming</li>
              <li>Medication reminders and management</li>
              <li>Mobility and transfers</li>
              <li>Meal preparation and dining assistance</li>
            </ul>
            <p className="mt-4">
              Assisted living residents typically maintain significant independence. They can come and
              go, participate in community activities, receive visitors, and manage much of their own
              daily routine with modest support.
            </p>
            <p className="mt-4">
              Assisted living facilities are regulated and inspected by state health departments.
              Inspection records — including any violations and deficiencies — are public and available
              through The Care Audit for facilities in{' '}
              <Link href="/fl" className="text-accent hover:underline">Florida</Link>,{' '}
              <Link href="/tx" className="text-accent hover:underline">Texas</Link>,{' '}
              <Link href="/ca" className="text-accent hover:underline">California</Link>,{' '}
              and all 50 states.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-navy">What Is Memory Care?</h2>
            <p>
              Memory care is a specialized level of senior living designed specifically for people
              living with Alzheimer&apos;s disease, vascular dementia, Lewy body dementia, or other
              forms of cognitive impairment. Memory care communities are designed around safety,
              predictability, and specialized engagement.
            </p>
            <p className="mt-4">
              Key characteristics of memory care that set it apart from standard assisted living:
            </p>
            <ul className="mt-3 space-y-2 pl-5 list-disc">
              <li>
                <strong>Secured environment:</strong> Doors are locked and exits are alarmed or
                monitored to prevent residents from wandering into unsafe areas.
              </li>
              <li>
                <strong>Higher staffing ratios:</strong> More staff per resident, and all staff
                are trained in dementia care, behavioral management, and de-escalation techniques.
              </li>
              <li>
                <strong>Specialized programming:</strong> Activities are designed to stimulate
                cognitive function, reduce agitation, and create positive emotional experiences —
                even as memory declines.
              </li>
              <li>
                <strong>Simplified environment:</strong> Physical spaces are designed to be
                calming, familiar, and easy to navigate for residents with cognitive impairment.
              </li>
              <li>
                <strong>Family support:</strong> Most memory care communities offer family
                education, counseling referrals, and regular communication about resident care.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-navy">Which One Does Your Loved One Need?</h2>
            <p>
              The right choice depends on current cognitive and physical health, and where things
              are headed. Use this as a general guide:
            </p>
            <div className="mt-4 space-y-4">
              <div className="rounded-lg border border-warm-200 bg-white p-4">
                <p className="font-semibold text-navy">Consider Assisted Living if:</p>
                <ul className="mt-2 space-y-1 pl-5 list-disc text-sm text-gray-700">
                  <li>The person is independent but needs help with daily tasks</li>
                  <li>There are no significant safety concerns related to wandering</li>
                  <li>The person can generally recognize family members and familiar places</li>
                  <li>Mild cognitive impairment is present but not severe</li>
                </ul>
              </div>
              <div className="rounded-lg border border-warm-200 bg-white p-4">
                <p className="font-semibold text-navy">Consider Memory Care if:</p>
                <ul className="mt-2 space-y-1 pl-5 list-disc text-sm text-gray-700">
                  <li>There is a diagnosis of Alzheimer&apos;s or moderate-to-advanced dementia</li>
                  <li>Wandering, elopement, or getting lost is a concern</li>
                  <li>Significant behavioral changes have occurred (aggression, sundowning, agitation)</li>
                  <li>The person can no longer recognize family members or familiar surroundings</li>
                  <li>Safety cannot be adequately maintained in a standard assisted living environment</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-navy">Many Facilities Offer Both</h2>
            <p>
              A growing number of assisted living communities include a dedicated memory care wing
              or unit on the same campus. This can be a significant advantage for families: if a
              loved one&apos;s care needs increase over time, they can transition to a higher level
              of care without leaving the community or changing facilities entirely.
            </p>
            <p className="mt-4">
              When evaluating facilities, ask whether memory care is available on-site, and what the
              transition process looks like. Also ask about the facility&apos;s inspection record —
              including any violations related to resident safety, elopement, or staffing levels.
              The Care Audit has those records for{' '}
              <Link href="/az" className="text-accent hover:underline">Arizona</Link>,{' '}
              <Link href="/nc" className="text-accent hover:underline">North Carolina</Link>,{' '}
              <Link href="/pa" className="text-accent hover:underline">Pennsylvania</Link>,{' '}
              and every other state.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-navy">Cost Differences Between Assisted Living and Memory Care</h2>
            <p>
              Memory care costs more because it requires more — more staff, more training, more
              security, and more specialized programming. In 2026, the cost difference is typically:
            </p>
            <ul className="mt-3 space-y-2 pl-5 list-disc">
              <li><strong>Assisted living:</strong> National median of $4,500–$5,000/month</li>
              <li><strong>Memory care:</strong> National median of $5,500–$7,000+/month</li>
            </ul>
            <p className="mt-4">
              In high cost-of-living areas, memory care can exceed $9,000–$10,000/month. As with
              assisted living, neither Medicare nor most private health insurance covers memory care
              room and board costs.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-navy">How Inspection Records Can Help You Decide</h2>
            <p>
              State inspections of assisted living and memory care facilities document violations
              related to staffing, resident safety, care quality, medication management, and more.
              Before choosing any facility, reviewing its inspection history can reveal patterns
              that are not visible during a tour — recurring violations, substantiated complaints,
              and how quickly problems were corrected.
            </p>
            <p className="mt-4">
              Use The Care Audit to search inspection records in your state before making a final
              decision.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              {[
                { code: 'FL', name: 'Florida' },
                { code: 'TX', name: 'Texas' },
                { code: 'CA', name: 'California' },
                { code: 'NY', name: 'New York' },
                { code: 'IL', name: 'Illinois' },
                { code: 'PA', name: 'Pennsylvania' },
              ].map(({ code, name }) => (
                <Link
                  key={code}
                  href={`/${code.toLowerCase()}`}
                  className="rounded-full border border-accent px-3 py-1 text-sm text-accent hover:bg-accent hover:text-white transition-colors"
                >
                  {name}
                </Link>
              ))}
            </div>
          </section>

          <section className="rounded-xl bg-navy/5 p-6">
            <h2 className="mb-4 text-xl font-bold text-navy">Key Takeaways</h2>
            <ol className="space-y-2 pl-5 list-decimal text-gray-800">
              <li>Assisted living is for seniors who need help with daily activities but are largely independent.</li>
              <li>Memory care is a specialized, secured environment for people with Alzheimer&apos;s or dementia.</li>
              <li>Memory care costs $1,000–$2,000+ more per month than standard assisted living.</li>
              <li>Many facilities offer both, allowing residents to transition without changing communities.</li>
              <li>Review inspection records for any facility you are considering — quality and safety vary widely.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-navy">Frequently Asked Questions</h2>
            <div className="mt-6 space-y-6">
              <div>
                <h3 className="font-bold text-gray-900">What is the difference between assisted living and memory care?</h3>
                <p className="mt-1 text-gray-700">Assisted living provides daily care support for largely independent seniors. Memory care is a specialized, secured environment for people with Alzheimer&apos;s or dementia, with higher staffing ratios and specialized programming.</p>
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Does memory care cost more than assisted living?</h3>
                <p className="mt-1 text-gray-700">Yes. Memory care typically costs $1,000–$2,000+ more per month due to higher staffing, specialized training, and secured environment. The national average is $5,500–$7,000/month in 2026.</p>
              </div>
              <div>
                <h3 className="font-bold text-gray-900">When should someone transition from assisted living to memory care?</h3>
                <p className="mt-1 text-gray-700">When wandering becomes a safety concern, behavioral issues emerge, the person can no longer recognize family members, or care needs exceed what a standard assisted living facility can safely provide.</p>
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Can a person with dementia live in assisted living?</h3>
                <p className="mt-1 text-gray-700">In early stages, yes. As dementia progresses and safety concerns grow, memory care becomes the safer choice. Many facilities offer both levels of care on-site.</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-navy">Related Resources</h2>
            <ul className="mt-4 space-y-3">
              <li><Link href="/resources/medicare-assisted-living" className="font-medium text-accent hover:underline">Does Medicare Cover Assisted Living?</Link></li>
              <li><Link href="/resources/assisted-living-cost" className="font-medium text-accent hover:underline">How Much Does Assisted Living Cost Per Month in 2026?</Link></li>
              <li><Link href="/resources/signs-its-time-for-assisted-living" className="font-medium text-accent hover:underline">Signs It&apos;s Time for Assisted Living: A Family Guide</Link></li>
              <li><Link href="/resources/how-to-read-inspection-report" className="font-medium text-accent hover:underline">How to Read an Assisted Living Inspection Report</Link></li>
            </ul>
          </section>

          <div className="rounded-xl bg-navy p-6 text-center text-white">
            <p className="text-lg font-semibold">Search facility inspection records in your state</p>
            <p className="mt-1 text-blue-200 text-sm">44,000+ facilities across all 50 states. Free, always.</p>
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
