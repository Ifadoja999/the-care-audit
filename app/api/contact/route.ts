import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { firstName, lastName, email, phone, subject, message } = body;

    // Server-side validation
    if (!firstName?.trim() || !lastName?.trim() || !email?.trim() || !subject?.trim() || !message?.trim()) {
      return NextResponse.json(
        { success: false, error: 'All required fields must be filled out.' },
        { status: 400 }
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return NextResponse.json(
        { success: false, error: 'Please provide a valid email address.' },
        { status: 400 }
      );
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    const fullName = `${firstName.trim()} ${lastName.trim()}`;
    const phoneLine = phone?.trim() ? `Phone: ${phone.trim()}` : 'Phone: Not provided';

    await resend.emails.send({
      from: 'The Care Audit <noreply@thecareaudit.com>',
      to: 'info@thecareaudit.com',
      replyTo: email.trim(),
      subject: `[The Care Audit] ${subject} — from ${fullName}`,
      text: [
        `Contact form submission`,
        ``,
        `Name: ${fullName}`,
        `Email: ${email.trim()}`,
        phoneLine,
        `Subject: ${subject}`,
        ``,
        `Message:`,
        message.trim(),
        ``,
        `---`,
        `Sent from thecareaudit.com contact form`,
      ].join('\n'),
      html: [
        `<p><b>Name:</b> ${fullName}</p>`,
        `<p><b>Email:</b> ${email.trim()}</p>`,
        `<p><b>Phone:</b> ${phone?.trim() || 'Not provided'}</p>`,
        `<p><b>Subject:</b> ${subject}</p>`,
        `<br>`,
        `<p><b>Message:</b></p>`,
        `<p>${message.trim().replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')}</p>`,
        `<br>`,
        `<p style="color:#888;font-size:12px;">Sent from thecareaudit.com contact form</p>`,
      ].join('\n'),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Contact form error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send message. Please try again.' },
      { status: 500 }
    );
  }
}
