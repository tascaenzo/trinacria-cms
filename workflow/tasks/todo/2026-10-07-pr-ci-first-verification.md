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
- [ ] Report nove scenari, upgrade/restore e digest dei tarball scaricati e verificati.

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
