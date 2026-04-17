import{j as a}from"./iframe-ce5-efCb.js";import{I as t}from"./input-BwIcYy4A.js";const n={title:"Forms/Inputs/Input",component:t},e={render:()=>a.jsxs("div",{className:"max-w-xl grid gap-4",children:[a.jsx(t,{label:"Site name",hint:"Nome visualizzato nel backoffice.",placeholder:"Trinacria CMS"}),a.jsx(t,{label:"Client ID",error:"Il campo e obbligatorio.",placeholder:"oauth-client-id"}),a.jsx(t,{label:"Readonly",defaultValue:"tenant-prod",disabled:!0})]})};var o,r,l;e.parameters={...e.parameters,docs:{...(o=e.parameters)==null?void 0:o.docs,source:{originalSource:`{
  render: () => <div className="max-w-xl grid gap-4">
      <Input label="Site name" hint="Nome visualizzato nel backoffice." placeholder="Trinacria CMS" />
      <Input label="Client ID" error="Il campo e obbligatorio." placeholder="oauth-client-id" />
      <Input label="Readonly" defaultValue="tenant-prod" disabled />
    </div>
}`,...(l=(r=e.parameters)==null?void 0:r.docs)==null?void 0:l.source}}};const i=["States"],c=Object.freeze(Object.defineProperty({__proto__:null,States:e,__namedExportsOrder:i,default:n},Symbol.toStringTag,{value:"Module"}));export{c as S,e as a};
