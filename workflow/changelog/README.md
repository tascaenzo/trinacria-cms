# Changelog Operativo

Questa directory tiene traccia dell'avanzamento per milestone, non piu come log
giornaliero verboso.

## Regola

Ogni milestone ha un changelog dedicato:

```text
workflow/changelog/M<n>-<slug>.md
```

Il file `CHANGELOG.md` resta un indice sintetico delle milestone e punta ai
changelog dedicati.

## Formato milestone

All'apertura della milestone:

- checklist dei punti previsti
- criteri di chiusura
- rischi o decisioni aperte

Durante lo sviluppo:

- si spuntano le checkbox
- si aggiungono solo note operative essenziali

Alla chiusura:

- riepilogo descrittivo di cosa e stato introdotto
- test/check eseguiti
- follow-up rimasti

Questo evita che il changelog globale diventi una cronologia troppo rumorosa.
