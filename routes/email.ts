const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

let transporter = null;

if (process.env.GOOGLE_APPKEY && process.env.GOOGLE_EMAIL) {
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GOOGLE_EMAIL,
      pass: process.env.GOOGLE_APPKEY,
    },
  });
}

const sendVerificationEmail = (toEmail, code) => {
  const mailOptions = {
    from: process.env.GOOGLE_SENDER || 'verify@jemedia.xyz',
    to: toEmail,
    subject: `${code} is your CheckOut Verification Code`,
    html: `
            <p>Hello,</p>
            <p>You've signed up for CheckOut, which makes it easy to submit and view codes.</p>
            <p>To complete your registration, please use the following verification code:</p>
            <p><strong>Verification Code:</strong> ${code}</p>
            <p>Enter this code into the CheckOut app to verify your email address and activate your account. Please remember not to share this code with anyone for security reasons.</p>
            <p>If you didn't request this code or have any concerns, feel free to ignore this email.</p>
            <p>Thank you.</p>
            <p>Best regards,<br/>The CheckOut Team</p>
        `,
  };

  if (!transporter) {
    console.log(`Email skipped for ${toEmail} with subject "${mailOptions.subject}" because GOOGLE_APPKEY/GOOGLE_EMAIL is not defined`);
    return Promise.resolve();
  }

  return transporter.sendMail(mailOptions);
};

const sendEmail = (toEmail, emailTitle, emailHtml, imageAttachments = []) => {
  // Convert image paths to attachments with CIDs
  const attachments = imageAttachments.map((imagePath) => {
    const filename = path.basename(imagePath);
    const cid = filename; // Simplified CID without 'image-' prefix for better Gmail compatibility
    
    return {
      filename,
      path: path.join(process.cwd(), 'public', 'static', 'images', 'email', imagePath),
      cid: cid,
      contentDisposition: 'inline', // Explicitly set inline disposition
      contentType: `image/${path.extname(imagePath).substring(1)}`, // Explicitly set content type based on extension
    };
  });

  const mailOptions = {
    from: process.env.GOOGLE_SENDER || 'checkout@jemedia.xyz',
    to: toEmail,
    subject: emailTitle,
    html: emailHtml,
    attachments: attachments,
  };

  if (!transporter) {
    console.log(`Email skipped for ${toEmail} with subject "${emailTitle}" because GOOGLE_APPKEY/GOOGLE_EMAIL is not defined`);
    return Promise.resolve();
  }

  return transporter.sendMail(mailOptions);
};

module.exports = { sendVerificationEmail, sendEmail };
