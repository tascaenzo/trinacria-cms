import{r as c,j as a}from"./iframe-ce5-efCb.js";import{D as t}from"./date-picker-CjY4LYX8.js";const i={title:"Forms/Pickers/DatePicker",component:t},e={render:()=>{const[l,n]=c.useState("2026-04-11");return a.jsxs("div",{className:"grid max-w-xl gap-4",children:[a.jsx(t,{label:"Publish date",value:l,onValueChange:n}),a.jsx(t,{label:"Freeze window start",hint:"Sono accettate solo date future.",min:"2026-04-11"}),a.jsx(t,{label:"Archive date",error:"La data deve essere successiva alla publish date."})]})}};var r,s,o;e.parameters={...e.parameters,docs:{...(r=e.parameters)==null?void 0:r.docs,source:{originalSource:`{
  render: () => {
    const [value, setValue] = useState("2026-04-11");
    return <div className="grid max-w-xl gap-4">
        <DatePicker label="Publish date" value={value} onValueChange={setValue} />
        <DatePicker label="Freeze window start" hint="Sono accettate solo date future." min="2026-04-11" />
        <DatePicker label="Archive date" error="La data deve essere successiva alla publish date." />
      </div>;
  }
}`,...(o=(s=e.parameters)==null?void 0:s.docs)==null?void 0:o.source}}};const u=["States"],p=Object.freeze(Object.defineProperty({__proto__:null,States:e,__namedExportsOrder:u,default:i},Symbol.toStringTag,{value:"Module"}));export{p as S,e as a};
