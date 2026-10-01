# Compatibilità e sintassi Tailwind 4.3

Stato: `completed`

## Risultato

- Uniformati oltre mille riferimenti ai token alla sintassi `utility-(--token)`.
- Classi `break-words` e `bg-gradient-to-*` sostituite con `wrap-break-word`
  e `bg-linear-to-*`; `outline-hidden` conserva il focus in forced colors.
- Alias `rounded` sostituito con `rounded-sm` a parità di raggio nella versione corrente.
- Rimosse due configurazioni TypeScript legacy non caricate: le sorgenti attive
  rimangono le direttive CSS `@source` nel backoffice e in Storybook.
- Guardrail compatibilità incluso nel check completo; controlli di superfici e
  asserzioni dei componenti aggiornati alla sintassi condivisa.

## Verifica

- Confrontate con il compilatore Tailwind installato 98 coppie distinte di classi
  per token: dichiarazioni CSS identiche prima/dopo la conversione.
- `npm run check`: format, lint, typecheck, 463 test ordinari e guardrail verdi.
- `npm run build`: 12 task passati; Storybook: 11 task passati.
- Verifica browser di toolbar, login e menu a 390 px, temi light/dark applicati;
  nessun overflow orizzontale. Snapshot visuali ispezionati.

Le classi `shadow-sm`, `rounded-sm` e le altre scale valide in Tailwind 4
mantengono il proprio significato attuale. Nessun downgrade o aggiornamento
forzato della libreria è stato introdotto.
