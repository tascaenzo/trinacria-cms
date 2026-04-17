import{j as e}from"./iframe-ce5-efCb.js";import{u as r,M as s}from"./blocks-BgVWM2bA.js";import"./preload-helper-C1FmrZbK.js";import"./index-z7P5nfEw.js";function o(n){const i={code:"code",h1:"h1",h2:"h2",li:"li",p:"p",ul:"ul",...r(),...n.components};return e.jsxs(e.Fragment,{children:[e.jsx(s,{title:"Foundations/Accessibility"}),`
`,e.jsx(i.h1,{id:"trinacria-ui-accessibility",children:"Trinacria UI Accessibility"}),`
`,e.jsxs(i.p,{children:["Questa pagina definisce la quality bar minima di accessibilita per i componenti di ",e.jsx(i.code,{children:"trinacria-ui"}),"."]}),`
`,e.jsx(i.p,{children:"L'obiettivo non e dichiarare conformita formale completa, ma evitare regressioni sistemiche mentre il design system cresce."}),`
`,e.jsx(i.h2,{id:"principi",children:"Principi"}),`
`,e.jsxs(i.ul,{children:[`
`,e.jsx(i.li,{children:"usare elementi HTML nativi quando coprono gia il comportamento richiesto"}),`
`,e.jsx(i.li,{children:"introdurre componenti custom solo se la semantica e la tastiera vengono ripristinate esplicitamente"}),`
`,e.jsx(i.li,{children:"non separare mai stato visivo e stato accessibile"}),`
`,e.jsx(i.li,{children:"trattare focus, nome accessibile, hint ed error come parte del contratto pubblico del componente"}),`
`]}),`
`,e.jsx(i.h2,{id:"requisiti-minimi-per-nuovi-componenti",children:"Requisiti minimi per nuovi componenti"}),`
`,e.jsxs(i.ul,{children:[`
`,e.jsxs(i.li,{children:["nome accessibile presente: testo visibile, ",e.jsx(i.code,{children:"label"}),", ",e.jsx(i.code,{children:"aria-label"})," o ",e.jsx(i.code,{children:"aria-labelledby"})]}),`
`,e.jsx(i.li,{children:"focus ring visibile e coerente con i token del DS"}),`
`,e.jsxs(i.li,{children:["stato ",e.jsx(i.code,{children:"disabled"})," reale e non solo visivo"]}),`
`,e.jsxs(i.li,{children:["stato ",e.jsx(i.code,{children:"error"})," collegato con ",e.jsx(i.code,{children:"aria-invalid"})," e messaggio associato"]}),`
`,e.jsxs(i.li,{children:["hint ed error collegati con ",e.jsx(i.code,{children:"aria-describedby"})," o ",e.jsx(i.code,{children:"aria-errormessage"})]}),`
`,e.jsx(i.li,{children:"navigazione tastiera completa per tutte le azioni interattive"}),`
`,e.jsxs(i.li,{children:["chiusura via ",e.jsx(i.code,{children:"Escape"})," per popup, dialog e picker"]}),`
`,e.jsx(i.li,{children:"ritorno del focus al trigger quando un overlay si chiude"}),`
`]}),`
`,e.jsx(i.h2,{id:"checklist-review",children:"Checklist review"}),`
`,e.jsxs(i.ul,{children:[`
`,e.jsx(i.li,{children:"Il componente usa l'elemento nativo corretto?"}),`
`,e.jsx(i.li,{children:"Il controllo ha un nome accessibile leggibile da screen reader?"}),`
`,e.jsx(i.li,{children:"Hint ed error vengono annunciati dal controllo?"}),`
`,e.jsx(i.li,{children:"Il focus entra, resta confinato e torna al punto corretto?"}),`
`,e.jsx(i.li,{children:"Il componente e usabile senza mouse?"}),`
`,e.jsxs(i.li,{children:["Gli stati ",e.jsx(i.code,{children:"disabled"}),", ",e.jsx(i.code,{children:"selected"}),", ",e.jsx(i.code,{children:"expanded"}),", ",e.jsx(i.code,{children:"checked"})," o ",e.jsx(i.code,{children:"invalid"})," sono esposti semanticamente?"]}),`
`,e.jsx(i.li,{children:"Storybook documenta almeno uno stato normale, uno errore e uno edge case?"}),`
`]}),`
`,e.jsx(i.h2,{id:"standard-correnti-del-ds",children:"Standard correnti del DS"}),`
`,e.jsxs(i.ul,{children:[`
`,e.jsxs(i.li,{children:[e.jsx(i.code,{children:"FormControlShell"})," genera id stabili e collega label, hint ed error ai campi"]}),`
`,e.jsxs(i.li,{children:[e.jsx(i.code,{children:"Dialog"})," espone ",e.jsx(i.code,{children:'role="dialog"'}),", ",e.jsx(i.code,{children:"aria-modal"}),", focus trap e restore focus"]}),`
`,e.jsxs(i.li,{children:[e.jsx(i.code,{children:"DatePicker"})," e ",e.jsx(i.code,{children:"TimePicker"})," espongono trigger con ",e.jsx(i.code,{children:"aria-expanded"}),"/",e.jsx(i.code,{children:"aria-controls"})," e dismiss coerente"]}),`
`,e.jsxs(i.li,{children:[e.jsx(i.code,{children:"DateTimePicker"})," tratta data e ora come gruppo semantico"]}),`
`]}),`
`,e.jsx(i.h2,{id:"gap-ancora-aperti",children:"Gap ancora aperti"}),`
`,e.jsxs(i.ul,{children:[`
`,e.jsx(i.li,{children:"il calendario custom non e ancora un'implementazione completa di date grid WCAG avanzata"}),`
`,e.jsxs(i.li,{children:["mancano test automatici con ",e.jsx(i.code,{children:"axe"})," o equivalenti nel flusso locale"]}),`
`,e.jsx(i.li,{children:"resta da introdurre una checklist smoke manuale per screen reader reali"}),`
`]}),`
`,e.jsx(i.h2,{id:"prossimo-passo-consigliato",children:"Prossimo passo consigliato"}),`
`,e.jsx(i.p,{children:"Integrare controlli automatici a11y nelle stories o nei test di package per evitare regressioni invisibili nelle prossime milestone."})]})}function d(n={}){const{wrapper:i}={...r(),...n.components};return i?e.jsx(i,{...n,children:e.jsx(o,{...n})}):o(n)}export{d as default};
