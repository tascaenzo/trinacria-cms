# Baseline dei contratti pubblici — B0

Baseline interna verificata il 2 ottobre 2026, prima di qualsiasi rilascio. La versione
pubblica iniziale resta una decisione del gate G2; `0.1.0` nei package è la versione
corrente di sviluppo. Nessun alias legacy o finestra di deprecazione.

`exports.json` inventaria ogni simbolo per package, subpath, origine e stato:

| Stato | Uso |
| --- | --- |
| public | Contratti, helper manifest/admin/settings/security, DTO/errori, factory e token intenzionali; supportati nella futura linea beta |
| experimental | Subpath `/runtime`: composizione avanzata dell'host, servizi/repository e factory privilegiate; versionato con il package, escluso dal contratto dei servizi plugin |
| internal | Dichiarazioni raggiungibili nei `.d.ts` ma senza export da un entrypoint; nessun deep import consentito |

I file `*.api.txt` contengono le dichiarazioni emesse e le dipendenze relative
raggiungibili da ogni subpath. Includono anche tipi referenziati da firme pubbliche,
non soltanto nomi di simboli: una modifica a un DTO viene rilevata. Gli asset CSS
sono elencati separatamente. I contratti upstream Trinacria rimangono responsabilità
dei rispettivi package e versioni esatte.

Dopo una build completa, `npm run public-api:check` confronta baseline e codice,
compila la fixture TypeScript positiva/negativa e verifica versioni dei manifest,
requiresCore e range delle dipendenze/peer ufficiali, incluso l'admin. La CI ripete
il controllo su una build completa. `npm run public-api:update` aggiorna la baseline
solo dopo aver revisionato la diff: consegnare insieme snapshot, consumer e changelog.
Il controllo segnala qualsiasi differenza, senza vietare cambiamenti deliberati
prima della prima pubblicazione. OpenAPI/SDK hanno il controllo distinto B1.

Semver usa una dipendenza diretta kernel dalla libreria npm `semver`, senza loose
mode e senza includere prerelease implicitamente: `0.2.0` non soddisfa `^0.1.0`,
`0.2.0-beta.2` richiede un range che ammetta quel prerelease, ad esempio
`^0.2.0-beta.1`. I wrapper `isValidVersion`, `isValidVersionRange`, `satisfiesVersion`
sono disponibili dal subpath host `kernel/runtime`. Runtime core/dipendenze e
verifica delle versioni ufficiali usano la stessa semantica.

I plugin fidati usano `kernel/contracts`, `kernel/plugin-api` e PluginHostServices;
il codice browser usa helper condivisi e subpath `/admin` o `/admin-manifest`.
La root kernel conserva le primitive del framework per controller/moduli host;
la composizione CMS e le factory d'identità appartengono a `/runtime`. Nei pack,
root espone factory, manifest, contratti applicativi e DTO intenzionali: non i
repository o servizi raw. `/runtime` non è una sandbox né un permesso aggiuntivo.
