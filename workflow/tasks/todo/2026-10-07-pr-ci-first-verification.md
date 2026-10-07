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

- [x] Marker Vite con colori ANSI riconosciuto; Biome e diff senza errori.
- [ ] CI remota completa sul candidato aggiornato.
- [ ] Report nove scenari, upgrade/restore e digest dei tarball scaricati e verificati.

Acceptance indipendente e staging restano aperte; questa verifica non le sostituisce.
