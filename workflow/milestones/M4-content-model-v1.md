# M4 - Content Model V1

## Obiettivo

Introdurre il primo vero dominio contenuti del CMS: definizione di content type, entries persistite, validazione e API amministrative minime.

## Perimetro

- modello content type
- modello entry
- persistenza Mongo e contratti DTO
- API amministrative e primi flussi backoffice

## Task inclusi

- [ ] `2026-04-06-content-domain-adr-and-bounded-context.md`
- [ ] `2026-04-06-content-types-foundation.md`
- [ ] `2026-04-06-content-entries-persistence-and-api.md`
- [ ] `2026-04-06-content-admin-ui-v1.md`
- [ ] `2026-04-06-content-openapi-sdk-and-docs.md`

## Dipendenze

- completamento di `M1`
- preferibilmente completamento di `M2` per sfruttare settings e config in modo coerente
- decisione su quale plugin ospitera il dominio contenuti iniziale

## Criterio di chiusura

- esiste un dominio contenuti formalizzato e documentato
- si possono definire content type e creare entries valide
- il dominio e esposto via API e SDK
- il backoffice consente almeno gestione base di content type ed entries

## Note

Questa e la milestone che sposta il progetto da CMS infrastructure a CMS applicativo.
