# Configuration du Service Email

Le service email de COLISDIRECT permet d'envoyer des notifications automatiques lors des événements importants (candidatures de points relais, validations, etc.).

## Méthodes de configuration

Le service supporte deux méthodes d'envoi d'emails :

### 1. Via n8n Webhook (Recommandé)

Si vous utilisez n8n pour l'automatisation, vous pouvez créer un webhook qui recevra les données d'email et les enverra via votre service préféré.

**Configuration :**

Ajoutez dans votre `.env` ou dans les variables d'environnement Docker :

```env
N8N_EMAIL_WEBHOOK_URL=https://votre-n8n.com/webhook/email
```

**Format des données envoyées au webhook :**

```json
{
  "to": ["email@example.com"],
  "subject": "Sujet de l'email",
  "html": "<html>Contenu HTML</html>",
  "text": "Version texte"
}
```

### 2. Via SMTP Direct

Vous pouvez configurer l'envoi direct via SMTP (Gmail, SendGrid, Mailgun, etc.).

**Configuration :**

Ajoutez dans votre `.env` :

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=votre-email@gmail.com
SMTP_PASSWORD=votre-mot-de-passe-app
# Équivalent accepté par le backend si SMTP_PASSWORD est absent :
# SMTP_PASS=votre-mot-de-passe-app
EMAILS_FROM_EMAIL=noreply@colisdirect.com
```

Le code (`backend/src/services/emailService.ts`, `backend/src/routes/chatbot.ts`) utilise **`SMTP_PASSWORD`** en priorité, puis **`SMTP_PASS`** si le premier est vide.

**Exemples de configuration SMTP :**

**Gmail :**
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=votre-email@gmail.com
SMTP_PASSWORD=mot-de-passe-app-gmail
```

**SendGrid :**
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASSWORD=votre-api-key-sendgrid
```

**Mailgun :**
```env
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=postmaster@votre-domaine.mailgun.org
SMTP_PASSWORD=votre-mot-de-passe-mailgun
```

## Notifications Support Team

Pour recevoir les notifications de nouvelles candidatures, configurez :

```env
SUPPORT_EMAIL=support@colisdirect.com
```

## Emails envoyés automatiquement

Le système envoie automatiquement les emails suivants :

1. **Confirmation de soumission** : Lorsqu'un candidat soumet une candidature
2. **Approbation** : Lorsqu'un admin approuve une candidature
3. **Rejet** : Lorsqu'un admin rejette une candidature (avec raison)
4. **Notification support** : Lorsqu'une nouvelle candidature est soumise

## Désactivation

Si aucune configuration n'est fournie, le service enregistrera simplement les tentatives d'envoi dans les logs sans bloquer l'application. Les emails ne seront pas envoyés, mais l'application continuera de fonctionner normalement.

## Test

Pour tester la configuration, vous pouvez soumettre une candidature de point relais depuis le formulaire public. Les emails seront envoyés automatiquement.

## SMS et WhatsApp (optionnel)

Pour les notifications envoyées via n8n :

```env
N8N_SMS_WEBHOOK_URL=https://votre-n8n.com/webhook/sms
N8N_WHATSAPP_WEBHOOK_URL=https://votre-n8n.com/webhook/whatsapp
```

## Notes importantes

- Les envois d'emails sont **non-bloquants** : si l'envoi échoue, l'application continue de fonctionner
- Les erreurs d'envoi sont loggées mais n'affectent pas l'expérience utilisateur
- Pour Gmail, vous devrez utiliser un "Mot de passe d'application" au lieu de votre mot de passe normal

