import{j as e}from"./iframe-ce5-efCb.js";import{c as n}from"./class-names-2dOUpm6k.js";function m({children:r,className:o,...i}){return e.jsx("div",{className:n("grid gap-6",o),...i,children:r})}function d({children:r,className:o,...i}){return e.jsx("div",{className:n("grid gap-2.5",o),...i,children:r})}function l({children:r,className:o,...i}){return e.jsx("label",{className:n("text-sm font-medium text-[color:var(--color-ink)]",o),...i,children:r})}function p({children:r,className:o,...i}){return e.jsx("p",{className:n("text-sm leading-6 text-[color:var(--color-ink-muted)]",o),...i,children:r})}function x({children:r,className:o,...i}){return e.jsx("p",{className:n("text-xs leading-5 text-[color:var(--color-ink-subtle)]",o),...i,children:r})}function u({children:r,className:o,...i}){return e.jsx("p",{className:n("text-xs leading-5 text-[color:var(--color-danger-ink)]",o),...i,children:r})}m.__docgenInfo={description:"",methods:[],displayName:"FieldGroup"};d.__docgenInfo={description:"",methods:[],displayName:"Field"};l.__docgenInfo={description:"",methods:[],displayName:"FieldLabel"};p.__docgenInfo={description:"",methods:[],displayName:"FieldDescription"};x.__docgenInfo={description:"",methods:[],displayName:"FieldHint"};u.__docgenInfo={description:"",methods:[],displayName:"FieldError"};const F={title:"Forms/Infrastructure/Field",component:d},t={render:()=>e.jsx("div",{className:"max-w-xl",children:e.jsxs(m,{children:[e.jsxs(d,{children:[e.jsx(l,{htmlFor:"tenant-name",children:"Tenant"}),e.jsx(p,{children:"Identificatore principale del tenant."}),e.jsx("input",{id:"tenant-name",className:"h-10 rounded-lg border border-[color:var(--color-border)] px-3"}),e.jsx(x,{children:"Usato per DNS e provisioning."})]}),e.jsxs(d,{children:[e.jsx(l,{htmlFor:"client-id",children:"Client ID"}),e.jsx("input",{id:"client-id",className:"h-10 rounded-lg border border-rose-200 bg-rose-50 px-3"}),e.jsx(u,{children:"Il campo e obbligatorio."})]})]})})};var s,a,c;t.parameters={...t.parameters,docs:{...(s=t.parameters)==null?void 0:s.docs,source:{originalSource:`{
  render: () => <div className="max-w-xl">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="tenant-name">Tenant</FieldLabel>
          <FieldDescription>Identificatore principale del tenant.</FieldDescription>
          <input id="tenant-name" className="h-10 rounded-lg border border-[color:var(--color-border)] px-3" />
          <FieldHint>Usato per DNS e provisioning.</FieldHint>
        </Field>
        <Field>
          <FieldLabel htmlFor="client-id">Client ID</FieldLabel>
          <input id="client-id" className="h-10 rounded-lg border border-rose-200 bg-rose-50 px-3" />
          <FieldError>Il campo e obbligatorio.</FieldError>
        </Field>
      </FieldGroup>
    </div>
}`,...(c=(a=t.parameters)==null?void 0:a.docs)==null?void 0:c.source}}};const b=["Composition"],f=Object.freeze(Object.defineProperty({__proto__:null,Composition:t,__namedExportsOrder:b,default:F},Symbol.toStringTag,{value:"Module"}));export{t as C,f as S};
