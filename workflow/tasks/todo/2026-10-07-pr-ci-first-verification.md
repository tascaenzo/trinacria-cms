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
  per la diagnostica. La verifica locale forza i colori per riprodurre il runner.

## Check

- [ ] Distribuzione esterna locale con `FORCE_COLOR=1`.
- [ ] CI remota completa sul candidato aggiornato.
- [ ] Report nove scenari, upgrade/restore e digest dei tarball scaricati e verificati.

Acceptance indipendente e staging restano aperte; questa verifica non le sostituisce.
