import { useState, useEffect, useMemo, useCallback } from "react";
import { api, setToken, setStoredUser, getStoredUser } from "./api";
import { F, C, MONTHS, fmt, today, curMonth, css, lbl, inp, sel, btn, secT, crd, iconBtn, Ctx, useApp, Modal, Confirm, Pill, TabBar, MonthNav } from "./shared.jsx";

// ═══ LOGIN ═══
function Login({ onLogin }) {
  const [u,setU]=useState(""),[p,setP]=useState(""),[err,setErr]=useState(""),[busy,setBusy]=useState(false);
  const go=async()=>{if(!u||!p)return;setBusy(true);setErr("");try{const r=await api.login(u.trim(),p);setToken(r.token);setStoredUser(r.user);onLogin(r.user);}catch(e){setErr(e.message);}finally{setBusy(false);}};
  return (<div style={{minHeight:"100vh",background:C.dark,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:F}}>
    <div style={{width:"88%",maxWidth:340}}>
      <div style={{textAlign:"center",marginBottom:36}}><div style={{fontSize:44,marginBottom:8}}>💰</div>
        <h1 style={{fontSize:22,fontWeight:700,color:"#fff",letterSpacing:-.5}}>Mis Gastos</h1>
        <p style={{color:"#555",fontSize:13,marginTop:5}}>Ingresá para continuar</p></div>
      <div style={{background:C.bg,borderRadius:18,padding:22}}>
        {err&&<div style={{background:"#fde8e8",color:"#c33",padding:"9px 12px",borderRadius:9,fontSize:12,marginBottom:14,fontWeight:500}}>{err}</div>}
        <label style={lbl}>Usuario</label>
        <input value={u} onChange={e=>setU(e.target.value)} placeholder="admin" style={inp} onKeyDown={e=>e.key==="Enter"&&go()} autoFocus autoCapitalize="none"/>
        <label style={lbl}>Contraseña</label>
        <input type="password" value={p} onChange={e=>setP(e.target.value)} placeholder="••••••" style={inp} onKeyDown={e=>e.key==="Enter"&&go()}/>
        <div style={{marginTop:22}}><button onClick={go} disabled={busy} style={{...btn(),opacity:busy?.6:1}}>{busy?"Ingresando...":"Ingresar"}</button></div>
      </div></div></div>);
}

// ═══ ALERTS BANNER ═══
function AlertsBanner() {
  const [alerts,setAlerts]=useState(null);
  useEffect(()=>{api.getAlerts().then(setAlerts).catch(()=>{});},[]);
  if(!alerts)return null;
  const items=[];
  (alerts.closing_tomorrow||[]).forEach(c=>items.push({icon:"⚠️",text:`${c.card_name} cierra mañana — Total: ${fmt(c.total)}`,bg:"#FFF3CD",color:"#856404"}));
  (alerts.due_tomorrow||[]).forEach(c=>items.push({icon:"🔴",text:`${c.card_name} vence mañana — Pagar: ${fmt(c.total)}`,bg:"#fde8e8",color:"#c33"}));
  if(!items.length)return null;
  return (<div style={{padding:"8px 16px 0"}}>{items.map((a,i)=>(<div key={i} style={{background:a.bg,color:a.color,padding:"10px 14px",borderRadius:12,fontSize:12,fontWeight:500,marginBottom:6,display:"flex",alignItems:"center",gap:8}}><span>{a.icon}</span>{a.text}</div>))}</div>);
}

