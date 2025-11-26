// src/App.jsx
import { useEffect, useRef, useState } from "react";
import { jsPDF } from "jspdf";
import QRCode from "qrcode";
import "./index.css";

/* ====== ENV / CONFIG ====== */
const APPS_URL = import.meta.env.VITE_APPS_SCRIPT_URL;
const VIEW_BASE = import.meta.env.VITE_VIEW_BASE_URL;

/* IMAGES depuis public/ */
const base = import.meta.env.BASE_URL || "/";
const tamponUrl = `${base}tampon.png`;
const logoUrl = `${base}logo.png`;

/* Drapeaux par défaut */
const DEFAULT_FLAG_CI =
  "https://upload.wikimedia.org/wikipedia/commons/thumb/f/fe/Flag_of_C%C3%B4te_d%27Ivoire.svg/256px-Flag_of_C%C3%B4te_d%27Ivoire.svg.png";
const DEFAULT_FLAG_MA =
  "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2c/Flag_of_Morocco.svg/256px-Flag_of_Morocco.svg.png";

/* ========= Helpers ========= */
function fmtDateISO(d){ if(!d) return ""; const dt=d instanceof Date?d:new Date(d); if(isNaN(dt.getTime())) return ""; const y=dt.getFullYear(); const m=String(dt.getMonth()+1).padStart(2,"0"); const dd=String(dt.getDate()).padStart(2,"0"); return `${y}-${m}-${dd}`;}
function fmtDateFR(d){ if(!d) return ""; const dt=d instanceof Date?d:new Date(d); if(isNaN(dt.getTime())) return ""; const y=dt.getFullYear(); const m=String(dt.getMonth()+1).padStart(2,"0"); const dd=String(dt.getDate()).padStart(2,"0"); return `${dd}-${m}-${y}`;}
function addMonths(date,n){const d=new Date(date); d.setMonth(d.getMonth()+n); return d;}
function safeUpper(s){return String(s||"").toUpperCase();}

async function readAsDataURL(file){return new Promise((res,rej)=>{const fr=new FileReader(); fr.onload=()=>res(fr.result); fr.onerror=()=>rej(new Error("Lecture fichier image impossible")); fr.readAsDataURL(file);});}
async function urlToDataURL(url){const r=await fetch(url,{mode:"cors"}); if(!r.ok) throw new Error(`HTTP ${r.status}`); const b=await r.blob(); return new Promise((res,rej)=>{const fr=new FileReader(); fr.onload=()=>res(fr.result); fr.onerror=()=>rej(new Error("Impossible de lire l'image distante")); fr.readAsDataURL(b);});}
async function tryLoadImageData(urls){for(const u of urls){try{return await urlToDataURL(u);}catch{}} return "";}
async function measureDataURL(dataUrl){return new Promise((resolve)=>{const img=new Image(); img.onload=()=>resolve({w:img.naturalWidth,h:img.naturalHeight}); img.onerror=()=>resolve({w:0,h:0}); img.src=dataUrl;});}
async function addFittedImage(pdf,dataUrl,x,y,boxW,boxH,formatHint="PNG",rotationDeg=0){
  const {w,h}=await measureDataURL(dataUrl); if(!w||!h) return;
  const r=Math.min(boxW/w,boxH/h); const iw=w*r, ih=h*r;
  const ox=x+(boxW-iw)/2, oy=y+(boxH-ih)/2;
  pdf.addImage(dataUrl,formatHint,ox,oy,iw,ih,undefined,"FAST",rotationDeg);
}

/* Dégradé doux (identique: #F8CFA2 → #A9E0A9) */
function fillSoftGradient(pdf,W,H,startRGB,endRGB,vertical=true){
  const steps=120;
  for(let i=0;i<steps;i++){
    const t=i/(steps-1);
    const r=Math.round(startRGB[0]+(endRGB[0]-startRGB[0])*t);
    const g=Math.round(startRGB[1]+(endRGB[1]-startRGB[1])*t);
    const b=Math.round(startRGB[2]+(endRGB[2]-startRGB[2])*t);
    pdf.setFillColor(r,g,b);
    if(vertical){const xx=(W*i)/steps, ww=W/steps+0.1; pdf.rect(xx,0,ww,H,"F");}
    else{const yy=(H*i)/steps, hh=H/steps+0.1; pdf.rect(0,yy, W,hh,"F");}
  }
}

