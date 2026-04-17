import{j as i}from"./iframe-ce5-efCb.js";import{u as l,M as o}from"./blocks-BgVWM2bA.js";import"./preload-helper-C1FmrZbK.js";import"./index-z7P5nfEw.js";function r(n){const e={code:"code",h1:"h1",h2:"h2",h3:"h3",li:"li",p:"p",ul:"ul",...l(),...n.components};return i.jsxs(i.Fragment,{children:[i.jsx(o,{title:"Foundations/Audit"}),`
`,i.jsx(e.h1,{id:"trinacria-ui-audit",children:"Trinacria UI Audit"}),`
`,i.jsx(e.p,{children:"Questo audit confronta i componenti correnti con le Foundations del design system."}),`
`,i.jsx(e.p,{children:"L'obiettivo non e elencare ogni differenza possibile, ma identificare le incoerenze che rischiano di far divergere il sistema nelle prossime iterazioni."}),`
`,i.jsx(e.h2,{id:"stato-attuale",children:"Stato attuale"}),`
`,i.jsx(e.p,{children:"Il DS e gia coerente su alcuni assi importanti:"}),`
`,i.jsxs(e.ul,{children:[`
`,i.jsx(e.li,{children:"tono generale sobrio e orientato a backoffice"}),`
`,i.jsx(e.li,{children:"densita compatta dei form"}),`
`,i.jsx(e.li,{children:"uso consistente di surface chiare e bordi leggeri"}),`
`,i.jsx(e.li,{children:"tassonomia componenti ordinata"}),`
`,i.jsx(e.li,{children:"Storybook e documentazione co-locata"}),`
`]}),`
`,i.jsx(e.p,{children:"Restano pero alcune aree da consolidare."}),`
`,i.jsx(e.h2,{id:"findings",children:"Findings"}),`
`,i.jsx(e.h3,{id:"f1-form-controls-duplicano-troppo-styling-base",children:"F1. Form controls duplicano troppo styling base"}),`
`,i.jsx(e.p,{children:"Componenti coinvolti:"}),`
`,i.jsxs(e.ul,{children:[`
`,i.jsx(e.li,{children:i.jsx(e.code,{children:"Input"})}),`
`,i.jsx(e.li,{children:i.jsx(e.code,{children:"Select"})}),`
`,i.jsx(e.li,{children:i.jsx(e.code,{children:"Textarea"})}),`
`,i.jsx(e.li,{children:i.jsx(e.code,{children:"NumberInput"})}),`
`,i.jsx(e.li,{children:i.jsx(e.code,{children:"DatePicker"})}),`
`,i.jsx(e.li,{children:i.jsx(e.code,{children:"TimePicker"})}),`
`]}),`
`,i.jsx(e.p,{children:"Problema:"}),`
`,i.jsxs(e.ul,{children:[`
`,i.jsx(e.li,{children:"stessi pattern di bordo, focus, disabled ed error sono riscritti in piu file"}),`
`,i.jsx(e.li,{children:"ogni nuova variante rischia di divergere in altezza, ring, padding o messaggi di stato"}),`
`]}),`
`,i.jsx(e.p,{children:"Direzione:"}),`
`,i.jsxs(e.ul,{children:[`
`,i.jsxs(e.li,{children:["introdurre una primitive o utility ",i.jsx(e.code,{children:"form-control"})," condivisa"]}),`
`,i.jsx(e.li,{children:"tenere separati layout, chrome e stato semantico"}),`
`]}),`
`,i.jsx(e.p,{children:"Priorita: alta"}),`
`,i.jsx(e.h3,{id:"f2-alcuni-componenti-usano-ancora-colori-hardcoded-invece-di-token-semantici",children:"F2. Alcuni componenti usano ancora colori hardcoded invece di token semantici"}),`
`,i.jsx(e.p,{children:"Componenti coinvolti:"}),`
`,i.jsxs(e.ul,{children:[`
`,i.jsx(e.li,{children:i.jsx(e.code,{children:"Button"})}),`
`,i.jsx(e.li,{children:i.jsx(e.code,{children:"Switch"})}),`
`,i.jsx(e.li,{children:i.jsx(e.code,{children:"Checkbox"})}),`
`,i.jsx(e.li,{children:i.jsx(e.code,{children:"RadioGroup"})}),`
`,i.jsx(e.li,{children:i.jsx(e.code,{children:"DatePicker"})}),`
`,i.jsx(e.li,{children:i.jsx(e.code,{children:"TimePicker"})}),`
`,i.jsx(e.li,{children:i.jsx(e.code,{children:"AdminShell"})}),`
`,i.jsx(e.li,{children:i.jsx(e.code,{children:"JsonView"})}),`
`]}),`
`,i.jsx(e.p,{children:"Problema:"}),`
`,i.jsxs(e.ul,{children:[`
`,i.jsxs(e.li,{children:["diversi elementi usano ancora ",i.jsx(e.code,{children:"slate-*"}),", ",i.jsx(e.code,{children:"white"})," o valori hardcoded"]}),`
`,i.jsx(e.li,{children:"il sistema e coerente visivamente oggi, ma meno governabile domani"}),`
`]}),`
`,i.jsx(e.p,{children:"Direzione:"}),`
`,i.jsxs(e.ul,{children:[`
`,i.jsx(e.li,{children:"spostare progressivamente i casi ricorrenti verso token semantici"}),`
`,i.jsx(e.li,{children:"introdurre token specifici per action primary, interactive hover, overlay e code surface"}),`
`]}),`
`,i.jsx(e.p,{children:"Priorita: alta"}),`
`,i.jsx(e.h3,{id:"f3-manca-una-primitive-overlaypopup-riusabile",children:"F3. Manca una primitive overlay/popup riusabile"}),`
`,i.jsx(e.p,{children:"Componenti coinvolti:"}),`
`,i.jsxs(e.ul,{children:[`
`,i.jsx(e.li,{children:i.jsx(e.code,{children:"Dialog"})}),`
`,i.jsx(e.li,{children:i.jsx(e.code,{children:"DatePicker"})}),`
`,i.jsx(e.li,{children:i.jsx(e.code,{children:"TimePicker"})}),`
`]}),`
`,i.jsx(e.p,{children:"Problema:"}),`
`,i.jsxs(e.ul,{children:[`
`,i.jsx(e.li,{children:"modal e picker usano layer elevati con logiche e shadow simili ma non condivise"}),`
`,i.jsxs(e.li,{children:["il sistema non ha ancora una famiglia esplicita di ",i.jsx(e.code,{children:"popover"}),", ",i.jsx(e.code,{children:"drawer"}),", ",i.jsx(e.code,{children:"overlay-surface"})]}),`
`]}),`
`,i.jsx(e.p,{children:"Direzione:"}),`
`,i.jsxs(e.ul,{children:[`
`,i.jsxs(e.li,{children:["creare primitive ",i.jsx(e.code,{children:"OverlaySurface"})," o ",i.jsx(e.code,{children:"Popover"})]}),`
`,i.jsx(e.li,{children:"centralizzare radius, border, shadow, offset e dismiss behavior"}),`
`]}),`
`,i.jsx(e.p,{children:"Priorita: alta"}),`
`,i.jsx(e.h3,{id:"f4-le-card-avevano-una-gerarchia-tipografica-troppo-editoriale",children:"F4. Le card avevano una gerarchia tipografica troppo editoriale"}),`
`,i.jsx(e.p,{children:"Stato:"}),`
`,i.jsxs(e.ul,{children:[`
`,i.jsx(e.li,{children:"corretto in questo passaggio"}),`
`]}),`
`,i.jsx(e.p,{children:"Problema originale:"}),`
`,i.jsxs(e.ul,{children:[`
`,i.jsxs(e.li,{children:[i.jsx(e.code,{children:"CardTitle"})," usava ",i.jsx(e.code,{children:"text-2xl"}),", eccessivo per moduli operativi standard"]}),`
`]}),`
`,i.jsx(e.p,{children:"Esito:"}),`
`,i.jsxs(e.ul,{children:[`
`,i.jsx(e.li,{children:"riallineato a una scala piu vicina alla shell e alle section header"}),`
`]}),`
`,i.jsx(e.p,{children:"Priorita residua: chiusa"}),`
`,i.jsx(e.h3,{id:"f5-alcuni-micro-componenti-erano-troppo-elevati",children:"F5. Alcuni micro-componenti erano troppo “elevati”"}),`
`,i.jsx(e.p,{children:"Componenti coinvolti:"}),`
`,i.jsxs(e.ul,{children:[`
`,i.jsx(e.li,{children:i.jsx(e.code,{children:"Badge"})}),`
`]}),`
`,i.jsx(e.p,{children:"Stato:"}),`
`,i.jsxs(e.ul,{children:[`
`,i.jsx(e.li,{children:"corretto in questo passaggio"}),`
`]}),`
`,i.jsx(e.p,{children:"Problema originale:"}),`
`,i.jsxs(e.ul,{children:[`
`,i.jsx(e.li,{children:"badge con ombra, in contrasto con la regola che riserva l'elevazione a layer e superfici"}),`
`]}),`
`,i.jsx(e.p,{children:"Esito:"}),`
`,i.jsxs(e.ul,{children:[`
`,i.jsx(e.li,{children:"rimossa l'ombra"}),`
`]}),`
`,i.jsx(e.p,{children:"Priorita residua: chiusa"}),`
`,i.jsx(e.h3,{id:"f6-story-e-demo-interne-non-sono-ancora-completamente-disciplinate-dal-ds",children:"F6. Story e demo interne non sono ancora completamente disciplinate dal DS"}),`
`,i.jsx(e.p,{children:"Componenti coinvolti:"}),`
`,i.jsxs(e.ul,{children:[`
`,i.jsx(e.li,{children:"alcune story di foundations e field examples"}),`
`]}),`
`,i.jsx(e.p,{children:"Problema:"}),`
`,i.jsxs(e.ul,{children:[`
`,i.jsx(e.li,{children:"in alcuni casi gli esempi usano markup o classi ad hoc invece di comporre componenti del sistema"}),`
`]}),`
`,i.jsx(e.p,{children:"Direzione:"}),`
`,i.jsxs(e.ul,{children:[`
`,i.jsx(e.li,{children:"trattare le story come esempi canonici, non come sandbox locali"}),`
`,i.jsx(e.li,{children:"evitare snippet raw dove esiste gia un componente DS"}),`
`]}),`
`,i.jsx(e.p,{children:"Priorita: media"}),`
`,i.jsx(e.h3,{id:"f7-il-sistema-form-non-ha-ancora-regole-accessibili-complete-per-tastiera-e-focus-management",children:"F7. Il sistema form non ha ancora regole accessibili complete per tastiera e focus management"}),`
`,i.jsx(e.p,{children:"Componenti coinvolti:"}),`
`,i.jsxs(e.ul,{children:[`
`,i.jsx(e.li,{children:i.jsx(e.code,{children:"DatePicker"})}),`
`,i.jsx(e.li,{children:i.jsx(e.code,{children:"TimePicker"})}),`
`,i.jsx(e.li,{children:i.jsx(e.code,{children:"DateTimePicker"})}),`
`,i.jsx(e.li,{children:i.jsx(e.code,{children:"Dialog"})}),`
`]}),`
`,i.jsx(e.p,{children:"Problema:"}),`
`,i.jsxs(e.ul,{children:[`
`,i.jsx(e.li,{children:"i componenti funzionano, ma non sono ancora hardenizzati come controlli complessi enterprise-grade"}),`
`]}),`
`,i.jsx(e.p,{children:"Direzione:"}),`
`,i.jsxs(e.ul,{children:[`
`,i.jsx(e.li,{children:"roving focus"}),`
`,i.jsx(e.li,{children:"keyboard navigation completa"}),`
`,i.jsx(e.li,{children:"focus trap per overlay quando serve"}),`
`,i.jsx(e.li,{children:"aria roles e annunci piu espliciti"}),`
`]}),`
`,i.jsx(e.p,{children:"Priorita: media"}),`
`,i.jsx(e.h2,{id:"azioni-consigliate",children:"Azioni consigliate"}),`
`,i.jsx(e.h3,{id:"sprint-1",children:"Sprint 1"}),`
`,i.jsxs(e.ul,{children:[`
`,i.jsxs(e.li,{children:["creare una primitive ",i.jsx(e.code,{children:"FormControlShell"})]}),`
`,i.jsx(e.li,{children:"introdurre token interattivi semantici"}),`
`,i.jsxs(e.li,{children:["estrarre una primitive ",i.jsx(e.code,{children:"Popover"})]}),`
`]}),`
`,i.jsx(e.h3,{id:"sprint-2",children:"Sprint 2"}),`
`,i.jsxs(e.ul,{children:[`
`,i.jsxs(e.li,{children:["rifattorizzare ",i.jsx(e.code,{children:"Button"}),", ",i.jsx(e.code,{children:"Switch"}),", ",i.jsx(e.code,{children:"Checkbox"}),", ",i.jsx(e.code,{children:"RadioGroup"})," su token interattivi"]}),`
`,i.jsxs(e.li,{children:["riallineare ",i.jsx(e.code,{children:"JsonView"})," e overlay scuri a token dedicati"]}),`
`,i.jsx(e.li,{children:"pulire le story che usano markup raw"}),`
`]}),`
`,i.jsx(e.h3,{id:"sprint-3",children:"Sprint 3"}),`
`,i.jsxs(e.ul,{children:[`
`,i.jsx(e.li,{children:"hardening accessibilita tastiera e focus"}),`
`,i.jsx(e.li,{children:"definire una checklist di review DS obbligatoria per nuovi componenti"}),`
`]}),`
`,i.jsx(e.h2,{id:"esito",children:"Esito"}),`
`,i.jsx(e.p,{children:"Il sistema non e disordinato: ha gia una direzione chiara."}),`
`,i.jsx(e.p,{children:"Il rischio attuale non e la mancanza di stile, ma la crescita per copie locali dello stesso pattern. La priorita quindi non e aggiungere molti altri componenti subito, ma consolidare primitive condivise per form, overlay e interaction tokens."})]})}function t(n={}){const{wrapper:e}={...l(),...n.components};return e?i.jsx(e,{...n,children:i.jsx(r,{...n})}):r(n)}export{t as default};
