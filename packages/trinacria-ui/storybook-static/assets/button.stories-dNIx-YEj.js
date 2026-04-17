import{j as n}from"./iframe-ce5-efCb.js";import{I as s}from"./icon-Dp3itan5.js";import{B as e}from"./button-DTZJ7PNL.js";const h={title:"Actions/Buttons/Button",component:e},a={render:()=>n.jsxs("div",{className:"flex flex-wrap gap-3",children:[n.jsx(e,{variant:"primary",children:"Primary"}),n.jsx(e,{variant:"secondary",children:"Secondary"}),n.jsx(e,{variant:"outline",children:"Outline"}),n.jsx(e,{variant:"ghost",children:"Ghost"})]})},r={render:()=>n.jsxs("div",{className:"flex flex-wrap gap-3",children:[n.jsx(e,{isLoading:!0,children:"Processing"}),n.jsx(e,{disabled:!0,variant:"secondary",children:"Disabled"}),n.jsx(e,{size:"sm",variant:"outline",children:"Small"}),n.jsx(e,{size:"lg",children:"Large"})]})},t={render:()=>n.jsxs("div",{className:"flex flex-wrap gap-3",children:[n.jsxs(e,{children:[n.jsx(s,{name:"plus"}),"New item"]}),n.jsxs(e,{variant:"secondary",children:[n.jsx(s,{name:"download"}),"Export"]}),n.jsxs(e,{variant:"outline",children:["Open details",n.jsx(s,{name:"arrow-right"})]}),n.jsxs(e,{variant:"ghost",children:[n.jsx(s,{name:"refresh-cw"}),"Refresh"]})]})};var o,i,c;a.parameters={...a.parameters,docs:{...(o=a.parameters)==null?void 0:o.docs,source:{originalSource:`{
  render: () => <div className="flex flex-wrap gap-3">
      <Button variant="primary">Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="ghost">Ghost</Button>
    </div>
}`,...(c=(i=a.parameters)==null?void 0:i.docs)==null?void 0:c.source}}};var l,d,u;r.parameters={...r.parameters,docs:{...(l=r.parameters)==null?void 0:l.docs,source:{originalSource:`{
  render: () => <div className="flex flex-wrap gap-3">
      <Button isLoading>Processing</Button>
      <Button disabled variant="secondary">
        Disabled
      </Button>
      <Button size="sm" variant="outline">
        Small
      </Button>
      <Button size="lg">Large</Button>
    </div>
}`,...(u=(d=r.parameters)==null?void 0:d.docs)==null?void 0:u.source}}};var m,p,x;t.parameters={...t.parameters,docs:{...(m=t.parameters)==null?void 0:m.docs,source:{originalSource:`{
  render: () => <div className="flex flex-wrap gap-3">
      <Button>
        <Icon name="plus" />
        New item
      </Button>
      <Button variant="secondary">
        <Icon name="download" />
        Export
      </Button>
      <Button variant="outline">
        Open details
        <Icon name="arrow-right" />
      </Button>
      <Button variant="ghost">
        <Icon name="refresh-cw" />
        Refresh
      </Button>
    </div>
}`,...(x=(p=t.parameters)==null?void 0:p.docs)==null?void 0:x.source}}};const v=["Variants","States","WithIcons"],f=Object.freeze(Object.defineProperty({__proto__:null,States:r,Variants:a,WithIcons:t,__namedExportsOrder:v,default:h},Symbol.toStringTag,{value:"Module"}));export{f as S,a as V,t as W,r as a};
