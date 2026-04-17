import{r as n,j as t}from"./iframe-ce5-efCb.js";import{T as o}from"./time-picker-DPrihalO.js";const c={title:"Forms/Pickers/TimePicker",component:o},e={render:()=>{const[s,l]=n.useState("09:30");return t.jsxs("div",{className:"grid max-w-xl gap-4",children:[t.jsx(o,{label:"Cutoff time",value:s,onValueChange:l}),t.jsx(o,{label:"Maintenance start",minuteStep:15,hint:"Slot disponibili ogni 15 minuti."}),t.jsx(o,{label:"Review slot",error:"L'orario selezionato collide con un blocco editoriale."})]})}};var a,r,i;e.parameters={...e.parameters,docs:{...(a=e.parameters)==null?void 0:a.docs,source:{originalSource:`{
  render: () => {
    const [value, setValue] = useState("09:30");
    return <div className="grid max-w-xl gap-4">
        <TimePicker label="Cutoff time" value={value} onValueChange={setValue} />
        <TimePicker label="Maintenance start" minuteStep={15} hint="Slot disponibili ogni 15 minuti." />
        <TimePicker label="Review slot" error="L'orario selezionato collide con un blocco editoriale." />
      </div>;
  }
}`,...(i=(r=e.parameters)==null?void 0:r.docs)==null?void 0:i.source}}};const m=["States"],p=Object.freeze(Object.defineProperty({__proto__:null,States:e,__namedExportsOrder:m,default:c},Symbol.toStringTag,{value:"Module"}));export{p as S,e as a};
