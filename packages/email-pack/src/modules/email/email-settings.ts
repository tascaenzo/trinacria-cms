import type { JsonValue, PluginManifestSetting } from "@trinacria-cms/kernel";
import { EMAIL_PACK_PLUGIN_ID } from "../../plugin/email-pack.constants.js";

export const EMAIL_PACK_SETTING_DEFINITIONS: readonly PluginManifestSetting[] = Object.freeze([
  {
    key: `${EMAIL_PACK_PLUGIN_ID}:email:provider`,
    category: "email",
    description:
      "Email delivery provider. Use console for local development, smtp for production delivery, or disabled to block outbound email.",
    defaultValue: "console",
    schema: {
      type: "string",
      enum: ["disabled", "console", "smtp"]
    } as JsonValue,
    status: "active",
    visibility: "admin",
    mutable: true,
    secret: false
  },
  {
    key: `${EMAIL_PACK_PLUGIN_ID}:email:from_address`,
    category: "email",
    description: "Default sender address used for CMS transactional emails.",
    defaultValue: "no-reply@localhost",
    schema: {
      type: "string",
      minLength: 1,
      maxLength: 320
    } as JsonValue,
    status: "active",
    visibility: "admin",
    mutable: true,
    secret: false
  },
  {
    key: `${EMAIL_PACK_PLUGIN_ID}:email:from_name`,
    category: "email",
    description: "Default sender display name used for CMS transactional emails.",
    defaultValue: "Trinacria CMS",
    schema: {
      type: "string",
      maxLength: 120
    } as JsonValue,
    status: "active",
    visibility: "admin",
    mutable: true,
    secret: false
  },
  {
    key: `${EMAIL_PACK_PLUGIN_ID}:email:reply_to`,
    category: "email",
    description: "Optional reply-to address for outbound CMS emails.",
    defaultValue: "",
    schema: {
      type: "string",
      maxLength: 320
    } as JsonValue,
    status: "active",
    visibility: "admin",
    mutable: true,
    secret: false
  },
  {
    key: `${EMAIL_PACK_PLUGIN_ID}:email:smtp_host`,
    category: "email",
    description: "SMTP server host used when the email provider is smtp.",
    defaultValue: "",
    schema: {
      type: "string",
      maxLength: 255
    } as JsonValue,
    status: "active",
    visibility: "admin",
    mutable: true,
    secret: false
  },
  {
    key: `${EMAIL_PACK_PLUGIN_ID}:email:smtp_port`,
    category: "email",
    description: "SMTP server port used when the email provider is smtp.",
    defaultValue: 587,
    schema: {
      type: "number",
      minimum: 1,
      maximum: 65535
    } as JsonValue,
    status: "active",
    visibility: "admin",
    mutable: true,
    secret: false
  },
  {
    key: `${EMAIL_PACK_PLUGIN_ID}:email:smtp_secure`,
    category: "email",
    description: "Whether SMTP should use TLS from connection start.",
    defaultValue: false,
    schema: {
      type: "boolean"
    } as JsonValue,
    status: "active",
    visibility: "admin",
    mutable: true,
    secret: false
  },
  {
    key: `${EMAIL_PACK_PLUGIN_ID}:email:smtp_username`,
    category: "email",
    description: "Optional SMTP username used when the email provider is smtp.",
    defaultValue: "",
    schema: {
      type: "string",
      maxLength: 255
    } as JsonValue,
    status: "active",
    visibility: "admin",
    mutable: true,
    secret: false
  },
  {
    key: `${EMAIL_PACK_PLUGIN_ID}:email:smtp_password`,
    category: "email",
    description: "Encrypted SMTP password used when the email provider is smtp.",
    schema: {
      type: "string",
      maxLength: 1000
    } as JsonValue,
    status: "active",
    visibility: "admin",
    mutable: true,
    secret: true
  }
]);
