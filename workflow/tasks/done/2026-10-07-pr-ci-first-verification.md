# Prima verifica remota del consolidamento CMS

## Obiettivo

Aprire la PR verso `unstable`, correggere i problemi rilevati dal runner remoto e
verificare la CI completa sul commit candidato, conservando i report degli scenari.

## Area

`infra | docs`

## Milestone

`M8`

## Evidenze iniziali

- PR [#17](https://github.com/tascaenzo/trinacria-cms/pull/17), base `unstable`.
- Il primo run sul commit `7d9625c` supera build/Storybook/API ma fallisce la
  readiness del frontend esterno: Vite inserisce sequenze ANSI nel marker `Local:`.
- Il test normalizza il log prima di riconoscere il marker; conserva il log originale
  per la diagnostica. Verificato localmente il marker ANSI reale del log remoto.
- La ripetizione locale completa con colori forzati non può usare Mongo: Docker è
  spento e la connessione riceve `ECONNREFUSED`. Nessun risultato completo locale
  viene attribuito a questa ripetizione; il runner remoto dispone del replica set.
- Il run push `37582358965` raggiunge il catalogo ma supera il limite di 30 secondi
  prima della readiness IPC, che comprende anche bootstrap/auth/CRUD/lifecycle.
  Deadline portata a 120 secondi, con tutte le assertion e diagnostica conservate.

## Check

- [x] Vero Vite con `FORCE_COLOR=1`, senza `NO_COLOR`: marker ANSI riconosciuto e
  pagina HTTP verificata; processo/directory di prova rimossi. Biome/diff passati.
- [x] CI remota completa sul candidato `d97ff83`, PR e push: tutti i controlli verdi.
- [x] Report nove scenari, upgrade/restore e digest dei tarball scaricati e verificati.

Prima CI verde: [run PR 37582912912](https://github.com/tascaenzo/trinacria-cms/actions/runs/37582912912),
commit `d97ff83f5553d870934ad7b383dfb14ce468c8fd`; anche il run push `37582908865`
passa. Le integrazioni sono 45/45 senza skip, playground 12/12 e Chromium 28/28.
I log attestano nove scenari esterni, upgrade e restore completati.

Il download dell'artefatto iniziale contiene solo la diagnostica durevole: il default
`include-hidden-files:false` esclude i due report sotto `.tmp`. L'upload ora abilita
le cartelle nascoste solo per i tre percorsi redatti già elencati; il prossimo run
deve confermare i report realmente scaricabili, senza caricare backup o credenziali.

Il run `37584437615` sul commit `9733230` carica effettivamente i due JSON, ma
la suite editoriale rileva un test intermittente: le richieste attraversano un
cambio di minuto, creando due bucket legittimi invece dell'unico atteso dal test.
Il test ora usa l'orologio iniettabile già esistente nel limiter, mantenendo tutte
le richieste HTTP/Mongo reali; verifica anche che avanzare di un minuto riapra il
budget. Nessun comportamento di produzione è stato cambiato per questo problema.

Acceptance indipendente e staging restano aperte; questa verifica non le sostituisce.

## Esito finale del codice

Verifica completata il 7 ottobre 2026 sul commit
`937ebf63909d2d37391bab5994030485825439d1`:
[CI della PR](https://github.com/tascaenzo/trinacria-cms/actions/runs/37585415718) e
[CI del push](https://github.com/tascaenzo/trinacria-cms/actions/runs/37585408417) riuscite.

- 605 test ordinari passati, 34 opt-in esclusi nel profilo ordinario.
- 45 integrazioni Mongo/Redis/S3 e 12 playground, senza skip; 28 Chromium passati.
- Build 15/15, Storybook 11/11, contratti pubblici/SDK/dependency/signing/template passati.
- Nove scenari esterni completi con upgrade/restore; otto tarball con digest SHA-256
  e integrità npm registrati. Scaricati e validati i due JSON e la diagnostica durevole.

Artefatto [cms-foundation-evidence](https://github.com/tascaenzo/trinacria-cms/actions/runs/37585415718/artifacts/11467090707),
digest ZIP `sha256:1a823a9ea5942244dc318bad325f2b7bb0220744402242f73cacfeb2193da2cf`.
Report redatti scaricati in `.tmp/release/pr-17-evidence` e riepilogo locale in
`.tmp/release/pr-17-first-verification.json`. I backup e i segreti restano esclusi.

Il commit che registra questo esito aggiorna soltanto evidenze/documentazione;
non chiude D0 umano, staging o G2. La PR rimane aperta verso `unstable`.
