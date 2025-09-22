// Email Configuration
// Copy this to your .env file or set these environment variables

module.exports = {
  // Gmail Configuration
  EMAIL_USER: process.env.EMAIL_USER || "your-email@gmail.com",
  EMAIL_PASS: process.env.EMAIL_PASS || "your-app-password",
  
  // Instructions for Gmail setup:
  // 1. Enable 2-factor authentication on your Gmail account
  // 2. Generate an App Password:
  //    - Go to Google Account settings
  //    - Security > 2-Step Verification > App passwords
  //    - Generate password for "Mail"
  //    - Use that password as EMAIL_PASS
  // 3. Replace "your-email@gmail.com" with your actual Gmail address
  // 4. Replace "your-app-password" with the generated app password
  
  // Alternative: You can also use other email services like:
  // - Outlook/Hotmail
  // - Yahoo Mail
  // - Custom SMTP server
};
