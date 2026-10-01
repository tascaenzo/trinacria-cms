# M7 — Consolidamento Editorial, Media e qualità

Stato: `completed`

## Obiettivo

Rendere la beta avanzata verificabile nei flussi di dominio e riallineare i piani al codice presente.

## Task

- [x] [Consolidamento qualità](../tasks/done/2026-10-01-project-quality-hardening.md)
- [x] [Unificazione UI](../tasks/done/2026-10-01-cms-ui-consistency.md)
- [x] [Compatibilità Tailwind](../tasks/done/2026-10-01-tailwind-compatibility.md)

Il consolidamento backend conserva i propri risultati di verifica. Gli interventi UI/Tailwind
successivi sono registrati separatamente; il riepilogo corrente è in `docs/project-quality-status.md`.

## Criterio di chiusura

Ownership e restore protetti, slug facoltativi corretti, storico atomico e concorrente,
modelli popolati protetti da cambi distruttivi, confini backend/admin verificati,
bundle suddiviso e suite unità/integrazione/browser verde.

## Fonti aggiornate

- `docs/project-quality-status.md`
- `docs/cms/it/0023-editorial-operazioni.md`

## Lavoro prodotto successivo

Metodi SDK editoriali generati, tassonomie dedicate, scheduling automatico, migrazioni guidate
ed estensione della matrice E2E alle altre superfici backoffice. Le milestone precedenti
conservano il significato storico; questa chiusura non certifica una release production stable.
