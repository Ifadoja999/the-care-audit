import { Resend } from "resend";

export const resend = new Resend(process.env.RESEND_API_KEY!);

export const FROM_EMAIL = "The Care Audit <noreply@thecareaudit.com>";
export const ALERT_EMAIL = process.env.ALERT_EMAIL || "info@thecareaudit.com";
