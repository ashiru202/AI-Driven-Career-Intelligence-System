const nodemailer = require('nodemailer');

const FROM = process.env.EMAIL_FROM || '"Career Intelligence" <noreply@career-intelligence.app>';
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';

let _transporter = null;

async function getTransporter() {
  if (_transporter) return _transporter;

  if (process.env.SMTP_HOST) {
    _transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  } else {
    // No SMTP configured — use Ethereal (free fake SMTP for dev/testing)
    const testAccount = await nodemailer.createTestAccount();
    _transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: { user: testAccount.user, pass: testAccount.pass },
    });
    console.log(`[EMAIL] No SMTP configured. Using Ethereal test account: ${testAccount.user}`);
    console.log('   Preview emails at https://ethereal.email');
  }

  return _transporter;
}

async function sendVerificationEmail(to, name, token) {
  const transport = await getTransporter();
  const link = `${CLIENT_URL}/verify-email?token=${token}`;

  const info = await transport.sendMail({
    from: FROM,
    to,
    subject: 'Verify your email – Career Intelligence',
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;background:#0d0d2b;color:#e5e5e5;border-radius:12px">
        <h2 style="color:#a5b4fc;margin-bottom:8px">Hi ${name},</h2>
        <p>Thanks for signing up! Please verify your email address by clicking the button below.</p>
        <p style="color:#94a3b8">This link expires in <strong style="color:#e5e5e5">24 hours</strong>.</p>
        <p style="margin:28px 0">
          <a href="${link}"
             style="display:inline-block;padding:12px 28px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px">
            Verify Email
          </a>
        </p>
        <p style="font-size:13px;color:#64748b">Or copy this link into your browser:<br>
          <a href="${link}" style="color:#818cf8;word-break:break-all">${link}</a>
        </p>
        <hr style="border:none;border-top:1px solid rgba(255,255,255,0.1);margin:24px 0">
        <p style="font-size:12px;color:#475569">If you didn't create an account, you can safely ignore this email.</p>
      </div>
    `,
  });

  if (!process.env.SMTP_HOST) {
    console.log(`[EMAIL] Verification email preview: ${nodemailer.getTestMessageUrl(info)}`);
  } else {
    console.log(`[EMAIL] Verification email sent via Gmail to: ${to}`);
  }
}

async function sendPasswordResetEmail(to, name, token) {
  const transport = await getTransporter();
  const link = `${CLIENT_URL}/reset-password?token=${token}`;

  const info = await transport.sendMail({
    from: FROM,
    to,
    subject: 'Reset your password – Career Intelligence',
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;background:#0d0d2b;color:#e5e5e5;border-radius:12px">
        <h2 style="color:#a5b4fc;margin-bottom:8px">Hi ${name},</h2>
        <p>We received a request to reset your password.</p>
        <p style="color:#94a3b8">This link expires in <strong style="color:#e5e5e5">10 minutes</strong>. If you didn't request this, you can safely ignore the email.</p>
        <p style="margin:28px 0">
          <a href="${link}"
             style="display:inline-block;padding:12px 28px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px">
            Reset Password
          </a>
        </p>
        <p style="font-size:13px;color:#64748b">Or copy this link into your browser:<br>
          <a href="${link}" style="color:#818cf8;word-break:break-all">${link}</a>
        </p>
        <hr style="border:none;border-top:1px solid rgba(255,255,255,0.1);margin:24px 0">
        <p style="font-size:12px;color:#475569">If you didn't request a password reset, no action is needed. Your password remains unchanged.</p>
      </div>
    `,
  });

  if (!process.env.SMTP_HOST) {
    console.log(`[EMAIL] Password reset email preview: ${nodemailer.getTestMessageUrl(info)}`);
  } else {
    console.log(`[EMAIL] Password reset email sent via Gmail to: ${to}`);
  }
}

async function sendStaffInviteEmail(to, name, token) {
  const transport = await getTransporter();
  const link = `${CLIENT_URL}/reset-password?token=${token}`;

  const info = await transport.sendMail({
    from: FROM,
    to,
    subject: 'You have been invited as STAFF – Career Intelligence',
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;background:#0d0d2b;color:#e5e5e5;border-radius:12px">
        <h2 style="color:#a5b4fc;margin-bottom:8px">Hi ${name},</h2>
        <p>An administrator invited you to join Career Intelligence as a <strong>STAFF</strong> member.</p>
        <p style="color:#94a3b8">Set your password using the secure link below. This invite link expires in <strong style="color:#e5e5e5">24 hours</strong>.</p>
        <p style="margin:28px 0">
          <a href="${link}"
             style="display:inline-block;padding:12px 28px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px">
            Set Password & Activate Account
          </a>
        </p>
        <p style="font-size:13px;color:#64748b">Or copy this link into your browser:<br>
          <a href="${link}" style="color:#818cf8;word-break:break-all">${link}</a>
        </p>
        <hr style="border:none;border-top:1px solid rgba(255,255,255,0.1);margin:24px 0">
        <p style="font-size:12px;color:#475569">If you were not expecting this invitation, you can ignore this email.</p>
      </div>
    `,
  });

  if (!process.env.SMTP_HOST) {
    console.log(`[EMAIL] Staff invite email preview: ${nodemailer.getTestMessageUrl(info)}`);
  } else {
    console.log(`[EMAIL] Staff invite email sent via Gmail to: ${to}`);
  }
}

async function sendStaffTemporaryPasswordEmail(to, name, temporaryPassword) {
  const transport = await getTransporter();
  const loginLink = `${CLIENT_URL}/login`;

  const info = await transport.sendMail({
    from: FROM,
    to,
    subject: 'Your STAFF account was created – Career Intelligence',
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;background:#0d0d2b;color:#e5e5e5;border-radius:12px">
        <h2 style="color:#a5b4fc;margin-bottom:8px">Hi ${name},</h2>
        <p>An administrator created a <strong>STAFF</strong> account for you.</p>
        <p style="color:#94a3b8;margin-top:14px;margin-bottom:10px">Use the credentials below to sign in, then change your password immediately.</p>
        <div style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);border-radius:10px;padding:14px 16px">
          <p style="margin:0 0 8px 0"><strong>Email:</strong> ${to}</p>
          <p style="margin:0"><strong>Temporary password:</strong> ${temporaryPassword}</p>
        </div>
        <p style="margin:22px 0">
          <a href="${loginLink}"
             style="display:inline-block;padding:12px 28px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px">
            Sign In
          </a>
        </p>
        <p style="font-size:13px;color:#64748b">If the button doesn't work, copy this link into your browser:<br>
          <a href="${loginLink}" style="color:#818cf8;word-break:break-all">${loginLink}</a>
        </p>
        <hr style="border:none;border-top:1px solid rgba(255,255,255,0.1);margin:24px 0">
        <p style="font-size:12px;color:#475569">If you weren't expecting this account, please contact the administrator.</p>
      </div>
    `,
  });

  if (!process.env.SMTP_HOST) {
    console.log(`[EMAIL] Staff temporary password email preview: ${nodemailer.getTestMessageUrl(info)}`);
  } else {
    console.log(`[EMAIL] Staff temporary password email sent via Gmail to: ${to}`);
  }
}

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendStaffInviteEmail,
  sendStaffTemporaryPasswordEmail,
};
