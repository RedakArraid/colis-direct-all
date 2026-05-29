/**
 * Email Service
 * Handles sending emails for various events (candidate applications, notifications, etc.)
 * Can use n8n webhooks, SMTP, or external email services
 */

interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

interface SMSOptions {
  to: string;
  message: string;
}

class EmailService {
  private n8nWebhookUrl: string | null;
  private smtpConfig: any;

  constructor() {
    // Check for n8n webhook URL from environment
    this.n8nWebhookUrl = process.env.N8N_EMAIL_WEBHOOK_URL || null;
    
    // SMTP configuration (if using direct SMTP)
    this.smtpConfig = {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD || process.env.SMTP_PASS,
      },
    };
  }

  /**
   * Send email via n8n webhook or SMTP
   */
  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      // Try n8n webhook first if available
      if (this.n8nWebhookUrl) {
        return await this.sendViaN8N(options);
      }

      // Fallback to SMTP if configured
      if (this.smtpConfig.host) {
        return await this.sendViaSMTP(options);
      }

      // If neither is configured, log and return false (don't fail)
      console.warn('Email service not configured. Email not sent:', options.subject);
      return false;
    } catch (error: any) {
      console.error('Error sending email:', error);
      return false;
    }
  }

  /**
   * Send email via n8n webhook
   */
  private async sendViaN8N(options: EmailOptions): Promise<boolean> {
    try {
      const response = await fetch(this.n8nWebhookUrl!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: Array.isArray(options.to) ? options.to : [options.to],
          subject: options.subject,
          html: options.html,
          text: options.text || options.html.replace(/<[^>]*>/g, ''), // Strip HTML for text version
        }),
      });

      return response.ok;
    } catch (error) {
      console.error('N8N webhook error:', error);
      return false;
    }
  }

  /**
   * Send email via SMTP
   */
  private async sendViaSMTP(options: EmailOptions): Promise<boolean> {
    try {
      // Dynamically import nodemailer only if needed
      const nodemailer = await import('nodemailer');
      
      const transporter = nodemailer.default.createTransport({
        host: this.smtpConfig.host,
        port: this.smtpConfig.port,
        secure: this.smtpConfig.secure,
        auth: this.smtpConfig.auth,
      });

      const recipients = Array.isArray(options.to) ? options.to : [options.to];
      
      for (const recipient of recipients) {
        await transporter.sendMail({
          from: process.env.EMAILS_FROM_EMAIL || 'noreply@colisdirect.com',
          to: recipient,
          subject: options.subject,
          html: options.html,
          text: options.text || options.html.replace(/<[^>]*>/g, ''),
        });
      }

      return true;
    } catch (error) {
      console.error('SMTP error:', error);
      return false;
    }
  }

  /**
   * Send application submission confirmation email
   */
  async sendApplicationSubmittedEmail(application: any): Promise<boolean> {
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #FF6C00; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
            .info-box { background: white; padding: 15px; margin: 15px 0; border-radius: 5px; border-left: 4px solid #FF6C00; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>COLISDIRECT</h1>
              <p>Votre candidature a été reçue</p>
            </div>
            <div class="content">
              <p>Bonjour ${application.applicant_first_name} ${application.applicant_last_name},</p>
              
              <p>Nous avons bien reçu votre candidature pour devenir point relais COLISDIRECT.</p>
              
              <div class="info-box">
                <strong>Détails de votre candidature :</strong><br>
                Commerce : ${application.business_name}<br>
                Type : ${application.business_type}<br>
                Localisation : ${application.commune}, ${application.quartier}<br>
                Date de soumission : ${new Date(application.created_at).toLocaleDateString('fr-FR')}
              </div>
              
              <p>Notre équipe va examiner votre candidature dans les plus brefs délais. Vous recevrez une notification par email dès que votre dossier sera traité.</p>
              
              <p>Numéro de suivi de candidature : <strong>${application.id}</strong></p>
              
              <p>En cas de questions, n'hésitez pas à nous contacter.</p>
              
              <p>Cordialement,<br>L'équipe COLISDIRECT</p>
            </div>
            <div class="footer">
              <p>Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({
      to: application.email,
      subject: 'Votre candidature Point Relais COLISDIRECT a été reçue',
      html: emailHtml,
    });
  }

  /**
   * Send application approval email (inclut l’accès espace partenaire : compte nouveau ou existant)
   */
  async sendApplicationApprovedEmail(
    application: any,
    relayPointId: string,
    onboarding?: { isNewAccount: boolean; temporaryPassword?: string }
  ): Promise<boolean> {
    const baseUrl = (process.env.FRONTEND_URL || '').replace(/\/$/, '');
    const loginHref = baseUrl ? `${baseUrl}/login` : '';

    const accessSection =
      onboarding?.isNewAccount && onboarding.temporaryPassword
        ? `
        <div class="success-box">
          <strong>Connexion à votre espace partenaire</strong><br><br>
          E-mail : <strong>${application.email}</strong><br>
          Mot de passe temporaire : <strong>${onboarding.temporaryPassword}</strong><br><br>
          Merci de vous connecter et de modifier ce mot de passe dès que possible.
          ${loginHref ? `<p><a class="button" href="${loginHref}">Se connecter</a></p>` : ''}
        </div>`
        : onboarding && !onboarding.isNewAccount
          ? `
        <div class="success-box">
          <strong>Votre compte COLISDIRECT a été lié à ce point relais.</strong><br><br>
          Connectez-vous avec l’e-mail habituel de votre compte : <strong>${application.email}</strong>.
          Vous accédez désormais au tableau de bord partenaire après connexion.
          ${loginHref ? `<p><a class="button" href="${loginHref}">Accéder à l’espace partenaire</a></p>` : ''}
        </div>`
          : '';

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #10b981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
            .success-box { background: #d1fae5; padding: 15px; margin: 15px 0; border-radius: 5px; border-left: 4px solid #10b981; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
            .button { display: inline-block; background: #FF6C00; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Félicitations !</h1>
              <p>Votre candidature a été approuvée</p>
            </div>
            <div class="content">
              <p>Bonjour ${application.applicant_first_name} ${application.applicant_last_name},</p>
              
              <div class="success-box">
                <strong>Excellente nouvelle !</strong><br>
                Votre candidature pour devenir point relais COLISDIRECT a été approuvée.
              </div>
              
              <p>Votre commerce «&nbsp;<strong>${application.business_name}</strong>&nbsp;» est maintenant enregistré comme point relais COLISDIRECT.</p>
              
              ${accessSection}

              <p><strong>Prochaines étapes :</strong></p>
              <ul>
                <li>Utiliser votre espace partenaire pour gérer la réception et les retraits de colis</li>
                <li>Notre équipe peut vous contacter pour la formation et la mise en place</li>
              </ul>
              
              <p>Identifiant du point relais : <strong>${relayPointId}</strong></p>
              
              <p>Bienvenue dans le réseau COLISDIRECT !</p>
              
              <p>Cordialement,<br>L'équipe COLISDIRECT</p>
            </div>
            <div class="footer">
              <p>Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({
      to: application.email,
      subject: 'Félicitations ! Votre candidature Point Relais a été approuvée',
      html: emailHtml,
    });
  }

  /**
   * Send application rejection email
   */
  async sendApplicationRejectedEmail(application: any, reason?: string): Promise<boolean> {
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #ef4444; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
            .info-box { background: white; padding: 15px; margin: 15px 0; border-radius: 5px; border-left: 4px solid #ef4444; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>COLISDIRECT</h1>
              <p>Décision concernant votre candidature</p>
            </div>
            <div class="content">
              <p>Bonjour ${application.applicant_first_name} ${application.applicant_last_name},</p>
              
              <p>Nous avons examiné votre candidature pour devenir point relais COLISDIRECT.</p>
              
              ${reason ? `
                <div class="info-box">
                  <strong>Raison :</strong><br>
                  ${reason}
                </div>
              ` : ''}
              
              <p>Malheureusement, nous ne pouvons pas retenir votre candidature à ce jour.</p>
              
              <p>Nous vous remercions néanmoins pour votre intérêt et vous encourageons à nous recontacter si votre situation change.</p>
              
              <p>Cordialement,<br>L'équipe COLISDIRECT</p>
            </div>
            <div class="footer">
              <p>Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({
      to: application.email,
      subject: 'Décision concernant votre candidature Point Relais COLISDIRECT',
      html: emailHtml,
    });
  }

  /**
   * Notify support team of new application
   */
  async notifySupportNewApplication(application: any): Promise<boolean> {
    const supportEmail = process.env.SUPPORT_EMAIL || 'support@colisdirect.com';
    
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #FF6C00; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
            .info-box { background: white; padding: 15px; margin: 15px 0; border-radius: 5px; border-left: 4px solid #FF6C00; }
            .button { display: inline-block; background: #FF6C00; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Nouvelle candidature Point Relais</h1>
            </div>
            <div class="content">
              <p>Une nouvelle candidature de point relais a été soumise.</p>
              
              <div class="info-box">
                <strong>Détails :</strong><br>
                Demandeur : ${application.applicant_first_name} ${application.applicant_last_name}<br>
                Commerce : ${application.business_name}<br>
                Type : ${application.business_type}<br>
                Localisation : ${application.commune}, ${application.quartier}<br>
                Contact : ${application.phone} / ${application.email}<br>
                Date : ${new Date(application.created_at).toLocaleString('fr-FR')}
              </div>
              
              ${application.latitude && application.longitude ? `
                <p>
                  <a href="https://www.openstreetmap.org/?mlat=${application.latitude}&mlon=${application.longitude}#map=16/${application.latitude}/${application.longitude}" 
                     class="button" target="_blank">
                    Voir sur la carte
                  </a>
                </p>
              ` : ''}
              
              <p>Veuillez examiner cette candidature dans l'interface d'administration.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({
      to: supportEmail,
      subject: `[COLISDIRECT] Nouvelle candidature : ${application.business_name}`,
      html: emailHtml,
    });
  }

  // ─── SMS / WhatsApp via n8n ────────────────────────────────────────────────

  async sendSMS(options: SMSOptions): Promise<boolean> {
    const webhookUrl = process.env.N8N_SMS_WEBHOOK_URL;
    if (!webhookUrl) {
      console.warn('[SMS] N8N_SMS_WEBHOOK_URL non configuré — SMS non envoyé à:', options.to);
      return false;
    }
    try {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: options.to, message: options.message, channel: 'sms' }),
      });
      return res.ok;
    } catch (err) {
      console.error('[SMS] Erreur envoi SMS:', err);
      return false;
    }
  }

  async sendWhatsApp(options: SMSOptions): Promise<boolean> {
    const webhookUrl = process.env.N8N_WHATSAPP_WEBHOOK_URL;
    if (!webhookUrl) {
      console.warn('[WhatsApp] N8N_WHATSAPP_WEBHOOK_URL non configuré — message non envoyé à:', options.to);
      return false;
    }
    try {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: options.to, message: options.message, channel: 'whatsapp' }),
      });
      return res.ok;
    } catch (err) {
      console.error('[WhatsApp] Erreur:', err);
      return false;
    }
  }

  // Essaie WhatsApp d'abord, SMS en fallback
  async sendNotification(phone: string, message: string): Promise<void> {
    if (!phone) return;
    const sent = await this.sendWhatsApp({ to: phone, message });
    if (!sent) await this.sendSMS({ to: phone, message });
  }
}

export default new EmailService();

