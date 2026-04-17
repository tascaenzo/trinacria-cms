import{j as o}from"./iframe-ce5-efCb.js";const c={title:"Foundations/Theme"},n=[{title:"Surfaces",items:["--color-canvas","--color-surface","--color-panel","--color-panel-soft","--color-panel-strong"]},{title:"Ink",items:["--color-ink","--color-ink-soft","--color-ink-muted","--color-ink-subtle","--color-ink-inverse"]},{title:"Semantic",items:["--color-info-bg","--color-success-bg","--color-warning-bg","--color-danger-bg"]}],r={render:()=>o.jsx("div",{className:"grid gap-8",children:n.map(e=>o.jsxs("section",{className:"grid gap-3",children:[o.jsx("h2",{className:"text-lg font-semibold text-[color:var(--color-ink)]",children:e.title}),o.jsx("div",{className:"grid gap-3 sm:grid-cols-2 xl:grid-cols-4",children:e.items.map(s=>o.jsxs("div",{className:"rounded-2xl border border-[color:var(--color-border)] bg-white p-4",children:[o.jsx("div",{className:"h-16 rounded-xl border border-[color:var(--color-border)]",style:{backgroundColor:`var(${s})`}}),o.jsx("p",{className:"mt-3 text-sm font-medium text-[color:var(--color-ink)]",children:s})]},s))})]},e.title))})};var l,t,a;r.parameters={...r.parameters,docs:{...(l=r.parameters)==null?void 0:l.docs,source:{originalSource:`{
  render: () => <div className="grid gap-8">
      {tokenGroups.map(group => <section key={group.title} className="grid gap-3">
          <h2 className="text-lg font-semibold text-[color:var(--color-ink)]">{group.title}</h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {group.items.map(token => <div key={token} className="rounded-2xl border border-[color:var(--color-border)] bg-white p-4">
                <div className="h-16 rounded-xl border border-[color:var(--color-border)]" style={{
            backgroundColor: \`var(\${token})\`
          }} />
                <p className="mt-3 text-sm font-medium text-[color:var(--color-ink)]">{token}</p>
              </div>)}
          </div>
        </section>)}
    </div>
}`,...(a=(t=r.parameters)==null?void 0:t.docs)==null?void 0:a.source}}};const i=["Overview"],m=Object.freeze(Object.defineProperty({__proto__:null,Overview:r,__namedExportsOrder:i,default:c},Symbol.toStringTag,{value:"Module"}));export{r as O,m as T};
