import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.thecareaudit.com';
const SLUG = 'signs-its-time-for-assisted-living';

export const metadata: Metadata = {
  title: "Signs It's Time for Assisted Living: A Family Guide",
  description:
    "Recognizing the signs that a loved one needs assisted living can be difficult. Learn the key warning signs — from safety concerns to daily care struggles — that signal it may be time.",
  alternates: { canonical: `${SITE_URL}/resources/${SLUG}` },
  openGraph: {
    title: "Signs It's Time for Assisted Living: A Family Guide",
    description:
      "Recognizing the signs that a loved one needs assisted living can be difficult. Learn the key warning signs that signal it may be time.",
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
      name: "What are the signs it's time for assisted living?",
      acceptedAnswer: {
        '@type': 'Answer',
        text: "Key signs that assisted living may be needed include: frequent falls or near-falls, inability to manage medications safely, neglected personal hygiene, unexplained weight loss or poor nutrition, social isolation and withdrawal, cognitive decline affecting daily safety, caregiver burnout in family members, and the home becoming unsafe or unmanageable.",
      },
    },
    {
      '@type': 'Question',
      name: 'How do I convince a parent to move to assisted living?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: "Start by having honest, compassionate conversations early — before a crisis forces the decision. Focus on specific safety concerns rather than abstract independence arguments. Involve the person in touring facilities. Frame it as getting more support, not losing independence. Consider involving a doctor, elder care manager, or social worker as a neutral third party.",
      },
    },
    {
      '@type': 'Question',
      name: 'When is it unsafe for a senior to live alone?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: "A senior may be unsafe living alone when they have had multiple falls, leave the stove on or forget to turn off water, get lost in familiar places, cannot manage medications, have significant unaddressed medical needs, or show signs of self-neglect such as poor hygiene, weight loss, or an unkempt home.",
      },
    },
    {
      '@type': 'Question',
      name: "What if a parent refuses to go to assisted living?",
      acceptedAnswer: {
        '@type': 'Answer',
        text: "If a parent has cognitive capacity and refuses, families cannot force the move. Options include: continuing the conversation over time, addressing specific concerns (loss of pet, leaving home), arranging in-home care as a bridge, having the doctor address concerns directly, connecting with a geriatric care manager, and in cases of cognitive impairment, exploring legal options such as guardianship if safety is at serious risk.",
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
    { '@type': 'ListItem', position: 3, name: "Signs It's Time for Assisted Living", item: `${SITE_URL}/resources/${SLUG}` },
  ],
};

const articleSchema = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: "Signs It's Time for Assisted Living: A Family Guide",
  url: `${SITE_URL}/resources/${SLUG}`,
  publisher: { '@type': 'Organization', name: 'The Care Audit', url: SITE_URL },
  datePublished: '2026-04-02',
  dateModified: '2026-04-02',
};

