import{j as e}from"./iframe-ce5-efCb.js";import{B as i}from"./badge-DsIKyoYj.js";import{B as u}from"./button-DTZJ7PNL.js";import{M as y,a as C,b as N}from"./mobile-record-CiWavGPq.js";import{B as v}from"./text-8uwx9w-W.js";import{c as a}from"./class-names-2dOUpm6k.js";function d({children:o,className:s,empty:r,mobile:n,...j}){const f=!!o;return e.jsxs(e.Fragment,{children:[n,e.jsx("div",{className:a("hidden overflow-x-auto md:block",s),...j,children:f?o:r})]})}function p({children:o,className:s,...r}){return e.jsx("table",{className:a("min-w-full text-sm",s),...r,children:o})}function x({children:o,className:s,...r}){return e.jsx("tr",{className:a("border-b border-[color:var(--color-border)] text-left text-[color:var(--color-ink-subtle)]",s),...r,children:o})}function l({children:o,className:s,...r}){return e.jsx("th",{className:a("px-4 py-3 font-medium",s),...r,children:o})}function T({children:o,className:s,...r}){return e.jsx("tr",{className:a("border-b border-[color:var(--color-border)] last:border-b-0",s),...r,children:o})}function t({children:o,className:s,...r}){return e.jsx("td",{className:a("px-4 py-4",s),...r,children:o})}function h({children:o,className:s,meta:r,...n}){return e.jsx(t,{className:s,...n,children:e.jsxs("div",{children:[e.jsx("p",{className:"font-medium text-[color:var(--color-ink)]",children:o}),r?e.jsx(v,{className:"mt-1",children:r}):null]})})}d.__docgenInfo={description:"",methods:[],displayName:"ResourceTable",props:{empty:{required:!1,tsType:{name:"ReactNode"},description:""},mobile:{required:!1,tsType:{name:"ReactNode"},description:""}},composes:["HTMLAttributes"]};p.__docgenInfo={description:"",methods:[],displayName:"ResourceTableElement"};x.__docgenInfo={description:"",methods:[],displayName:"ResourceTableHeaderRow"};l.__docgenInfo={description:"",methods:[],displayName:"ResourceTableHeadCell"};T.__docgenInfo={description:"",methods:[],displayName:"ResourceTableRow"};t.__docgenInfo={description:"",methods:[],displayName:"ResourceTableCell"};h.__docgenInfo={description:"",methods:[],displayName:"ResourceTablePrimaryCell",props:{meta:{required:!1,tsType:{name:"ReactNode"},description:""}}};const _={title:"Display/Data/ResourceTable",component:d},c={render:()=>e.jsx(d,{mobile:e.jsx(y,{children:e.jsx(C,{title:"Mario Rossi",subtitle:"mario@example.com",badges:e.jsx(i,{tone:"success",children:"Active"}),actions:e.jsx(u,{variant:"secondary",className:"w-full",children:"Suspend"}),children:e.jsx(N,{label:"Updated",value:"2026-04-10 10:45"})})}),children:e.jsxs(p,{children:[e.jsx("thead",{children:e.jsxs(x,{children:[e.jsx(l,{children:"User"}),e.jsx(l,{children:"Status"}),e.jsx(l,{children:"Updated"}),e.jsx(l,{children:"Action"})]})}),e.jsx("tbody",{children:e.jsxs(T,{children:[e.jsx(h,{meta:"mario@example.com",children:"Mario Rossi"}),e.jsx(t,{children:e.jsx(i,{tone:"success",children:"Active"})}),e.jsx(t,{className:"text-[color:var(--color-ink-muted)]",children:"2026-04-10 10:45"}),e.jsx(t,{children:e.jsx(u,{variant:"secondary",children:"Suspend"})})]})})]})})};var m,b,R;c.parameters={...c.parameters,docs:{...(m=c.parameters)==null?void 0:m.docs,source:{originalSource:`{
  render: () => <ResourceTable mobile={<MobileRecordList>
          <MobileRecordCard title="Mario Rossi" subtitle="mario@example.com" badges={<Badge tone="success">Active</Badge>} actions={<Button variant="secondary" className="w-full">Suspend</Button>}>
            <MobileRecordField label="Updated" value="2026-04-10 10:45" />
          </MobileRecordCard>
        </MobileRecordList>}>
      <ResourceTableElement>
        <thead>
          <ResourceTableHeaderRow>
            <ResourceTableHeadCell>User</ResourceTableHeadCell>
            <ResourceTableHeadCell>Status</ResourceTableHeadCell>
            <ResourceTableHeadCell>Updated</ResourceTableHeadCell>
            <ResourceTableHeadCell>Action</ResourceTableHeadCell>
          </ResourceTableHeaderRow>
        </thead>
        <tbody>
          <ResourceTableRow>
            <ResourceTablePrimaryCell meta="mario@example.com">Mario Rossi</ResourceTablePrimaryCell>
            <ResourceTableCell><Badge tone="success">Active</Badge></ResourceTableCell>
            <ResourceTableCell className="text-[color:var(--color-ink-muted)]">2026-04-10 10:45</ResourceTableCell>
            <ResourceTableCell><Button variant="secondary">Suspend</Button></ResourceTableCell>
          </ResourceTableRow>
        </tbody>
      </ResourceTableElement>
    </ResourceTable>
}`,...(R=(b=c.parameters)==null?void 0:b.docs)==null?void 0:R.source}}};const g=["UsersLikeLayout"],L=Object.freeze(Object.defineProperty({__proto__:null,UsersLikeLayout:c,__namedExportsOrder:g,default:_},Symbol.toStringTag,{value:"Module"}));export{L as S,c as U};
