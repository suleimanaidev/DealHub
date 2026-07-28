import nodemailer from "nodemailer";
import { env } from "../../config/env";
import { logger } from "../../utils/logger";

// ─── Transporter ───────────────────────────────────────

const isEmailConfigured =
  env.SMTP_USER &&
  env.SMTP_PASS &&
  env.SMTP_USER !== "your-email@gmail.com" &&
  env.SMTP_PASS !== "your-app-password";

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_SECURE,
  connectionTimeout: 5000,
  greetingTimeout: 5000,
  socketTimeout: 5000,
  auth: isEmailConfigured
    ? { user: env.SMTP_USER, pass: env.SMTP_PASS }
    : undefined,
});

// ─── Types ─────────────────────────────────────────────

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}

export interface SendTemplateEmailOptions {
  to: string | string[];
  subject: string;
  template: string;
  variables: Record<string, string>;
  replyTo?: string;
}

// ─── Core Send Function ────────────────────────────────

export async function sendEmail(options: SendEmailOptions): Promise<boolean> {
  if (!isEmailConfigured) {
    logger.warn("Email not configured - skipping send");
    return false;
  }

  try {
    const info = await transporter.sendMail({
      from: env.EMAIL_FROM || env.SMTP_USER,
      to: Array.isArray(options.to) ? options.to.join(", ") : options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      replyTo: options.replyTo,
      cc: options.cc ? (Array.isArray(options.cc) ? options.cc.join(", ") : options.cc) : undefined,
      bcc: options.bcc ? (Array.isArray(options.bcc) ? options.bcc.join(", ") : options.bcc) : undefined,
      attachments: options.attachments,
    });

    logger.info({ messageId: info.messageId, to: options.to }, "Email sent successfully");
    return true;
  } catch (error) {
    logger.error({ error, to: options.to, subject: options.subject }, "Failed to send email");
    return false;
  }
}

// ─── Template Email Sender ─────────────────────────────

export async function sendTemplateEmail(options: SendTemplateEmailOptions): Promise<boolean> {
  let html = options.template;

  // Replace {{variable}} placeholders
  for (const [key, value] of Object.entries(options.variables)) {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, "g");
    html = html.replace(regex, value);
  }

  return sendEmail({
    to: options.to,
    subject: options.subject,
    html,
    replyTo: options.replyTo,
  });
}

// ─── Pre-built Email Templates ─────────────────────────

export function buildVerificationEmail(verificationUrl: string, firstName: string): SendEmailOptions {
  return {
    to: "", // Set by caller
    subject: "Verify your email address",
    html: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #1a1a1a;">Welcome to CRM, ${firstName}!</h2>
        <p style="color: #4a4a4a; line-height: 1.6;">Please verify your email address by clicking the button below:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" style="background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">Verify Email</a>
        </div>
        <p style="color: #9a9a9a; font-size: 14px;">This link expires in 24 hours. If you didn't create an account, you can safely ignore this email.</p>
      </body>
      </html>
    `,
  };
}

export function buildPasswordResetEmail(resetUrl: string, firstName: string): SendEmailOptions {
  return {
    to: "",
    subject: "Reset your password",
    html: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #1a1a1a;">Password Reset Request</h2>
        <p style="color: #4a4a4a; line-height: 1.6;">Hi ${firstName}, we received a request to reset your password.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">Reset Password</a>
        </div>
        <p style="color: #9a9a9a; font-size: 14px;">This link expires in 15 minutes. If you didn't request this, please ignore this email.</p>
      </body>
      </html>
    `,
  };
}

export function buildInvitationEmail(inviteUrl: string, inviterName: string, orgName: string): SendEmailOptions {
  return {
    to: "",
    subject: `You've been invited to join ${orgName} on CRM`,
    html: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #1a1a1a;">You're Invited!</h2>
        <p style="color: #4a4a4a; line-height: 1.6;"><strong>${inviterName}</strong> has invited you to join <strong>${orgName}</strong> on CRM.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${inviteUrl}" style="background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">Accept Invitation</a>
        </div>
        <p style="color: #9a9a9a; font-size: 14px;">This invitation expires in 7 days.</p>
      </body>
      </html>
    `,
  };
}

// ─── Verify SMTP Connection ────────────────────────────

export async function verifyEmailConnection(): Promise<boolean> {
  try {
    await transporter.verify();
    logger.info("SMTP connection verified");
    return true;
  } catch (error) {
    logger.warn({ error }, "SMTP connection failed - emails will not be sent");
    return false;
  }
}
