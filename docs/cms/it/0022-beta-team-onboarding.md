# 0022 - Beta team onboarding: primo verticale prodotto

Questa guida definisce il primo caso d'uso beta di Trinacria CMS: una squadra
inizializza l'istanza, configura il workspace, invita un collega e ne governa
l'accesso attraverso ruoli, impostazioni e lifecycle dei plugin.

L'obiettivo non e aggiungere un nuovo dominio artificiale: e rendere verificabile
il percorso che ogni team deve completare prima di portare il CMS in beta.

## Risultato atteso

Al termine un amministratore puo:

1. inizializzare l'istanza e accedere al backoffice;
2. impostare nome, lingua, timezone e configurazione email;
3. creare o invitare un membro;
4. assegnare e verificare ruolo e permission grant;
5. configurare un plugin di onboarding;
6. ispezionare stato, operazioni e audit lifecycle dei plugin.

## Avvio da zero

Segui il **Quick start** del
[plugin di riferimento](../../../examples/team-onboarding-plugin/README.md),
poi avvia il backoffice:

```bash
npm run dev:backoffice
```

Alla prima apertura il backoffice mostra il wizard di installazione. Crea il
primo amministratore: il passaggio effettua il bootstrap del catalogo settings,
dei ruoli baseline e della sessione operatore.

## Percorso operatore nel backoffice

### 1. Onboarding dell'istanza

Completa **Site settings** e **Administrator** nel wizard. Dopo il login, la
dashboard deve indicare runtime sano, plugin caricati e risorse admin visibili.

### 2. Impostazioni essenziali

Apri **Settings** e verifica:

- `site`, `branding` e `features` dal `core-pack`;
- provider e mittente del plugin email;
- se il plugin di riferimento e abilitato, la sezione **Team onboarding**.

Per una beta locale usa il provider email `console`. Per un ambiente condiviso,
configura SMTP e salva la password soltanto nella setting segreta dedicata.

### 3. Membri, ruoli e permessi

In **Users**, crea un membro o invia un invito. In **Roles** controlla il ruolo
assegnato e i grant. In **Permissions** verifica che le key siano namespaced;
quelle del plugin di riferimento iniziano con `team-onboarding:`.

Il plugin osserva l'evento pubblico `core-pack:user-invited`. Questo rende il
caso d'uso estendibile senza accoppiare il `core-pack` alla logica di onboarding.

### 4. Plugin e audit lifecycle

Apri **Plugins**. La pagina mostra inventario runtime, capability, dipendenze e
operazioni consentite. Selezionando un plugin si vedono i suoi eventi recenti:
register, load, unload, enable, disable e failure.

Questo e un audit **operativo del lifecycle**, non ancora un audit trail di
business immutabile. Qualunque requisito di compliance sugli inviti, sui ruoli o
sui dati deve essere implementato in un plugin di audit dedicato prima di un
rilascio regolamentato.

## Contratto per gli autori di plugin

Il plugin di riferimento in
[`examples/team-onboarding-plugin`](../../../examples/team-onboarding-plugin)
e il template minimo da copiare. Un plugin di produzione deve aggiungere:

1. entity e indici se conserva stato proprio;
2. service per policy e invarianti di dominio;
3. controller OpenAPI con response envelope standard;
4. rigenerazione e uso del client in `packages/sdk`;
5. test di manifest, policy, API e journey E2E;
6. renderer custom solo quando il manifest declarative non e sufficiente.

## Criteri di uscita dalla beta

- installazione, login, invito e recovery password passano in E2E;
- plugin e impostazioni vengono caricati da un checkout pulito;
- un operatore puo diagnosticare un plugin senza console o accesso diretto a Mongo;
- il percorso email e testato con provider console e con SMTP staging;
- backup/restore e hardening production sono eseguiti seguendo i runbook M6.

Quando questi criteri sono stabili, il prossimo dominio (editoriale, booking o
commerce) deve nascere come plugin separato usando questo stesso verticale come
baseline tecnica e di prodotto.
