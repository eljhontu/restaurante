<?php
// qr.php - Menú público QR para clientes
require_once 'config/db.php';
?>
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Menú — RestaurantOS</title>
<link rel="stylesheet" href="assets/style.css">
<link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet">
</head>
<body style="background:var(--bg);">

<div id="qr-app">
  <div class="qr-header">
    <h2>🍽 RestaurantOS</h2>
    <p id="qr-turno">Cargando menú...</p>
    <p style="opacity:0.7;font-size:0.78rem;margin-top:4px;" id="qr-hora"></p>
  </div>
  <div style="padding:20px;max-width:480px;margin:0 auto;" id="qr-content">
    <div class="loading">Cargando...</div>
  </div>
</div>

<script>
document.getElementById('qr-hora').textContent = 'Hora: ' + new Date().toLocaleTimeString('es-BO',{hour:'2-digit',minute:'2-digit'});

async function cargarMenu() {
  const res  = await fetch('api/menu.php?action=completo');
  const data = await res.json();
  const content = document.getElementById('qr-content');
  const turnoLabel = document.getElementById('qr-turno');

  if (data.turno === 'almuerzo') {
    turnoLabel.textContent = '🌞 Menú de Almuerzo';
    const m = data.almuerzo;
    content.innerHTML = `
      <div class="card" style="margin-bottom:16px;text-align:center;">
        <div class="card-body">
          <div style="font-family:'DM Serif Display',serif;font-size:2.2rem;color:var(--accent);">${m.precio} Bs</div>
          <div style="color:var(--text3);font-size:0.85rem;margin-top:4px;">Almuerzo del día</div>
          <div style="margin-top:10px;font-size:0.82rem;color:var(--text2);">Incluye: 1 sopa + 1 segundo + 1 postre</div>
        </div>
      </div>
      ${seccionQR('🍲 Sopas', m.sopas.map(s=>({nombre:s,precio:null})))}
      ${seccionQR('🍽 Segundos', m.segundos.map(s=>({nombre:s,precio:null})))}
      ${seccionQR('🍮 Postres', m.postres.map(s=>({nombre:s,precio:null})))}
      ${seccionQR('🥤 Bebidas adicionales', m.bebidas)}
    `;
  } else if (data.turno === 'noche') {
    turnoLabel.textContent = '🌙 Menú de Noche';
    content.innerHTML = data.noche.map(cat => `
      <div class="menu-section">
        <div class="menu-section-title">${cat.categoria}</div>
        ${cat.items.map(i=>`
          <div class="menu-plato">
            <span class="menu-plato-name">${i.nombre}</span>
            <span class="menu-plato-price">${i.precio} Bs</span>
          </div>`).join('')}
      </div>`).join('');
  } else {
    turnoLabel.textContent = '⏸ Restaurante cerrado';
    content.innerHTML = `<div class="empty"><div class="empty-icon">🕐</div><div class="empty-text">Atendemos de 11:00–16:00 y 18:00–23:00<br>¡Te esperamos pronto!</div></div>`;
  }
}

function seccionQR(titulo, items) {
  return `<div class="menu-section">
    <div class="menu-section-title">${titulo}</div>
    ${items.map(i=>`
      <div class="menu-plato">
        <span class="menu-plato-name">${i.nombre}</span>
        ${i.precio !== null ? `<span class="menu-plato-price">+${i.precio} Bs</span>` : '<span class="badge badge-green">Incluido</span>'}
      </div>`).join('')}
  </div>`;
}

cargarMenu();
</script>
</body>
</html>