// ═══ EXPENSE FORM ═══
function ExpenseForm({expense,categories,paymentMethods,creditCards,onSave,onCancel}) {
  const [f,setF]=useState({description:expense?.description||"",amount:expense?.amount||"",category_id:expense?.category_id||categories[0]?.id||"",payment_method_id:expense?.payment_method_id||"",credit_card_id:expense?.credit_card_id||"",date:expense?.date||today()});
  const [busy,setBusy]=useState(false);
  const pm=paymentMethods.find(p=>p.id===f.payment_method_id);const showCards=pm?.type==="credit_card";
  const go=async()=>{if(!f.description.trim()||!f.amount||Number(f.amount)<=0)return;setBusy(true);try{await onSave({...(expense?.id&&{id:expense.id}),...f,amount:Number(f.amount),credit_card_id:showCards?f.credit_card_id:null});}finally{setBusy(false);}};
  return (<Modal title={expense?"Editar Gasto":"Nuevo Gasto"} onClose={onCancel}>
    <label style={lbl}>Descripción</label><input value={f.description} onChange={e=>setF({...f,description:e.target.value})} placeholder="Ej: Almuerzo" style={inp} autoFocus/>
    <label style={lbl}>Monto ($)</label><input type="number" inputMode="numeric" value={f.amount} onChange={e=>setF({...f,amount:e.target.value})} placeholder="0" style={{...inp,fontSize:22,fontWeight:700}}/>
    <label style={lbl}>Fecha</label><input type="date" value={f.date} onChange={e=>setF({...f,date:e.target.value})} style={inp}/>
    <label style={lbl}>Categoría</label>
    <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:4}}>{categories.map(c=>(<Pill key={c.id} label={c.label} icon={c.icon} color={c.color} active={f.category_id===c.id} onClick={()=>setF({...f,category_id:c.id})}/>))}</div>
    <label style={lbl}>Medio de Pago</label>
    <select value={f.payment_method_id} onChange={e=>setF({...f,payment_method_id:e.target.value,credit_card_id:""})} style={sel}><option value="">— Sin especificar —</option>{paymentMethods.map(m=>(<option key={m.id} value={m.id}>{m.type==="cash"?"💵":"💳"} {m.name}</option>))}</select>
    {showCards&&(<><label style={lbl}>Tarjeta</label><select value={f.credit_card_id} onChange={e=>setF({...f,credit_card_id:e.target.value})} style={sel}><option value="">— Seleccionar —</option>{creditCards.map(c=>(<option key={c.id} value={c.id}>{c.card_name} ({c.brand})</option>))}</select>
      {f.credit_card_id&&(()=>{const cc=creditCards.find(c=>c.id===f.credit_card_id);return cc?<div style={{fontSize:11,color:C.green,marginTop:3,fontWeight:500}}>Cierre día {cc.closing_day} · Vto día {cc.due_day}</div>:null;})()}</>)}
    <div style={{marginTop:22}}><button onClick={go} disabled={busy} style={{...btn(),opacity:busy?.6:1}}>{busy?"Guardando...":expense?"Guardar":"Agregar"}</button></div>
  </Modal>);
}

// ═══ INCOME FORM ═══
function IncomeForm({income,onSave,onCancel}) {
  const [f,setF]=useState({description:income?.description||"",amount:income?.amount||"",date:income?.date||today(),recurring:income?.recurring||false});
  const [busy,setBusy]=useState(false);
  const go=async()=>{if(!f.description.trim()||!f.amount)return;setBusy(true);try{await onSave({...(income?.id&&{id:income.id}),...f,amount:Number(f.amount)});}finally{setBusy(false);}};
  return (<Modal title={income?"Editar Ingreso":"Nuevo Ingreso"} onClose={onCancel}>
    <label style={lbl}>Descripción</label><input value={f.description} onChange={e=>setF({...f,description:e.target.value})} placeholder="Ej: Sueldo" style={inp} autoFocus/>
    <label style={lbl}>Monto ($)</label><input type="number" inputMode="numeric" value={f.amount} onChange={e=>setF({...f,amount:e.target.value})} placeholder="0" style={{...inp,fontSize:22,fontWeight:700}}/>
    <label style={lbl}>Fecha</label><input type="date" value={f.date} onChange={e=>setF({...f,date:e.target.value})} style={inp}/>
    <div style={{marginTop:14,display:"flex",alignItems:"center",gap:8}}>
      <input type="checkbox" checked={f.recurring} onChange={e=>setF({...f,recurring:e.target.checked})} id="rec" style={{width:18,height:18}}/><label htmlFor="rec" style={{fontSize:13,color:C.dark}}>Ingreso recurrente</label></div>
    <div style={{marginTop:22}}><button onClick={go} disabled={busy} style={{...btn(),opacity:busy?.6:1}}>{busy?"Guardando...":"Guardar"}</button></div>
  </Modal>);
}

