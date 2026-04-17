import{j as e}from"./iframe-ce5-efCb.js";import{I as r}from"./icon-Dp3itan5.js";import{B as a}from"./button-base-BK7tGpG4.js";const u={title:"Primitives/Interaction/ButtonBase",component:a},n={render:()=>e.jsxs("div",{className:"flex flex-wrap gap-3",children:[e.jsx(a,{children:"Primary"}),e.jsx(a,{variant:"secondary",children:"Secondary"}),e.jsx(a,{variant:"outline",children:"Outline"}),e.jsx(a,{variant:"ghost",children:"Ghost"})]})},t={render:()=>e.jsxs("div",{className:"flex flex-wrap gap-3",children:[e.jsx(a,{iconOnly:!0,"aria-label":"Refresh",variant:"outline",children:e.jsx(r,{name:"refresh-cw"})}),e.jsx(a,{iconOnly:!0,"aria-label":"Open settings",variant:"secondary",children:e.jsx(r,{name:"settings-2"})}),e.jsx(a,{iconOnly:!0,"aria-label":"Delete item",variant:"ghost",children:e.jsx(r,{name:"trash-2"})})]})};var s,o,i;n.parameters={...n.parameters,docs:{...(s=n.parameters)==null?void 0:s.docs,source:{originalSource:`{
  render: () => <div className="flex flex-wrap gap-3">
      <ButtonBase>Primary</ButtonBase>
      <ButtonBase variant="secondary">Secondary</ButtonBase>
      <ButtonBase variant="outline">Outline</ButtonBase>
      <ButtonBase variant="ghost">Ghost</ButtonBase>
    </div>
}`,...(i=(o=n.parameters)==null?void 0:o.docs)==null?void 0:i.source}}};var l,c,d;t.parameters={...t.parameters,docs:{...(l=t.parameters)==null?void 0:l.docs,source:{originalSource:`{
  render: () => <div className="flex flex-wrap gap-3">
      <ButtonBase iconOnly aria-label="Refresh" variant="outline">
        <Icon name="refresh-cw" />
      </ButtonBase>
      <ButtonBase iconOnly aria-label="Open settings" variant="secondary">
        <Icon name="settings-2" />
      </ButtonBase>
      <ButtonBase iconOnly aria-label="Delete item" variant="ghost">
        <Icon name="trash-2" />
      </ButtonBase>
    </div>
}`,...(d=(c=t.parameters)==null?void 0:c.docs)==null?void 0:d.source}}};const m=["Variants","IconOnly"],h=Object.freeze(Object.defineProperty({__proto__:null,IconOnly:t,Variants:n,__namedExportsOrder:m,default:u},Symbol.toStringTag,{value:"Module"}));export{t as I,h as S,n as V};
