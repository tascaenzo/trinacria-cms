# Semplificazione della logica dei menu UI

Stato: `completed`

## Risultato

- Navigazione frecce/Home/End centralizzata in una utility interna, condivisa dai due menu.
- Contratto di selezione condiviso tramite contesto interno; rimosso il controllo DOM
  del click nel ContextMenu. Voci persistenti e selezioni annullate non chiudono il menu.
- Un solo handler tastiera per trigger dropdown standard/custom; ref tipizzato senza cast.
- Conservati API pubbliche, posizione, portal nel tema locale e ripristino del focus.

## Verifica

- Sei regressioni aggiunte: navigazione con disabilitati, wrapping/Home/End e assenza
  di voce attiva; selezione persistente/annullata; trigger standard e custom con Tab.
- 470 test ordinari passati (96 UI); check completo, build e Storybook verdi.
- Nessun nuovo giro delle integrazioni esterne o della suite E2E per questo intervento.
