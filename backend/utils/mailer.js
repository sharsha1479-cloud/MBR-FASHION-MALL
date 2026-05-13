const nodemailer = require('nodemailer');

const hasSmtpConfig = () => (
  process.env.SMTP_HOST &&
  process.env.SMTP_PORT &&
  process.env.SMTP_USER &&
  process.env.SMTP_PASS
);

const getTransporter = () => nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

exports.sendPasswordResetOtp = async (email, otp) => {
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;

  if (!hasSmtpConfig()) {
    console.log(`Password reset OTP for ${email}: ${otp}`);
    return;
  }

  await getTransporter().sendMail({
    from,
    to: email,
    subject: 'Your MBR Fashion Hub password reset OTP',
    text: `Your password reset OTP is ${otp}. It expires in 10 minutes.`,
    html: `
      <div style="font-family: Arial, sans-serif; color: #1f2937;">
        <h2>MBR Fashion Hub password reset</h2>
        <p>Your OTP is:</p>
        <p style="font-size: 28px; font-weight: 700; letter-spacing: 6px;">${otp}</p>
        <p>This OTP expires in 10 minutes.</p>
      </div>
    `,
  });
};