/* ====== Compteur par année (éditable) ====== */
function counterKey(year){ return `aica_id_counter_${year}`; }
function getCounter(year){
  const raw = localStorage.getItem(counterKey(year));
  const n = parseInt(raw ?? "0", 10);
  return Number.isFinite(n) && n >= 0 ? n : 0; // ← défaut = 0
}
function setCounter(year, n){
  const v = Math.max(0, Number(n)|0);
  localStorage.setItem(counterKey(year), String(v));
  return v;
}

/* ID AICA-YYYY-0000, puis ++ après génération */
function genIdPerYear(){
  const year=new Date().getFullYear();
  let n = getCounter(year);                 // ← commence à 0
  const seq=String(n).padStart(4,"0");      // ← ex: 0000
  const id=`AICA-${year}-${seq}`;
  setCounter(year, n+1);                    // ← incrémente après usage
  return id;
}

/* base64url */
function toBase64Url(str){const b64=btoa(unescape(encodeURIComponent(str))); return b64.replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/g,"");}

/* vCard (fallback) */
function toVCard(p){
  const fullName=`${p.nom||""} ${p.prenom||""}`.trim();
  return [
    "BEGIN:VCARD","VERSION:3.0",
    `N:${p.nom||""};${p.prenom||""};;;`,`FN:${fullName}`,
    p.contact?`TEL;TYPE=CELL:${p.contact}`:null,
    p.email?`EMAIL:${p.email}`:null,
    p.quartier?`ADR;TYPE=HOME:;;${p.quartier};;;;Casablanca;MA`:null,
    p.metier?`TITLE:${p.metier}`:null,
    p.numero?`NOTE:N° ${p.numero}`:null,
    `NOTE:Naissance ${fmtDateFR(p.naissance.date)||""} - ${p.naissance.lieu||""}`,
    `NOTE:Urgence ${p.urgence.nom||""} ${p.urgence.tel||""}`,
    `NOTE:Expiration ${fmtDateFR(p.expiration)||""}`,
    "END:VCARD",
  ].filter(Boolean).join("\n");
}

/* ====== Détourage (suppression auto du fond) ====== */
function colorDistSq(a,b){const dr=a[0]-b[0],dg=a[1]-b[1],db=a[2]-b[2]; return dr*dr+dg*dg+db*db;}
function avgCornersColor(img,ctx,w,h){
  const pts=[[1,1],[w-2,1],[1,h-2],[w-2,h-2],[5,5],[w-6,5],[5,h-6],[w-6,h-6]];
  let r=0,g=0,b=0,n=0;
  for(const [x,y] of pts){const d=ctx.getImageData(x,y,1,1).data; r+=d[0]; g+=d[1]; b+=d[2]; n++;}
  return [Math.round(r/n),Math.round(g/n),Math.round(b/n)];
}
async function removeBgChroma(dataUrl,tolerance=28){
  return new Promise((resolve)=>{
    const img=new Image();
    img.onload=()=>{
      const w=img.naturalWidth,h=img.naturalHeight;
      const canvas=document.createElement("canvas"); canvas.width=w; canvas.height=h;
      const ctx=canvas.getContext("2d"); ctx.drawImage(img,0,0);
      const target=avgCornersColor(img,ctx,w,h); const tolSq=tolerance*tolerance*3;
      const image=ctx.getImageData(0,0,w,h); const p=image.data;
      for(let i=0;i<p.length;i+=4){const r=p[i],g=p[i+1],b=p[i+2]; if(colorDistSq([r,g,b],target)<tolSq){p[i+3]=0;}}
      ctx.putImageData(image,0,0); resolve(canvas.toDataURL("image/png"));
    };
    img.onerror=()=>resolve(dataUrl); img.src=dataUrl;
  });
}

