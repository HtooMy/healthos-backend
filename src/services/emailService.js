const { Resend } = require('resend');

function escapeHtml(value) {
  const replacements = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };

  return String(value).replace(
    /[&<>"']/g,
    (character) => replacements[character]
  );
}

function buildVerificationCode(code) {
  const verificationCode = String(code ?? '').trim();

  if (!/^\d{6}$/.test(verificationCode)) {
    throw new Error('Verification code must contain exactly 6 digits.');
  }

  return verificationCode;
}

async function sendVerificationEmail({ email, name, code }) {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    return {
      sent: false,
      reason: 'RESEND_API_KEY is not configured.',
    };
  }

  if (typeof email !== 'string' || !email.trim()) {
    throw new Error('A recipient email address is required.');
  }

  const verificationCode = buildVerificationCode(code);
  const displayName = String(name || 'friend');
  const safeName = escapeHtml(displayName);
  const resend = new Resend(apiKey);

  const { data, error } = await resend.emails.send({
    from:
      process.env.EMAIL_FROM ||
      'HealthOS <onboarding@resend.dev>',
    to: [email.trim()],
    subject: 'Your HealthOS verification code',

    text: [
      `Welcome to HealthOS, ${displayName}!`,
      `Your verification code is: ${verificationCode}`,
      'Enter this code in the app to verify your email address.',
      'If you did not create this account, ignore this email.',
    ].join('\n\n'),

    html: `
      <div style="font-family: Arial, sans-serif;
                  line-height: 1.6; color: #1f2937;">
        <h2>Welcome to HealthOS, ${safeName}!</h2>

        <p>Enter this code in the app to verify your email address:</p>

        <div style="font-size: 32px;
                    letter-spacing: 8px;
                    font-weight: 700;
                    background: #eff6ff;
                    color: #1d4ed8;
                    padding: 20px;
                    border-radius: 10px;
                    display: inline-block;
                    margin: 16px 0;">
          ${verificationCode}
        </div>

        <p>Do not share this code with anyone.</p>

        <p>
          If you did not create this account, ignore this email.
        </p>
      </div>
    `,
  });

  if (error) {
    throw new Error(
      error.message || 'Unable to send verification email.'
    );
  }

  return {
    sent: true,
    messageId: data?.id || null,
  };
}

module.exports = {
  sendVerificationEmail,
  buildVerificationCode,
};