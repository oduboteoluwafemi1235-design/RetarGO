import nodemailer from 'nodemailer';

export type PaymentEmailInput = {
  to: string;
  orderNumber: string;
  amount: number;
  provider: string;
  receiptNumber: string;
  receiptUrl: string;
};

let cachedTransporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  if (cachedTransporter) {
    return cachedTransporter;
  }

  cachedTransporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  return cachedTransporter;
}

export async function sendPaymentConfirmationEmail(input: PaymentEmailInput) {
  const transporter = getTransporter();
  const from = process.env.EMAIL_FROM;

  if (!transporter || !from) {
    return;
  }

  const amount = `₦${Math.round(input.amount).toLocaleString()}`;

  await transporter.sendMail({
    from,
    to: input.to,
    subject: `Payment confirmed for ${input.orderNumber}`,
    text: [
      `Your payment has been confirmed for order ${input.orderNumber}.`,
      `Amount: ${amount}`,
      `Provider: ${input.provider}`,
      `Receipt: ${input.receiptNumber}`,
      `View receipt: ${input.receiptUrl}`,
      '',
      'Thank you for shopping with RetarGO.',
    ].join('\n'),
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a;">
        <h2 style="margin-bottom: 8px;">Payment confirmed</h2>
        <p>Your payment has been confirmed for <strong>${input.orderNumber}</strong>.</p>
        <ul>
          <li><strong>Amount:</strong> ${amount}</li>
          <li><strong>Provider:</strong> ${input.provider}</li>
          <li><strong>Receipt:</strong> ${input.receiptNumber}</li>
        </ul>
        <p><a href="${input.receiptUrl}">View your receipt</a></p>
        <p>Thank you for shopping with RetarGO.</p>
      </div>
    `,
  });
}
