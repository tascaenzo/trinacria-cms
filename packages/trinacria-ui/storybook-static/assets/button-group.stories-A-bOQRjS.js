import{j as e}from"./iframe-ce5-efCb.js";import{B as t}from"./button-DTZJ7PNL.js";import{I as i}from"./icon-button-KvY8F26h.js";import{c as y}from"./class-names-2dOUpm6k.js";function a({children:x,className:j,orientation:s="horizontal",wrap:l=!0,...b}){return e.jsx("div",{role:"group",className:y("flex items-center gap-2",s==="vertical"&&"flex-col items-stretch",s==="horizontal"&&l&&"flex-wrap",s==="horizontal"&&!l&&"flex-nowrap",j),...b,children:x})}a.__docgenInfo={description:"",methods:[],displayName:"ButtonGroup",props:{orientation:{required:!1,tsType:{name:"union",raw:'"horizontal" | "vertical"',elements:[{name:"literal",value:'"horizontal"'},{name:"literal",value:'"vertical"'}]},description:"",defaultValue:{value:'"horizontal"',computed:!1}},wrap:{required:!1,tsType:{name:"boolean"},description:"",defaultValue:{value:"true",computed:!1}}},composes:["PropsWithChildren","HTMLAttributes"]};const g={title:"Actions/Buttons/ButtonGroup",component:a},r={render:()=>e.jsxs(a,{children:[e.jsx(t,{variant:"secondary",children:"Cancel"}),e.jsx(t,{variant:"outline",children:"Save draft"}),e.jsx(t,{children:"Publish"})]})},o={render:()=>e.jsxs(a,{wrap:!1,children:[e.jsx(i,{icon:"refresh-cw",label:"Refresh",variant:"outline"}),e.jsx(i,{icon:"filter",label:"Filter",variant:"outline"}),e.jsx(i,{icon:"columns-3",label:"Columns",variant:"outline"}),e.jsx(t,{variant:"secondary",children:"Export"})]})},n={render:()=>e.jsxs(a,{orientation:"vertical",className:"max-w-xs",children:[e.jsx(t,{variant:"secondary",children:"Duplicate"}),e.jsx(t,{variant:"outline",children:"Archive"}),e.jsx(t,{variant:"ghost",children:"Delete"})]})};var u,c,p;r.parameters={...r.parameters,docs:{...(u=r.parameters)==null?void 0:u.docs,source:{originalSource:`{
  render: () => <ButtonGroup>
      <Button variant="secondary">Cancel</Button>
      <Button variant="outline">Save draft</Button>
      <Button>Publish</Button>
    </ButtonGroup>
}`,...(p=(c=r.parameters)==null?void 0:c.docs)==null?void 0:p.source}}};var d,m,v;o.parameters={...o.parameters,docs:{...(d=o.parameters)==null?void 0:d.docs,source:{originalSource:`{
  render: () => <ButtonGroup wrap={false}>
      <IconButton icon="refresh-cw" label="Refresh" variant="outline" />
      <IconButton icon="filter" label="Filter" variant="outline" />
      <IconButton icon="columns-3" label="Columns" variant="outline" />
      <Button variant="secondary">Export</Button>
    </ButtonGroup>
}`,...(v=(m=o.parameters)==null?void 0:m.docs)==null?void 0:v.source}}};var h,B,f;n.parameters={...n.parameters,docs:{...(h=n.parameters)==null?void 0:h.docs,source:{originalSource:`{
  render: () => <ButtonGroup orientation="vertical" className="max-w-xs">
      <Button variant="secondary">Duplicate</Button>
      <Button variant="outline">Archive</Button>
      <Button variant="ghost">Delete</Button>
    </ButtonGroup>
}`,...(f=(B=n.parameters)==null?void 0:B.docs)==null?void 0:f.source}}};const w=["Horizontal","Toolbar","Vertical"],T=Object.freeze(Object.defineProperty({__proto__:null,Horizontal:r,Toolbar:o,Vertical:n,__namedExportsOrder:w,default:g},Symbol.toStringTag,{value:"Module"}));export{r as H,T as S,o as T,n as V};
