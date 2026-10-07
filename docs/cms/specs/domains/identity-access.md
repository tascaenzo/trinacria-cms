# Identità, ruoli e recupero accessi

Stato: implementato in beta, 2026-10-07. Decisioni e prove:
[audit funzionale](./functional-audit.md).

## Configurare un operatore

1. Dal backoffice Users creare l'account e inviare l'invito. L'operatore accetta
   il link e sceglie la password; l'invito non attribuisce automaticamente ruoli.
2. Aprire il dettaglio dell'utente e assegnare uno o più ruoli attivi.
3. Scegliere `author` per authoring, `reviewer` per revisioni assegnate,
   `content-manager` per gestione editoriale, `admin` per amministrazione completa.
   Verificare anche la policy di ownership del modello editoriale.
4. Per Media o altre funzioni, aggiungere un ruolo con permission specifiche.
   I grant del ruolo non sostituiscono le ACL degli asset.
5. Controllare le azioni consentite nel dettaglio utente e provare il login del
   destinatario. Rimuovere il ruolo o sospendere l'account quando necessario.

Un gestore anagrafico può ricevere `core-pack:backoffice:access`, `users:read` e
`users:write`. Non può assegnare ruoli. `roles:write` consente amministrazione IAM
piena e può ampliare privilegi: concederlo soltanto ad amministratori fidati.

Per impostazioni/template concedere accesso shell, Core settings read/write e
le permission del pack richieste dal percorso. Le API diagnostiche mantengono
permessi distinti. La lettura del proprio profilo, ruoli e permission non abilita
la rubrica o la shell per un account pubblico.

## Modificare un ruolo via API

Leggere il record aggiornato; inviare `expectedUpdatedAt` in PATCH e cambio
stato. Un `409 iam_revision_conflict` richiede ricaricamento e revisione della
scelta: non ripetere automaticamente una patch che sovrascriverebbe un altro
operatore. Il form UI gestisce il campo di revisione.

Deselezionare un grant di plugin crea un override deny, senza convertirlo in un
grant Core. Le policy manuali rimangono indipendenti. Un deny di un qualsiasi
ruolo prevale su allow provenienti dagli altri ruoli. Il ruolo `admin` e le
permission predefinite Core hanno protezioni API e UI.

`GET /v1/users/{id}/permissions` restituisce le azioni consentite globalmente;
con `?resourceId={recordId}` applica anche le condizioni di record. Lo SDK espone
il parametro in `security.listUserEffectivePermissions`.

## Recupero locale dell'amministratore

Usare la CLI installata con `@trinacria-cms/core-pack` sul server del CMS. Occorre
accesso al DB, non una sessione HTTP. Il comando è assente dalle API/plugin
operations. Richiede un account esistente e un CMS già installato.

1. Fermare le istanze CMS e verificare backup e nome del database da recuperare.
2. Caricare `MONGO_URI` nell'ambiente con il metodo di configurazione del server.
3. In zsh leggere la password senza mostrarla e passarla su stdin:

   ```sh
   read -rs 'recovery_password?Nuova password: '
   printf '%s\n' "$recovery_password" | cms-recover-admin \
     --database NOME_DATABASE --email amministratore@example.com
   unset recovery_password
   ```

   Password da 12 a 200 caratteri. Nessuna password negli argomenti del processo.
   Nel repository, dopo `npm run build`, il comando equivalente è
   `node packages/core-pack/scripts/recover-admin.mjs` con gli stessi flag.
4. Aggiungere `--reset-mfa` se il fattore è perso. Con policy MFA obbligatoria,
   il login successivo richiede un nuovo enrollment.
5. Conservare il risultato redatto nel registro dell'intervento, riavviare il
   CMS, accedere con la nuova password, verificare ruoli/permission e riconfigurare
   le assegnazioni del destinatario.

La transazione riattiva l'utente e il ruolo admin, ripristina i grant Core,
elimina le policy del ruolo admin, sostituisce le assegnazioni del destinatario
con il solo ruolo admin e revoca sessioni, challenge MFA e link account pendenti.
Non elimina utenti, dati editoriali o grant degli altri ruoli. `--reset-mfa`
disabilita soltanto il fattore del destinatario. Per recuperare due account
eseguire due interventi espliciti.

Se il catalogo permission Core è incompleto il recupero fallisce senza scritture
parziali: avviare il CMS per provisioning del catalogo e ripetere. La CLI non è
un nuovo setup e non ricostruisce un database cancellato.

## Contratti beta aggiornati

JWT precedenti senza `sessionVersion` richiedono un nuovo login; challenge MFA
precedenti non vengono conservati. PATCH ruolo ora richiede `expectedUpdatedAt`.
SDK e snapshot delle API sono aggiornati insieme al backend. Non riutilizzare
un SDK compilato prima di queste modifiche.