// ═══ EXPENSES VIEW ═══
function ExpensesView() {
  const [expenses,setExpenses]=useState([]),[categories,setCategories]=useState([]),[pms,setPms]=useState([]),[ccs,setCcs]=useState([]);
  const [loading,setLoading]=useState(true),[showForm,setShowForm]=useState(false),[editing,setEditing]=useState(null);
  const [filterCat,setFilterCat]=useState(null),[confirm,setConfirm]=useState(null),[month,setMonth]=useState(curMonth);
  const [y,m]=month.split("-").map(Number);
  const catMap=useMemo(()=>Object.fromEntries(categories.map(c=>[c.id,c])),[categories]);
  const pmMap=useMemo(()=>Object.fromEntries(pms.map(p=>[p.id,p])),[pms]);
  const ccMap=useMemo(()=>Object.fromEntries(ccs.map(c=>[c.id,c])),[ccs]);
  const [cardTotals,setCardTotals]=useState([]);

  const load=useCallback(async()=>{
    try{const [ca,pm,cc,ex]=await Promise.all([api.getCategories(),api.getPaymentMethods(),api.getCreditCards(),api.getExpenses({month})]);
      setCategories(ca);setPms(pm);setCcs(cc);setExpenses(ex);api.getCardTotals(month).then(setCardTotals).catch(()=>{});}catch(e){console.error(e);}finally{setLoading(false);}
  },[month]);
  useEffect(()=>{load();},[load]);

  const handleSave=async d=>{if(d.id)await api.updateExpense(d.id,d);else await api.addExpense(d);setShowForm(false);setEditing(null);load();};
  const handleDel=async id=>{await api.deleteExpense(id);setConfirm(null);load();};
  const filtered=useMemo(()=>filterCat?expenses.filter(e=>e.category_id===filterCat):expenses,[expenses,filterCat]);
  const total=useMemo(()=>filtered.reduce((s,e)=>s+e.amount,0),[filtered]);
  const cardGrandTotal=cardTotals.reduce((s,t)=>s+t.total,0);
  const breakdown=useMemo(()=>{const t={};filtered.forEach(e=>{t[e.category_id]=(t[e.category_id]||0)+e.amount});return Object.entries(t).map(([k,v])=>({cat:k,total:v})).sort((a,b)=>b.total-a.total);},[filtered]);
  const maxBk=Math.max(...breakdown.map(b=>b.total),1);

  if(loading)return <div style={{textAlign:"center",padding:60,color:C.muted}}>Cargando...</div>;

  return (<>
    <div style={{padding:"14px 18px 22px",background:C.dark,borderRadius:"0 0 24px 24px"}}>
      <MonthNav value={month} onChange={setMonth}/>
      <div style={{textAlign:"center"}}><div style={{fontSize:36,fontWeight:700,color:"#fff",letterSpacing:-2,lineHeight:1}}>{fmt(total)}</div>
        <div style={{fontSize:11,color:"#555",marginTop:5}}>{filtered.length} gasto{filtered.length!==1?"s":""}</div></div></div>
    <AlertsBanner/>
    <div style={{padding:"18px 18px 100px"}}>
      {cardTotals.some(t=>t.total>0)&&(<div style={{marginBottom:20}}><h3 style={secT}>💳 Tarjetas · {MONTHS[m-1]}</h3>
        {cardTotals.filter(t=>t.total>0).map(t=>(<div key={t.card_id} style={{...crd,display:"flex",alignItems:"center",gap:10}}>
          <div style={{flex:1}}><div style={{fontSize:14,fontWeight:600}}>{t.card_name}</div><div style={{fontSize:11,color:C.muted}}>{t.brand?.toUpperCase()} {t.bank&&`· ${t.bank}`} · {t.count} gastos</div>
            <div style={{fontSize:10,color:C.red,fontWeight:500,marginTop:1}}>Vence día {t.due_day}</div></div>
          <div style={{fontSize:16,fontWeight:700}}>{fmt(t.total)}</div></div>))}
        <div style={{textAlign:"right",fontSize:13,fontWeight:700,padding:"6px 2px",borderTop:`2px solid ${C.border}`}}>Total: {fmt(cardGrandTotal)}</div></div>)}
      <div style={{display:"flex",gap:5,overflowX:"auto",paddingBottom:6,marginBottom:14,scrollbarWidth:"none"}}>
        <Pill label="Todas" active={!filterCat} onClick={()=>setFilterCat(null)}/>
        {categories.map(c=>(<Pill key={c.id} label={c.label} icon={c.icon} color={c.color} active={filterCat===c.id} onClick={()=>setFilterCat(filterCat===c.id?null:c.id)}/>))}</div>
      {breakdown.length>0&&(<div style={{marginBottom:20}}><h3 style={secT}>Por categoría</h3>
        {breakdown.map(({cat:k,total:t})=>{const c=catMap[k]||{icon:"📦",label:k,color:"#999"};return(<div key={k} style={{display:"flex",alignItems:"center",gap:9,marginBottom:7}}>
          <span style={{fontSize:15,width:22,textAlign:"center"}}>{c.icon}</span><div style={{flex:1}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}><span style={{fontSize:12,fontWeight:500}}>{c.label}</span><span style={{fontSize:12,fontWeight:700}}>{fmt(t)}</span></div>
            <div style={{height:4,borderRadius:2,background:C.light}}><div style={{height:"100%",borderRadius:2,background:c.color,width:`${(t/maxBk)*100}%`,transition:"width .4s"}}/></div></div></div>);})}</div>)}
      <h3 style={secT}>Detalle</h3>
      {filtered.length===0?(<div style={{textAlign:"center",padding:"36px",color:"#ccc"}}><div style={{fontSize:32,marginBottom:6}}>📭</div><div style={{fontSize:13}}>Sin gastos</div></div>)
      :filtered.map(e=>{const c=catMap[e.category_id]||{icon:"📦",label:"?",color:"#999"};const pm=pmMap[e.payment_method_id];const cc=ccMap[e.credit_card_id];return(
        <div key={e.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0",borderBottom:"1px solid #eee"}}>
          <div style={{width:36,height:36,borderRadius:9,background:`${c.color}12`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>{c.icon}</div>
          <div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:500,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{e.description}</div>
            <div style={{fontSize:10,color:C.muted,marginTop:1}}>{c.label} · {new Date(e.date+"T12:00:00").toLocaleDateString("es-AR",{day:"numeric",month:"short"})}{pm&&` · ${pm.type==="cash"?"💵":"💳"}`}{cc&&` ${cc.card_name}`}{e.billing_month&&e.billing_month!==month&&<span style={{color:C.red}}> → {e.billing_month}</span>}</div></div>
          <div style={{fontSize:14,fontWeight:700,whiteSpace:"nowrap"}}>{fmt(e.amount)}</div>
          <button onClick={()=>{setEditing(e);setShowForm(true);}} style={iconBtn}>✏️</button>
          <button onClick={()=>setConfirm(e.id)} style={iconBtn}>🗑️</button></div>);})}
    </div>
    <button onClick={()=>{setEditing(null);setShowForm(true);}} style={{position:"fixed",bottom:74,right:20,width:50,height:50,borderRadius:14,background:C.dark,color:"#fff",border:"none",fontSize:24,cursor:"pointer",boxShadow:"0 4px 16px rgba(0,0,0,.25)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:50}}>+</button>
    {showForm&&<ExpenseForm expense={editing} categories={categories} paymentMethods={pms} creditCards={ccs} onSave={handleSave} onCancel={()=>{setShowForm(false);setEditing(null);}}/>}
    {confirm&&<Confirm msg="¿Eliminar este gasto?" onYes={()=>handleDel(confirm)} onNo={()=>setConfirm(null)}/>}
  </>);
}

// ═══ BALANCE VIEW ═══
function BalanceView() {
  const [month,setMonth]=useState(curMonth);const [y,m]=month.split("-").map(Number);
  const [balance,setBalance]=useState({income:0,expenses:0,card_debt:0,balance:0});
  const [incomes,setIncomes]=useState([]),[showForm,setShowForm]=useState(false),[editing,setEditing]=useState(null),[confirm,setConfirm]=useState(null);
  const load=useCallback(async()=>{const [b,inc]=await Promise.all([api.getBalance(month),api.getIncomes(month)]);setBalance(b);setIncomes(inc);},[month]);
  useEffect(()=>{load();},[load]);
  const handleSave=async d=>{if(d.id)await api.updateIncome(d.id,d);else await api.addIncome(d);setShowForm(false);setEditing(null);load();};
  const handleDel=async id=>{await api.deleteIncome(id);setConfirm(null);load();};
  const pct=balance.income>0?Math.min((balance.expenses/balance.income)*100,100):0;
  const isPos=balance.balance>=0;
  return (<>
    <div style={{padding:"14px 18px 22px",background:C.dark,borderRadius:"0 0 24px 24px"}}><MonthNav value={month} onChange={setMonth}/>
      <div style={{textAlign:"center"}}><div style={{fontSize:32,fontWeight:700,color:isPos?C.green:C.red,letterSpacing:-2,lineHeight:1}}>{fmt(balance.balance)}</div>
        <div style={{fontSize:11,color:"#555",marginTop:5}}>Balance del mes</div></div></div>
    <div style={{padding:"18px 18px 100px"}}>
      <div style={{display:"flex",gap:10,marginBottom:20}}>
        <div style={{...crd,flex:1,textAlign:"center"}}><div style={{fontSize:10,color:C.muted,fontWeight:600,textTransform:"uppercase",marginBottom:4}}>Ingresos</div><div style={{fontSize:18,fontWeight:700,color:C.green}}>{fmt(balance.income)}</div></div>
        <div style={{...crd,flex:1,textAlign:"center"}}><div style={{fontSize:10,color:C.muted,fontWeight:600,textTransform:"uppercase",marginBottom:4}}>Gastos</div><div style={{fontSize:18,fontWeight:700,color:C.red}}>{fmt(balance.expenses)}</div></div></div>
      {balance.income>0&&(<div style={{marginBottom:20}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:11,color:C.muted}}>Gastado</span><span style={{fontSize:11,fontWeight:600,color:pct>90?C.red:pct>70?"#F2A541":C.green}}>{pct.toFixed(0)}%</span></div>
        <div style={{height:8,borderRadius:4,background:C.light}}><div style={{height:"100%",borderRadius:4,background:pct>90?C.red:pct>70?"#F2A541":C.green,width:`${pct}%`,transition:"width .5s"}}/></div>
        <div style={{fontSize:10,color:C.muted,marginTop:4}}>Disponible: {fmt(Math.max(balance.income-balance.expenses,0))}</div></div>)}
      {balance.card_debt>0&&(<div style={{...crd,background:"#fde8e8",borderColor:"#f5c6cb",marginBottom:20}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><div style={{fontSize:11,fontWeight:600,color:C.red}}>💳 Deuda tarjetas</div><div style={{fontSize:16,fontWeight:700,color:C.red}}>{fmt(balance.card_debt)}</div></div></div>)}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
        <h3 style={{...secT,marginBottom:0}}>Ingresos</h3>
        <button onClick={()=>{setEditing(null);setShowForm(true);}} style={{...btn(),width:"auto",padding:"7px 14px",fontSize:12}}>+ Ingreso</button></div>
      {incomes.length===0?(<div style={{textAlign:"center",padding:28,color:"#ccc",fontSize:13}}>Sin ingresos cargados</div>)
      :incomes.map(i=>(<div key={i.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0",borderBottom:"1px solid #eee"}}>
        <div style={{width:36,height:36,borderRadius:9,background:`${C.green}15`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>💰</div>
        <div style={{flex:1}}><div style={{fontSize:13,fontWeight:500}}>{i.description}</div><div style={{fontSize:10,color:C.muted}}>{new Date(i.date+"T12:00:00").toLocaleDateString("es-AR",{day:"numeric",month:"short"})}{i.recurring?" · 🔄 Recurrente":""}</div></div>
        <div style={{fontSize:14,fontWeight:700,color:C.green}}>{fmt(i.amount)}</div>
        <button onClick={()=>{setEditing(i);setShowForm(true);}} style={iconBtn}>✏️</button>
        <button onClick={()=>setConfirm(i.id)} style={iconBtn}>🗑️</button></div>))}</div>
    {showForm&&<IncomeForm income={editing} onSave={handleSave} onCancel={()=>{setShowForm(false);setEditing(null);}}/>}
    {confirm&&<Confirm msg="¿Eliminar?" onYes={()=>handleDel(confirm)} onNo={()=>setConfirm(null)}/>}
  </>);
}

// ═══ SETTINGS ═══
function CategoriesABM() {
  const [cats,setCats]=useState([]),[showF,setShowF]=useState(false),[ed,setEd]=useState(null),[f,setF]=useState({label:"",icon:"📦",color:"#6C757D"});
  const pal=["#E07A5F","#F2A541","#81B29A","#3D405B","#7209B7","#0077B6","#E63946","#457B9D","#2A9D8F","#FF6B6B"];
  const load=useCallback(async()=>{setCats(await api.getCategories());},[]);useEffect(()=>{load();},[load]);
  const save=async()=>{try{if(ed)await api.updateCategory(ed.id,f);else await api.addCategory(f);setShowF(false);setEd(null);setF({label:"",icon:"📦",color:"#6C757D"});load();}catch(e){alert(e.message);}};
  return(<div><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
    <h3 style={secT}>Categorías</h3><button onClick={()=>{setEd(null);setF({label:"",icon:"📦",color:"#6C757D"});setShowF(true);}} style={{...btn(),width:"auto",padding:"7px 14px",fontSize:12}}>+ Nueva</button></div>
    <div style={{display:"flex",flexWrap:"wrap",gap:6}}>{cats.map(c=>(<div key={c.id} style={{...crd,display:"inline-flex",alignItems:"center",gap:6,padding:"8px 12px",marginBottom:6,cursor:"pointer"}} onClick={()=>{setEd(c);setF({label:c.label,icon:c.icon,color:c.color});setShowF(true);}}>
      <span style={{fontSize:16}}>{c.icon}</span><span style={{fontSize:13,fontWeight:500}}>{c.label}</span><span style={{width:8,height:8,borderRadius:"50%",background:c.color}}/></div>))}</div>
    {showF&&(<Modal title={ed?"Editar":"Nueva Categoría"} onClose={()=>setShowF(false)}>
      <label style={lbl}>Nombre</label><input value={f.label} onChange={e=>setF({...f,label:e.target.value})} style={inp} autoFocus/>
      <label style={lbl}>Emoji</label><input value={f.icon} onChange={e=>setF({...f,icon:e.target.value})} style={{...inp,width:70,fontSize:22,textAlign:"center"}}/>
      <label style={lbl}>Color</label><div style={{display:"flex",gap:7,flexWrap:"wrap",marginTop:3,marginBottom:6}}>{pal.map(c=>(<button key={c} onClick={()=>setF({...f,color:c})} style={{width:28,height:28,borderRadius:7,background:c,border:f.color===c?"3px solid #1a1a1a":"3px solid transparent",cursor:"pointer"}}/>))}</div>
      <div style={{display:"flex",gap:8,marginTop:18}}>{ed&&<button onClick={async()=>{await api.deleteCategory(ed.id);setShowF(false);setEd(null);load();}} style={{...btn(C.red),flex:1,padding:11}}>Eliminar</button>}<button onClick={save} style={{...btn(),flex:1,padding:11}}>Guardar</button></div></Modal>)}</div>);
}

function PaymentMethodsABM() {
  const [ms,setMs]=useState([]),[showF,setShowF]=useState(false),[ed,setEd]=useState(null),[f,setF]=useState({name:"",type:"cash"});
  const load=useCallback(async()=>{setMs(await api.getPaymentMethods());},[]);useEffect(()=>{load();},[load]);
  const save=async()=>{try{if(ed)await api.updatePaymentMethod(ed.id,f);else await api.addPaymentMethod(f);setShowF(false);setEd(null);setF({name:"",type:"cash"});load();}catch(e){alert(e.message);}};
  const tl={cash:"💵 Efectivo",debit_card:"💳 Débito",credit_card:"💳 Crédito"};
  return(<div><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
    <h3 style={secT}>Medios de Pago</h3><button onClick={()=>{setEd(null);setF({name:"",type:"cash"});setShowF(true);}} style={{...btn(),width:"auto",padding:"7px 14px",fontSize:12}}>+ Nuevo</button></div>
    {ms.map(m=>(<div key={m.id} style={{...crd,display:"flex",alignItems:"center",gap:10}}>
      <div style={{fontSize:20}}>{m.type==="cash"?"💵":"💳"}</div><div style={{flex:1}}><div style={{fontSize:14,fontWeight:500}}>{m.name}</div><div style={{fontSize:11,color:C.muted}}>{tl[m.type]}</div></div>
      <button onClick={()=>{setEd(m);setF({name:m.name,type:m.type});setShowF(true);}} style={iconBtn}>✏️</button><button onClick={async()=>{await api.deletePaymentMethod(m.id);load();}} style={iconBtn}>🗑️</button></div>))}
    {showF&&(<Modal title={ed?"Editar":"Nuevo Medio"} onClose={()=>setShowF(false)}>
      <label style={lbl}>Nombre</label><input value={f.name} onChange={e=>setF({...f,name:e.target.value})} style={inp} autoFocus/>
      <label style={lbl}>Tipo</label><select value={f.type} onChange={e=>setF({...f,type:e.target.value})} style={sel}><option value="cash">Efectivo</option><option value="debit_card">Débito</option><option value="credit_card">Crédito</option></select>
      <div style={{marginTop:20}}><button onClick={save} style={btn()}>Guardar</button></div></Modal>)}</div>);
}

function CreditCardsABM() {
  const [cs,setCs]=useState([]),[showF,setShowF]=useState(false),[ed,setEd]=useState(null);
  const [f,setF]=useState({card_name:"",brand:"visa",bank:"",closing_day:15,due_day:5});
  const load=useCallback(async()=>{setCs(await api.getCreditCards());},[]);useEffect(()=>{load();},[load]);
  const save=async()=>{try{if(ed)await api.updateCreditCard(ed.id,f);else await api.addCreditCard(f);setShowF(false);setEd(null);setF({card_name:"",brand:"visa",bank:"",closing_day:15,due_day:5});load();}catch(e){alert(e.message);}};
  return(<div><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
    <h3 style={secT}>Tarjetas de Crédito</h3><button onClick={()=>{setEd(null);setF({card_name:"",brand:"visa",bank:"",closing_day:15,due_day:5});setShowF(true);}} style={{...btn(),width:"auto",padding:"7px 14px",fontSize:12}}>+ Nueva</button></div>
    {cs.length===0&&<div style={{textAlign:"center",padding:28,color:"#ccc",fontSize:13}}>No hay tarjetas</div>}
    {cs.map(c=>(<div key={c.id} style={{...crd,display:"flex",alignItems:"center",gap:10}}>
      <div style={{fontSize:20}}>💳</div><div style={{flex:1}}><div style={{fontSize:14,fontWeight:600}}>{c.card_name}</div><div style={{fontSize:11,color:C.muted}}>{c.brand?.toUpperCase()} {c.bank&&`· ${c.bank}`}</div>
        <div style={{fontSize:10,color:C.muted}}>Cierre: día {c.closing_day} · Vto: día {c.due_day}</div></div>
      <button onClick={()=>{setEd(c);setF({card_name:c.card_name,brand:c.brand,bank:c.bank,closing_day:c.closing_day,due_day:c.due_day});setShowF(true);}} style={iconBtn}>✏️</button>
      <button onClick={async()=>{await api.deleteCreditCard(c.id);load();}} style={iconBtn}>🗑️</button></div>))}
    {showF&&(<Modal title={ed?"Editar":"Nueva Tarjeta"} onClose={()=>setShowF(false)}>
      <label style={lbl}>Nombre</label><input value={f.card_name} onChange={e=>setF({...f,card_name:e.target.value})} placeholder="Visa BNA" style={inp} autoFocus/>
      <label style={lbl}>Marca</label><select value={f.brand} onChange={e=>setF({...f,brand:e.target.value})} style={sel}><option value="visa">Visa</option><option value="mastercard">Mastercard</option><option value="amex">Amex</option><option value="cabal">Cabal</option><option value="naranja">Naranja</option></select>
      <label style={lbl}>Banco</label><input value={f.bank} onChange={e=>setF({...f,bank:e.target.value})} placeholder="Banco Nación" style={inp}/>
      <div style={{display:"flex",gap:10}}><div style={{flex:1}}><label style={lbl}>Día cierre</label><input type="number" min="1" max="28" value={f.closing_day} onChange={e=>setF({...f,closing_day:Number(e.target.value)})} style={inp}/></div>
        <div style={{flex:1}}><label style={lbl}>Día vto</label><input type="number" min="1" max="28" value={f.due_day} onChange={e=>setF({...f,due_day:Number(e.target.value)})} style={inp}/></div></div>
      <div style={{marginTop:20}}><button onClick={save} style={btn()}>Guardar</button></div></Modal>)}</div>);
}

function AdminUsers() {
  const [us,setUs]=useState([]),[showF,setShowF]=useState(false),[ed,setEd]=useState(null),[resetPw,setResetPw]=useState(null),[newPw,setNewPw]=useState("");
  const [f,setF]=useState({username:"",display_name:"",password:"",role:"user"});
  const load=useCallback(async()=>{setUs(await api.getUsers());},[]);useEffect(()=>{load();},[load]);
  const save=async()=>{try{if(ed)await api.updateUser(ed.id,{display_name:f.display_name,role:f.role,active:1});else await api.createUser(f);setShowF(false);setEd(null);setF({username:"",display_name:"",password:"",role:"user"});load();}catch(e){alert(e.message);}};
  const doReset=async()=>{if(!newPw)return;try{await api.resetPassword(resetPw.id,newPw);setResetPw(null);setNewPw("");alert("✅ Contraseña actualizada");}catch(e){alert(e.message);}};
  const toggle=async u=>{await api.updateUser(u.id,{active:u.active?0:1,display_name:u.display_name,role:u.role});load();};
  return(<div><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
    <h3 style={secT}>Usuarios</h3><button onClick={()=>{setEd(null);setF({username:"",display_name:"",password:"",role:"user"});setShowF(true);}} style={{...btn(),width:"auto",padding:"7px 14px",fontSize:12}}>+ Nuevo</button></div>
    {us.map(u=>(<div key={u.id} style={{...crd,opacity:u.active?1:.5,display:"flex",alignItems:"center",gap:10}}>
      <div style={{width:36,height:36,borderRadius:9,background:u.role==="admin"?"#7209B715":"#81B29A15",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>{u.role==="admin"?"👑":"👤"}</div>
      <div style={{flex:1}}><div style={{fontSize:14,fontWeight:600}}>{u.display_name}</div><div style={{fontSize:11,color:C.muted}}>@{u.username} · {u.role}{!u.active?" · Inactivo":""}</div></div>
      <button onClick={()=>{setResetPw(u);setNewPw("");}} style={iconBtn}>🔑</button>
      <button onClick={()=>{setEd(u);setF({username:u.username,display_name:u.display_name,password:"",role:u.role});setShowF(true);}} style={iconBtn}>✏️</button>
      <button onClick={()=>toggle(u)} style={iconBtn}>{u.active?"🚫":"✅"}</button></div>))}
    {showF&&(<Modal title={ed?"Editar":"Nuevo Usuario"} onClose={()=>setShowF(false)}>
      {!ed&&<><label style={lbl}>Username</label><input value={f.username} onChange={e=>setF({...f,username:e.target.value})} style={inp} autoCapitalize="none"/></>}
      <label style={lbl}>Nombre</label><input value={f.display_name} onChange={e=>setF({...f,display_name:e.target.value})} style={inp}/>
      {!ed&&<><label style={lbl}>Contraseña</label><input type="password" value={f.password} onChange={e=>setF({...f,password:e.target.value})} style={inp}/></>}
      <label style={lbl}>Rol</label><select value={f.role} onChange={e=>setF({...f,role:e.target.value})} style={sel}><option value="user">Usuario</option><option value="admin">Admin</option></select>
      <div style={{marginTop:20}}><button onClick={save} style={btn()}>Guardar</button></div></Modal>)}
    {resetPw&&(<Modal title={`Blanquear: ${resetPw.display_name}`} onClose={()=>setResetPw(null)}>
      <label style={lbl}>Nueva contraseña</label><input type="password" value={newPw} onChange={e=>setNewPw(e.target.value)} style={inp} autoFocus/>
      <div style={{marginTop:20}}><button onClick={doReset} style={btn()}>Blanquear</button></div></Modal>)}</div>);
}

function BackupRestore() {
  const [status,setStatus]=useState("");
  const doExport=async()=>{try{const d=await api.exportData();const b=new Blob([JSON.stringify(d,null,2)],{type:"application/json"});const u=URL.createObjectURL(b);const a=document.createElement("a");a.href=u;a.download=`gastos-backup-${today()}.json`;a.click();URL.revokeObjectURL(u);setStatus("✅ Backup descargado");}catch(e){setStatus("❌ "+e.message);}};
  const doImport=()=>{const i=document.createElement("input");i.type="file";i.accept=".json";i.onchange=async e=>{const file=e.target.files[0];if(!file)return;try{const t=await file.text();const d=JSON.parse(t);if(!d.users){setStatus("❌ Archivo inválido");return;}await api.importData(d);setStatus(`✅ Importado: ${d.users.length} usuarios, ${(d.expenses||[]).length} gastos`);setTimeout(()=>window.location.reload(),2000);}catch(err){setStatus("❌ "+err.message);}};i.click();};
  return(<div><h3 style={secT}>Backup & Restauración</h3>
    <p style={{fontSize:12,color:C.muted,marginBottom:14,lineHeight:1.5}}>En Render gratis los datos se pierden al re-deployar. Exportá un backup y restauralo después.</p>
    <div style={{display:"flex",gap:10,marginBottom:14}}><button onClick={doExport} style={{...btn(C.green),flex:1,padding:11}}>📥 Exportar</button><button onClick={doImport} style={{...btn(C.blue),flex:1,padding:11}}>📤 Importar</button></div>
    {status&&<div style={{...crd,fontSize:12,fontWeight:500,textAlign:"center"}}>{status}</div>}</div>);
}

function SettingsView() {
  const {user}=useApp();const [tab,setTab]=useState("categories");
  const tabs=[{id:"categories",label:"Categ.",icon:"🏷️"},{id:"pm",label:"Medios",icon:"💵"},{id:"cards",label:"Tarjetas",icon:"💳"}];
  if(user.role==="admin"){tabs.push({id:"users",label:"Usuarios",icon:"👥"});tabs.push({id:"backup",label:"Backup",icon:"💾"});}
  return(<div style={{padding:"18px 18px 100px"}}><h2 style={{fontSize:18,fontWeight:700,marginBottom:16}}>Configuración</h2>
    <TabBar tabs={tabs} current={tab} onChange={setTab}/>
    {tab==="categories"&&<CategoriesABM/>}{tab==="pm"&&<PaymentMethodsABM/>}{tab==="cards"&&<CreditCardsABM/>}
    {tab==="users"&&user.role==="admin"&&<AdminUsers/>}{tab==="backup"&&user.role==="admin"&&<BackupRestore/>}</div>);
}

// ═══ MAIN APP ═══
export default function App() {
  const [user,setUser]=useState(getStoredUser);const [view,setView]=useState("expenses");
  if(!user)return <Login onLogin={u=>setUser(u)}/>;
  const nav=[{id:"expenses",icon:"💰",label:"Gastos"},{id:"balance",icon:"📊",label:"Balance"},{id:"settings",icon:"⚙️",label:"Config"}];
  return (<Ctx.Provider value={{user}}>
    <div style={{maxWidth:480,margin:"0 auto",minHeight:"100vh",background:C.bg,fontFamily:F,color:C.dark}}>
      <style>{css}</style>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 18px",background:C.dark}}>
        <div><span style={{fontSize:12,color:"#666"}}>Hola, </span><span style={{fontSize:13,color:"#fff",fontWeight:600}}>{user.display_name}</span>
          {user.role==="admin"&&<span style={{fontSize:9,color:C.purple,marginLeft:5,fontWeight:600}}>ADMIN</span>}</div>
        <button onClick={()=>{setToken(null);setStoredUser(null);setUser(null);}} style={{background:"rgba(255,255,255,.08)",border:"none",color:"#666",fontSize:11,padding:"5px 10px",borderRadius:7,cursor:"pointer",fontFamily:F}}>Salir</button></div>
      {view==="expenses"&&<ExpensesView/>}{view==="balance"&&<BalanceView/>}{view==="settings"&&<SettingsView/>}
      <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:480,background:"#fff",borderTop:`1px solid ${C.border}`,display:"flex",paddingBottom:"env(safe-area-inset-bottom, 6px)"}}>
        {nav.map(n=>(<button key={n.id} onClick={()=>setView(n.id)} style={{flex:1,padding:"8px 0 6px",border:"none",background:"none",display:"flex",flexDirection:"column",alignItems:"center",gap:1,color:view===n.id?C.dark:C.muted,fontWeight:view===n.id?600:400,fontSize:9,cursor:"pointer",fontFamily:F}}>
          <span style={{fontSize:18}}>{n.icon}</span>{n.label}</button>))}</div>
    </div></Ctx.Provider>);
}