export default function SignsItsTimePage() {
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
            <li className="text-gray-700">Signs It&apos;s Time for Assisted Living</li>
          </ol>
        </nav>

        <header className="mb-8">
          <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-accent">Family Guide</p>
          <h1 className="text-3xl font-bold leading-tight text-navy sm:text-4xl" style={{ fontFamily: 'var(--font-heading)' }}>
            Signs It&apos;s Time for Assisted Living: A Family Guide
          </h1>
          <p className="mt-3 text-sm text-gray-500">Updated April 2026 &middot; 8 min read</p>
        </header>

        {/* Direct Answer Box */}
        <div className="mb-8 rounded-xl border-l-4 border-accent bg-warm-100 p-5">
          <h2 className="mb-1 text-lg font-bold text-navy">Signs It&apos;s Time for Assisted Living</h2>
          <p className="text-gray-800 leading-relaxed">
            It may be time to consider assisted living when a loved one experiences <strong>frequent
            falls, unsafe medication management, significant weight loss, social isolation, cognitive
            decline affecting safety</strong>, or when a family caregiver is no longer able to safely
            meet their needs. Most families wait too long — recognizing the signs early leads to
            better outcomes.
          </p>
        </div>

        <div className="prose prose-gray max-w-none space-y-8 text-gray-800 leading-relaxed">

          <section>
            <h2 className="text-2xl font-bold text-navy">Why This Decision Is So Hard</h2>
            <p>
              For most families, the decision to transition a loved one to assisted living is one of
              the most emotionally difficult they will face. It carries layers of guilt, grief,
              practical logistics, and disagreement among family members. And the person who needs
              the most care is often the most resistant to accepting it.
            </p>
            <p className="mt-4">
              What makes the decision even harder: there is rarely a single obvious moment. Instead,
              there is a slow accumulation of warning signs — each one manageable in isolation, but
              together forming a clear picture that the current situation is no longer safe or
              sustainable.
            </p>
            <p className="mt-4">
              This guide is designed to help families recognize those signs clearly, without judgment.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-navy">10 Signs It May Be Time for Assisted Living</h2>

            <div className="mt-4 space-y-5">
              <div className="rounded-lg border border-warm-200 bg-white p-5">
                <h3 className="font-bold text-navy">1. Frequent Falls or Near-Falls</h3>
                <p className="mt-1 text-gray-700">
                  Falls are the leading cause of injury-related death among seniors. A single
                  serious fall can lead to hospitalization, surgery, and a permanent loss of
                  independence. If a loved one has fallen more than once in the past year — or
                  if you find unexplained bruises — that is a serious warning sign. Assisted
                  living communities are designed with fall prevention in mind: grab bars, no-slip
                  flooring, emergency call systems, and staff who are available around the clock.
                </p>
              </div>

              <div className="rounded-lg border border-warm-200 bg-white p-5">
                <h3 className="font-bold text-navy">2. Unsafe Medication Management</h3>
                <p className="mt-1 text-gray-700">
                  Missing doses, doubling up on medications, or taking the wrong medication entirely
                  can have serious and even life-threatening consequences. If a loved one is
                  managing multiple prescriptions and struggling to keep track, assisted living
                  staff can handle medication management safely.
                </p>
              </div>

              <div className="rounded-lg border border-warm-200 bg-white p-5">
                <h3 className="font-bold text-navy">3. Unexplained Weight Loss or Poor Nutrition</h3>
                <p className="mt-1 text-gray-700">
                  Significant unexplained weight loss — especially more than 10 pounds over a
                  few months — suggests a senior is not eating properly. This may be because
                  grocery shopping has become difficult, cooking is unsafe, they have lost
                  appetite due to depression, or they simply forget to eat. Assisted living
                  provides three meals a day plus snacks.
                </p>
              </div>

              <div className="rounded-lg border border-warm-200 bg-white p-5">
                <h3 className="font-bold text-navy">4. Neglected Personal Hygiene</h3>
                <p className="mt-1 text-gray-700">
                  If a previously clean and well-dressed parent now consistently has body odor,
                  unwashed hair, dirty clothes, or oral hygiene concerns, it may indicate they
                  are struggling to manage personal care tasks independently. This is often the
                  sign families notice first — and one of the most emotionally difficult to raise.
                </p>
              </div>

              <div className="rounded-lg border border-warm-200 bg-white p-5">
                <h3 className="font-bold text-navy">5. The Home Is Unsafe or Unmanageable</h3>
                <p className="mt-1 text-gray-700">
                  A home that was manageable at 60 can become a hazard at 80. Warning signs
                  include: piles of unopened mail, expired food in the refrigerator, utility
                  bills going unpaid, broken appliances that haven&apos;t been fixed, burnt pots
                  from leaving the stove unattended, or a home that has become cluttered with
                  fall hazards.
                </p>
              </div>

              <div className="rounded-lg border border-warm-200 bg-white p-5">
                <h3 className="font-bold text-navy">6. Increasing Social Isolation</h3>
                <p className="mt-1 text-gray-700">
                  Social isolation in older adults is strongly associated with depression,
                  cognitive decline, and physical health deterioration. If a previously social
                  person has stopped seeing friends, no longer pursues hobbies, and rarely
                  leaves home, it may be time to consider a community setting that provides
                  built-in social connection.
                </p>
              </div>

              <div className="rounded-lg border border-warm-200 bg-white p-5">
                <h3 className="font-bold text-navy">7. Cognitive Decline Affecting Safety</h3>
                <p className="mt-1 text-gray-700">
                  Getting lost while driving in familiar areas, leaving the stove on repeatedly,
                  confusing day and night, forgetting appointments or recent conversations —
                  these are signs of cognitive decline that can quickly become safety emergencies.
                  If dementia or significant cognitive impairment has been diagnosed, memory care
                  may be more appropriate than standard assisted living.
                </p>
              </div>

              <div className="rounded-lg border border-warm-200 bg-white p-5">
                <h3 className="font-bold text-navy">8. Caregiver Burnout</h3>
                <p className="mt-1 text-gray-700">
                  If adult children or other family members are providing significant amounts of
                  daily care — and it is taking a toll on their health, relationships, or work —
                  that is a signal the situation may have exceeded what informal caregiving can
                  safely provide. Family caregiver burnout is real, and recognizing it is not
                  a sign of failure.
                </p>
              </div>

              <div className="rounded-lg border border-warm-200 bg-white p-5">
                <h3 className="font-bold text-navy">9. Recent Hospitalizations or Medical Events</h3>
                <p className="mt-1 text-gray-700">
                  A hospitalization — especially for a fall, a medication error, or a medical
                  crisis related to an unmanaged chronic condition — is often the inflection
                  point. Hospital discharge planners and social workers frequently recommend
                  assisted living for patients who are no longer safe at home.
                </p>
              </div>

              <div className="rounded-lg border border-warm-200 bg-white p-5">
                <h3 className="font-bold text-navy">10. The Senior Is Expressing Interest</h3>
                <p className="mt-1 text-gray-700">
                  Not every senior resists the idea. Some actively express interest in moving
                  somewhere with more support, less loneliness, or fewer home maintenance
                  responsibilities. When a loved one raises this themselves — even tentatively —
                  it is worth taking seriously and exploring together.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-navy">How to Start the Conversation</h2>
            <p>
              Most families dread the conversation. Here are practical approaches that tend to work:
            </p>
            <ol className="mt-3 space-y-3 pl-5 list-decimal">
              <li>
                <strong>Start early, before a crisis.</strong> Having this conversation when things
                are still manageable is much easier than after a fall or hospitalization forces
                the issue under pressure.
              </li>
              <li>
                <strong>Focus on specific concerns, not abstract loss.</strong> Instead of &quot;I&apos;m
                worried about you,&quot; say &quot;I noticed you fell last month and it scared me. I
                want us to think about what would make you safer.&quot;
              </li>
              <li>
                <strong>Involve their doctor.</strong> For many seniors, hearing the recommendation
                from their physician carries more weight than hearing it from family.
              </li>
              <li>
                <strong>Tour facilities together.</strong> Visiting in person often changes
                perceptions. Modern assisted living communities are very different from the
                nursing home images many seniors fear.
              </li>
              <li>
                <strong>Frame it as gaining support, not losing independence.</strong> Assisted
                living can mean more independence — a senior who is no longer safe driving
                has access to transportation; a senior who struggles with meals gets three
                good ones daily.
              </li>
            </ol>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-navy">How Inspection Records Help You Choose the Right Facility</h2>
            <p>
              Once you have recognized the signs and started the search, the next step is choosing
              a specific facility. Beyond the tour and marketing materials, state inspection records
              provide an objective view of how a facility actually operates.
            </p>
            <p className="mt-4">
              Every state inspects assisted living facilities on a regular basis. Inspection reports
              document violations, deficiencies, and complaints — and they are public record. The
              Care Audit aggregates and presents those records in plain English for{' '}
              <Link href="/texas" className="text-accent hover:underline">Texas</Link>,{' '}
              <Link href="/florida" className="text-accent hover:underline">Florida</Link>,{' '}
              <Link href="/california" className="text-accent hover:underline">California</Link>,{' '}
              <Link href="/new-york" className="text-accent hover:underline">New York</Link>,{' '}
              and every other state in the country.
            </p>
            <p className="mt-4">
              Before signing any contract, search the facility you are considering and review its
              inspection history. It takes five minutes and could save you from choosing a facility
              with a pattern of serious violations.
            </p>
          </section>

          <section className="rounded-xl bg-navy/5 p-6">
            <h2 className="mb-4 text-xl font-bold text-navy">Key Takeaways</h2>
            <ol className="space-y-2 pl-5 list-decimal text-gray-800">
              <li>The most common warning signs include falls, medication errors, weight loss, poor hygiene, and unsafe home conditions.</li>
              <li>Cognitive decline affecting safety — wandering, confusion, stove left on — is a particularly urgent sign.</li>
              <li>Caregiver burnout is a legitimate sign that the current care situation needs to change.</li>
              <li>Start the conversation early, focus on specific safety concerns, and involve the person&apos;s doctor.</li>
              <li>Review inspection records for any facility you consider — The Care Audit has them for all 50 states.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-navy">Frequently Asked Questions</h2>
            <div className="mt-6 space-y-6">
              <div>
                <h3 className="font-bold text-gray-900">What are the signs it&apos;s time for assisted living?</h3>
                <p className="mt-1 text-gray-700">Frequent falls, unsafe medication management, weight loss, neglected hygiene, cognitive decline affecting safety, social isolation, caregiver burnout, and an unmanageable home are the most common signs.</p>
              </div>
              <div>
                <h3 className="font-bold text-gray-900">How do I convince a parent to move to assisted living?</h3>
                <p className="mt-1 text-gray-700">Start early, focus on specific safety concerns, involve their doctor, tour facilities together, and frame the move as gaining support rather than losing independence.</p>
              </div>
              <div>
                <h3 className="font-bold text-gray-900">When is it unsafe for a senior to live alone?</h3>
                <p className="mt-1 text-gray-700">Multiple falls, medication mismanagement, getting lost in familiar places, significant cognitive decline, or inability to manage basic home safety are clear indicators it is no longer safe to live alone.</p>
              </div>
              <div>
                <h3 className="font-bold text-gray-900">What if a parent refuses to go to assisted living?</h3>
                <p className="mt-1 text-gray-700">If they have cognitive capacity, they have the right to refuse. Keep the conversation going over time, address specific concerns, try in-home care as a bridge, and consider involving a geriatric care manager or elder law attorney if safety is at serious risk.</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-navy">Related Resources</h2>
            <ul className="mt-4 space-y-3">
              <li><Link href="/resources/medicare-assisted-living" className="font-medium text-accent hover:underline">Does Medicare Cover Assisted Living?</Link></li>
              <li><Link href="/resources/assisted-living-cost" className="font-medium text-accent hover:underline">How Much Does Assisted Living Cost Per Month in 2026?</Link></li>
              <li><Link href="/resources/assisted-living-vs-memory-care" className="font-medium text-accent hover:underline">Assisted Living vs. Memory Care: What&apos;s the Difference?</Link></li>
              <li><Link href="/resources/how-to-read-inspection-report" className="font-medium text-accent hover:underline">How to Read an Assisted Living Inspection Report</Link></li>
            </ul>
          </section>

          <div className="rounded-xl bg-navy p-6 text-center text-white">
            <p className="text-lg font-semibold">Check inspection records before you decide</p>
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
