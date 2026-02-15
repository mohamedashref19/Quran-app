const nodemailer = require("nodemailer");
const { convert } = require("html-to-text");

module.exports = class Email {
  constructor(user, url) {
    this.to = user.email;
    this.firstName = user.name.split(" ")[0];
    this.url = url;
    this.from = `Aqra App <${process.env.EMAIL_FROM}>`;
  }

  newTransport() {
    if (process.env.NODE_ENV === "production") {
      // SendGrid
      return nodemailer.createTransport({
        service: "Gmail",
        auth: {
          user: process.env.GMAIL_USERNAME,
          pass: process.env.GMAIL_APP_PASSWORD,
        },
      });
    }

    // Mailtrap (Development)
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  }

  async send(subject, htmlContent) {
    const emailOptions = {
      from: this.from,
      to: this.to,
      subject,
      html: htmlContent,
      text: convert(htmlContent),
    };

    await this.newTransport().sendMail(emailOptions);
  }

  async sendWelcome() {
    const html = `
      <div style="max-width: 600px; margin:auto; border-top: 8px solid #1e5f31; padding: 40px 20px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #fdfdfd; border-radius: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.05); text-align: center;">
        <h1 style="color: #1e5f31; margin-bottom: 20px;">أهلاً بك في تطبيق اقرأ ✨</h1>
        <h2 style="color: #1e5f31;">Welcome to Aqra App!</h2>
        <p style="font-size: 16px; color: #555; line-height: 1.6;">مرحباً ${this.firstName}، نحن سعداء جداً بانضمامك إلينا في رحلتك مع القرآن الكريم.</p>
        <p style="font-size: 16px; color: #555;">نسأل الله أن يجعل هذا التطبيق عوناً لك على التلاوة والتدبر.</p>
        
        <div style="margin: 30px 0;">
          <a href="${this.url}" style="background: #1e5f31; color: white; padding: 12px 25px; text-decoration: none; border-radius: 50px; font-weight: bold; font-size: 16px;">ابدأ رحلتك الآن | Start Reading</a>
        </div>
        
        <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="font-size: 12px; color: #999;">تطبيق اقرأ - رفيقك في رحلة التلاوة والتدبر</p>
      </div>
    `;
    await this.send("مرحباً بك في تطبيق اقرأ | Welcome to Aqra App", html);
  }

  async sendPasswordReset() {
    const html = `
      <div style="max-width: 600px; margin:auto; border-top: 8px solid #d4af37; padding: 40px 20px; font-family: sans-serif; text-align: center; background-color: #fff;">
        <h2 style="color: #333;">إعادة تعيين كلمة المرور</h2>
        <h2 style="color: #333;">Password Reset</h2>
        <p style="color: #666;">هل نسيت كلمة المرور؟ لا تقلق، اضغط على الزر أدناه لتعيين كلمة مرور جديدة (صالح لمدة 10 دقائق فقط).</p>
        <div style="margin: 30px 0;">
          <a href="${this.url}" style="background: #2c3e50; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">إعادة تعيين | Reset Password</a>
        </div>
        <p style="font-size: 14px; color: #999;">إذا لم تطلب هذا التغيير، يرجى تجاهل هذا البريد.</p>
      </div>
    `;
    await this.send("رابط إعادة تعيين كلمة المرور (صالح لـ 10 دقائق)", html);
  }

  async sendOTP(otpCode) {
    const html = `
      <div style="max-width: 500px; margin: auto; padding: 40px; font-family: sans-serif; border: 1px solid #eee; text-align: center; border-radius: 15px; background: #fff;">
        <div style="font-size: 40px; margin-bottom: 20px;">🔐</div>
        <h2 style="color: #1e5f31; margin-bottom: 10px;">رمز التحقق</h2>
        <p style="color: #666;">استخدم الكود التالي لتفعيل حسابك في تطبيق اقرأ:</p>
        <div style="background: #f4f7f6; padding: 20px; border-radius: 10px; margin: 25px 0;">
          <h1 style="color: #1e5f31; letter-spacing: 10px; font-size: 36px; margin: 0;">${otpCode}</h1>
        </div>
        <p style="color: #999; font-size: 14px;">هذا الكود صالح لمدة 10 دقائق فقط.</p>
        <p style="color: #999; font-size: 12px; margin-top: 30px;">شكراً لثقتك بنا.</p>
      </div>
    `;

    await this.send("رمز التحقق الخاص بحسابك - Aqra App", html);
  }

  async sendKhatmahCompletion() {
    const html = `
      <div style="max-width: 600px; margin:auto; border: 2px solid #d4af37; padding: 40px 20px; font-family: sans-serif; text-align: center; background-color: #fff; border-radius: 15px;">
        <h1 style="color: #d4af37; font-size: 40px;">مبارك! 🎉</h1>
        <h2 style="color: #1e5f31;">هنيئاً لك ختم كتاب الله</h2>
        <p style="font-size: 18px; color: #555;">مرحباً ${this.firstName}، يسعدنا جداً أنك أتممت ختمتك بنجاح عبر تطبيق اقرأ.</p>
        <p style="font-size: 16px; color: #666;">نسأل الله أن يتقبل منك ويجعله شفيعاً لك يوم القيامة.</p>
        <div style="margin-top: 30px;">
          <a href="${this.url}" style="background: #1e5f31; color: white; padding: 12px 30px; text-decoration: none; border-radius: 50px; font-weight: bold;">ابدأ ختمة جديدة</a>
        </div>
      </div>
    `;
    await this.send("مبارك ختم القرآن الكريم! 🎉", html);
  }
};