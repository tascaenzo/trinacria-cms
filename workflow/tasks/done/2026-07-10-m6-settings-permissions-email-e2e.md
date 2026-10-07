# M6 Settings, Permission Center And Email E2E

## Obiettivo

Validare le principali superfici operative del backoffice basate su admin contributions.

## Scope

- settings generici e valori tipizzati
- autorizzazioni dei plugin
- email provider settings
- email template preview e salvataggio
- `/v1/admin/extensions` come sorgente primaria e fallback legacy controllato

## Check

- `npm run e2e -- --grep "settings|permission|email|extensions"`

## Avanzamento

- [x] guard e risposta `/v1/admin/extensions`
- [x] snapshot OpenAPI e metodo SDK `system.listAdminExtensions()`
- [x] catalogo settings e definizione permission grant senza leakage secret
- [x] seed e preview template email con variabili renderizzate
- [x] write flow UI settings, controlli accesso ed email template editor

## Verifica completata

- `npm run e2e:ci`: write flow settings, controlli accesso e template email passati
