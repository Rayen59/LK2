import nodemailer, { type Transporter } from 'nodemailer';

// Cache transporter instance
let cachedTransporter: Transporter | null = null;
let isConfiguredSmtp = false;

export function isEmailConfigured(): boolean {
  return !!(
    (process.env.GMAIL_USER && (process.env.GMAIL_APP_PASSWORD || process.env.GMAIL_PASS)) ||
    (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) ||
    process.env.RESEND_API_KEY ||
    process.env.BREVO_API_KEY
  );
}

async function getTransporter(): Promise<{ transporter: Transporter; isRealSmtp: boolean }> {
  if (cachedTransporter) return { transporter: cachedTransporter, isRealSmtp: isConfiguredSmtp };

  // 1. Direct Gmail Configuration (Google App Password)
  if (process.env.GMAIL_USER && (process.env.GMAIL_APP_PASSWORD || process.env.GMAIL_PASS)) {
    cachedTransporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: process.env.GMAIL_USER,
        pass: (process.env.GMAIL_APP_PASSWORD || process.env.GMAIL_PASS || '').replace(/\s+/g, ''),
      },
    });
    isConfiguredSmtp = true;
    console.log('[EMAIL] ✅ Relais Gmail SMTP (port 465) configuré pour:', process.env.GMAIL_USER);
    return { transporter: cachedTransporter, isRealSmtp: true };
  }

  // 2. Custom SMTP Server Configuration (e.g., Brevo, SendGrid, Mailjet, OVH, etc.)
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    const port = Number(process.env.SMTP_PORT) || 587;
    const secure = process.env.SMTP_SECURE === 'true' || port === 465;
    cachedTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });
    isConfiguredSmtp = true;
    console.log(`[EMAIL] ✅ SMTP externe configuré sur ${process.env.SMTP_HOST}:${port}`);
    return { transporter: cachedTransporter, isRealSmtp: true };
  }

  // 3. Resend SMTP relay
  if (process.env.RESEND_API_KEY) {
    cachedTransporter = nodemailer.createTransport({
      host: 'smtp.resend.com',
      port: 465,
      secure: true,
      auth: {
        user: 'resend',
        pass: process.env.RESEND_API_KEY,
      },
    });
    isConfiguredSmtp = true;
    console.log('[EMAIL] ✅ Relais SMTP Resend configuré avec succès');
    return { transporter: cachedTransporter, isRealSmtp: true };
  }

  // 4. Fallback for sandbox / testing
  try {
    const testAccount = await nodemailer.createTestAccount();
    cachedTransporter = nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    isConfiguredSmtp = false;
    console.log(`[EMAIL] ℹ️ Ethereal sandbox actif (${testAccount.user})`);
    return { transporter: cachedTransporter, isRealSmtp: false };
  } catch (err) {
    console.warn('[EMAIL] Mode JSON transport actif:', err);
    cachedTransporter = nodemailer.createTransport({
      jsonTransport: true,
    } as any);
    isConfiguredSmtp = false;
    return { transporter: cachedTransporter, isRealSmtp: false };
  }
}

/**
 * Sends a real, professionally branded verification code email to the recipient.
 */
