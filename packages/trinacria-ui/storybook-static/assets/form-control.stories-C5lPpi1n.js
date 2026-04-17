import{j as r}from"./iframe-ce5-efCb.js";import{F as e,a}from"./form-control-BzK8dlK3.js";const s={title:"Forms/Infrastructure/FormControl",component:e},o={render:()=>r.jsxs("div",{className:"grid max-w-xl gap-4",children:[r.jsx(e,{label:"API key label",hint:"Nome interno visibile solo agli amministratori.",children:r.jsx("input",{className:"h-10 w-full rounded-lg border border-[color:var(--color-border-strong)] bg-white px-3 text-sm text-[color:var(--color-ink)] outline-none",defaultValue:"Public integration"})}),r.jsx(e,{label:"Numeric field",error:"Il valore non e valido.",children:r.jsxs(a,{error:!0,children:[r.jsx("span",{className:"border-r border-[color:var(--color-border)] px-3 text-[color:var(--color-ink-subtle)]",children:"EUR"}),r.jsx("input",{className:"h-full w-full bg-transparent px-3 text-sm text-[color:var(--color-ink)] outline-none",defaultValue:"49.90"})]})})]})};var l,t,n;o.parameters={...o.parameters,docs:{...(l=o.parameters)==null?void 0:l.docs,source:{originalSource:`{
  render: () => <div className="grid max-w-xl gap-4">
      <FormControlShell label="API key label" hint="Nome interno visibile solo agli amministratori.">
        <input className="h-10 w-full rounded-lg border border-[color:var(--color-border-strong)] bg-white px-3 text-sm text-[color:var(--color-ink)] outline-none" defaultValue="Public integration" />
      </FormControlShell>

      <FormControlShell label="Numeric field" error="Il valore non e valido.">
        <FormControlSurface error>
          <span className="border-r border-[color:var(--color-border)] px-3 text-[color:var(--color-ink-subtle)]">EUR</span>
          <input className="h-full w-full bg-transparent px-3 text-sm text-[color:var(--color-ink)] outline-none" defaultValue="49.90" />
        </FormControlSurface>
      </FormControlShell>
    </div>
}`,...(n=(t=o.parameters)==null?void 0:t.docs)==null?void 0:n.source}}};const i=["Overview"],d=Object.freeze(Object.defineProperty({__proto__:null,Overview:o,__namedExportsOrder:i,default:s},Symbol.toStringTag,{value:"Module"}));export{o as O,d as S};
