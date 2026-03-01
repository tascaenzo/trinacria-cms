# 0005 - DB astrazione e isolamento plugin

## Obiettivo

Evitare che i plugin accedano direttamente al database globale e impedire scritture fuori dal proprio dominio.

## Contratti core

Nel `core` esistono contratti DB agnostici:

- `DbClient`
- `DbCollection`
- `NamespacedDbFactory`

I plugin devono usare questi contratti, non Mongoose/driver direttamente.

## Isolamento namespace

Quando un plugin viene registrato, il kernel inietta nel suo scope un DB client isolato:

- se il provider DB supporta `forNamespace(...)`, viene usato il namespace plugin
- altrimenti il kernel applica un prefisso automatico alle collection (`pluginId__collectionName`)

Questo impedisce collisioni tra plugin e riduce il rischio di scritture non autorizzate.

## Regola pratica

- default: plugin solo su porte astratte del core
- eccezioni storage-specific: solo con capability dichiarata nel manifest
