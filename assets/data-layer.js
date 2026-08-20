import { DEMO } from "./demo-data.js";

export const isDemo = true;
export const bucket = "local-preview";
export const supabase = null;

const LS = "tm-asociados-render-etapa1-v1";
const DB_NAME = "tm-asociados-local-files";
const STORE = "files";

function clone(o){return JSON.parse(JSON.stringify(o))}
function state(){
  const raw=localStorage.getItem(LS);
  if(raw){try{return JSON.parse(raw)}catch{}}
  const d=clone(DEMO); d.documents=d.documents||[];
  localStorage.setItem(LS,JSON.stringify(d)); return d;
}
function save(s){localStorage.setItem(LS,JSON.stringify(s))}
function randomId(prefix){return `${prefix}-${crypto.randomUUID().slice(0,8).toUpperCase()}`}
function openDb(){
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open(DB_NAME,1);
    req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE,{keyPath:"id"})};
    req.onsuccess=()=>resolve(req.result); req.onerror=()=>reject(req.error);
  });
}
async function putBlob(rec){const db=await openDb();return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,"readwrite");tx.objectStore(STORE).put(rec);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error)})}
async function getBlob(id){const db=await openDb();return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,"readonly");const q=tx.objectStore(STORE).get(id);q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error)})}
export async function hashFile(file){
  const buf=await file.arrayBuffer();const hash=await crypto.subtle.digest("SHA-256",buf);
  return [...new Uint8Array(hash)].map(b=>b.toString(16).padStart(2,"0")).join("");
}
export async function authSession(){return {user:{id:"render-preview",email:"preview@tm-asociados.local"}}}
export async function login(email,password){return {user:{email}}}
export async function logout(){}
export async function loadAll(){return state()}
export async function upsertClient(obj){
  const s=state();const i=s.clients.findIndex(x=>x.id===obj.id);
  if(i>=0)s.clients[i]={...s.clients[i],...obj};else s.clients.push({...obj,id:obj.id||randomId("CL")});
  save(s);
}
export async function upsertCase(obj){
  const s=state();const i=s.cases.findIndex(x=>x.id===obj.id);
  if(i>=0)s.cases[i]={...s.cases[i],...obj};else s.cases.push({...obj,id:obj.id||randomId("CAS")});
  save(s);
}
export async function addAction(obj,files=[]){
  const s=state(), actionId=obj.id||randomId("A");
  s.actions.push({...obj,id:actionId});
  const c=s.cases.find(x=>x.id===obj.case_id);
  if(c){
    c.status=obj.status_to||c.status;c.priority=obj.priority_to||c.priority;c.risk=obj.risk_to||c.risk;c.last_action=obj.action_date;
  }
  s.documents=s.documents||[];
  save(s);
  for(const file of files){
    const id=randomId("FILE"), sha256=await hashFile(file);
    await putBlob({id,blob:file,name:file.name,type:file.type,size:file.size,created_at:new Date().toISOString()});
    const current=state();
    current.documents=current.documents||[];
    current.documents.push({
      id,case_id:obj.case_id,action_id:actionId,file_name:file.name,
      object_path:`local://${id}`,mime_type:file.type,size_bytes:file.size,sha256,
      created_at:new Date().toISOString(),archived_at:null
    });
    save(current);
  }
  return actionId;
}
export async function addTask(obj){
  const s=state();s.tasks.push({...obj,id:randomId("T")});save(s);
}
export async function toggleTask(id,status){
  const s=state(),t=s.tasks.find(x=>x.id===id);if(t)t.status=status==="Completada"?"Pendiente":"Completada";save(s);
}
export async function addFeeMovement(obj){
  const s=state();s.fee_movements.push({...obj,id:randomId("M")});
  const c=s.cases.find(x=>x.id===obj.case_id);
  if(c&&obj.type==="Cobro"){c.collected=Number(c.collected||0)+Number(obj.amount);c.billed=Math.max(Number(c.billed||0),Number(c.collected||0))}
  save(s);
}
export async function uploadDocument(caseId,actionId,file){
  const id=randomId("FILE"),sha256=await hashFile(file);
  await putBlob({id,blob:file,name:file.name,type:file.type,size:file.size,created_at:new Date().toISOString()});
  const s=state();s.documents=s.documents||[];
  s.documents.push({id,case_id:caseId,action_id:actionId,file_name:file.name,object_path:`local://${id}`,mime_type:file.type,size_bytes:file.size,sha256,created_at:new Date().toISOString(),archived_at:null});
  save(s);return id;
}
export async function signedDocumentUrl(path,download=false){
  const id=String(path||"").replace("local://","");
  const rec=await getBlob(id);if(!rec?.blob)throw new Error("El archivo no está disponible en este navegador.");
  return URL.createObjectURL(rec.blob);
}
export async function archiveDocument(id){
  const s=state(),d=(s.documents||[]).find(x=>x.id===id);if(d)d.archived_at=new Date().toISOString();
  s.documents=(s.documents||[]).filter(x=>!x.archived_at);save(s);
}
export function resetDemo(){localStorage.removeItem(LS);indexedDB.deleteDatabase(DB_NAME)}
