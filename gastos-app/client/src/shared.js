// shared.js - Shared styles, constants, and components
import { useState, useEffect, createContext, useContext } from "react";

export const F = "'DM Sans','SF Pro Display',-apple-system,sans-serif";
export const C = { bg:"#FAFAF5", dark:"#1a1a1a", border:"#e8e8e3", muted:"#999", light:"#f0f0eb", green:"#2A9D8F", red:"#E63946", blue:"#0077B6", purple:"#7209B7" };
export const MONTHS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
export const fmt = (n) => new Intl.NumberFormat("es-AR",{style:"currency",currency:"ARS",maximumFractionDigits:0}).format(n);
export const today = () => new Date().toISOString().slice(0,10);
export const curMonth = () => { const n=new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,"0")}`; };

export const css = `@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
*{box-sizing:border-box;margin:0;padding:0}body{background:${C.bg};font-family:${F};-webkit-tap-highlight-color:transparent}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
input:focus,select:focus{outline:none;border-color:${C.dark}!important}::-webkit-scrollbar{display:none}
select{appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24'%3E%3Cpath fill='%23999' d='M7 10l5 5 5-5z'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 12px center}`;

export const lbl = {display:"block",fontSize:11,fontWeight:600,color:C.muted,textTransform:"uppercase",letterSpacing:.8,marginBottom:5,marginTop:14};
export const inp = {width:"100%",padding:"11px 13px",borderRadius:11,border:`2px solid ${C.border}`,background:"#fff",fontSize:14,fontFamily:F,color:C.dark};
export const sel = {...inp,paddingRight:32};
export const btn = (bg=C.dark,col="#fff")=>({width:"100%",padding:"13px",borderRadius:13,background:bg,color:col,border:"none",fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:F});
export const secT = {fontSize:12,fontWeight:600,color:C.muted,textTransform:"uppercase",letterSpacing:1,marginBottom:10};
export const crd = {background:"#fff",borderRadius:14,padding:"14px",marginBottom:10,border:`1px solid ${C.border}`};
export const iconBtn = {background:"none",border:"none",fontSize:15,cursor:"pointer",padding:3};

export const Ctx = createContext();
export const useApp = () => useContext(Ctx);

export function Modal({children,onClose,title}) {
  return (<div style={{position:"fixed",inset:0,zIndex:100,background:"rgba(0,0,0,.5)",display:"flex",alignItems:"flex-end",justifyContent:"center",animation:"fadeIn .15s"}} onClick={e=>e.target===e.currentTarget&&onClose()}>
    <div style={{background:C.bg,width:"100%",maxWidth:480,borderRadius:"22px 22px 0 0",padding:"22px 18px 32px",maxHeight:"92vh",overflowY:"auto",animation:"slideUp .25s ease"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
        <h2 style={{margin:0,fontSize:17,fontWeight:700,color:C.dark}}>{title}</h2>
        <button onClick={onClose} style={{background:"none",border:"none",fontSize:20,cursor:"pointer",color:"#aaa"}}>✕</button>
      </div>{children}</div></div>);
}

export function Confirm({msg,onYes,onNo}) {
  return (<div style={{position:"fixed",inset:0,zIndex:200,background:"rgba(0,0,0,.55)",display:"flex",alignItems:"center",justifyContent:"center"}}>
    <div style={{background:"#fff",borderRadius:18,padding:22,width:"85%",maxWidth:320,textAlign:"center"}}>
      <p style={{fontSize:14,color:C.dark,marginBottom:18,lineHeight:1.5}}>{msg}</p>
      <div style={{display:"flex",gap:10}}>
        <button onClick={onNo} style={{...btn("#fff",C.dark),border:`2px solid ${C.border}`,flex:1,padding:11}}>No</button>
        <button onClick={onYes} style={{...btn(C.red),flex:1,padding:11}}>Sí</button></div></div></div>);
}

export function Pill({label,icon,color,active,onClick}) {
  return (<button onClick={onClick} style={{display:"inline-flex",alignItems:"center",gap:4,padding:"5px 11px",borderRadius:18,whiteSpace:"nowrap",
    border:active?`2px solid ${color||C.dark}`:"2px solid transparent",background:active?`${color||C.dark}15`:C.light,
    color:active?(color||C.dark):"#666",fontWeight:active?600:400,fontSize:11,cursor:"pointer",fontFamily:F}}>
    {icon&&<span>{icon}</span>}{label}</button>);
}

export function TabBar({tabs,current,onChange}) {
  return (<div style={{display:"flex",background:C.light,borderRadius:11,padding:3,marginBottom:16}}>
    {tabs.map(t=>(<button key={t.id} onClick={()=>onChange(t.id)} style={{flex:1,padding:"9px 6px",borderRadius:9,border:"none",
      background:current===t.id?"#fff":"transparent",color:current===t.id?C.dark:C.muted,fontWeight:current===t.id?600:400,
      fontSize:12,cursor:"pointer",fontFamily:F,boxShadow:current===t.id?"0 1px 3px rgba(0,0,0,.06)":"none"}}>
      {t.icon&&<span style={{marginRight:3}}>{t.icon}</span>}{t.label}</button>))}</div>);
}

export function MonthNav({value,onChange}) {
  const [y,m]=value.split("-").map(Number);
  const prev=()=>{const d=new Date(y,m-2,1);onChange(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`)};
  const next=()=>{const d=new Date(y,m,1);onChange(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`)};
  return (<div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
    <button onClick={prev} style={{background:"rgba(255,255,255,.1)",border:"none",color:"#fff",fontSize:20,width:34,height:34,borderRadius:10,cursor:"pointer"}}>‹</button>
    <div style={{textAlign:"center"}}><div style={{fontSize:15,fontWeight:600,color:"#fff"}}>{MONTHS[m-1]}</div><div style={{fontSize:11,color:"#666"}}>{y}</div></div>
    <button onClick={next} style={{background:"rgba(255,255,255,.1)",border:"none",color:"#fff",fontSize:20,width:34,height:34,borderRadius:10,cursor:"pointer"}}>›</button></div>);
}
