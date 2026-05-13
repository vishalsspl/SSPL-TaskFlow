import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.office365.com',
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    ciphers: 'TLSv1.2',
    rejectUnauthorized: false
  },
  requireTLS: true
});

async function testMail() {
  try {
    console.log('Testing SMTP connection...');
    await transporter.verify();
    console.log('SMTP connection verified successfully!');

    const info = await transporter.sendMail({
      from: `"${process.env.SMTP_FROM_NAME || 'TaskFlow'}" <${process.env.SMTP_USER}>`,
      to: process.env.SMTP_USER, // Send to self for testing
      subject: 'SMTP Test Mail',
      text: 'This is a test email from TaskFlow.',
    });
    console.log('Test email sent successfully:', info.messageId);
  } catch (error) {
    console.error('SMTP Error:', error);
  }
}

testMail();
