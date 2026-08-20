export const DEMO = {
  clients:[
    {id:"CL-001",name:"Industrias Andinas S.A.",client_type:"Empresa",tax_id:"30-71112223-4",contact_name:"Mariana Ruiz",email:"mariana@andinas.demo",phone:"+54 260 4000001",segment:"Corporativo",industry:"Industria",manager_name:"Juan Martínez",relation_status:"Activo",notes:"Cliente estratégico",created_at:"2026-05-02"},
    {id:"CL-002",name:"Tomás Herrera",client_type:"Persona",tax_id:"20-28999111-9",contact_name:"Tomás Herrera",email:"tomas@example.demo",phone:"+54 260 4000002",segment:"Particular",industry:"—",manager_name:"Sofía Álvarez",relation_status:"Activo",notes:"",created_at:"2026-06-14"},
    {id:"CL-003",name:"Bodega del Sur SRL",client_type:"Empresa",tax_id:"30-74444555-6",contact_name:"Andrea Paz",email:"andrea@bodega.demo",phone:"+54 260 4000003",segment:"PyME",industry:"Vitivinícola",manager_name:"Marcos Díaz",relation_status:"Activo",notes:"Abono mensual",created_at:"2026-04-07"},
    {id:"CL-004",name:"Clínica Central",client_type:"Empresa",tax_id:"30-76666777-8",contact_name:"Lucía Gómez",email:"lucia@clinica.demo",phone:"+54 260 4000004",segment:"Corporativo",industry:"Salud",manager_name:"Juan Martínez",relation_status:"Activo",notes:"",created_at:"2026-03-21"}
  ],
  cases:[
    {id:"CAS-001",client_id:"CL-001",title:"Reclamo contractual proveedor",counterpart:"Logística Cuyo SA",segment:"Comercial",case_type:"Litigioso",status:"Demanda",manager_name:"Juan Martínez",opened_on:"2026-05-04",priority:"Alto",risk:"Medio",next_action:"Controlar proveído de demanda",next_action_date:"2026-08-22",deadline_date:"2026-08-23",waiting_external:false,waiting_reason:"",court:"2° Juzgado Civil",docket:"CUIJ 13-07123456-8",jurisdiction:"Mendoza",fee_agreed:2500000,billed:1500000,collected:1100000,expenses:120000,folder_link:"",notes:""},
    {id:"CAS-002",client_id:"CL-002",title:"Despido y diferencias salariales",counterpart:"Empresa Norte SRL",segment:"Laboral",case_type:"Litigioso",status:"Prueba",manager_name:"Sofía Álvarez",opened_on:"2026-06-15",priority:"Crítico",risk:"Alto",next_action:"Ofrecer prueba informativa",next_action_date:"2026-08-21",deadline_date:"2026-08-21",waiting_external:false,waiting_reason:"",court:"Cámara Laboral",docket:"179922",jurisdiction:"San Rafael",fee_agreed:1800000,billed:900000,collected:700000,expenses:80000,folder_link:"",notes:""},
    {id:"CAS-003",client_id:"CL-003",title:"Contrato distribución regional",counterpart:"Distribuidora Oeste",segment:"Contratos",case_type:"Contractual",status:"Documentación",manager_name:"Marcos Díaz",opened_on:"2026-07-11",priority:"Medio",risk:"Bajo",next_action:"Recibir observaciones del cliente",next_action_date:"2026-08-25",deadline_date:null,waiting_external:true,waiting_reason:"Cliente",court:"—",docket:"—",jurisdiction:"—",fee_agreed:950000,billed:950000,collected:950000,expenses:0,folder_link:"",notes:""},
    {id:"CAS-004",client_id:"CL-004",title:"Defensa reclamo paciente",counterpart:"Paciente particular",segment:"Civil",case_type:"Extrajudicial",status:"Mediación",manager_name:"Juan Martínez",opened_on:"2026-06-28",priority:"Alto",risk:"Alto",next_action:"Preparar audiencia de mediación",next_action_date:"2026-08-27",deadline_date:"2026-08-27",waiting_external:false,waiting_reason:"",court:"Mediación prejudicial",docket:"MED-4421",jurisdiction:"Mendoza",fee_agreed:2100000,billed:1000000,collected:600000,expenses:40000,folder_link:"",notes:""}
  ],
  actions:[
    {id:"A-001",case_id:"CAS-001",action_date:"2026-08-14",type:"Presentación judicial",description:"Se presentó demanda con documental y poder.",owner_name:"Juan Martínez",result:"Pendiente proveído",status_from:"Mediación",status_to:"Demanda",priority_from:"Alto",priority_to:"Alto",risk_from:"Medio",risk_to:"Medio"},
    {id:"A-002",case_id:"CAS-001",action_date:"2026-07-29",type:"Mediación",description:"Audiencia sin acuerdo. Se cerró instancia prejudicial.",owner_name:"Juan Martínez",result:"Sin acuerdo",status_from:"Mediación",status_to:"Mediación",priority_from:"Medio",priority_to:"Alto",risk_from:"Medio",risk_to:"Medio"},
    {id:"A-003",case_id:"CAS-002",action_date:"2026-08-18",type:"Resolución",description:"Se notificó apertura a prueba.",owner_name:"Sofía Álvarez",result:"Plazo probatorio en curso",status_from:"Contestación",status_to:"Prueba",priority_from:"Alto",priority_to:"Crítico",risk_from:"Alto",risk_to:"Alto"},
    {id:"A-004",case_id:"CAS-003",action_date:"2026-08-12",type:"Documento",description:"Se envió segunda versión del contrato al cliente.",owner_name:"Marcos Díaz",result:"Esperando observaciones",status_from:"Documentación",status_to:"Documentación",priority_from:"Medio",priority_to:"Medio",risk_from:"Bajo",risk_to:"Bajo"}
  ],
  tasks:[
    {id:"T-001",case_id:"CAS-001",title:"Controlar proveído",owner_name:"Juan Martínez",due_date:"2026-08-22",legal_deadline:true,priority:"Alto",status:"Pendiente",category:"Seguimiento"},
    {id:"T-002",case_id:"CAS-002",title:"Ofrecer prueba informativa",owner_name:"Sofía Álvarez",due_date:"2026-08-21",legal_deadline:true,priority:"Crítico",status:"Pendiente",category:"Presentación"},
    {id:"T-003",case_id:"CAS-003",title:"Pedir devolución al cliente",owner_name:"Marcos Díaz",due_date:"2026-08-25",legal_deadline:false,priority:"Medio",status:"Esperando cliente",category:"Documentación"}
  ],
  documents:[],
  fee_movements:[
    {id:"M-001",case_id:"CAS-001",movement_date:"2026-08-01",type:"Cobro",amount:500000,concept:"Segunda cuota"},
    {id:"M-002",case_id:"CAS-002",movement_date:"2026-08-10",type:"Cobro",amount:300000,concept:"Cuota honorarios"}
  ]
};