/* ========= App ========= */
export default function App(){
  const [form,setForm]=useState({
    nom:"", prenom:"", naissance_date:"", naissance_lieu:"",
    tel:"", quartier:"", metier:"", fonction:"Membre",
    exp:fmtDateISO(addMonths(new Date(),12)), id:"",
    urg_nom:"", urg_tel:"", email:"", numero:"",
    flagL:DEFAULT_FLAG_CI, flagR:DEFAULT_FLAG_MA,
    sexe:"", matrim:"", date_maroc:"", diplome:"", social:"", logement:"",
    photoUrl:"", photoData:"",
    removeBg:true, bgTolerance:28,
  });

  /* === Compteur visible / modifiable (année courante) === */
  const year = new Date().getFullYear();
  const [yearCounter, setYearCounter] = useState(()=>getCounter(year)); // ← affichage

  const [qrDataUrl,setQrDataUrl]=useState("");
  const [isGenerating,setIsGenerating]=useState(false);
  const msgRef=useRef(null);
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));

  function ensureId(){
    const year=new Date().getFullYear();
    const pattern=new RegExp(`^AICA-${year}-\\d{4}$`);
    if(!form.id||!pattern.test(form.id)){const newId=genIdPerYear(); set("id",newId); setYearCounter(getCounter(year)); return newId;}
    return form.id;
  }

  function buildPayload(){
    const id=ensureId();
    return {
      id,
      nom:safeUpper(form.nom),
      prenom:form.prenom.trim(),
      naissance:{date:fmtDateISO(form.naissance_date), lieu:form.naissance_lieu.trim()},
      contact:form.tel.trim(), quartier:form.quartier.trim(),
      metier:form.metier.trim(), fonction:form.fonction||"Membre",
      email:form.email.trim(), numero:form.numero.trim(),
      urgence:{nom:form.urg_nom.trim(), tel:form.urg_tel.trim()},
      expiration:form.exp||fmtDateISO(addMonths(new Date(),12)),
      sexe:form.sexe.trim(), situation_matrimoniale:form.matrim.trim(),
      date_entree_maroc:fmtDateISO(form.date_maroc), diplome:form.diplome.trim(),
      reseaux_sociaux:form.social.trim(), logement:form.logement.trim(),
      photoUrl:form.photoUrl.trim(),
    };
  }

  function buildQrContent(payload){
    const json=JSON.stringify(payload);
    if (VIEW_BASE){
      const url=new URL(VIEW_BASE); url.searchParams.set("id",payload.id);
      const b64u=toBase64Url(json); return `${url.toString()}#d=${b64u}`;
    }
    const readable=[
      "AICA | Données de la carte",
      `ID: ${payload.id}`,
      `Nom: ${payload.nom} ${payload.prenom}`,
      `Naissance: ${fmtDateFR(payload.naissance.date)} - ${payload.naissance.lieu}`,
      `Fonction: ${payload.fonction}`,
      `Métier: ${payload.metier}`,
      `Expiration: ${fmtDateFR(payload.expiration)}`,
      `Téléphone: ${payload.contact}`,
      `Quartier: ${payload.quartier}`,
      `Urgence: ${payload.urgence.nom} - ${payload.urgence.tel}`,
      payload.email?`Email: ${payload.email}`:null,
      payload.numero?`N°: ${payload.numero}`:null,
      payload.sexe?`Sexe: ${payload.sexe}`:null,
      payload.situation_matrimoniale?`Matrim.: ${payload.situation_matrimoniale}`:null,
      payload.date_entree_maroc?`Entrée MA: ${fmtDateFR(payload.date_entree_maroc)}`:null,
      payload.diplome?`Diplôme: ${payload.diplome}`:null,
      payload.reseaux_sociaux?`Réseaux: ${payload.reseaux_sociaux}`:null,
      payload.logement?`Logement: ${payload.logement}`:null,
      payload.photoUrl?`PhotoURL: ${payload.photoUrl}`:null,
    ].filter(Boolean).join("\n");
    const vcard=toVCard(payload);
    return `${readable}\n---VCARD---\n${vcard}\n---JSON---\n${json}`;
  }

  useEffect(()=>{
    const payload=buildPayload();
    const qrText=buildQrContent(payload);
    QRCode.toDataURL(qrText,{errorCorrectionLevel:"M",scale:8,margin:4,color:{dark:"#000000",light:"#FFFFFF"}})
      .then(setQrDataUrl).catch(()=>setQrDataUrl(""));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[
    form.nom,form.prenom,form.naissance_date,form.naissance_lieu,
    form.tel,form.quartier,form.metier,form.fonction,form.exp,form.id,
    form.urg_nom,form.urg_tel,form.email,form.numero,form.sexe,form.matrim,
    form.date_maroc,form.diplome,form.social,form.logement,form.photoUrl,
  ]);

  async function onFileChange(e,keyData,keyUrl){
    const file=e.target.files?.[0]; if(!file) return;
    try{
      let dataUrl=await readAsDataURL(file);
      if(form.removeBg) dataUrl=await removeBgChroma(dataUrl, form.bgTolerance);
      set(keyData,dataUrl); if(keyUrl) set(keyUrl,"");
    }catch(err){ if(msgRef.current) msgRef.current.textContent=err.message; }
  }

  /* === Wrap auto (lineH respecté) === */
  function drawRowWrapped(pdf, opts) {
    const {
      leftX, yStart, label, value, labelW, valueMaxW, lineH,
      labelFont = ["helvetica", "bold"],
      valueFont = ["helvetica", "normal"],
    } = opts;

    // Libellé
    pdf.setFont(...labelFont);
    pdf.text(String(label), leftX, yStart);

    // Valeur (multi-lignes)
    pdf.setFont(...valueFont);
    const text = String(value ?? "—");
    const lines = pdf.splitTextToSize(text, valueMaxW);

    // 1re ligne
    pdf.text(lines[0] || "—", leftX + labelW, yStart, { maxWidth: valueMaxW });

    // Lignes suivantes
    let y = yStart;
    for (let i = 1; i < lines.length; i++) {
      y += lineH;
      pdf.text(lines[i], leftX + labelW, y, { maxWidth: valueMaxW });
    }
    return (lines.length > 1 ? y : yStart) + lineH;
  }

  async function postToSheet(payload){
    if(!APPS_URL) return {ok:false,error:"APPS_URL manquant"};
    try{
      const res=await fetch(APPS_URL,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
      const data=await res.json().catch(()=>({})); return {ok:res.ok, ...data};
    }catch(e){ return {ok:false,error:e.message};}
  }

  function drawHeader(pdf,W){
    const headH=10.5;
    pdf.setFillColor(255,223,191); pdf.rect(0,0,W,headH,"F");
    pdf.setDrawColor(245,200,150); pdf.line(0,headH,W,headH);

    pdf.setTextColor(11,23,54);
    pdf.setFont("helvetica","bold"); pdf.setFontSize(8.8); pdf.text("AICA", W/2, 4.0, {align:"center"});

    const parts=[
      {text:"A",bold:true},{text:"ssociation ",bold:false},
      {text:"des ",bold:false},{text:"I",bold:true},
      {text:"voiriens ",bold:false},{text:"de ",bold:false},
      {text:"C",bold:true},{text:"asablanca",bold:false},
    ];
    const baseY=6.25; let totalW=0; const sizes=[]; pdf.setFontSize(5.2);
    for(const p of parts){ pdf.setFont("helvetica", p.bold?"bold":"normal"); const w=pdf.getTextWidth(p.text); sizes.push(w); totalW+=w; }
    let x=(W-totalW)/2;
    for(let i=0;i<parts.length;i++){ const p=parts[i]; pdf.setFont("helvetica", p.bold?"bold":"normal"); pdf.text(p.text, x, baseY); x+=sizes[i]; }

    pdf.setFont("helvetica","bold"); pdf.setFontSize(7.0); pdf.text("CARTE DE MEMBRE", W/2, 8.8, {align:"center"});
    return headH;
  }

  async function downloadPdfDirect(){
    if(isGenerating) return; setIsGenerating(true);
    if(msgRef.current) msgRef.current.textContent="";

    try{
      const payload=buildPayload();

      // Images
      if(form.photoUrl && !form.photoData){
        try{
          let loaded=await urlToDataURL(form.photoUrl);
          if(form.removeBg) loaded=await removeBgChroma(loaded, form.bgTolerance);
          set("photoData", loaded);
        }catch{}
      }
      const tamponData=await tryLoadImageData([tamponUrl,"/tampon.png"]);
      // ====== SEULE MODIF: détourage du logo au chargement ======
      const logoRawData=await tryLoadImageData([logoUrl,"/logo.png"]);
      const logoData = logoRawData
        ? await removeBgChroma(
            logoRawData,
            Number.isFinite(form.bgTolerance) ? form.bgTolerance : 28
          )
        : "";
      // ==========================================================

      const flagLData=await tryLoadImageData([form.flagL||DEFAULT_FLAG_CI]);
      const flagRData=await tryLoadImageData([form.flagR||DEFAULT_FLAG_MA]);

      const rawPhoto=form.photoData ? form.photoData : (form.photoUrl?await tryLoadImageData([form.photoUrl]):"");
      const photoData=form.removeBg && rawPhoto ? await removeBgChroma(rawPhoto, form.bgTolerance) : rawPhoto;

      // Enregistrement Sheet (best-effort)
      const saveRes=await postToSheet(payload);
      if(!saveRes.ok && msgRef.current){
        msgRef.current.textContent="Enregistrement Sheet échoué: "+(saveRes.error||"...");
        msgRef.current.style.color="orangered";
      }

      // PDF CR80
      const W=85.6, H=54;
      const pdf=new jsPDF({orientation:"landscape", unit:"mm", format:[W,H]});

      /* --------- RECTO ---------- */
      fillSoftGradient(pdf,W,H,[248,207,162],[169,224,169],true);
      const headH=drawHeader(pdf,W);

      // Drapeaux
      const flagW=9.2, flagH=6.1, marginEdge=2.2;
      if(flagLData) await addFittedImage(pdf,flagLData,marginEdge,(headH-flagH)/2,flagW,flagH);
      if(flagRData) await addFittedImage(pdf,flagRData,W-flagW-marginEdge,(headH-flagH)/2,flagW,flagH);

      // Infos (ne rien changer au style)
      const leftX=3.0;
      const topY=headH+3.4;
      const lineH=4.0;
      const labelW=18.8;
      const railW=16.5;
      const railX=W-railW-2.2;

      const infoRightLimit=railX-1.2;
      const valueMaxW=Math.max(22, infoRightLimit-(leftX+labelW));

      let y=topY;
      pdf.setTextColor(11,23,54);
      pdf.setFontSize(5.0);

      y=drawRowWrapped(pdf,{leftX,yStart:y,label:"NOM :",value:safeUpper(form.nom),labelW,valueMaxW,lineH});
      y=drawRowWrapped(pdf,{leftX,yStart:y,label:"PRÉNOMS :",value:form.prenom, labelW,valueMaxW,lineH});
      y=drawRowWrapped(pdf,{leftX,yStart:y,label:"NAISSANCE :",value:`${fmtDateFR(form.naissance_date)} à ${form.naissance_lieu||"—"}`,labelW,valueMaxW,lineH});
      y=drawRowWrapped(pdf,{leftX,yStart:y,label:"FONCTION :", value:form.fonction||"Membre", labelW,valueMaxW,lineH});
      y=drawRowWrapped(pdf,{leftX,yStart:y,label:"PROFESSION :",value:form.metier, labelW,valueMaxW,lineH});
      y=drawRowWrapped(pdf,{leftX,yStart:y,label:"QUARTIER :",  value:form.quartier, labelW,valueMaxW,lineH});
      y=drawRowWrapped(pdf,{leftX,yStart:y,label:"TÉLÉPHONE :", value:form.tel,     labelW,valueMaxW,lineH});

      /* ==== URGENCE : forcer NOM et TÉLÉPHONE sur 2 lignes ==== */
      const urgenceLines = [];
      if (form.urg_nom) urgenceLines.push(form.urg_nom + (form.urg_tel ? " —" : ""));
      if (form.urg_tel) urgenceLines.push(form.urg_tel);
      const urgenceValue = urgenceLines.join("\n");
      y=drawRowWrapped(pdf,{leftX,yStart:y,label:"URGENCE :", value:urgenceValue, labelW,valueMaxW,lineH});

      if(form.numero){
        y=drawRowWrapped(pdf,{leftX,yStart:y,label:"N° :",value:form.numero, labelW,valueMaxW,lineH});
      }

      // === Rail (droite) ===
      const phY = topY - 1.0;
      const phH = 22.6;
      const phW = railW;
      if(photoData){ await addFittedImage(pdf,photoData,railX,phY,phW,phH); }
      else{
        pdf.setDrawColor(180); pdf.rect(railX,phY,phW,phH);
        pdf.setTextColor(148,163,184); pdf.setFont("helvetica","bold"); pdf.setFontSize(5.0);
        pdf.text("PHOTO", railX+phW/2, phY+phH/2, {align:"center", baseline:"middle"});
      }

      // Matricule
      const idBoxY=phY+phH+1.4;
      pdf.setFillColor(11,23,54); pdf.rect(railX,idBoxY,railW,4.8,"F");
      pdf.setTextColor(255,255,255); pdf.setFont("helvetica","bold"); pdf.setFontSize(5.0);
      pdf.text(form.id||"AICA-2025-0001", railX+railW/2, idBoxY+3.0, {align:"center",baseline:"middle"});

      // Dates + Tampon + Président (inchangé)
      const todayStr=fmtDateFR(new Date());
      const expStr=fmtDateFR(form.exp);
      pdf.setTextColor(38,49,79); pdf.setFont("helvetica","normal"); pdf.setFontSize(4.6);
      const line1Y=idBoxY+7.6;
      const line2Y=line1Y+3.2;
      const baseX=railX+2.8;
      pdf.text(`Valable : ${todayStr}`, baseX, line1Y, {align:"left"});
      pdf.text(`Au : ${expStr||"—"}`, baseX, line2Y, {align:"left"});

      const stampW=12.8, stampH=12.8, extraGap=6.0;
      const stampX=baseX - stampW - extraGap;
      const stampMidY=(line1Y+line2Y)/2;
      const stampY=stampMidY - stampH/2 + 0.2;
      if(tamponData){ await addFittedImage(pdf, tamponData, stampX, stampY, stampW, stampH, "PNG", -10); }
      pdf.setFont("helvetica","bold"); pdf.setFontSize(5.2); pdf.setTextColor(38,49,79);
      const prezY=stampY + stampH + 0.6;
      pdf.text("Président", stampX + stampW/2, prezY, {align:"center"});

      /* --------- VERSO ---------- */
      pdf.addPage([W,H],"landscape");
       fillSoftGradient(pdf,W,H,[248,207,162],[169,224,169],true);

      pdf.setTextColor(21,34,54); pdf.setFont("helvetica","normal"); pdf.setFontSize(6);
      const backText =
        "Cette carte strictement personnelle est délivrée à un membre immatriculé de l'Association A.I.C.A.\n\n"
        pdf.text(backText, W/2, 9.5, { align: "center", maxWidth: W - 12 });

      const margin=3;
      const box=Math.min(W*0.38, H*0.38);
      const qx=W - box - margin;
      const qy=H - box - margin;
      if(logoData){ await addFittedImage(pdf, logoData, margin, qy, box, box, "PNG", 0); }
      if(qrDataUrl){ await addFittedImage(pdf, qrDataUrl, qx, qy, box, box, "PNG"); }
      else{ pdf.setTextColor(100,116,139); pdf.text("QR Code en cours de génération…", W/2, H-6, {align:"center"}); }

      // Fichier
      const safeNom=(form.nom||"NOM").replace(/\s+/g,"_");
      const safePre=(form.prenom||"PRENOM").replace(/\s+/g,"_");
      const fileName=`CARTE_${payload.id}_${safeNom}_${safePre}.pdf`;
      pdf.save(fileName);

      if(msgRef.current){
        msgRef.current.textContent=`PDF téléchargé : ${fileName}`;
        msgRef.current.style.color=saveRes?.ok?"green":"orange";
      }
    }catch(error){
      console.error("Erreur PDF direct:",error);
      if(msgRef.current){ msgRef.current.textContent="Erreur: "+error.message; msgRef.current.style.color="red"; }
    }finally{ setIsGenerating(false); }
  }

  function generateNewId(){
    set("id", genIdPerYear());
    setYearCounter(getCounter(year));
  }

  function resetForm(){
    setForm(f=>({
      ...f,
      nom:"", prenom:"", naissance_date:"", naissance_lieu:"",
      tel:"", quartier:"", metier:"", fonction:"Membre",
      exp:fmtDateISO(addMonths(new Date(),12)), id:"",
      urg_nom:"", urg_tel:"", email:"", numero:"",
      sexe:"", matrim:"", date_maroc:"", diplome:"", social:"", logement:"",
      photoUrl:"", photoData:"", removeBg:true, bgTolerance:28,
    }));
    if(msgRef.current) msgRef.current.textContent="";
  }

  /* Mise à zéro du compteur si inexistant (défaut = 0) */
  useEffect(()=>{
    const cur = getCounter(year);
    if(cur !== yearCounter) setYearCounter(cur);
  }, [year]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <header className="header"><h1>Carte membre AICA — PDF direct</h1></header>
      <main className="main">
        <section className="panel">
          <h2>1) Renseigner les informations</h2>
          <div className="grid-2">
            <div><label>Nom</label><input value={form.nom} onChange={(e)=>set("nom",e.target.value)} placeholder="NOM" /></div>
            <div><label>Prénom(s)</label><input value={form.prenom} onChange={(e)=>set("prenom",e.target.value)} placeholder="Prénom(s)" /></div>
            <div><label>Date de naissance</label><input type="date" value={form.naissance_date} onChange={(e)=>set("naissance_date",e.target.value)} /></div>
            <div><label>Lieu de naissance</label><input value={form.naissance_lieu} onChange={(e)=>set("naissance_lieu",e.target.value)} placeholder="Ville / Lieu" /></div>
            <div><label>Téléphone</label><input value={form.tel} onChange={(e)=>set("tel",e.target.value)} placeholder="+212..." /></div>
            <div><label>Quartier (Casablanca)</label><input value={form.quartier} onChange={(e)=>set("quartier",e.target.value)} placeholder="Maarif, Sidi Bernoussi, ... " /></div>
            <div><label>Métier / Profession</label><input value={form.metier} onChange={(e)=>set("metier",e.target.value)} placeholder="Profession" /></div>
            <div><label>Fonction dans l'AICA</label><input value={form.fonction} onChange={(e)=>set("fonction",e.target.value)} placeholder="Membre, Président, ..." /></div>
            <div><label>Expiration (défaut +12 mois)</label><input type="date" value={form.exp} onChange={(e)=>set("exp",e.target.value)} /></div>

            {/* ====== Matricule + Génération ====== */}
            <div>
              <label>ID Association (Matricule)</label>
              <div className="row">
                <input value={form.id} onChange={(e)=>set("id",e.target.value)} placeholder="AICA-2025-0001" />
                <button type="button" onClick={generateNewId}>Générer</button>
              </div>
            </div>

            {/* ====== Compteur (modifiable) ====== */}
            <div>
              <label>Compteur {year} (édition)</label>
              <div className="row">
                <input
                  type="number"
                  min="0"
                  value={yearCounter}
                  onChange={(e)=>{
                    const v = Math.max(0, parseInt(e.target.value||"0",10));
                    setYearCounter(v);
                    setCounter(year, v);
                  }}
                  placeholder="0"
                />
                <button
                  type="button"
                  onClick={()=>{
                    setCounter(year,0);
                    setYearCounter(0);
                  }}
                >
                  Réinitialiser
                </button>
              </div>
              <div className="hint">Le prochain “Générer” utilisera ce compteur (AICA-{year}-xxxx) puis l’incrémente.</div>
            </div>

            <div><label>Urgence — Nom & Prénom</label><input value={form.urg_nom} onChange={(e)=>set("urg_nom",e.target.value)} placeholder="Nom Prénom" /></div>
            <div><label>Urgence — Téléphone</label><input value={form.urg_tel} onChange={(e)=>set("urg_tel",e.target.value)} placeholder="+212..." /></div>
            <div><label>Adresse mail (QR / fiche)</label><input value={form.email} onChange={(e)=>set("email",e.target.value)} placeholder="exemple@domaine.com" /></div>
            <div><label>N°</label><input value={form.numero} onChange={(e)=>set("numero",e.target.value)} placeholder="N° de document" /></div>
          </div>

          <h2 style={{marginTop:14}}>2) Photo</h2>
          <div className="grid-2">
            <div>
              <label>Photo — Fichier</label>
              <input type="file" accept="image/*" onChange={(e)=>onFileChange(e,"photoData","photoUrl")} />
              <label className="hint">ou URL</label>
              <input value={form.photoUrl} onChange={(e)=>set("photoUrl",e.target.value)} placeholder="https://..." />
            </div>
            <div>
              <label>Options photo</label>
              <div className="row">
                <label className="switch">
                  <input type="checkbox" checked={form.removeBg} onChange={(e)=>set("removeBg",e.target.checked)} />
                  <span>Supprimer le fond (auto)</span>
                </label>
                <label style={{marginLeft:8}}>
                  Tolérance
                  <input type="range" min="10" max="60" step="1" value={form.bgTolerance}
                         onChange={(e)=>set("bgTolerance", Number(e.target.value))}
                         style={{width:140, verticalAlign:"middle", marginLeft:8}} />
                  <span className="hint" style={{marginLeft:6}}>{form.bgTolerance}</span>
                </label>
              </div>
              <div className="hint">Astuce : fonctionne mieux si le fond est clair / uni.</div>
            </div>
          </div>

          <h2 style={{marginTop:14}}>3) Drapeaux</h2>
          <div className="grid-2">
            <div><label>Drapeau gauche</label><input value={form.flagL} onChange={(e)=>set("flagL",e.target.value)} placeholder="URL image" /></div>
            <div><label>Drapeau droit</label><input value={form.flagR} onChange={(e)=>set("flagR",e.target.value)} placeholder="URL image" /></div>
          </div>

          <details style={{marginTop:10}}>
            <summary>4) Détails supplémentaires (QR / fiche uniquement)</summary>
            <div className="grid-3" style={{marginTop:6}}>
              <div><label>Sexe</label><input value={form.sexe} onChange={(e)=>set("sexe",e.target.value)} placeholder="Masculin / Féminin" /></div>
              <div><label>Situation matrimoniale</label><input value={form.matrim} onChange={(e)=>set("matrim",e.target.value)} placeholder="Célibataire, Marié(e)..." /></div>
              <div><label>Date d'entrée au Maroc</label><input type="date" value={form.date_maroc} onChange={(e)=>set("date_maroc",e.target.value)} /></div>
              <div><label>Diplôme / Niveau</label><input value={form.diplome} onChange={(e)=>set("diplome",e.target.value)} placeholder="BAC, Licence..." /></div>
              <div><label>Réseaux sociaux</label><input value={form.social} onChange={(e)=>set("social",e.target.value)} placeholder="@moncompte ..." /></div>
              <div><label>Logement</label><input value={form.logement} onChange={(e)=>set("logement",e.target.value)} placeholder="Appartement, Chambre..." /></div>
            </div>
          </details>

          <div className="actions">
            <button className="primary" type="button" onClick={downloadPdfDirect} disabled={isGenerating}>
              {isGenerating ? "Génération..." : "Télécharger le PDF (direct)"}
            </button>
            <button type="button" onClick={resetForm} disabled={isGenerating}>Réinitialiser</button>
            <span className="hint">URGENCE : nom et téléphone passent désormais sur 2 lignes.</span>
          </div>
          <p ref={msgRef} className="msg"></p>
        </section>
      </main>
    </div>
  );
}
