// utils/emailService.js
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

const sendPasswordResetEmail = async (email, resetCode, userName) => {
  try {
    const { data, error } = await resend.emails.send({
      from: process.env.FROM_EMAIL || 'onboarding@resend.dev',
      to: [email],
      subject: 'Eduvia.mn - Нууц үг сэргээх код',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; background: #f4f4f4; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #00d4ff 0%, #0099cc 100%); padding: 30px; text-align: center; }
            .header h1 { color: #ffffff; margin: 0; font-size: 28px; }
            .content { padding: 40px 30px; }
            .code-box { background: #f8f9fa; border: 2px dashed #00d4ff; border-radius: 8px; padding: 20px; text-align: center; margin: 30px 0; }
            .code { font-size: 36px; font-weight: bold; color: #00d4ff; letter-spacing: 8px; }
            .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
            .btn { display: inline-block; background: #00d4ff; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 Нууц үг сэргээх</h1>
            </div>
            <div class="content">
              <p>Сайн байна уу, <strong>${userName}</strong>!</p>
              <p>Та нууц үг сэргээх хүсэлт илгээсэн байна. Доорх кодыг ашиглан нууц үгээ шинэчлээрэй:</p>
              
              <div class="code-box">
                <div class="code">${resetCode}</div>
                <p style="margin: 10px 0 0; color: #666;">Энэ код 15 минутын дараа хүчингүй болно</p>
              </div>

              <p style="color: #666; font-size: 14px;">
                ⚠️ Хэрэв та энэ хүсэлтийг илгээгээгүй бол энэ имэйлийг үл хэрэгсээрэй.
              </p>
            </div>
            <div class="footer">
              <p>© 2024 Eduvia.mn - Бүх эрх хуулиар хамгаалагдсан</p>
              <p>Асуулт байвал: support@eduvia.mn</p>
            </div>
          </div>
        </body>
        </html>
      `
    });

    if (error) {
      console.error('❌ Resend алдаа:', error);
      return { success: false, error };
    }

    console.log('✅ Email амжилттай илгээгдлээ:', data);
    return { success: true, data };
  } catch (error) {
    console.error('❌ Email илгээхэд алдаа:', error);
    return { success: false, error };
  }
};

const sendWelcomeEmail = async (email, userName) => {
  try {
    const { data, error } = await resend.emails.send({
      from: process.env.FROM_EMAIL || 'onboarding@resend.dev',
      to: [email],
      subject: 'Eduvia.mn-д тавтай морил! 🎉',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; background: #f4f4f4; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 10px; overflow: hidden; }
            .header { background: linear-gradient(135deg, #00d4ff 0%, #0099cc 100%); padding: 40px; text-align: center; }
            .header h1 { color: #ffffff; margin: 0; font-size: 32px; }
            .content { padding: 40px 30px; }
            .btn { display: inline-block; background: #00d4ff; color: #ffffff; padding: 14px 40px; text-decoration: none; border-radius: 8px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Тавтай морил!</h1>
            </div>
            <div class="content">
              <p>Сайн байна уу, <strong>${userName}</strong>!</p>
              <p>Eduvia.mn-д амжилттай бүртгүүллээ. Одоо та мянга мянган хичээлүүдээс сонгож суралцаж эхлэх боломжтой.</p>
              
              <h3>🚀 Дараагийн алхамууд:</h3>
              <ul>
                <li>Өөртөө тохирсон хичээл хайж олох</li>
                <li>Мэргэжлийн багш нараас сурах</li>
                <li>Өөрийн прогрессоо хянах</li>
              </ul>

              <a href="https://eduvia.mn/dashboard" class="btn">Хичээл үзэх</a>
            </div>
          </div>
        </body>
        </html>
      `
    });

    if (error) {
      console.error('❌ Welcome email алдаа:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error('❌ Welcome email алдаа:', error);
    return { success: false, error };
  }
};

module.exports = {
  sendPasswordResetEmail,
  sendWelcomeEmail
};