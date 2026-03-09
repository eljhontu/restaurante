<?php
require_once 'config/db.php';
?>
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Menú del Día</title>
<link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet">
<style>
:root{--accent:#C8541A;--accent2:#E8832A;--bg:#F7F3EE;--surface:#fff;--border:#E2D9CE;--text:#1A1410;--text2:#6B5E52;--text3:#9B8E84;--green:#2D7A4F;--green-bg:#EAF5EE;--red:#C0392B;--red-bg:#FDECEA;--blue:#1A5276;--blue-bg:#EAF2F8;}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
body{font-family:'DM Sans',sans-serif;background:var(--bg);color:var(--text);}
.qr-header{background:linear-gradient(135deg,var(--accent) 0%,var(--accent2) 100%);color:#fff;padding:28px 20px;text-align:center;}
.qr-header h1{font-family:'DM Serif Display',serif;font-size:1.9rem;margin-bottom:6px;}
.qr-fecha{display:inline-block;background:rgba(255,255,255,.2);padding:6px 18px;border-radius:20px;font-size:.92rem;font-weight:600;margin-top:6px;}
.container{max-width:540px;margin:0 auto;padding:20px 16px 50px;}
.menu-btn{width:100%;display:flex;align-items:center;justify-content:space-between;padding:18px 20px;border:none;border-radius:14px;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:1rem;font-weight:700;transition:all .25s;margin-bottom:10px;text-align:left;}
.menu-btn-almuerzo{background:linear-gradient(135deg,#FFF3EA,#FFE8D6);color:var(--accent);border:2px solid #FDDBB4;}
.menu-btn-almuerzo.open,.menu-btn-almuerzo:hover{background:linear-gradient(135deg,#FFDFC0,#FFD0A8);border-color:var(--accent);box-shadow:0 4px 20px rgba(200,84,26,.15);}
.menu-btn-noche{background:linear-gradient(135deg,#EAF2F8,#D6E8F5);color:var(--blue);border:2px solid #B8D4E8;}
.menu-btn-noche.open,.menu-btn-noche:hover{background:linear-gradient(135deg,#C0D8EC,#A8C8E0);border-color:var(--blue);box-shadow:0 4px 20px rgba(26,82,118,.15);}
.menu-btn-left{display:flex;align-items:center;gap:12px;}
.menu-btn-icon{font-size:1.6rem;}
.menu-btn-titulo{font-size:1.05rem;font-weight:800;display:block;}
.menu-btn-horario{font-size:.78rem;font-weight:500;opacity:.75;margin-top:2px;display:block;}
.menu-btn-arrow{font-size:1.1rem;transition:transform .3s;}
.menu-btn.open .menu-btn-arrow{transform:rotate(180deg);}
.menu-panel{max-height:0;overflow:hidden;transition:max-height .4s ease;background:var(--surface);border-radius:12px;border:1px solid var(--border);margin-bottom:14px;}
.menu-panel.open{max-height:4000px;}
.menu-panel-inner{padding:16px;}
.precio-almuerzo{background:linear-gradient(135deg,#FFF8F0,#FFF3EA);border:1.5px solid #FDDBB4;border-radius:10px;padding:14px 16px;text-align:center;margin-bottom:14px;}
.precio-almuerzo .monto{font-family:'DM Serif Display',serif;font-size:2rem;color:var(--accent);}
.precio-almuerzo .incluye{font-size:.8rem;color:var(--text2);margin-top:3px;}
.sub-titulo{font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:var(--text3);margin:14px 0 8px;}
.plato-card{display:flex;gap:12px;background:var(--bg);border-radius:10px;border:1px solid var(--border);overflow:hidden;margin-bottom:8px;transition:box-shadow .2s;}
.plato-card:hover{box-shadow:0 3px 12px rgba(0,0,0,.07);}
.plato-card.agotado{opacity:.5;filter:grayscale(.6);}
.plato-img{width:80px;height:80px;object-fit:cover;flex-shrink:0;}
.plato-img-ph{width:80px;height:80px;display:flex;align-items:center;justify-content:center;font-size:1.8rem;background:var(--surface);flex-shrink:0;}
.plato-info{flex:1;padding:10px 10px 10px 0;}
.plato-nombre{font-weight:600;font-size:.92rem;margin-bottom:3px;}
.plato-desc{font-size:.78rem;color:var(--text2);line-height:1.4;margin-bottom:6px;}
.plato-footer{display:flex;align-items:center;justify-content:space-between;gap:6px;}
.plato-precio{font-weight:700;color:var(--accent);font-size:.9rem;}
.tag-incluido{font-size:.7rem;font-weight:700;background:var(--green-bg);color:var(--green);padding:2px 8px;border-radius:10px;}
.tag-agotado{font-size:.7rem;font-weight:700;background:var(--red-bg);color:var(--red);padding:2px 8px;border-radius:10px;}
.divider{border:none;border-top:1px dashed var(--border);margin:8px 0 4px;}
.loading{text-align:center;padding:40px;color:var(--text3);font-size:.9rem;}
.empty-sec{text-align:center;padding:20px;color:var(--text3);font-size:.85rem;}
</style>
</head>
<body>
<div class="qr-header">
  <h1>🍽 RestaurantOS</h1>
  <div class="qr-fecha" id="fecha-label">Cargando...</div>
</div>
<div class="container" id="app"><div class="loading">⏳ Cargando menú...</div></div>
<script>
const MESES=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
function formatFecha(f){const[y,m,d]=f.split('-');return`${parseInt(d)} de ${MESES[parseInt(m)-1]} de ${y}`;}
function em(cat){return{sopa:'🍲',segundo:'🍽',postre:'🍮',noche:'🌙',bebida:'🥤'}[cat]||'🍴';}
function platosHTML(lista,showPrecio=true){
  if(!lista||!lista.length)return'<div class="empty-sec">Sin opciones disponibles hoy</div>';
  return lista.map(p=>{
    const img=p.imagen_url?`<img class="plato-img" src="${p.imagen_url}" alt="" onerror="this.style.display='none';this.nextSibling.style.display='flex'">`:'' ;
    const ph=`<div class="plato-img-ph" ${p.imagen_url?'style="display:none"':''}>${em(p.categoria)}</div>`;
    const precioTag=p.precio>0?`<span class="plato-precio">${p.precio} Bs</span>`:`<span></span>`;
    const agotadoTag=p.agotado?'<span class="tag-agotado">⚠ Agotado</span>':'';
    return`<div class="plato-card ${p.agotado?'agotado':''}">${img}${ph}<div class="plato-info"><div class="plato-nombre">${p.nombre}</div>${p.descripcion?`<div class="plato-desc">${p.descripcion}</div>`:''}<div class="plato-footer">${precioTag}${agotadoTag}</div></div></div>`;
  }).join('');
}
function toggle(id){
  document.getElementById('btn-'+id).classList.toggle('open');
  document.getElementById('panel-'+id).classList.toggle('open');
}
async function cargar(){
  const res=await fetch('api/platos.php?action=menu_qr');
  const data=await res.json();
  document.getElementById('fecha-label').textContent='MENÚ PARA '+formatFecha(data.fecha);
  const a=data.almuerzo, n=data.noche;
  const htmlA=`
    <div class="precio-almuerzo"><div class="monto">${a.precio} Bs</div><div class="incluye">Almuerzo del día · incluye sopa + segundo + postre</div></div>
    <div class="sub-titulo">🍲 Sopas</div>${platosHTML(a.sopas,false)}
    <div class="sub-titulo">🍽 Segundos</div>${platosHTML(a.segundos,false)}
    <div class="sub-titulo">🍮 Postres</div>${platosHTML(a.postres,false)}
    ${a.bebidas?.length?`<div class="divider"></div><div class="sub-titulo">🥤 Bebidas adicionales</div>${platosHTML(a.bebidas,true)}`:''}`;
  const htmlN=`
    ${platosHTML(n.platos,true)}
    ${n.bebidas?.length?`<div class="divider"></div><div class="sub-titulo">🥤 Bebidas</div>${platosHTML(n.bebidas,true)}`:''}`;
  document.getElementById('app').innerHTML=`
    <button class="menu-btn menu-btn-almuerzo open" id="btn-almuerzo" onclick="toggle('almuerzo')">
      <div class="menu-btn-left"><span class="menu-btn-icon">🌞</span><div><span class="menu-btn-titulo">ALMUERZO</span><span class="menu-btn-horario">12:00 a 14:30</span></div></div>
      <span class="menu-btn-arrow">▼</span>
    </button>
    <div class="menu-panel open" id="panel-almuerzo"><div class="menu-panel-inner">${htmlA}</div></div>
    <button class="menu-btn menu-btn-noche" id="btn-noche" onclick="toggle('noche')">
      <div class="menu-btn-left"><span class="menu-btn-icon">🌙</span><div><span class="menu-btn-titulo">MENÚ NOCHE</span><span class="menu-btn-horario">17:30 a 22:00</span></div></div>
      <span class="menu-btn-arrow">▼</span>
    </button>
    <div class="menu-panel" id="panel-noche"><div class="menu-panel-inner">${htmlN}</div></div>`;
}
cargar().catch(()=>{document.getElementById('app').innerHTML='<div class="loading">Error cargando el menú.</div>';});
</script>
</body>
</html>
