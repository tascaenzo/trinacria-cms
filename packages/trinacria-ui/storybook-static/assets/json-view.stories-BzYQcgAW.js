import{j as o}from"./iframe-ce5-efCb.js";import{E as d}from"./eyebrow-UCSOs8qC.js";import{c as p}from"./class-names-2dOUpm6k.js";function r({className:i,title:t,value:l,...c}){return o.jsxs("section",{className:"grid gap-2",children:[t?o.jsx(d,{className:"text-xs",children:t}):null,o.jsx("pre",{className:p("overflow-x-auto rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-code-surface)] px-4 py-4 text-xs leading-6 text-[color:var(--color-code-ink)]",i),...c,children:JSON.stringify(l,null,2)})]})}r.__docgenInfo={description:`JsonView gives admin operators a compact structured inspection panel for raw
payloads, configuration documents, and debug snapshots.`,methods:[],displayName:"JsonView",props:{title:{required:!1,tsType:{name:"string"},description:""},value:{required:!0,tsType:{name:"unknown"},description:""}},composes:["HTMLAttributes"]};const u={title:"Display/Data/JsonView",component:r},e={render:()=>o.jsx(r,{title:"Runtime payload",value:{pluginId:"core.settings",capabilities:["kernel.settings.manage"],healthy:!0}})};var s,a,n;e.parameters={...e.parameters,docs:{...(s=e.parameters)==null?void 0:s.docs,source:{originalSource:`{
  render: () => <JsonView title="Runtime payload" value={{
    pluginId: "core.settings",
    capabilities: ["kernel.settings.manage"],
    healthy: true
  }} />
}`,...(n=(a=e.parameters)==null?void 0:a.docs)==null?void 0:n.source}}};const m=["Payload"],f=Object.freeze(Object.defineProperty({__proto__:null,Payload:e,__namedExportsOrder:m,default:u},Symbol.toStringTag,{value:"Module"}));export{e as P,f as S};