export async function sendVerificationCodeEmail(params: {
  to: string;
  code: string;
  recipientName?: string;
  purpose?: 'register' | 'forgot_password' | 'pc_login';
}): Promise<{ success: boolean; isRealSmtp?: boolean; previewUrl?: string; error?: string }> {
  const { to, code, recipientName, purpose = 'register' } = params;

  const subjectTitles = {
    register: 'Votre code de vérification Wavegram',
    forgot_password: 'Réinitialisation de votre mot de passe Wavegram',
    pc_login: 'Validation de votre connexion PC Wavegram',
  };

  const actionDescriptions = {
    register: 'Bienvenue sur Wavegram ! Utilisez le code de sécurité ci-dessous pour confirmer votre adresse email et finaliser la création de votre compte.',
    forgot_password: 'Nous avons reçu une demande de réinitialisation de mot de passe pour votre compte Wavegram. Utilisez le code ci-dessous pour définir un nouveau mot de passe.',
    pc_login: 'Une tentative de connexion depuis un ordinateur PC a été détectée sur votre compte. Entrez ce code pour approuver l’accès.',
  };

  const subject = subjectTitles[purpose] || 'Code de sécurité Wavegram';
  const intro = actionDescriptions[purpose];
  const nameGreeting = recipientName ? `Bonjour ${recipientName},` : 'Bonjour,';

  const htmlContent = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #060b18; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #e2e8f0;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #060b18; padding: 40px 15px;">
    <tr>
      <td align="center">
        <!-- Main Card -->
        <table role="presentation" width="100%" style="max-width: 520px; background: linear-gradient(145deg, #0d1733, #081024); border: 1px solid rgba(56, 189, 248, 0.25); border-radius: 24px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7); overflow: hidden; padding: 36px 28px; text-align: center;">
          
          <!-- Logo & Crown -->
          <tr>
            <td align="center" style="padding-bottom: 24px;">
              <div style="display: inline-block; width: 68px; height: 68px; border-radius: 50%; background: linear-gradient(135deg, #f59e0b, #fbbf24, #d97706); padding: 3px; box-shadow: 0 0 24px rgba(251, 191, 36, 0.4);">
                <div style="width: 100%; height: 100%; border-radius: 50%; background: #070e22; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center;">
                  <div style="font-size: 14px; line-height: 1; padding-top: 8px;">👑</div>
                  <div style="font-size: 18px; font-weight: 900; color: #ffffff; letter-spacing: 1px; font-family: 'Arial Black', sans-serif;">MK</div>
                </div>
              </div>
            </td>
          </tr>

          <!-- Title -->
          <tr>
            <td align="center" style="padding-bottom: 6px;">
              <h1 style="margin: 0; font-size: 26px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">Wavegram</h1>
            </td>
          </tr>

          <!-- Subtitle -->
          <tr>
            <td align="center" style="padding-bottom: 24px;">
              <p style="margin: 0; font-size: 13px; color: #38bdf8; font-weight: 600; letter-spacing: 0.5px;">Connecte-toi · Partage · Explore</p>
            </td>
          </tr>

          <!-- Message Body -->
          <tr>
            <td align="left" style="padding: 0 8px 24px 8px; line-height: 1.6; font-size: 14px; color: #cbd5e1;">
              <p style="margin: 0 0 12px 0; font-weight: 700; color: #ffffff;">${nameGreeting}</p>
              <p style="margin: 0;">${intro}</p>
            </td>
          </tr>

          <!-- 6-digit Code Box -->
          <tr>
            <td align="center" style="padding: 10px 0 26px 0;">
              <div style="background: rgba(14, 165, 233, 0.08); border: 1.5px dashed #38bdf8; border-radius: 16px; padding: 20px 24px; display: inline-block; max-width: 340px; width: 100%; box-sizing: border-box;">
                <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #94a3b8; margin-bottom: 8px;">Code de sécurité</div>
                <div style="font-size: 38px; font-weight: 900; letter-spacing: 8px; color: #38bdf8; font-family: 'Courier New', Courier, monospace; text-shadow: 0 0 14px rgba(56, 189, 248, 0.45);">${code}</div>
                <div style="font-size: 11px; color: #cbd5e1; margin-top: 8px;">⏱ Valable pendant <strong>15 minutes</strong></div>
              </div>
            </td>
          </tr>

          <!-- Security Notice -->
          <tr>
            <td align="center" style="padding: 0 12px 20px 12px; font-size: 12px; color: #64748b; line-height: 1.5;">
              <p style="margin: 0;">⚠️ Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet email en toute sécurité. Ne communiquez jamais ce code à un tiers.</p>
            </td>
          </tr>

          <!-- Footer Divider -->
          <tr>
            <td style="border-top: 1px solid rgba(255, 255, 255, 0.08); padding-top: 20px;">
              <p style="margin: 0; font-size: 11px; color: #475569;">© ${new Date().getFullYear()} Wavegram · Plateforme MK Social Network</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  const textContent = `${nameGreeting}\n\n${intro}\n\nVotre code de vérification Wavegram : ${code}\nCe code est valable pendant 15 minutes.\n\nSi vous n'êtes pas à l'origine de cette demande, ignorez cet email.`;

  try {
    const { transporter, isRealSmtp } = await getTransporter();
    const fromAddress = process.env.SMTP_FROM || process.env.GMAIL_USER || '"Wavegram Sécurité" <no-reply@wavegram.app>';

    const info = await transporter.sendMail({
      from: fromAddress,
      to,
      subject,
      text: textContent,
      html: htmlContent,
    });

    const previewUrl = nodemailer.getTestMessageUrl(info) || undefined;
    console.log(`\n============================================================`);
    console.log(`[MK EMAIL DISPATCH] Destinataire: ${to}`);
    console.log(`[MK EMAIL DISPATCH] Code généré:  >>> ${code} <<<`);
    console.log(`[MK EMAIL DISPATCH] Mode relais:  ${isRealSmtp ? 'SMTP externe (Réel)' : 'Sandbox / Test'}`);
    if (previewUrl) {
      console.log(`[MK EMAIL DISPATCH] Aperçu Ethereal: ${previewUrl}`);
    }
    if (!isRealSmtp) {
      console.log(`[MK EMAIL DISPATCH] Astuce: Pour livrer directement sur Gmail, configurez GMAIL_USER et GMAIL_APP_PASSWORD dans .env`);
    }
    console.log(`============================================================\n`);

    return { success: true, isRealSmtp, previewUrl };
  } catch (err: any) {
    console.error(`[EMAIL ERROR] Échec de l'envoi de l'email à ${to}:`, err);
    return { success: false, isRealSmtp: false, error: err.message };
  }
}

