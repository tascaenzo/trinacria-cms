import type { EmailTemplateSeed } from "./email-templates.types.js";

export const EMAIL_PACK_DEFAULT_EMAIL_TEMPLATES: readonly EmailTemplateSeed[] = [
  {
    key: "generic_notification",
    locale: "it",
    name: "Notifica generica",
    description: "Template neutro per notifiche di sistema.",
    subject: "{{siteName}} - {{title}}",
    textBody: ["Ciao {{recipientName}},", "", "{{message}}", "", "Grazie,", "{{siteName}}"].join(
      "\n"
    ),
    htmlBody: [
      "<p>Ciao {{recipientName}},</p>",
      "<p>{{message}}</p>",
      "<p>Grazie,<br>{{siteName}}</p>"
    ].join("\n"),
    variables: ["recipientName", "siteName", "title", "message"]
  },
  {
    key: "reset_password",
    locale: "it",
    name: "Reset password",
    description: "Email inviata quando un utente richiede il reset della password.",
    subject: "{{siteName}} - Reset password",
    textBody: [
      "Ciao {{recipientName}},",
      "",
      "Abbiamo ricevuto una richiesta di reset password per il tuo account.",
      "Apri questo link per scegliere una nuova password:",
      "{{resetUrl}}",
      "",
      "Il link scade il {{expiresAt}}.",
      "Se non hai richiesto tu questa operazione, puoi ignorare questa email.",
      "",
      "{{siteName}}"
    ].join("\n"),
    htmlBody: [
      "<p>Ciao {{recipientName}},</p>",
      "<p>Abbiamo ricevuto una richiesta di reset password per il tuo account.</p>",
      '<p><a href="{{resetUrl}}">Scegli una nuova password</a></p>',
      "<p>Il link scade il {{expiresAt}}.</p>",
      "<p>Se non hai richiesto tu questa operazione, puoi ignorare questa email.</p>",
      "<p>{{siteName}}</p>"
    ].join("\n"),
    variables: ["recipientName", "siteName", "resetUrl", "expiresAt"]
  },
  {
    key: "user_invite",
    locale: "it",
    name: "Invito utente",
    description: "Email inviata per invitare un nuovo utente nel backoffice.",
    subject: "{{siteName}} - Invito al backoffice",
    textBody: [
      "Ciao {{recipientName}},",
      "",
      "{{inviterName}} ti ha invitato ad accedere a {{siteName}}.",
      "Apri questo link per completare l'attivazione:",
      "{{inviteUrl}}",
      "",
      "Il link scade il {{expiresAt}}.",
      "",
      "{{siteName}}"
    ].join("\n"),
    htmlBody: [
      "<p>Ciao {{recipientName}},</p>",
      "<p>{{inviterName}} ti ha invitato ad accedere a {{siteName}}.</p>",
      '<p><a href="{{inviteUrl}}">Completa l\'attivazione</a></p>',
      "<p>Il link scade il {{expiresAt}}.</p>",
      "<p>{{siteName}}</p>"
    ].join("\n"),
    variables: ["recipientName", "siteName", "inviterName", "inviteUrl", "expiresAt"]
  },
  {
    key: "email_verification",
    locale: "it",
    name: "Verifica email",
    description: "Email inviata per confermare l'indirizzo email di un utente.",
    subject: "{{siteName}} - Verifica email",
    textBody: [
      "Ciao {{recipientName}},",
      "",
      "Conferma il tuo indirizzo email aprendo questo link:",
      "{{verificationUrl}}",
      "",
      "Il link scade il {{expiresAt}}.",
      "",
      "{{siteName}}"
    ].join("\n"),
    htmlBody: [
      "<p>Ciao {{recipientName}},</p>",
      "<p>Conferma il tuo indirizzo email aprendo questo link:</p>",
      '<p><a href="{{verificationUrl}}">Verifica email</a></p>',
      "<p>Il link scade il {{expiresAt}}.</p>",
      "<p>{{siteName}}</p>"
    ].join("\n"),
    variables: ["recipientName", "siteName", "verificationUrl", "expiresAt"]
  }
];
