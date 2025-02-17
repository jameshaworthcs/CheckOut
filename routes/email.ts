const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'james@jameshaworth.dev',
    pass: process.env.GPASS,
  },
});

const sendVerificationEmail = (toEmail, code) => {
  const mailOptions = {
    from: 'verify@jemedia.xyz',
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

  return transporter.sendMail(mailOptions);
};

const sendEmail = (toEmail, emailTitle, emailHtml) => {
  const mailOptions = {
    from: 'checkout@jemedia.xyz',
    to: toEmail,
    subject: emailTitle,
    html: emailHtml,
  };

  return transporter.sendMail(mailOptions);
};

module.exports = { sendVerificationEmail, sendEmail };
