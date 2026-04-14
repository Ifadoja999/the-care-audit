import {
  resend
} from "../../../../../../chunk-6KQBLFPX.mjs";
import {
  logAutomation
} from "../../../../../../chunk-OQTFKTYY.mjs";
import {
  supabase
} from "../../../../../../chunk-7DCWVU2K.mjs";
import {
  logger,
  schedules_exports,
  task
} from "../../../../../../chunk-MMQGKQDQ.mjs";
import "../../../../../../chunk-U3REXNIV.mjs";
import {
  __name,
  init_esm
} from "../../../../../../chunk-6ULOIQV4.mjs";

// src/trigger/outreach-sequence.ts
init_esm();
var OUTREACH_FROM = "The Care Audit <info@thecareaudit.com>";
var OUTREACH_REPLY_TO = "info@thecareaudit.com";
var SEND_DELAY_MS = 1e3;
var COOLING_PERIOD_DAYS = 60;
function getDailyCap(daysSinceLaunch) {
  const envVal = process.env.OUTREACH_DAILY_CAP;
  if (envVal !== void 0 && envVal !== "") {
    const manual = parseInt(envVal, 10);
    if (!isNaN(manual) && manual >= 0) {
      return { cap: manual, source: `manual override (OUTREACH_DAILY_CAP=${manual})` };
    }
  }
  if (daysSinceLaunch <= 7) return { cap: 200, source: "auto warm-up Days 1-7" };
  if (daysSinceLaunch <= 14) return { cap: 500, source: "auto warm-up Days 8-14" };
  if (daysSinceLaunch <= 21) return { cap: 1e3, source: "auto warm-up Days 15-21" };
  return { cap: 2e3, source: "auto warm-up Days 22+" };
}
__name(getDailyCap, "getDailyCap");
var STATE_NAMES = {
  AL: "Alabama",
  AK: "Alaska",
  AZ: "Arizona",
  AR: "Arkansas",
  CA: "California",
  CO: "Colorado",
  CT: "Connecticut",
  DE: "Delaware",
  DC: "District of Columbia",
  FL: "Florida",
  GA: "Georgia",
  HI: "Hawaii",
  ID: "Idaho",
  IL: "Illinois",
  IN: "Indiana",
  IA: "Iowa",
  KS: "Kansas",
  KY: "Kentucky",
  LA: "Louisiana",
  ME: "Maine",
  MD: "Maryland",
  MA: "Massachusetts",
  MI: "Michigan",
  MN: "Minnesota",
  MS: "Mississippi",
  MO: "Missouri",
  MT: "Montana",
  NE: "Nebraska",
  NV: "Nevada",
  NH: "New Hampshire",
  NJ: "New Jersey",
  NM: "New Mexico",
  NY: "New York",
  NC: "North Carolina",
  ND: "North Dakota",
  OH: "Ohio",
  OK: "Oklahoma",
  OR: "Oregon",
  PA: "Pennsylvania",
  RI: "Rhode Island",
  SC: "South Carolina",
  SD: "South Dakota",
  TN: "Tennessee",
  TX: "Texas",
  UT: "Utah",
  VT: "Vermont",
  VA: "Virginia",
  WA: "Washington",
  WV: "West Virginia",
  WI: "Wisconsin",
  WY: "Wyoming"
};
var FACILITY_SELECT_FIELDS = "id, facility_name, city, state, total_violations, outreach_email, slug, outreach_sequence_step, outreach_last_sent, outreach_sequence_started, outreach_opt_out, outreach_email_bounced, is_sponsored, facility_status, outreach_cycle";
var outreachEmailSequence = schedules_exports.task({
  id: "outreach-email-sequence",
  // 10:00 AM Mountain Standard Time = 17:00 UTC
  cron: "0 17 * * *",
  run: /* @__PURE__ */ __name(async (payload) => {
    const startedAt = /* @__PURE__ */ new Date();
    const now = /* @__PURE__ */ new Date();
    const counts = {
      email1: 0,
      email2: 0,
      email3: 0,
      email4: 0,
      email5: 0,
      skipped: 0,
      failed: 0,
      cycleResets: 0
    };
    const { data: earliestRow } = await supabase.from("facilities").select("outreach_sequence_started").not("outreach_sequence_started", "is", null).order("outreach_sequence_started", { ascending: true }).limit(1).single();
    const launchDate = earliestRow?.outreach_sequence_started ? new Date(earliestRow.outreach_sequence_started) : now;
    const daysSinceLaunch = Math.max(
      1,
      Math.floor((now.getTime() - launchDate.getTime()) / (1e3 * 60 * 60 * 24)) + 1
    );
    const { cap: dailyCap, source: capSource } = getDailyCap(daysSinceLaunch);
    logger.info(`Outreach sequence run`, {
      timestamp: now.toISOString(),
      daysSinceLaunch,
      dailyCap,
      capSource
    });
    const coolingCutoff = new Date(now.getTime() - COOLING_PERIOD_DAYS * 24 * 60 * 60 * 1e3);
    const { data: coolingFacilities } = await supabase.from("facilities").select("id, outreach_cycle").eq("facility_status", "active").eq("outreach_sequence_step", 5).not("outreach_email", "is", null).or("outreach_opt_out.is.null,outreach_opt_out.eq.false").or("is_sponsored.is.null,is_sponsored.eq.false").or("outreach_email_bounced.is.null,outreach_email_bounced.eq.false").lte("outreach_last_sent", coolingCutoff.toISOString()).limit(5e4);
    if (coolingFacilities && coolingFacilities.length > 0) {
      for (const f of coolingFacilities) {
        await supabase.from("facilities").update({
          outreach_sequence_step: 0,
          outreach_cycle: (f.outreach_cycle ?? 1) + 1,
          outreach_last_sent: null,
          outreach_sequence_started: null
        }).eq("id", f.id);
        counts.cycleResets++;
      }
      logger.info(`Cooling period complete: reset ${counts.cycleResets} facilities back into sequence (cycle incremented)`);
    }
    const { data: followUpCandidates, error: followUpError } = await supabase.from("facilities").select(FACILITY_SELECT_FIELDS).eq("facility_status", "active").not("outreach_email", "is", null).or("outreach_opt_out.is.null,outreach_opt_out.eq.false").or("is_sponsored.is.null,is_sponsored.eq.false").or("outreach_email_bounced.is.null,outreach_email_bounced.eq.false").gte("outreach_sequence_step", 1).lte("outreach_sequence_step", 4).limit(5e4);
    if (followUpError) {
      logger.error("Follow-up query failed", { error: followUpError.message });
    }
    const followUps = (followUpCandidates ?? []).filter((f) => {
      const step = f.outreach_sequence_step;
      const daysSince = f.outreach_last_sent ? (now.getTime() - new Date(f.outreach_last_sent).getTime()) / (1e3 * 60 * 60 * 24) : Infinity;
      if (step === 1) return daysSince >= 3;
      if (step === 2) return daysSince >= 6;
      if (step === 3) return daysSince >= 8;
      if (step === 4) return daysSince >= 10;
      return false;
    });
    logger.info(`Follow-ups due today: ${followUps.length}`);
    for (const facility of followUps) {
      try {
        const result = await processSequenceStep(facility, now);
        if (result === "sent_2") counts.email2++;
        else if (result === "sent_3") counts.email3++;
        else if (result === "sent_4") counts.email4++;
        else if (result === "sent_5") counts.email5++;
        else if (result === "skipped") counts.skipped++;
        await new Promise((r) => setTimeout(r, SEND_DELAY_MS));
      } catch (err) {
        logger.error(`Follow-up failed: ${facility.facility_name}`, { error: err.message });
        counts.failed++;
      }
    }
    const followUpsSent = counts.email2 + counts.email3 + counts.email4 + counts.email5;
    const newEmailBudget = dailyCap;
    logger.info(`Follow-ups sent: ${followUpsSent} (uncapped). New Email 1 budget: ${newEmailBudget} (cap: ${dailyCap}, source: ${capSource})`);
    if (newEmailBudget > 0) {
      const { data: newCandidates, error: newError } = await supabase.from("facilities").select(FACILITY_SELECT_FIELDS).eq("facility_status", "active").not("outreach_email", "is", null).not("total_violations", "is", null).or("outreach_opt_out.is.null,outreach_opt_out.eq.false").or("is_sponsored.is.null,is_sponsored.eq.false").or("outreach_email_bounced.is.null,outreach_email_bounced.eq.false").or("outreach_sequence_step.is.null,outreach_sequence_step.eq.0").order("state", { ascending: true }).order("facility_name", { ascending: true }).limit(newEmailBudget);
      if (newError) {
        logger.error("New Email 1 query failed", { error: newError.message });
      }
      logger.info(`New Email 1 candidates fetched (within budget): ${newCandidates?.length ?? 0}`);
      for (const facility of newCandidates ?? []) {
        try {
          const result = await processSequenceStep(facility, now);
          if (result === "sent_1") counts.email1++;
          else if (result === "skipped") counts.skipped++;
          await new Promise((r) => setTimeout(r, SEND_DELAY_MS));
        } catch (err) {
          logger.error(`Email 1 failed: ${facility.facility_name}`, { error: err.message });
          counts.failed++;
        }
      }
    }
    const { count: remainingInQueue } = await supabase.from("facilities").select("id", { count: "exact", head: true }).eq("facility_status", "active").not("outreach_email", "is", null).not("total_violations", "is", null).or("outreach_opt_out.is.null,outreach_opt_out.eq.false").or("is_sponsored.is.null,is_sponsored.eq.false").or("outreach_email_bounced.is.null,outreach_email_bounced.eq.false").or("outreach_sequence_step.is.null,outreach_sequence_step.eq.0");
    const totalSentToday = counts.email1 + followUpsSent;
    const summary = {
      ...counts,
      followUpsSent,
      totalSentToday,
      dailyCap,
      capSource,
      daysSinceLaunch,
      remainingInQueue: remainingInQueue ?? 0
    };
    logger.info("Sequence complete", summary);
    await logAutomation({
      taskId: "outreach-sequence-daily",
      taskName: "outreach-email-sequence",
      status: "completed",
      result: summary,
      startedAt
    });
    return summary;
  }, "run")
});
var outreachSequenceLauncher = task({
  id: "outreach-sequence-launcher",
  run: /* @__PURE__ */ __name(async (payload) => {
    const startedAt = /* @__PURE__ */ new Date();
    const stateCode = payload.state.toUpperCase();
    logger.info(`Initializing outreach sequence for ${stateCode}`);
    const { count: eligibleCount } = await supabase.from("facilities").select("id", { count: "exact", head: true }).eq("state", stateCode).eq("facility_status", "active").not("outreach_email", "is", null).or("outreach_opt_out.is.null,outreach_opt_out.eq.false").or("is_sponsored.is.null,is_sponsored.eq.false");
    logger.info(`Found ${eligibleCount} eligible facilities in ${stateCode}`);
    const { error } = await supabase.from("facilities").update({
      outreach_sequence_step: 0,
      outreach_last_sent: null,
      outreach_sequence_started: null
    }).eq("state", stateCode).eq("facility_status", "active").not("outreach_email", "is", null).or("outreach_opt_out.is.null,outreach_opt_out.eq.false").or("is_sponsored.is.null,is_sponsored.eq.false");
    if (error) throw new Error(`Update failed: ${error.message}`);
    await logAutomation({
      taskId: `outreach-launcher-${stateCode}`,
      taskName: "outreach-sequence-launcher",
      stateCode,
      status: "completed",
      result: { initialized: eligibleCount, stateCode },
      startedAt
    });
    logger.info(`Initialized ${eligibleCount} facilities in ${stateCode} for outreach sequence`);
    return { stateCode, initialized: eligibleCount };
  }, "run")
});
async function processSequenceStep(facility, now) {
  const step = facility.outreach_sequence_step ?? 0;
  if (facility.outreach_opt_out === true) return "skipped";
  if (facility.is_sponsored === true) return "skipped";
  if (facility.outreach_email_bounced === true) return "skipped";
  if (facility.facility_status !== "active") return "skipped";
  const daysSinceLastSent = facility.outreach_last_sent ? (now.getTime() - new Date(facility.outreach_last_sent).getTime()) / (1e3 * 60 * 60 * 24) : Infinity;
  let emailNumber = null;
  if (step === 0) {
    emailNumber = 1;
  } else if (step === 1 && daysSinceLastSent >= 3) {
    emailNumber = 2;
  } else if (step === 2 && daysSinceLastSent >= 6) {
    emailNumber = 3;
  } else if (step === 3 && daysSinceLastSent >= 8) {
    emailNumber = 4;
  } else if (step === 4 && daysSinceLastSent >= 10) {
    emailNumber = 5;
  }
  if (emailNumber === null) return "skipped";
  const subject = buildSubject(emailNumber, facility);
  const html = buildEmail(emailNumber, facility);
  await resend.emails.send({
    from: OUTREACH_FROM,
    replyTo: OUTREACH_REPLY_TO,
    to: facility.outreach_email,
    subject,
    html
  });
  const update = {
    outreach_sequence_step: emailNumber,
    outreach_last_sent: now.toISOString()
  };
  if (emailNumber === 1) {
    update.outreach_sequence_started = now.toISOString();
    if (!facility.outreach_cycle) {
      update.outreach_cycle = 1;
    }
  }
  await supabase.from("facilities").update(update).eq("id", facility.id);
  logger.info(`Email ${emailNumber} sent to ${facility.facility_name} (${facility.state})`);
  return `sent_${emailNumber}`;
}
__name(processSequenceStep, "processSequenceStep");
function buildSubject(emailNumber, facility) {
  const name = facility.facility_name;
  const city = toTitleCase(facility.city);
  switch (emailNumber) {
    case 1:
      return `${name} is now listed on The Care Audit`;
    case 2:
      return `What families see when they look up ${name}`;
    case 3:
      return `A recommendation for ${name}`;
    case 4:
      return `Families in ${city} are comparing facilities right now`;
    case 5:
      return `Last note about your listing on The Care Audit`;
    default:
      return `Update from The Care Audit`;
  }
}
__name(buildSubject, "buildSubject");
function buildEmail(emailNumber, facility) {
  const vars = buildTemplateVars(facility);
  switch (emailNumber) {
    case 1:
      return email1(vars);
    case 2:
      return email2(vars);
    case 3:
      return email3(vars);
    case 4:
      return email4(vars);
    case 5:
      return email5(vars);
    default:
      return email1(vars);
  }
}
__name(buildEmail, "buildEmail");
function buildTemplateVars(facility) {
  const stateName = STATE_NAMES[facility.state] || facility.state;
  const slug = facility.slug;
  const base = "https://www.thecareaudit.com";
  return {
    facilityName: facility.facility_name,
    city: toTitleCase(facility.city),
    stateName,
    totalViolations: facility.total_violations,
    facilityUrl: `${base}/${slug}`,
    forFacilitiesUrl: `${base}/for-facilities?facility_id=${facility.id}`,
    optOutUrl: `${base}/api/outreach/opt-out?facility_id=${facility.id}`,
    violationText: getViolationText(facility.total_violations),
    isClean: facility.total_violations === null || facility.total_violations <= 3
  };
}
__name(buildTemplateVars, "buildTemplateVars");
function getViolationText(violations) {
  if (violations === null || violations === void 0) return "";
  if (violations === 0) return "No violations were found in your most recent inspection.";
  if (violations === 1) return "1 violation cited in your most recent inspection.";
  return `${violations} violations cited in your most recent inspection.`;
}
__name(getViolationText, "getViolationText");
function toTitleCase(str) {
  return str.toLowerCase().split(" ").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
}
__name(toTitleCase, "toTitleCase");
function wrap(body, optOutUrl) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  <style>
    @media only screen and (max-width: 620px) {
      .email-container { width: 100% !important; }
      .email-body { padding: 28px 20px !important; }
      .email-footer { padding: 20px !important; }
      .btn-cell { display: block !important; text-align: center !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;-webkit-text-size-adjust:100%;mso-line-height-rule:exactly;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table class="email-container" role="presentation" width="580" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">

          <!-- Body -->
          <tr>
            <td class="email-body" style="padding:40px;">
              ${body}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td class="email-footer" style="padding:24px 40px;background:#f9fafb;border-top:1px solid #e5e7eb;">
              <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
                You're receiving this because your facility is listed in public state licensing records.<br>
                <a href="${optOutUrl}" style="color:#9ca3af;text-decoration:underline;">Unsubscribe from future emails</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
__name(wrap, "wrap");
function p(text, style = "") {
  return `<p style="margin:0 0 16px;font-size:15px;line-height:1.75;color:#374151;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;${style}">${text}</p>`;
}
__name(p, "p");
function h2(text) {
  return `<h2 style="margin:0 0 20px;font-size:20px;font-weight:600;color:#111827;line-height:1.3;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">${text}</h2>`;
}
__name(h2, "h2");
function btn(label, url) {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:32px auto 0;">
      <tr>
        <td class="btn-cell" style="border-radius:8px;background:#2563EB;">
          <a href="${url}" style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;letter-spacing:0.01em;mso-padding-alt:0;">
            ${label}
          </a>
        </td>
      </tr>
    </table>`;
}
__name(btn, "btn");
function secondaryLink(label, url) {
  return `<p style="margin:16px 0 0;text-align:center;font-size:14px;color:#6b7280;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
    <a href="${url}" style="color:#2563EB;text-decoration:underline;">${label}</a>
  </p>`;
}
__name(secondaryLink, "secondaryLink");
function divider() {
  return `<hr style="border:none;border-top:1px solid #e5e7eb;margin:28px 0;" />`;
}
__name(divider, "divider");
function infoBlock(content) {
  return `<div style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:8px;padding:20px 24px;margin:0 0 16px;">
    ${content}
  </div>`;
}
__name(infoBlock, "infoBlock");
function email1(v) {
  const violationLine = v.violationText ? p(`<strong>Inspection data:</strong> ${v.violationText}`) : "";
  const body = `
    ${h2(`${v.facilityName} is now listed on The Care Audit`)}
    ${p("Hi,")}
    ${p(`I'm reaching out because <strong>${v.facilityName}</strong> in ${v.city}, ${v.stateName} is currently listed on The Care Audit, a free, public directory that helps families research assisted living facilities using official state inspection data.`)}
    ${p(`Every month, thousands of families across the country use our site to compare facilities, read inspection summaries in plain English, and make more informed decisions about care for their loved ones. Your facility's listing is live and being viewed by families in ${v.stateName} right now.`)}
    ${p("We built The Care Audit because we believe transparency helps everyone. Families deserve easy access to public inspection data, and quality facilities deserve to stand out.")}
    ${divider()}
    ${p("<strong>Here's what your current listing shows:</strong>")}
    ${p(`Your listing includes your facility name, address, and inspection data reported by the state of ${v.stateName}.`)}
    ${violationLine}
    ${divider()}
    ${p("<strong>You can enhance your listing.</strong>")}
    ${p("We offer facility owners the ability to upgrade their presence on The Care Audit. Whether that's getting featured at the top of search results, adding photos and a facility description, or posting an official response to inspection findings, there are options designed to help your facility stand out.")}
    ${p("Enhancements start at $49/month and take less than 5 minutes to set up.")}
    ${btn("See Your Options", v.forFacilitiesUrl)}
    <p style="margin:24px 0 0;font-size:15px;line-height:1.75;color:#374151;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">If you have questions, just reply to this email. I'm happy to help.</p>
    <p style="margin:16px 0 0;font-size:15px;line-height:1.75;color:#374151;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">Best,<br><strong>The Care Audit Team</strong></p>
  `;
  return wrap(body, v.optOutUrl);
}
__name(email1, "email1");
function email2(v) {
  const body = `
    ${h2(`What families see when they look up ${v.facilityName}`)}
    ${p("Hi,")}
    ${p(`A few days ago I let you know that <strong>${v.facilityName}</strong> is listed on The Care Audit. I wanted to follow up with a little more context on how families are actually using the site.`)}
    ${p("<strong>Here's how it works:</strong>")}
    ${p(`When a family is researching assisted living options in ${v.city}, they find your listing alongside every other licensed facility in the area. They see facility names, violation counts from the most recent state inspection, and an AI-generated plain English summary of the official inspection findings.`)}
    ${p('Families compare facilities side by side. The listings that stand out are the ones with enhanced profiles: verified badges, facility photos, descriptions written by the facility itself, and in some cases, a direct "Schedule a Tour" button.')}
    ${divider()}
    ${p("<strong>A basic listing is factual. An enhanced listing tells your story.</strong>")}
    ${p("State inspection data is just one snapshot in time. An enhanced listing gives you the opportunity to show families who you really are: the care you provide, the environment you've built, and the steps you've taken to maintain or improve quality.")}
    ${btn("View Your Listing", v.facilityUrl)}
    ${secondaryLink("Enhance Your Listing", v.forFacilitiesUrl)}
    <p style="margin:28px 0 0;font-size:15px;line-height:1.75;color:#374151;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">Best,<br><strong>The Care Audit Team</strong></p>
  `;
  return wrap(body, v.optOutUrl);
}
__name(email2, "email2");
function email3(v) {
  const conditionalContent = v.isClean ? buildEmail3CleanContent(v) : buildEmail3HighViolationsContent(v);
  const body = `
    ${h2(`A recommendation for ${v.facilityName}`)}
    ${p("Hi,")}
    ${p(`I've been looking at the listing for <strong>${v.facilityName}</strong> in ${v.city}, ${v.stateName}, and I wanted to share a quick recommendation based on your facility's current inspection profile.`)}
    ${conditionalContent}
    ${btn("Get Started", v.forFacilitiesUrl)}
    ${secondaryLink(`View your listing`, v.facilityUrl)}
    <p style="margin:28px 0 0;font-size:15px;line-height:1.75;color:#374151;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">Best,<br><strong>The Care Audit Team</strong></p>
  `;
  return wrap(body, v.optOutUrl);
}
__name(email3, "email3");
function buildEmail3CleanContent(v) {
  const violationNote = v.totalViolations !== null && v.totalViolations !== void 0 ? `With ${v.totalViolations === 0 ? "no" : v.totalViolations} violation${v.totalViolations === 1 ? "" : "s"} on record, <strong>${v.facilityName}</strong> is eligible for our top-tier options:` : `<strong>${v.facilityName}</strong> is eligible for our top-tier options:`;
  return `
    ${divider()}
    ${p("<strong>Your facility qualifies for our Featured Verified listing.</strong>")}
    ${p(violationNote)}
    ${infoBlock(`
      <p style="margin:0 0 8px;font-size:15px;font-weight:600;color:#111827;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">Featured Verified: $149/month</p>
      <p style="margin:0;font-size:14px;line-height:1.7;color:#374151;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">This puts your facility front and center. You'll appear at the top of the ${v.city} search results with a gold "Featured Verified" badge, up to 4 facility photos, a custom description, and a "Schedule a Tour" button that connects families directly to you. For facilities with a clean or near-clean record, this is the fastest way to turn online visibility into tour bookings.</p>
    `)}
    ${infoBlock(`
      <p style="margin:0 0 8px;font-size:15px;font-weight:600;color:#111827;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">Verified Profile: $79/month</p>
      <p style="margin:0;font-size:14px;line-height:1.7;color:#374151;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">A lighter option that still makes an impact. Your listing gets a "Verified" badge, updated contact information, and a facility description, so families know your listing has been claimed and is actively managed by someone who cares.</p>
    `)}
    ${p("Both options take less than 5 minutes to set up after subscribing.")}
  `;
}
__name(buildEmail3CleanContent, "buildEmail3CleanContent");
function buildEmail3HighViolationsContent(v) {
  return `
    ${divider()}
    ${p("<strong>Your facility can post an official response.</strong>")}
    ${p(`With ${v.totalViolations} violations on record, families who view your listing are seeing the state's inspection findings, but they're not hearing your side of the story. That's where the Facility Response option comes in.`)}
    ${infoBlock(`
      <p style="margin:0 0 8px;font-size:15px;font-weight:600;color:#111827;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">Facility Response: $49/month</p>
      <p style="margin:0;font-size:14px;line-height:1.7;color:#374151;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">This gives you the ability to post an official response directly on your listing. You can explain the context behind inspection findings, describe the corrective actions you've taken, and show families that you take quality seriously. It also lets you update your phone number and address to make sure families can reach you.</p>
    `)}
    ${p("Many facility owners tell us that the worst part of public inspection data isn't the data itself. It's not being able to respond. This changes that.")}
  `;
}
__name(buildEmail3HighViolationsContent, "buildEmail3HighViolationsContent");
function email4(v) {
  const conditionalParagraph = v.isClean ? p(`With your clean inspection record, <strong>${v.facilityName}</strong> has a real opportunity to be one of the first featured facilities in ${v.city}. That's a significant advantage when families are comparing options.`) : p(`Families reading your inspection summary are forming an impression. A Facility Response gives you the chance to shape that impression: to explain the context, describe your corrective actions, and show that you're responsive and accountable.`);
  const body = `
    ${h2(`Families in ${v.city} are comparing facilities right now`)}
    ${p("Hi,")}
    ${p("I wanted to share a quick update. The Care Audit is growing fast. We now list over 44,000 assisted living facilities across all 50 states, and the number of families using our directory increases every week.")}
    ${p(`When a family in ${v.city} searches for assisted living options, they see <strong>${v.facilityName}</strong> alongside every other facility in the area. And they're making decisions based on what they see.`)}
    ${divider()}
    ${p("<strong>Here's what we've noticed:</strong>")}
    ${p("Facilities with enhanced listings (verified badges, photos, descriptions, tour buttons) naturally stand out from basic listings that only show state inspection data. An enhanced listing doesn't just look better. It signals to families that the facility is engaged, transparent, and invested in how it presents itself.")}
    ${conditionalParagraph}
    ${p("Enhancements start at $49/month and take less than 5 minutes to set up.")}
    ${btn("Enhance Your Listing", v.forFacilitiesUrl)}
    <p style="margin:28px 0 0;font-size:15px;line-height:1.75;color:#374151;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">Best,<br><strong>The Care Audit Team</strong></p>
  `;
  return wrap(body, v.optOutUrl);
}
__name(email4, "email4");
function email5(v) {
  const conditionalContent = v.isClean ? p(`Starting at $79/month, you can add a verified badge, updated contact info, and a facility description. For $149/month, you can be featured at the top of ${v.city} search results with photos and a "Schedule a Tour" button.`) : p(`For $49/month, you can post an official response to your inspection findings, giving families the full picture, not just the state's report.`);
  const body = `
    ${h2("One last note")}
    ${p("Hi,")}
    ${p(`This is my last email about enhancing your listing for <strong>${v.facilityName}</strong> on The Care Audit. I don't want to clutter your inbox, so I'll keep this short.`)}
    ${p("Your facility is listed on a directory that thousands of families use to research assisted living options. Right now, your listing shows only what the state has reported. An enhanced listing lets you add your own voice.")}
    ${divider()}
    ${conditionalContent}
    ${p(`If this isn't the right time, no worries at all. Your listing will remain on The Care Audit as a public resource, and you're always welcome to enhance it later at <a href="${v.forFacilitiesUrl}" style="color:#2563EB;text-decoration:underline;">thecareaudit.com/for-facilities</a>.`)}
    ${p("Thank you for the work you do caring for your residents.")}
    ${btn("View Your Options", v.forFacilitiesUrl)}
    <p style="margin:28px 0 0;font-size:15px;line-height:1.75;color:#374151;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">Best,<br><strong>The Care Audit Team</strong></p>
  `;
  return wrap(body, v.optOutUrl);
}
__name(email5, "email5");
export {
  outreachEmailSequence,
  outreachSequenceLauncher
};
//# sourceMappingURL=outreach-sequence.mjs.map
