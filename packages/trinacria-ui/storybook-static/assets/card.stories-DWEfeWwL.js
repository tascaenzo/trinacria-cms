import{j as e}from"./iframe-ce5-efCb.js";import{B as d}from"./button-DTZJ7PNL.js";import{E as f}from"./eyebrow-UCSOs8qC.js";import{P as j}from"./panel-C5HhQPw_.js";import{B as v}from"./text-8uwx9w-W.js";import{c as n}from"./class-names-2dOUpm6k.js";function i({children:t,className:o,title:r,eyebrow:s,...C}){return e.jsxs(j,{className:n("bg-[color:var(--color-panel)] p-5",o),elevation:"sm",radius:"lg",...C,children:[(s||r)&&e.jsxs("header",{className:"mb-4 space-y-1.5",children:[s?e.jsx(f,{children:s}):null,r?e.jsx("h2",{className:"text-lg font-semibold text-[color:var(--color-ink)]",children:r}):null]}),t]})}function m({children:t,className:o,...r}){return e.jsx("div",{className:n("grid gap-1.5 px-6 pt-6",o),...r,children:t})}function u({children:t,className:o,...r}){return e.jsx("h3",{className:n("text-lg font-semibold tracking-[-0.02em] text-[color:var(--color-ink)]",o),...r,children:t})}function x({children:t,className:o,...r}){return e.jsx(v,{className:o,...r,children:t})}function h({children:t,className:o,...r}){return e.jsx("div",{className:n("px-6 pb-6 pt-4",o),...r,children:t})}function g({children:t,className:o,...r}){return e.jsx("div",{className:n("flex items-center justify-end gap-3 border-t border-[color:var(--color-border)] px-6 py-4",o),...r,children:t})}i.__docgenInfo={description:`Card mirrors the dashboard surfaces: light border, moderate radius, and a
quiet shadow so data modules stay separated without feeling heavy.`,methods:[],displayName:"Card",props:{title:{required:!1,tsType:{name:"string"},description:""},eyebrow:{required:!1,tsType:{name:"string"},description:""}},composes:["PropsWithChildren","HTMLAttributes"]};m.__docgenInfo={description:"",methods:[],displayName:"CardHeader"};u.__docgenInfo={description:"",methods:[],displayName:"CardTitle"};x.__docgenInfo={description:"",methods:[],displayName:"CardDescription"};h.__docgenInfo={description:"",methods:[],displayName:"CardContent"};g.__docgenInfo={description:"",methods:[],displayName:"CardActions"};const y={title:"Layout/Surface/Card",component:i},a={render:()=>e.jsx("div",{className:"max-w-2xl",children:e.jsxs(i,{children:[e.jsxs(m,{children:[e.jsx(u,{children:"Plugin catalog"}),e.jsx(x,{children:"Snapshot operativo del runtime plugin."})]}),e.jsx(h,{children:e.jsx("p",{className:"text-sm text-[color:var(--color-ink-muted)]",children:"12 plugin registrati, 11 healthy, 1 degraded."})}),e.jsxs(g,{children:[e.jsx(d,{variant:"ghost",children:"Annulla"}),e.jsx(d,{children:"Apri dettaglio"})]})]})})};var l,c,p;a.parameters={...a.parameters,docs:{...(l=a.parameters)==null?void 0:l.docs,source:{originalSource:`{
  render: () => <div className="max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Plugin catalog</CardTitle>
          <CardDescription>Snapshot operativo del runtime plugin.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-[color:var(--color-ink-muted)]">12 plugin registrati, 11 healthy, 1 degraded.</p>
        </CardContent>
        <CardActions>
          <Button variant="ghost">Annulla</Button>
          <Button>Apri dettaglio</Button>
        </CardActions>
      </Card>
    </div>
}`,...(p=(c=a.parameters)==null?void 0:c.docs)==null?void 0:p.source}}};const _=["Composition"],I=Object.freeze(Object.defineProperty({__proto__:null,Composition:a,__namedExportsOrder:_,default:y},Symbol.toStringTag,{value:"Module"}));export{a as C,I as S};
