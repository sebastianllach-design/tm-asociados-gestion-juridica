import {isDemo,authSession,login,logout,loadAll,upsertClient,upsertCase,addAction,addTask,toggleTask,addFeeMovement,signedDocumentUrl,archiveDocument,resetDemo} from "./data-layer.js";

const cfg=window.LEX_CONFIG||{};
let state={clients:[],cases:[],actions:[],tasks:[],documents:[],fee_movements:[]};
let view="dashboard";
let activeCaseId=null, activeTab="summary";
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
const money=n=>new Intl.NumberFormat("es-AR",{style:"currency",currency:"ARS",maximumFractionDigits:0}).format(Number(n||0));
const shortMoney=n=>{n=Number(n||0);return n>=1e6?`$ ${(n/1e6).toFixed(1)} M`:n>=1e3?`$ ${(n/1e3).toFixed(0)} K`:money(n)};
const fmtDate=d=>d?new Intl.DateTimeFormat("es-AR",{day:"2-digit",month:"short",year:"numeric"}).format(new Date(d+"T12:00:00")):"—";
const daysUntil=d=>d?Math.ceil((new Date(d+"T23:59:59")-new Date())/86400000):9999;
const initials=n=>(n||"TM").split(/\s+/).slice(0,2).map(x=>x[0]).join("").toUpperCase();
const client=id=>state.clients.find(x=>x.id===id);
const cs=id=>state.cases.find(x=>x.id===id);
const caseDocs=id=>state.documents.filter(d=>d.case_id===id);
const caseActions=id=>state.actions.filter(a=>a.case_id===id).sort((a,b)=>String(b.action_date).localeCompare(String(a.action_date)));
const caseTasks=id=>state.tasks.filter(t=>t.case_id===id);
function toast(msg){const e=document.createElement("div");e.className="toast";e.textContent=msg;$("#toastRoot").appendChild(e);setTimeout(()=>e.remove(),2600)}
function btn(label,cls="ghost-btn",attr=""){return `<button class="${cls}" ${attr}>${label}</button>`}
function priorityClass(p){return p==="Crítico"?"red":p==="Alto"?"orange":p==="Bajo"?"green":"blue"}
function pending(c){return Math.max(0,Number(c.fee_agreed||0)-Number(c.collected||0))}
function currentDateISO(){return new Date().toISOString().slice(0,10)}
function alerts(){
  const out=[];
  state.cases.filter(c=>c.status!=="Cierre").forEach(c=>{
    const du=daysUntil(c.deadline_date);
    if(c.deadline_date&&du<0)out.push({sev:"critical",title:`Vencimiento procesal vencido · ${c.title}`,sub:`Venció ${fmtDate(c.deadline_date)}`,caseId:c.id});
    else if(c.deadline_date&&du<=2)out.push({sev:"critical",title:`Vencimiento en ${du===0?"hoy":du+" día(s)"} · ${c.title}`,sub:fmtDate(c.deadline_date),caseId:c.id});
    else if(c.deadline_date&&du<=7)out.push({sev:"high",title:`Vencimiento próximo · ${c.title}`,sub:fmtDate(c.deadline_date),caseId:c.id});
    if(!c.next_action)out.push({sev:"high",title:`Caso sin próxima acción · ${c.title}`,sub:client(c.client_id)?.name||"",caseId:c.id});
  });
  state.tasks.filter(t=>t.status!=="Completada"&&daysUntil(t.due_date)<0).forEach(t=>out.push({sev:"high",title:`Tarea vencida · ${t.title}`,sub:cs(t.case_id)?.title||"",caseId:t.case_id}));
  return out.slice(0,10);
}
async function refresh(){state=await loadAll();render()}
async function boot(){
  const session=await authSession();
  if(!session&&!isDemo)return renderLogin();
  await refresh();
}
function renderLogin(){
  $("#app").innerHTML=`<div class="login-page"><section class="login-art"><div class="brand"><div class="brand-mark">TM</div><div class="brand-copy"><strong>TM & Asociados</strong><span>Gestión Jurídica</span></div></div><h1>Información jurídica ordenada. Riesgos bajo control.</h1><p>Un único centro para clientes, asuntos, actuaciones, vencimientos, documentación y honorarios.</p></section><section class="login-form-wrap"><form class="login-card" id="loginForm"><div class="eyebrow">Acceso seguro</div><h2>Ingresar</h2><p>Ingresá con el usuario único del estudio.</p><div class="field"><label>Email</label><input name="email" type="email" required></div><div class="field"><label>Contraseña</label><input name="password" type="password" required></div><button class="primary-btn" style="width:100%">Ingresar</button><p id="loginError" style="color:#b3454e"></p></form></section></div>`;
  $("#loginForm").addEventListener("submit",async e=>{e.preventDefault();try{await login(e.target.email.value,e.target.password.value);await refresh()}catch(err){$("#loginError").textContent=err.message}})
}
function shell(){
  const nav=[["dashboard","⌂","Centro de control"],["cases","◫","Cartera de casos"],["agenda","◷","Agenda"],["clients","◎","Clientes"],["documents","▱","Documentos"],["fees","$","Honorarios"],["reports","⌁","Indicadores"]];
  return `<div class="shell"><aside class="sidebar" id="sidebar"><div class="brand"><div class="brand-mark">TM</div><div class="brand-copy"><strong>${esc(cfg.APP_NAME||"TM & Asociados")}</strong><span>${esc(cfg.FIRM_SUBTITLE||"Gestión Jurídica")}</span></div></div><div class="nav-section">Gestión</div>${nav.map(n=>`<button class="nav-item ${view===n[0]?"active":""}" data-view="${n[0]}"><span class="nav-icon">${n[1]}</span>${n[2]}</button>`).join("")}<div class="sidebar-foot"><div class="userbox"><div class="avatar">TM</div><div><strong>${isDemo?"Modo demostración":"Usuario autenticado"}</strong><span>${isDemo?"Etapa 1 · datos locales":"Memoria compartida · Supabase"}</span></div></div>${isDemo?`<button class="nav-item" id="resetDemo">↻ Restaurar demo</button>`:`<button class="nav-item" id="logoutBtn">⇥ Cerrar sesión</button>`}</div></aside><main class="main"><header class="topbar"><button class="icon-btn mobile-menu" id="mobileMenu">☰</button><div class="search-wrap"><span class="search-symbol">⌕</span><input class="search" id="globalSearch" placeholder="Buscar cliente, caso, expediente o contraparte"></div><div class="top-actions">${isDemo?`<span class="badge orange">ETAPA 1</span>`:""}${btn("＋ Nuevo caso","primary-btn",'id="topNewCase"')}</div></header><div class="content" id="content"></div></main></div><div id="backdrop" class="drawer-backdrop hidden"></div><aside id="drawer" class="drawer hidden"></aside>`;
}
function render(){
  $("#app").innerHTML=shell();
  bindShell();
  renderView();
}
function bindShell(){
  $$("[data-view]").forEach(b=>b.onclick=()=>{view=b.dataset.view;render()});
  $("#topNewCase").onclick=()=>editCase();
  $("#mobileMenu").onclick=()=>$("#sidebar").classList.toggle("open");
  $("#backdrop").onclick=closeDrawer;
  $("#logoutBtn")?.addEventListener("click",async()=>{await logout();renderLogin()});
  $("#resetDemo")?.addEventListener("click",()=>{resetDemo();location.reload()});
  $("#globalSearch").addEventListener("input",e=>{const q=e.target.value.trim().toLowerCase();if(q.length<2)return;const c=state.cases.find(x=>`${x.id} ${x.title} ${x.counterpart} ${x.docket} ${client(x.client_id)?.name}`.toLowerCase().includes(q));if(c)openCase(c.id)});
}
function head(title,sub,actions=""){return `<div class="page-head"><div><div class="eyebrow">TM & Asociados</div><h1 class="page-title">${title}</h1><p class="page-sub">${sub}</p></div><div class="actions">${actions}</div></div>`}
function kpi(label,value,note,icon){return `<div class="kpi"><div class="kpi-top"><span class="kpi-label">${label}</span><span class="kpi-icon">${icon}</span></div><div class="kpi-value">${value}</div><div class="kpi-note">${note}</div></div>`}
function renderView(){
  if(view==="dashboard")renderDashboard();
  if(view==="cases")renderCases();
  if(view==="agenda")renderAgenda();
  if(view==="clients")renderClients();
  if(view==="documents")renderDocuments();
  if(view==="fees")renderFees();
  if(view==="reports")renderReports();
}
function renderDashboard(){
  const active=state.cases.filter(c=>c.status!=="Cierre"), a=alerts(), due7=state.tasks.filter(t=>t.status!=="Completada"&&daysUntil(t.due_date)>=0&&daysUntil(t.due_date)<=7).length;
  const pend=state.cases.reduce((s,c)=>s+pending(c),0);
  const upcoming=[...state.tasks].filter(t=>t.status!=="Completada").sort((a,b)=>String(a.due_date).localeCompare(String(b.due_date))).slice(0,7);
  $("#content").innerHTML=`${head("Centro de control","Lo que requiere atención hoy, antes que los gráficos que quedan muy lindos en una reunión.")}<div class="grid kpi-grid">${kpi("Casos activos",active.length,"Cartera bajo seguimiento","◫")}${kpi("Próximos 7 días",due7,"Tareas y vencimientos","◷")}${kpi("Alertas activas",a.length,a.length?"Requieren revisión":"Sin señales críticas","!")} ${kpi("Honorarios pendientes",shortMoney(pend),"Sobre honorarios pactados","$")}</div><div class="grid dashboard-main"><section class="panel panel-pad"><div class="panel-head"><div><div class="panel-title">Necesita mi atención</div><div class="panel-sub">Ordenado por criticidad</div></div></div>${a.length?a.map(x=>`<div class="attention-item" data-case="${x.caseId}"><span class="dot ${x.sev}"></span><div class="item-main"><strong>${esc(x.title)}</strong><span>${esc(x.sub)}</span></div><div class="item-meta">Abrir →</div></div>`).join(""):`<div class="empty">No hay alertas activas.</div>`}</section><section class="panel panel-pad"><div class="panel-head"><div><div class="panel-title">Próximas acciones</div><div class="panel-sub">Agenda inmediata</div></div></div>${upcoming.map(t=>`<div class="agenda-row" data-case="${t.case_id}"><span class="dot ${t.legal_deadline?"critical":"medium"}"></span><div class="item-main"><strong>${esc(t.title)}</strong><span>${esc(cs(t.case_id)?.title||"")}</span></div><div class="item-meta">${fmtDate(t.due_date)}</div></div>`).join("")||`<div class="empty">Sin tareas próximas.</div>`}</section></div>`;
  $$("[data-case]").forEach(x=>x.onclick=()=>openCase(x.dataset.case));
}
function renderCases(){
  $("#content").innerHTML=`${head("Cartera de casos","Todos los asuntos, su etapa actual, prioridad, riesgo y próxima acción.",btn("＋ Nuevo caso","primary-btn",'id="newCaseBtn"'))}<div class="toolbar"><input class="filter" id="caseSearch" placeholder="Buscar caso o cliente"><select class="filter" id="caseStatus"><option value="">Todos los estados</option>${[...new Set(state.cases.map(c=>c.status))].map(x=>`<option>${esc(x)}</option>`).join("")}</select><select class="filter" id="caseSegment"><option value="">Todos los segmentos</option>${[...new Set(state.cases.map(c=>c.segment))].map(x=>`<option>${esc(x)}</option>`).join("")}</select></div><div class="panel table-wrap"><table><thead><tr><th>Caso / Cliente</th><th>Segmento</th><th>Estado</th><th>Prioridad</th><th>Riesgo</th><th>Próxima acción</th><th>Vencimiento</th><th></th></tr></thead><tbody id="caseRows"></tbody></table></div>`;
  $("#newCaseBtn").onclick=()=>editCase();
  const draw=()=>{const q=$("#caseSearch").value.toLowerCase(),st=$("#caseStatus").value,sg=$("#caseSegment").value;const rows=state.cases.filter(c=>(!q||`${c.title} ${client(c.client_id)?.name} ${c.docket}`.toLowerCase().includes(q))&&(!st||c.status===st)&&(!sg||c.segment===sg));$("#caseRows").innerHTML=rows.map(c=>`<tr data-open-case="${c.id}"><td><div class="case-main"><strong>${esc(c.title)}</strong><span>${esc(client(c.client_id)?.name||"")} · ${esc(c.id)}</span></div></td><td>${esc(c.segment)}</td><td><span class="badge">${esc(c.status)}</span></td><td><span class="badge ${priorityClass(c.priority)}">${esc(c.priority)}</span></td><td>${esc(c.risk)}</td><td>${esc(c.next_action||"⚠ Definir")}</td><td>${fmtDate(c.deadline_date)}</td><td><button class="tiny" data-edit-case="${c.id}">Editar</button></td></tr>`).join("");$$("[data-open-case]").forEach(r=>r.onclick=e=>{if(e.target.closest("[data-edit-case]"))return;openCase(r.dataset.openCase)});$$("[data-edit-case]").forEach(b=>b.onclick=e=>{e.stopPropagation();editCase(b.dataset.editCase)})};
  ["caseSearch","caseStatus","caseSegment"].forEach(id=>$("#"+id).oninput=draw);draw();
}
function renderClients(){
  $("#content").innerHTML=`${head("Cartera de clientes","La relación completa con el cliente, no solamente un expediente aislado.",btn("＋ Nuevo cliente","primary-btn",'id="newClientBtn"'))}<div class="grid cards">${state.clients.map(cl=>{const cc=state.cases.filter(c=>c.client_id===cl.id);return `<div class="panel client-card"><div class="client-head"><div class="client-logo">${initials(cl.name)}</div><div><strong>${esc(cl.name)}</strong><span>${esc(cl.client_type)} · ${esc(cl.segment)}</span></div></div><div class="client-metrics"><div class="client-metric"><span>Casos</span><strong>${cc.length}</strong></div><div class="client-metric"><span>Pendiente</span><strong>${shortMoney(cc.reduce((s,c)=>s+pending(c),0))}</strong></div><div class="client-metric"><span>Responsable</span><strong>${esc((cl.manager_name||"—").split(" ")[0])}</strong></div></div><div class="actions">${btn("Ver ficha","ghost-btn",`data-open-client="${cl.id}"`)}${btn("Editar","ghost-btn",`data-edit-client="${cl.id}"`)}</div></div>`}).join("")}</div>`;
  $("#newClientBtn").onclick=()=>editClient();$$("[data-open-client]").forEach(b=>b.onclick=()=>openClient(b.dataset.openClient));$$("[data-edit-client]").forEach(b=>b.onclick=()=>editClient(b.dataset.editClient));
}
function renderAgenda(){
  const tasks=[...state.tasks].filter(t=>t.status!=="Completada").sort((a,b)=>String(a.due_date).localeCompare(String(b.due_date)));
  $("#content").innerHTML=`${head("Agenda","Tareas, vencimientos y seguimientos en una sola vista.")}<div class="panel panel-pad">${tasks.map(t=>`<div class="agenda-row"><button class="tiny" data-task="${t.id}" data-status="${t.status}">${t.status==="Completada"?"✓":"○"}</button><span class="dot ${t.legal_deadline?"critical":"medium"}"></span><div class="item-main" data-case="${t.case_id}"><strong>${esc(t.title)}</strong><span>${esc(cs(t.case_id)?.title||"")} · ${esc(t.owner_name||"")}</span></div><div class="item-meta">${fmtDate(t.due_date)}<br>${t.legal_deadline?"PROCESAL":"INTERNO"}</div></div>`).join("")||`<div class="empty">Sin tareas pendientes.</div>`}</div>`;
  $$("[data-task]").forEach(b=>b.onclick=async()=>{await toggleTask(b.dataset.task,b.dataset.status);await refresh()});$$("[data-case]").forEach(x=>x.onclick=()=>openCase(x.dataset.case));
}
function renderDocuments(){
  $("#content").innerHTML=`
    ${head(
      "Documentos",
      "Índice transversal de los archivos guardados en cada actuación."
    )}

    ${
      !cfg.GOOGLE_DRIVE_CONNECTED
        ? `
          <div class="callout">
            <b>Memoria compartida activa.</b>
            Clientes, casos, actuaciones, tareas y honorarios
            ya se guardan en Supabase.

            Los documentos todavía no están conectados a Google Drive;
            no cargues adjuntos reales hasta completar esa etapa.
          </div>
        `
        : ""
    }

    <div class="grid docs-grid">

      ${
        state.documents.map(d=>`

          <div class="panel doc-card">

            <div class="client-head">

              <div class="file-icon">
                ${
                  (d.file_name || "FILE")
                    .split(".")
                    .pop()
                    .slice(0,4)
                    .toUpperCase()
                }
              </div>

              <div>
                <strong>${esc(d.file_name)}</strong>

                <span>
                  ${esc(
                    cs(d.case_id)?.title || ""
                  )}
                </span>
              </div>

            </div>

            <div class="doc-path">
              ${
                esc(
                  d.drive_url ||
                  d.drive_file_id ||
                  "Google Drive pendiente"
                )
              }
            </div>

            <div
              class="actions"
              style="margin-top:10px"
            >

              ${btn(
                "Abrir",
                "ghost-btn",
                `data-doc-open="${d.id}"`
              )}

              ${btn(
                "Descargar",
                "ghost-btn",
                `data-doc-download="${d.id}"`
              )}

              ${btn(
                "Archivar",
                "ghost-btn",
                `data-doc-archive="${d.id}"`
              )}

            </div>

          </div>

        `).join("")
        ||
        `
          <div class="panel empty">
            Todavía no hay documentos cargados.
          </div>
        `
      }

    </div>
  `;

  $$("[data-doc-open]").forEach(
    b=>b.onclick=()=>openDoc(
      b.dataset.docOpen,
      false
    )
  );

  $$("[data-doc-download]").forEach(
    b=>b.onclick=()=>openDoc(
      b.dataset.docDownload,
      true
    )
  );

  $$("[data-doc-archive]").forEach(
    b=>b.onclick=async()=>{
      if(
        confirm(
          "¿Archivar este documento? El archivo físico se conserva."
        )
      ){
        await archiveDocument(
          b.dataset.docArchive
        );

        await refresh();
      }
    }
  );
}
function renderFees(){
  const totalAg=state.cases.reduce((s,c)=>s+Number(c.fee_agreed||0),0),col=state.cases.reduce((s,c)=>s+Number(c.collected||0),0);
  $("#content").innerHTML=`${head("Honorarios","Seguimiento económico por asunto.")}<div class="grid kpi-grid">${kpi("Pactados",shortMoney(totalAg),"Cartera total","$")}${kpi("Cobrado",shortMoney(col),"Ingresos registrados","✓")}${kpi("Pendiente",shortMoney(totalAg-col),"Saldo por cobrar","◷")}${kpi("Cobranza",totalAg?`${Math.round(col/totalAg*100)}%`:"0%","Sobre pactado","⌁")}</div><div class="panel table-wrap"><table><thead><tr><th>Caso</th><th>Cliente</th><th>Pactado</th><th>Facturado</th><th>Cobrado</th><th>Pendiente</th><th></th></tr></thead><tbody>${state.cases.map(c=>`<tr><td>${esc(c.title)}</td><td>${esc(client(c.client_id)?.name||"")}</td><td>${money(c.fee_agreed)}</td><td>${money(c.billed)}</td><td>${money(c.collected)}</td><td>${money(pending(c))}</td><td><button class="tiny" data-pay="${c.id}">Registrar cobro</button></td></tr>`).join("")}</tbody></table></div>`;$$("[data-pay]").forEach(b=>b.onclick=()=>paymentForm(b.dataset.pay));
}
function renderReports(){
  const seg={};state.cases.forEach(c=>seg[c.segment]=(seg[c.segment]||0)+1);const pri={};state.cases.forEach(c=>pri[c.priority]=(pri[c.priority]||0)+1);
  $("#content").innerHTML=`${head("Indicadores","Una lectura ejecutiva de cartera, riesgo y carga.")}<div class="grid dashboard-main"><div class="panel panel-pad"><div class="panel-title">Casos por segmento</div>${Object.entries(seg).map(([k,v])=>`<div class="list-row"><div class="item-main"><strong>${esc(k)}</strong></div><div class="item-meta">${v}</div></div>`).join("")}</div><div class="panel panel-pad"><div class="panel-title">Prioridad de cartera</div>${Object.entries(pri).map(([k,v])=>`<div class="list-row"><span class="dot ${priorityClass(k)==="red"?"critical":priorityClass(k)==="orange"?"high":"medium"}"></span><div class="item-main"><strong>${esc(k)}</strong></div><div class="item-meta">${v}</div></div>`).join("")}</div></div>`;
}
function showDrawer(html){$("#drawer").innerHTML=html;$("#drawer").classList.remove("hidden");$("#backdrop").classList.remove("hidden");document.body.style.overflow="hidden";$$("[data-close]").forEach(b=>b.onclick=closeDrawer)}
function closeDrawer(){$("#drawer").classList.add("hidden");$("#backdrop").classList.add("hidden");document.body.style.overflow=""}
function openCase(id,tab="summary"){activeCaseId=id;activeTab=tab;const c=cs(id),cl=client(c.client_id),acts=caseActions(id),tasks=caseTasks(id),docs=caseDocs(id);
  const tabs=[["summary","Resumen"],["actions","Actuaciones"],["tasks","Tareas"],["judicial","Judicial"],["fees","Honorarios"]];
  let body="";
  if(tab==="summary")body=`<div class="form-card"><div class="list-row"><div class="item-main"><strong>Cliente</strong><span>${esc(cl?.name||"")}</span></div></div><div class="list-row"><div class="item-main"><strong>Contraparte</strong><span>${esc(c.counterpart||"—")}</span></div></div><div class="list-row"><div class="item-main"><strong>Responsable</strong><span>${esc(c.manager_name||"—")}</span></div></div><div class="list-row"><div class="item-main"><strong>Documentación</strong><span>${docs.length} archivo(s) registrados</span></div></div></div>`;
  if(tab==="actions")body=`<div class="actions" style="justify-content:flex-end;margin-bottom:10px">${btn("＋ Nueva actuación","primary-btn",'id="newActionBtn"')}</div><div class="timeline">${acts.map(actionCard).join("")||`<div class="empty">Sin actuaciones.</div>`}</div>`;
  if(tab==="tasks")body=`<div class="actions" style="justify-content:flex-end;margin-bottom:10px">${btn("＋ Agregar tarea","ghost-btn",'id="newTaskBtn"')}</div><div class="form-card">${tasks.map(t=>`<div class="agenda-row"><button class="tiny" data-case-task="${t.id}" data-status="${t.status}">${t.status==="Completada"?"✓":"○"}</button><div class="item-main"><strong>${esc(t.title)}</strong><span>${esc(t.owner_name||"")} · ${esc(t.category||"")}</span></div><div class="item-meta">${fmtDate(t.due_date)}</div></div>`).join("")||`<div class="empty">Sin tareas.</div>`}</div>`;
  if(tab==="judicial")body=`<div class="form-card"><div class="list-row"><div class="item-main"><strong>Expediente</strong><span>${esc(c.docket||"—")}</span></div></div><div class="list-row"><div class="item-main"><strong>Juzgado / organismo</strong><span>${esc(c.court||"—")}</span></div></div><div class="list-row"><div class="item-main"><strong>Jurisdicción</strong><span>${esc(c.jurisdiction||"—")}</span></div></div><div class="list-row"><div class="item-main"><strong>Vencimiento</strong><span>${fmtDate(c.deadline_date)}</span></div></div></div>`;
  if(tab==="fees")body=`<div class="form-card"><div class="list-row"><div class="item-main"><strong>Honorarios pactados</strong></div><div class="item-meta">${money(c.fee_agreed)}</div></div><div class="list-row"><div class="item-main"><strong>Cobrado</strong></div><div class="item-meta">${money(c.collected)}</div></div><div class="list-row"><div class="item-main"><strong>Pendiente</strong></div><div class="item-meta">${money(pending(c))}</div></div><div class="actions" style="justify-content:flex-end;margin-top:12px">${btn("Registrar cobro","ghost-btn",'id="drawerPay"')}</div></div>`;
  showDrawer(`<div class="drawer-header"><div class="drawer-top"><div><div class="eyebrow">${esc(c.id)} · Caso 360°</div><h2 class="drawer-title">${esc(c.title)}</h2><p class="page-sub">${esc(cl?.name||"")} · ${esc(c.counterpart||"")}</p></div><div class="actions">${btn("Editar caso","ghost-btn",'id="drawerEditCase"')}<button class="icon-btn" data-close>×</button></div></div></div><div class="drawer-body"><div class="grid summary-grid"><div class="summary"><span>Estado</span><div class="summary-edit"><strong>${esc(c.status)}</strong><button class="tiny" id="quickEdit">Cambiar</button></div></div><div class="summary"><span>Prioridad</span><div class="summary-edit"><strong>${esc(c.priority)}</strong><button class="tiny" id="quickEdit2">Cambiar</button></div></div><div class="summary"><span>Riesgo</span><div class="summary-edit"><strong>${esc(c.risk)}</strong><button class="tiny" id="quickEdit3">Cambiar</button></div></div><div class="summary"><span>Documentos</span><strong>${docs.length}</strong></div></div><div class="next-action"><div><span>PRÓXIMA ACCIÓN</span><strong>${esc(c.next_action||"⚠ Definir próxima acción")}</strong></div><div>${fmtDate(c.next_action_date)}</div></div><div class="tabs">${tabs.map(t=>`<button class="tab ${tab===t[0]?"active":""}" data-tab="${t[0]}">${t[1]}</button>`).join("")}</div>${body}</div>`);
  $$("[data-tab]").forEach(b=>b.onclick=()=>openCase(id,b.dataset.tab));$("#drawerEditCase").onclick=()=>editCase(id);["quickEdit","quickEdit2","quickEdit3"].forEach(x=>$("#"+x).onclick=()=>editCase(id));$("#newActionBtn")?.addEventListener("click",()=>actionForm(id));$("#newTaskBtn")?.addEventListener("click",()=>taskForm(id));$("#drawerPay")?.addEventListener("click",()=>paymentForm(id));$$("[data-case-task]").forEach(b=>b.onclick=async()=>{await toggleTask(b.dataset.caseTask,b.dataset.status);await refresh();openCase(id,"tasks")});$$("[data-doc-open]").forEach(b=>b.onclick=()=>openDoc(b.dataset.docOpen,false));
}
function actionCard(a){const docs=state.documents.filter(d=>d.action_id===a.id);return `<article class="action-card"><div class="action-head"><div><div class="action-date">${fmtDate(a.action_date)} · ${esc(a.type)}</div><div class="action-owner">${esc(a.owner_name||"")}</div></div></div><p>${esc(a.description)}</p><span class="badge">${esc(a.result||"Registrado")}</span>${a.status_from!==a.status_to?`<div class="transition">Estado: <b>${esc(a.status_from)} → ${esc(a.status_to)}</b></div>`:""}${a.priority_from!==a.priority_to?`<div class="transition">Prioridad: <b>${esc(a.priority_from)} → ${esc(a.priority_to)}</b></div>`:""}${a.risk_from!==a.risk_to?`<div class="transition">Riesgo: <b>${esc(a.risk_from)} → ${esc(a.risk_to)}</b></div>`:""}<div class="attachments"><div class="attachment-head"><strong>Documentos de esta actuación</strong><span>${docs.length}</span></div>${docs.map(d=>`<div class="attachment"><div class="file-icon">${(d.file_name||"FILE").split(".").pop().slice(0,4).toUpperCase()}</div><div class="file-main"><strong>${esc(d.file_name)}</strong><span>${Math.round(Number(d.size_bytes||0)/1024)} KB · SHA-256 registrado</span></div><div class="file-actions"><button data-doc-open="${d.id}">Abrir</button><button data-doc-download="${d.id}">Descargar</button></div></div>`).join("")||`<div class="empty" style="padding:10px">Sin adjuntos.</div>`}</div></article>`}
async function openDoc(id,download){

  const d=
    state.documents.find(
      x=>x.id===id
    );

  if(!d) return;

  try{

    const url=
      await signedDocumentUrl(
        d.drive_url ||
        d.drive_file_id,
        download
      );

    window.open(
      url,
      "_blank",
      "noopener"
    );

  }catch(e){

    toast(e.message);

  }
}
function openClient(id){const cl=client(id),cc=state.cases.filter(c=>c.client_id===id);showDrawer(`<div class="drawer-header"><div class="drawer-top"><div><div class="eyebrow">${esc(cl.id)} · Cliente</div><h2 class="drawer-title">${esc(cl.name)}</h2><p class="page-sub">${esc(cl.client_type)} · ${esc(cl.segment)}</p></div><div class="actions">${btn("Editar cliente","ghost-btn",'id="editClientDrawer"')}<button class="icon-btn" data-close>×</button></div></div></div><div class="drawer-body"><div class="form-card"><div class="list-row"><div class="item-main"><strong>Contacto</strong><span>${esc(cl.contact_name||"—")}</span></div></div><div class="list-row"><div class="item-main"><strong>Email</strong><span>${esc(cl.email||"—")}</span></div></div><div class="list-row"><div class="item-main"><strong>Teléfono</strong><span>${esc(cl.phone||"—")}</span></div></div><div class="list-row"><div class="item-main"><strong>Responsable</strong><span>${esc(cl.manager_name||"—")}</span></div></div></div><div class="form-card" style="margin-top:12px"><div class="panel-title">Asuntos</div>${cc.map(c=>`<div class="list-row" data-case="${c.id}"><div class="item-main"><strong>${esc(c.title)}</strong><span>${esc(c.status)} · ${esc(c.priority)}</span></div><div class="item-meta">Abrir →</div></div>`).join("")}</div></div>`);$("#editClientDrawer").onclick=()=>editClient(id);$$("[data-case]").forEach(x=>x.onclick=()=>openCase(x.dataset.case))}
function editClient(id=null){const cl=id?client(id):{id:`CL-${crypto.randomUUID().slice(0,8).toUpperCase()}`,relation_status:"Activo",created_at:currentDateISO()};showDrawer(`<div class="drawer-header"><div class="drawer-top"><div><div class="eyebrow">${id?"Editar":"Nuevo"} cliente</div><h2 class="drawer-title">${id?esc(cl.name):"Alta de cliente"}</h2></div><button class="icon-btn" data-close>×</button></div></div><div class="drawer-body"><form id="clientForm" class="form-card"><div class="form-grid">${field("name","Nombre / razón social",cl.name,true,"full")}${select("client_type","Tipo",["Empresa","Persona"],cl.client_type)}${field("tax_id","CUIT / DNI",cl.tax_id)}${field("contact_name","Contacto",cl.contact_name)}${field("email","Email",cl.email,false,"", "email")}${field("phone","Teléfono",cl.phone)}${select("segment","Segmento",["Corporativo","PyME","Particular","Institucional"],cl.segment)}${field("industry","Actividad / industria",cl.industry)}${field("manager_name","Responsable",cl.manager_name)}${select("relation_status","Estado relación",["Activo","Prospecto","Inactivo"],cl.relation_status)}${field("created_at","Fecha de alta",cl.created_at,false,"","date")}${textarea("notes","Observaciones",cl.notes)}</div><div class="form-actions">${btn("Cancelar","ghost-btn",'type="button" data-close')}${btn("Guardar cliente","primary-btn")}</div></form></div>`);$("#clientForm").onsubmit=async e=>{e.preventDefault();const o=Object.fromEntries(new FormData(e.target));o.id=cl.id;try{await upsertClient(o);toast("Cliente guardado");await refresh()}catch(err){toast(err.message)}}}
function editCase(id=null){const c=id?cs(id):{id:`CAS-${crypto.randomUUID().slice(0,8).toUpperCase()}`,status:"Consulta",priority:"Medio",risk:"Medio",opened_on:currentDateISO(),waiting_external:false,fee_agreed:0,billed:0,collected:0,expenses:0};showDrawer(`<div class="drawer-header"><div class="drawer-top"><div><div class="eyebrow">${id?"Editar":"Nuevo"} caso</div><h2 class="drawer-title">${id?esc(c.title):"Alta de asunto"}</h2></div><button class="icon-btn" data-close>×</button></div></div><div class="drawer-body"><form id="caseForm" class="form-card"><div class="form-grid">${field("title","Nombre del caso",c.title,true,"full")}${select("client_id","Cliente",state.clients.map(x=>({value:x.id,label:x.name})),c.client_id,true)}${field("counterpart","Contraparte",c.counterpart)}${select("segment","Segmento",["Laboral","Civil","Comercial","Familia","Societario","Penal","Administrativo","Defensa consumidor","Contratos","Asesoramiento","Otros"],c.segment)}${select("case_type","Tipo",["Litigioso","Extrajudicial","Consultivo","Contractual","Negociación","Administrativo"],c.case_type)}${select("status","Estado",["Consulta","Evaluación","Documentación","Intimación","Mediación","Demanda","Contestación","Prueba","Alegatos","Sentencia","Ejecución","Cierre"],c.status)}${select("priority","Prioridad",["Crítico","Alto","Medio","Bajo"],c.priority)}${select("risk","Riesgo",["Alto","Medio","Bajo"],c.risk)}${field("manager_name","Responsable",c.manager_name)}${field("opened_on","Fecha apertura",c.opened_on,false,"","date")}${field("next_action","Próxima acción",c.next_action,false,"full")}${field("next_action_date","Fecha próxima acción",c.next_action_date,false,"","date")}${field("deadline_date","Vencimiento procesal",c.deadline_date,false,"","date")}${select("waiting_external","Esperando tercero",[{"value":"false","label":"No"},{"value":"true","label":"Sí"}],String(!!c.waiting_external))}${field("waiting_reason","Motivo espera",c.waiting_reason)}${field("docket","N° expediente",c.docket)}${field("court","Juzgado / organismo",c.court)}${field("jurisdiction","Jurisdicción",c.jurisdiction)}${field("fee_agreed","Honorarios pactados",c.fee_agreed,false,"","number")}${field("billed","Facturado",c.billed,false,"","number")}${field("collected","Cobrado",c.collected,false,"","number")}${field("expenses","Gastos",c.expenses,false,"","number")}${field("folder_link","Carpeta / enlace alternativo",c.folder_link,false,"full")}${textarea("notes","Notas",c.notes)}</div><div class="form-actions">${btn("Cancelar","ghost-btn",'type="button" data-close')}${btn("Guardar caso","primary-btn")}</div></form></div>`);$("#caseForm").onsubmit=async e=>{e.preventDefault();const o=Object.fromEntries(new FormData(e.target));o.id=c.id;o.waiting_external=o.waiting_external==="true";["fee_agreed","billed","collected","expenses"].forEach(k=>o[k]=Number(o[k]||0));try{await upsertCase(o);toast("Caso guardado");await refresh()}catch(err){toast(err.message)}}}
function actionForm(caseId){const c=cs(caseId);showDrawer(`<div class="drawer-header"><div class="drawer-top"><div><div class="eyebrow">${esc(caseId)} · Actuación</div><h2 class="drawer-title">Nueva actuación</h2><p class="page-sub">${esc(c.title)}</p></div><button class="icon-btn" data-close>×</button></div></div><div class="drawer-body">${!cfg.GOOGLE_DRIVE_CONNECTED?`
<div class="callout">
  <b>Google Drive pendiente:</b>
  podés registrar la actuación,
  pero todavía no adjuntar documentos.
  Esa conexión será la próxima etapa.
</div>
`:""}<form id="actionForm" class="form-card"><div class="form-grid">${field("action_date","Fecha",currentDateISO(),true,"","date")}${select("type","Tipo",["Presentación judicial","Documento","Reunión","Llamada","Correo","Audiencia","Resolución","Negociación","Consulta","Otro"],"Presentación judicial")}${field("owner_name","Responsable",c.manager_name)}${field("result","Resultado","Registrado")}${select("status_to","Estado posterior",["Consulta","Evaluación","Documentación","Intimación","Mediación","Demanda","Contestación","Prueba","Alegatos","Sentencia","Ejecución","Cierre"],c.status)}${select("priority_to","Prioridad posterior",["Crítico","Alto","Medio","Bajo"],c.priority)}${select("risk_to","Riesgo posterior",["Alto","Medio","Bajo"],c.risk)}${textarea("description","Descripción","",true)}<div class="field full"><label>Documentos adjuntos</label><div class="drop" id="dropZone"><strong>Arrastrá archivos aquí o tocá para seleccionarlos</strong><span>Se guardarán automáticamente dentro de esta actuación.</span><input id="actionFiles" type="file" multiple hidden></div><div class="filequeue" id="fileQueue"></div></div></div><div class="form-actions">${btn("Cancelar","ghost-btn",'type="button" data-close')}${btn("Guardar actuación","primary-btn")}</div></form></div>`);bindDrop();$("#actionForm").onsubmit=async e=>{e.preventDefault();const o=Object.fromEntries(new FormData(e.target));o.case_id=caseId;o.status_from=c.status;o.priority_from=c.priority;o.risk_from=c.risk;const files=[...$("#actionFiles").files];try{await addAction(o,files);toast(`Actuación guardada${files.length?` · ${files.length} archivo(s)`:``}`);await refresh()}catch(err){toast(err.message)}}}
function taskForm(caseId){const c=cs(caseId);showDrawer(`<div class="drawer-header"><div class="drawer-top"><div><div class="eyebrow">${esc(caseId)}</div><h2 class="drawer-title">Nueva tarea</h2></div><button class="icon-btn" data-close>×</button></div></div><div class="drawer-body"><form id="taskForm" class="form-card"><div class="form-grid">${field("title","Acción", "",true,"full")}${field("owner_name","Responsable",c.manager_name)}${field("due_date","Fecha objetivo",currentDateISO(),true,"","date")}${select("priority","Prioridad",["Crítico","Alto","Medio","Bajo"],c.priority)}${select("category","Categoría",["Seguimiento","Presentación","Documentación","Reunión","Audiencia"],"Seguimiento")}${select("legal_deadline","Vencimiento procesal",[{"value":"false","label":"No"},{"value":"true","label":"Sí"}],"false")}</div><div class="form-actions">${btn("Cancelar","ghost-btn",'type="button" data-close')}${btn("Agregar tarea","primary-btn")}</div></form></div>`);$("#taskForm").onsubmit=async e=>{e.preventDefault();const o=Object.fromEntries(new FormData(e.target));o.case_id=caseId;o.status="Pendiente";o.legal_deadline=o.legal_deadline==="true";try{await addTask(o);toast("Tarea agregada");await refresh()}catch(err){toast(err.message)}}}
function paymentForm(caseId){const c=cs(caseId);showDrawer(`<div class="drawer-header"><div class="drawer-top"><div><div class="eyebrow">${esc(caseId)}</div><h2 class="drawer-title">Registrar cobro</h2><p class="page-sub">Pendiente: ${money(pending(c))}</p></div><button class="icon-btn" data-close>×</button></div></div><div class="drawer-body"><form id="paymentForm" class="form-card"><div class="form-grid">${field("amount","Monto","",true,"","number")}${field("movement_date","Fecha",currentDateISO(),true,"","date")}${field("concept","Concepto","Cuota de honorarios",false,"full")}</div><div class="form-actions">${btn("Cancelar","ghost-btn",'type="button" data-close')}${btn("Registrar","primary-btn")}</div></form></div>`);$("#paymentForm").onsubmit=async e=>{e.preventDefault();const o=Object.fromEntries(new FormData(e.target));o.case_id=caseId;o.type="Cobro";o.amount=Number(o.amount);try{await addFeeMovement(o);toast("Cobro registrado");await refresh()}catch(err){toast(err.message)}}}
function field(name,label,value="",required=false,cls="",type="text"){return `<div class="field ${cls}"><label>${label}${required?" *":""}</label><input name="${name}" type="${type}" value="${esc(value??"")}" ${required?"required":""}></div>`}
function textarea(name,label,value="",required=false){return `<div class="field full"><label>${label}${required?" *":""}</label><textarea name="${name}" rows="4" ${required?"required":""}>${esc(value??"")}</textarea></div>`}
function select(name,label,options,value,required=false){return `<div class="field"><label>${label}${required?" *":""}</label><select name="${name}" ${required?"required":""}>${options.map(o=>{const val=typeof o==="object"?o.value:o,lab=typeof o==="object"?o.label:o;return `<option value="${esc(val)}" ${String(val)===String(value)?"selected":""}>${esc(lab)}</option>`}).join("")}</select></div>`}
function bindDrop(){const z=$("#dropZone"),i=$("#actionFiles"),q=$("#fileQueue");const draw=()=>q.innerHTML=[...i.files].map(f=>`<div class="filequeue-row"><span>${esc(f.name)}</span><span>${Math.round(f.size/1024)} KB</span></div>`).join("");z.onclick=()=>i.click();i.onchange=draw;["dragenter","dragover"].forEach(ev=>z.addEventListener(ev,e=>{e.preventDefault();z.classList.add("drag")}));["dragleave","drop"].forEach(ev=>z.addEventListener(ev,e=>{e.preventDefault();z.classList.remove("drag")}));z.addEventListener("drop",e=>{const dt=new DataTransfer();[...e.dataTransfer.files].forEach(f=>dt.items.add(f));i.files=dt.files;draw()})}
boot().catch(e=>{console.error(e);$("#app").innerHTML=`<div class="empty">Error al iniciar: ${esc(e.message)}</div>`});
