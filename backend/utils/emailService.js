const nodemailer = require('nodemailer');
require('dotenv').config();

// Tạo transporter cho Gmail
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER, // Email của bạn
      pass: process.env.EMAIL_PASS  // App Password của Gmail
    }
  });
};

// Template email OTP - Simplified to avoid spam filters
const createOTPEmailTemplate = (otp, userName = '') => {
  return {
    subject: 'Mã OTP đặt lại mật khẩu - WebPhim',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>OTP Code</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          <!-- Header -->
          <div style="background-color: #dc2626; padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">WebPhim</h1>
            <p style="color: white; margin: 5px 0 0 0; font-size: 14px;">Đặt lại mật khẩu</p>
          </div>
          
          <!-- Content -->
          <div style="padding: 30px;">
            <h2 style="color: #333; margin: 0 0 20px 0; font-size: 20px;">
              ${userName ? `Xin chào ${userName},` : 'Xin chào,'}
            </h2>
            
            <p style="color: #666; font-size: 16px; line-height: 1.5; margin: 0 0 20px 0;">
              Bạn đã yêu cầu đặt lại mật khẩu cho tài khoản WebPhim của bạn.
            </p>
            
            <p style="color: #666; font-size: 16px; line-height: 1.5; margin: 0 0 30px 0;">
              Vui lòng sử dụng mã OTP sau để xác thực và đặt lại mật khẩu:
            </p>
            
            <!-- OTP Code -->
            <div style="background-color: #f8f9fa; border: 2px solid #e9ecef; border-radius: 8px; padding: 30px; text-align: center; margin: 30px 0;">
              <p style="color: #495057; font-size: 14px; margin: 0 0 15px 0; font-weight: 600;">MÃ OTP CỦA BẠN</p>
              <div style="background-color: white; border: 1px solid #dee2e6; border-radius: 6px; padding: 20px; display: inline-block;">
                <span style="font-size: 28px; font-weight: bold; color: #dc2626; letter-spacing: 4px; font-family: monospace;">
                  ${otp}
                </span>
              </div>
            </div>
            
            <!-- Warning -->
            <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 6px; padding: 15px; margin: 20px 0;">
              <p style="color: #856404; font-size: 14px; margin: 0; font-weight: 600;">
                Lưu ý quan trọng:
              </p>
              <ul style="color: #856404; font-size: 14px; margin: 10px 0 0 0; padding-left: 20px;">
                <li>Mã OTP này chỉ có hiệu lực trong 10 phút</li>
                <li>Không chia sẻ mã này với bất kỳ ai</li>
                <li>Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này</li>
              </ul>
            </div>
            
            <p style="color: #666; font-size: 14px; line-height: 1.5; margin: 30px 0 0 0;">
              Nếu bạn gặp vấn đề, vui lòng liên hệ với đội ngũ hỗ trợ của chúng tôi.
            </p>
          </div>
          
          <!-- Footer -->
          <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e9ecef;">
            <p style="color: #6c757d; font-size: 12px; margin: 0;">
              © 2024 WebPhim. Tất cả quyền được bảo lưu.
            </p>
            <p style="color: #6c757d; font-size: 12px; margin: 5px 0 0 0;">
              Email này được gửi tự động, vui lòng không trả lời.
            </p>
          </div>
        </div>
      </body>
      </html>
    `,
    // Add plain text version to avoid spam
    text: `
      WebPhim - Đặt lại mật khẩu
      
      ${userName ? `Xin chào ${userName},` : 'Xin chào,'}
      
      Bạn đã yêu cầu đặt lại mật khẩu cho tài khoản WebPhim của bạn.
      
      Mã OTP của bạn là: ${otp}
      
      Mã này chỉ có hiệu lực trong 10 phút.
      Không chia sẻ mã này với bất kỳ ai.
      
      Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.
      
      Trân trọng,
      Đội ngũ WebPhim
    `
  };
};

// Gửi email OTP
const sendOTPEmail = async (toEmail, otp, userName = '') => {
  try {
    // Kiểm tra environment variables
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      return {
        success: false,
        error: 'Email configuration missing. Please check EMAIL_USER and EMAIL_PASS in .env file'
      };
    }

    const transporter = createTransporter();

    // Test connection
    await transporter.verify();

    const emailTemplate = createOTPEmailTemplate(otp, userName);

    const mailOptions = {
      from: `"WebPhim" <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
      text: emailTemplate.text
    };


    const result = await transporter.sendMail(mailOptions);
    return { success: true, messageId: result.messageId };

  } catch (error) {

    // Provide more specific error messages
    let errorMessage = error.message;
    if (error.code === 'EAUTH') {
      errorMessage = 'Email authentication failed. Please check EMAIL_USER and EMAIL_PASS';
    } else if (error.code === 'ECONNECTION') {
      errorMessage = 'Cannot connect to email server. Please check your internet connection';
    } else if (error.code === 'ETIMEDOUT') {
      errorMessage = 'Email server connection timeout';
    }

    return { success: false, error: errorMessage };
  }
};

module.exports = {
  sendOTPEmail,
  createOTPEmailTemplate
};
