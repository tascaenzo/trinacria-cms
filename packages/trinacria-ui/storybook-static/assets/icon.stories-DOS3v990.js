import{j as e}from"./iframe-ce5-efCb.js";import{I as c,a as p}from"./icon-Dp3itan5.js";const g=[{title:"Navigation",icons:["layout-dashboard","panel-left","panel-left-close","columns-3","arrow-right","external-link"]},{title:"Content",icons:["folder-open","folder-cog","file-text","file-json","image","package"]},{title:"System",icons:["plug","puzzle","database","server","hard-drive","settings-2"]},{title:"Users & Security",icons:["users","user-round","shield","shield-check","lock-keyhole","key-round"]},{title:"Actions",icons:["plus","pencil","save","refresh-cw","download","upload","trash-2","more-horizontal"]},{title:"Status",icons:["check","check-check","circle-check-big","circle-alert","triangle-alert","x","x-circle","loader-circle"]},{title:"Utility",icons:["search","eye","eye-off","calendar-days","clock-3","bell","mail","globe","sparkles"]}],x={title:"Foundations/Iconography/Icon",component:c},r={render:()=>e.jsx("div",{className:"grid gap-6",children:g.map(s=>e.jsxs("section",{className:"grid gap-3",children:[e.jsxs("header",{className:"flex items-center justify-between gap-3",children:[e.jsx("h3",{className:"text-sm font-semibold uppercase tracking-[0.12em] text-[color:var(--color-ink-subtle)]",children:s.title}),e.jsxs("span",{className:"text-xs text-[color:var(--color-ink-subtle)]",children:[s.icons.length," icons"]})]}),e.jsx("div",{className:"grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4",children:s.icons.map(a=>e.jsxs("div",{className:"flex items-center gap-3 rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4",children:[e.jsx(c,{name:a,className:"h-5 w-5"}),e.jsx("span",{className:"text-sm text-[color:var(--color-ink-muted)]",children:a})]},a))})]},s.title))})},o={render:()=>e.jsx("div",{className:"grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4",children:p.map(s=>e.jsxs("div",{className:"flex items-center gap-3 rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4",children:[e.jsx(c,{name:s,className:"h-5 w-5"}),e.jsx("span",{className:"text-sm text-[color:var(--color-ink-muted)]",children:s})]},s))})};var l,t,n;r.parameters={...r.parameters,docs:{...(l=r.parameters)==null?void 0:l.docs,source:{originalSource:`{
  render: () => <div className="grid gap-6">
      {sections.map(section => <section key={section.title} className="grid gap-3">
          <header className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-[color:var(--color-ink-subtle)]">
              {section.title}
            </h3>
            <span className="text-xs text-[color:var(--color-ink-subtle)]">{section.icons.length} icons</span>
          </header>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {section.icons.map(name => <div key={name} className="flex items-center gap-3 rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4">
                <Icon name={name} className="h-5 w-5" />
                <span className="text-sm text-[color:var(--color-ink-muted)]">{name}</span>
              </div>)}
          </div>
        </section>)}
    </div>
}`,...(n=(t=r.parameters)==null?void 0:t.docs)==null?void 0:n.source}}};var i,d,m;o.parameters={...o.parameters,docs:{...(i=o.parameters)==null?void 0:i.docs,source:{originalSource:`{
  render: () => <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
      {ICON_NAMES.map(name => <div key={name} className="flex items-center gap-3 rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4">
          <Icon name={name} className="h-5 w-5" />
          <span className="text-sm text-[color:var(--color-ink-muted)]">{name}</span>
        </div>)}
    </div>
}`,...(m=(d=o.parameters)==null?void 0:d.docs)==null?void 0:m.source}}};const u=["Registry","FullIndex"],b=Object.freeze(Object.defineProperty({__proto__:null,FullIndex:o,Registry:r,__namedExportsOrder:u,default:x},Symbol.toStringTag,{value:"Module"}));export{o as F,r as R,b as S};
