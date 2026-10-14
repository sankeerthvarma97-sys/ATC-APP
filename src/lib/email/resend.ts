import { Resend } from "resend";

export interface OperationalEmailInput {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  from?: string;
}

export class EmailConfigurationError extends Error {
  constructor(message = "Resend email is not configured.") {
    super(message);
    this.name = "EmailConfigurationError";
  }
}

export function getEmailConfigStatus() {
  return {
    resendConfigured: Boolean(process.env.RESEND_API_KEY),
    defaultFromConfigured: Boolean(process.env.RESEND_FROM_EMAIL),
    defaultFrom: process.env.RESEND_FROM_EMAIL,
  };
}

export async function sendOperationalEmail(input: OperationalEmailInput) {
  if (!process.env.RESEND_API_KEY) {
    throw new EmailConfigurationError();
  }

  const from = input.from ?? process.env.RESEND_FROM_EMAIL;
  if (!from) {
    throw new EmailConfigurationError("A sender address is required for Resend email.");
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const result = await resend.emails.send(
    input.html
      ? {
          from,
          to: input.to,
          subject: input.subject,
          html: input.html,
          ...(input.text ? { text: input.text } : {}),
        }
      : {
          from,
          to: input.to,
          subject: input.subject,
          text: input.text ?? "",
        },
  );

  if (result.error) {
    throw new Error(result.error.message);
  }

  return { id: result.data?.id ?? null };
}
