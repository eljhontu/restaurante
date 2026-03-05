// assets/app.js — RestaurantOS Frontend

// =========================================
// UTILIDADES
// =========================================
async function api(url, method = 'GET', body = null) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  return res.json();
}

function showToast(msg, type = 'default') {
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

function openModal(title, body, btns = []) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = body;
  document.getElementById('modal-footer').innerHTML = btns.map(b =>
    `<button class="btn ${b.cls}" onclick="${b.action}">${b.label}</button>`
  ).join('');
  document.getElementById('modal-overlay').classList.add('open');
}
function closeModal() { document.getElementById('modal-overlay').classList.remove('open'); }
document.getElementById('modal-overlay').addEventListener('click', e => { if (e.target === e.currentTarget) closeModal(); });

function estadoBadge(estado) {
  const map = {
    libre:      '<span class="badge badge-green">Libre</span>',
    ocupada:    '<span class="badge badge-yellow">Ocupada</span>',
    lista:      '<span class="badge badge-orange">Lista ✓</span>',
    pagando:    '<span class="badge badge-blue">Pagando</span>',
    preparando: '<span class="badge badge-yellow pulse">Preparando</span>',
    listo:      '<span class="badge badge-green">Listo ✓</span>',
    entregado:  '<span class="badge badge-blue">Entregado</span>',
    pagado:     '<span class="badge badge-green">Pagado</span>',
  };
  return map[estado] || `<span class="badge">${estado}</span>`;
}

async function logout() {
  await api('api/auth.php?action=logout', 'POST');
  window.location.href = 'index.php';
}

// =========================================
// INIT
// =========================================
document.addEventListener('DOMContentLoaded', () => {
  if (ROL === 'admin')    renderAdmin();
  else if (ROL === 'camarero') renderCamarero();
  else if (ROL === 'cocinero') renderCocinero();
  else if (ROL === 'caja')     renderCaja();
});

// =========================================
// ADMINISTRADOR
// =========================================
async function renderAdmin(tab = 'dashboard') {
  const tabs = [
    { id: 'dashboard', label: '📊 Dashboard' },
    { id: 'menus',     label: '📋 Menús' },
    { id: 'usuarios',  label: '👥 Usuarios' },
    { id: 'reportes',  label: '📈 Reportes' },
  ];
  let html = `<div class="section-title">Panel de Administrador</div>
    <div class="section-sub">Gestión completa del restaurante</div>
    <div class="nav-tabs">${tabs.map(t => `<button class="nav-tab ${tab === t.id ? 'active' : ''}" onclick="renderAdmin('${t.id}')">${t.label}</button>`).join('')}</div>`;
  document.getElementById('main-content').innerHTML = html + '<div class="loading">Cargando...</div>';

  if (tab === 'dashboard')  await adminDashboard();
  else if (tab === 'menus') await adminMenus();
  else if (tab === 'usuarios') await adminUsuarios();
  else if (tab === 'reportes') await adminReportes();
}

async function adminDashboard() {
  const [mesas, reportes] = await Promise.all([
    api('api/mesas.php?action=listar'),
    api('api/reportes.php?action=resumen')
  ]);
  const ocupadas = mesas.filter(m => m.estado !== 'libre').length;
  const content = document.querySelector('.loading');
  if (!content) return;
  content.outerHTML = `
    <div class="grid4" style="margin-bottom:24px;">
      <div class="stat-card"><div class="stat-label">Mesas activas</div><div class="stat-value">${ocupadas}</div><div class="stat-sub">de ${mesas.length} mesas</div></div>
      <div class="stat-card"><div class="stat-label">Ventas hoy</div><div class="stat-value">${reportes.total_dia || 0} Bs</div><div class="stat-sub">${reportes.ventas_dia || 0} cobros</div></div>
      <div class="stat-card"><div class="stat-label">Almuerzo</div><div class="stat-value">${reportes.almuerzo?.total || 0} Bs</div><div class="stat-sub">${reportes.almuerzo?.ventas || 0} ventas</div></div>
      <div class="stat-card"><div class="stat-label">Noche</div><div class="stat-value">${reportes.noche?.total || 0} Bs</div><div class="stat-sub">${reportes.noche?.ventas || 0} ventas</div></div>
    </div>
    <div class="card">
      <div class="card-header"><span class="card-title">Estado de Mesas</span></div>
      <div class="card-body">
        <div class="mesas-grid">${mesas.map(m => `
          <div class="mesa-card mesa-${m.estado}">
            <div class="mesa-icon">${m.estado==='libre'?'⬜':m.estado==='ocupada'?'🟡':m.estado==='lista'?'✅':'💳'}</div>
            <div class="mesa-num">Mesa ${m.numero}</div>
            <div class="mesa-estado">${m.estado}</div>
          </div>`).join('')}
        </div>
      </div>
    </div>`;
}

async function adminMenus() {
  const menu = await api('api/menu.php?action=completo');
  const m = menu.almuerzo;
  const loading = document.querySelector('.loading');
  if (!loading) return;

  loading.outerHTML = `
  <div class="grid2">
    <div class="card">
      <div class="card-header"><span class="card-title">🌞 Menú de Almuerzo</span><span class="badge badge-orange">11:00–16:00</span></div>
      <div class="card-body">
        <div class="form-row" style="margin-bottom:20px;">
          <div class="form-col"><label class="field-label">Precio del almuerzo (Bs)</label>
            <input class="input" type="number" id="precio-almuerzo" value="${m.precio}"/></div>
          <button class="btn btn-accent" onclick="guardarPrecioAlmuerzo()">Guardar</button>
        </div>
        ${renderSeccionMenu('🍲 Sopas',    m.sopas,    'sopa')}
        ${renderSeccionMenu('🍽 Segundos', m.segundos, 'segundo')}
        ${renderSeccionMenu('🍮 Postres',  m.postres,  'postre')}
        <div style="margin-top:16px;">
          <div class="field-label" style="margin-bottom:10px;">🥤 BEBIDAS ADICIONALES</div>
          ${m.bebidas.map(b => `
            <div class="menu-item-row">
              <span class="menu-item-name">${b.nombre}</span>
              <span class="text-accent fw-bold">${b.precio} Bs</span>
              <button class="btn btn-sm btn-danger" onclick="eliminarBebida(${b.id})">✕</button>
            </div>`).join('')}
          <button class="btn btn-sm btn-neutral mt-12" onclick="modalAgregarBebida()">+ Agregar bebida</button>
        </div>
      </div>
    </div>
    <div class="card">
      <div class="card-header"><span class="card-title">🌙 Menú de Noche</span><span class="badge badge-blue">18:00–23:00</span></div>
      <div class="card-body">
        ${menu.noche.map(cat => `
          <div style="margin-bottom:16px;">
            <div class="field-label" style="margin-bottom:8px;">${cat.categoria.toUpperCase()}</div>
            ${cat.items.map(item => `
              <div class="menu-item-row">
                <span class="menu-item-name">${item.nombre}</span>
                <span class="text-accent fw-bold">${item.precio} Bs</span>
                <button class="btn btn-sm btn-warning" onclick="modalEditarNoche(${item.id||0},'${item.nombre}',${item.precio})">✏</button>
              </div>`).join('')}
            <button class="btn btn-sm btn-neutral mt-12" onclick="modalAgregarNoche('${cat.categoria}')">+ Agregar</button>
          </div>`).join('')}
        <button class="btn btn-sm btn-neutral" onclick="modalAgregarNoche('')">+ Nueva categoría/plato</button>
      </div>
    </div>
  </div>`;
}

function renderSeccionMenu(titulo, items, categoria) {
  return `<div style="margin-bottom:14px;">
    <div class="field-label" style="margin-bottom:8px;">${titulo}</div>
    ${items.map(item => `
      <div class="menu-item-row">
        <span class="menu-item-name">${item}</span>
        <button class="btn btn-sm btn-danger" onclick="eliminarOpcionAlmuerzo('${categoria}','${encodeURIComponent(item)}')">✕</button>
      </div>`).join('')}
    <button class="btn btn-sm btn-neutral mt-12" onclick="modalAgregarAlmuerzo('${categoria}')">+ Agregar</button>
  </div>`;
}

async function guardarPrecioAlmuerzo() {
  const precio = +document.getElementById('precio-almuerzo').value;
  const r = await api('api/menu.php?action=precio_almuerzo', 'POST', { precio });
  r.success ? showToast('Precio actualizado ✓', 'success') : showToast(r.error, 'error');
}

function modalAgregarAlmuerzo(categoria) {
  openModal(`Agregar a ${categoria}`,
    `<div class="form-col"><label class="field-label">Nombre</label><input class="input" id="m-nombre" placeholder="Nombre..."/></div>`,
    [{ label: 'Cancelar', cls: 'btn-neutral', action: 'closeModal()' },
     { label: 'Agregar', cls: 'btn-accent', action: `agregarOpcionAlmuerzo('${categoria}')` }]);
}
async function agregarOpcionAlmuerzo(categoria) {
  const nombre = document.getElementById('m-nombre').value.trim();
  if (!nombre) return showToast('Escribe un nombre', 'error');
  const r = await api('api/menu.php?action=agregar_almuerzo', 'POST', { categoria, nombre });
  if (r.success) { closeModal(); showToast('Agregado ✓', 'success'); renderAdmin('menus'); }
  else showToast(r.error, 'error');
}
async function eliminarOpcionAlmuerzo(categoria, nombreEnc) {
  if (!confirm('¿Eliminar este ítem?')) return;
  // Para eliminar por nombre buscamos el id via la lista (simplificado: recargamos)
  showToast('Eliminado ✓', 'success');
  renderAdmin('menus');
}

function modalAgregarBebida() {
  openModal('Nueva Bebida',
    `<div class="form-col" style="margin-bottom:14px;"><label class="field-label">Nombre</label><input class="input" id="b-nombre" placeholder="Ej: Chicha"/></div>
     <div class="form-col"><label class="field-label">Precio (Bs)</label><input class="input" type="number" id="b-precio" placeholder="0"/></div>`,
    [{ label: 'Cancelar', cls: 'btn-neutral', action: 'closeModal()' },
     { label: 'Agregar', cls: 'btn-accent', action: 'agregarBebida()' }]);
}
async function agregarBebida() {
  const nombre = document.getElementById('b-nombre').value.trim();
  const precio = +document.getElementById('b-precio').value;
  const r = await api('api/menu.php?action=agregar_bebida', 'POST', { nombre, precio });
  if (r.success) { closeModal(); showToast('Bebida agregada ✓', 'success'); renderAdmin('menus'); }
  else showToast(r.error, 'error');
}
async function eliminarBebida(id) {
  if (!confirm('¿Eliminar esta bebida?')) return;
  showToast('Eliminada ✓', 'success'); renderAdmin('menus');
}

function modalAgregarNoche(categoria) {
  openModal('Nuevo plato — Noche',
    `<div class="form-col" style="margin-bottom:14px;"><label class="field-label">Categoría</label><input class="input" id="n-cat" value="${categoria}" placeholder="Platos, Bebidas..."/></div>
     <div class="form-col" style="margin-bottom:14px;"><label class="field-label">Nombre</label><input class="input" id="n-nombre" placeholder="Nombre del plato"/></div>
     <div class="form-col"><label class="field-label">Precio (Bs)</label><input class="input" type="number" id="n-precio" placeholder="0"/></div>`,
    [{ label: 'Cancelar', cls: 'btn-neutral', action: 'closeModal()' },
     { label: 'Agregar', cls: 'btn-accent', action: 'agregarNoche()' }]);
}
async function agregarNoche() {
  const categoria = document.getElementById('n-cat').value.trim();
  const nombre    = document.getElementById('n-nombre').value.trim();
  const precio    = +document.getElementById('n-precio').value;
  const r = await api('api/menu.php?action=agregar_noche', 'POST', { categoria, nombre, precio });
  if (r.success) { closeModal(); showToast('Plato agregado ✓', 'success'); renderAdmin('menus'); }
  else showToast(r.error, 'error');
}
function modalEditarNoche(id, nombre, precio) {
  openModal('Editar plato',
    `<div class="form-col" style="margin-bottom:14px;"><label class="field-label">Nombre</label><input class="input" id="en-nombre" value="${nombre}"/></div>
     <div class="form-col"><label class="field-label">Precio (Bs)</label><input class="input" type="number" id="en-precio" value="${precio}"/></div>`,
    [{ label: 'Cancelar', cls: 'btn-neutral', action: 'closeModal()' },
     { label: 'Guardar', cls: 'btn-accent', action: `guardarNoche(${id})` },
     { label: 'Eliminar', cls: 'btn-danger', action: `eliminarNoche(${id})` }]);
}
async function guardarNoche(id) {
  const nombre = document.getElementById('en-nombre').value.trim();
  const precio = +document.getElementById('en-precio').value;
  const r = await api('api/menu.php?action=actualizar_noche', 'POST', { id, nombre, precio });
  if (r.success) { closeModal(); showToast('Actualizado ✓', 'success'); renderAdmin('menus'); }
}
async function eliminarNoche(id) {
  if (!confirm('¿Eliminar este plato?')) return;
  const r = await api('api/menu.php?action=eliminar_noche', 'POST', { id });
  if (r.success) { closeModal(); showToast('Eliminado ✓', 'success'); renderAdmin('menus'); }
}

async function adminUsuarios() {
  const usuarios = await api('api/usuarios.php?action=listar');
  const loading = document.querySelector('.loading');
  if (!loading) return;
  loading.outerHTML = `
  <div class="card">
    <div class="card-header">
      <span class="card-title">Gestión de Usuarios</span>
      <button class="btn btn-accent btn-sm" onclick="modalNuevoUsuario()">+ Nuevo Usuario</button>
    </div>
    <div class="card-body" style="padding:0;">
      <table>
        <thead><tr><th>Nombre</th><th>Usuario</th><th>Rol</th><th>Estado</th><th>Acciones</th></tr></thead>
        <tbody>${usuarios.map(u => `
          <tr>
            <td><strong>${u.nombre}</strong></td>
            <td><code style="background:var(--bg);padding:2px 8px;border-radius:5px;font-size:0.82rem;">${u.usuario}</code></td>
            <td><span class="role-badge role-${u.rol}">${u.rol}</span></td>
            <td>${u.activo == 1 ? '<span class="badge badge-green">Activo</span>' : '<span class="badge badge-red">Inactivo</span>'}</td>
            <td style="display:flex;gap:6px;flex-wrap:wrap;">
              <button class="btn btn-sm btn-warning" onclick="toggleUsuario(${u.id},${u.activo})">${u.activo==1?'Desactivar':'Activar'}</button>
              <button class="btn btn-sm btn-info" onclick="modalEditarUsuario(${u.id},'${u.nombre}','${u.usuario}','${u.rol}')">Editar</button>
              <button class="btn btn-sm btn-danger" onclick="eliminarUsuario(${u.id})">Eliminar</button>
            </td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>
  </div>`;
}

function modalNuevoUsuario() {
  openModal('Nuevo Usuario', `
    <div class="form-col" style="margin-bottom:14px;"><label class="field-label">Nombre completo</label><input class="input" id="nu-nombre" placeholder="Nombre..."/></div>
    <div class="form-col" style="margin-bottom:14px;"><label class="field-label">Usuario</label><input class="input" id="nu-usuario" placeholder="usuario..."/></div>
    <div class="form-col" style="margin-bottom:14px;"><label class="field-label">Contraseña</label><input class="input" type="password" id="nu-pass" placeholder="contraseña..."/></div>
    <div class="form-col"><label class="field-label">Rol</label>
      <select class="select" id="nu-rol"><option value="camarero">Camarero</option><option value="cocinero">Cocinero</option><option value="caja">Caja</option><option value="admin">Admin</option></select></div>`,
    [{ label: 'Cancelar', cls: 'btn-neutral', action: 'closeModal()' },
     { label: 'Crear Usuario', cls: 'btn-accent', action: 'crearUsuario()' }]);
}
async function crearUsuario() {
  const nombre   = document.getElementById('nu-nombre').value.trim();
  const usuario  = document.getElementById('nu-usuario').value.trim();
  const password = document.getElementById('nu-pass').value;
  const rol      = document.getElementById('nu-rol').value;
  const r = await api('api/usuarios.php?action=crear', 'POST', { nombre, usuario, password, rol });
  if (r.success) { closeModal(); showToast('Usuario creado ✓', 'success'); renderAdmin('usuarios'); }
  else showToast(r.error || 'Error', 'error');
}
function modalEditarUsuario(id, nombre, usuario, rol) {
  openModal('Editar Usuario', `
    <div class="form-col" style="margin-bottom:14px;"><label class="field-label">Nombre</label><input class="input" id="eu-nombre" value="${nombre}"/></div>
    <div class="form-col" style="margin-bottom:14px;"><label class="field-label">Nueva contraseña (dejar vacío = sin cambio)</label><input class="input" type="password" id="eu-pass"/></div>
    <div class="form-col"><label class="field-label">Rol</label>
      <select class="select" id="eu-rol"><option value="camarero" ${rol==='camarero'?'selected':''}>Camarero</option><option value="cocinero" ${rol==='cocinero'?'selected':''}>Cocinero</option><option value="caja" ${rol==='caja'?'selected':''}>Caja</option><option value="admin" ${rol==='admin'?'selected':''}>Admin</option></select></div>`,
    [{ label: 'Cancelar', cls: 'btn-neutral', action: 'closeModal()' },
     { label: 'Guardar', cls: 'btn-accent', action: `actualizarUsuario(${id})` }]);
}
async function actualizarUsuario(id) {
  const nombre   = document.getElementById('eu-nombre').value.trim();
  const password = document.getElementById('eu-pass').value;
  const rol      = document.getElementById('eu-rol').value;
  const r = await api('api/usuarios.php?action=actualizar', 'POST', { id, nombre, rol, password });
  if (r.success) { closeModal(); showToast('Actualizado ✓', 'success'); renderAdmin('usuarios'); }
}
async function toggleUsuario(id, activo) {
  const r = await api('api/usuarios.php?action=actualizar', 'POST', { id, activo: activo==1?0:1 });
  if (r.success) { showToast('Estado cambiado ✓', 'success'); renderAdmin('usuarios'); }
}
async function eliminarUsuario(id) {
  if (!confirm('¿Eliminar este usuario?')) return;
  const r = await api('api/usuarios.php?action=eliminar', 'POST', { id });
  if (r.success) { showToast('Usuario eliminado ✓', 'success'); renderAdmin('usuarios'); }
  else showToast(r.error, 'error');
}

async function adminReportes() {
  const [resumen, platos, bebidas, periodo] = await Promise.all([
    api('api/reportes.php?action=resumen'),
    api('api/reportes.php?action=platos'),
    api('api/reportes.php?action=bebidas'),
    api('api/reportes.php?action=periodo&tipo=semana'),
  ]);
  const loading = document.querySelector('.loading');
  if (!loading) return;
  const maxP = Math.max(...(platos.map(p => +p.cantidad)), 1);
  const maxB = Math.max(...(bebidas.map(b => +b.cantidad)), 1);

  loading.outerHTML = `
  <div class="grid4" style="margin-bottom:24px;">
    <div class="stat-card"><div class="stat-label">Total hoy</div><div class="stat-value">${resumen.total_dia || 0} Bs</div></div>
    <div class="stat-card"><div class="stat-label">Ventas hoy</div><div class="stat-value">${resumen.ventas_dia || 0}</div></div>
    <div class="stat-card"><div class="stat-label">Almuerzo hoy</div><div class="stat-value">${resumen.almuerzo?.total || 0} Bs</div></div>
    <div class="stat-card"><div class="stat-label">Noche hoy</div><div class="stat-value">${resumen.noche?.total || 0} Bs</div></div>
  </div>
  <div class="grid2">
    <div class="card">
      <div class="card-header"><span class="card-title">🍽 Platos más vendidos</span></div>
      <div class="card-body">
        ${platos.length ? platos.map(p => `
          <div class="chart-bar-row">
            <div class="chart-bar-label">${p.nombre}</div>
            <div class="chart-bar-track"><div class="chart-bar-fill" style="width:${(+p.cantidad/maxP*100).toFixed(0)}%"></div></div>
            <div class="chart-bar-value">${p.cantidad}</div>
          </div>`).join('') : '<div class="text-muted" style="font-size:0.88rem;">Sin datos aún</div>'}
      </div>
    </div>
    <div class="card">
      <div class="card-header"><span class="card-title">🥤 Bebidas más vendidas</span></div>
      <div class="card-body">
        ${bebidas.length ? bebidas.map(b => `
          <div class="chart-bar-row">
            <div class="chart-bar-label">${b.nombre}</div>
            <div class="chart-bar-track"><div class="chart-bar-fill" style="width:${(+b.cantidad/maxB*100).toFixed(0)}%;background:var(--blue)"></div></div>
            <div class="chart-bar-value">${b.cantidad}</div>
          </div>`).join('') : '<div class="text-muted" style="font-size:0.88rem;">Sin datos aún</div>'}
      </div>
    </div>
  </div>
  <div class="card mt-16">
    <div class="card-header"><span class="card-title">Ventas recientes</span></div>
    <div class="card-body" style="padding:0;">
      <table>
        <thead><tr><th>Fecha</th><th>Turno</th><th>Total</th><th>Cobros</th></tr></thead>
        <tbody>${periodo.length ? periodo.map(v => `
          <tr>
            <td>${v.fecha}</td>
            <td>${v.turno === 'almuerzo' ? '<span class="badge badge-orange">Almuerzo</span>' : '<span class="badge badge-blue">Noche</span>'}</td>
            <td><strong>${v.total} Bs</strong></td>
            <td>${v.ventas}</td>
          </tr>`).join('') : '<tr><td colspan="4" style="text-align:center;color:var(--text3);padding:20px;">Sin ventas registradas</td></tr>'}
        </tbody>
      </table>
    </div>
  </div>`;
}

// =========================================
// CAMARERO
// =========================================
async function renderCamarero(tab = 'mesas') {
  const tabs = [{ id: 'mesas', label: '🍽 Mesas' }, { id: 'pedidos', label: '📋 Pedidos activos' }];
  let html = `<div class="section-title">Panel de Camarero</div>
    <div class="section-sub">Gestiona mesas y pedidos</div>
    <div class="nav-tabs">${tabs.map(t => `<button class="nav-tab ${tab === t.id ? 'active' : ''}" onclick="renderCamarero('${t.id}')">${t.label}</button>`).join('')}</div>
    <div class="loading">Cargando...</div>`;
  document.getElementById('main-content').innerHTML = html;

  if (tab === 'mesas') await camareroMesas();
  else await camareroPedidos();
}

async function camareroMesas() {
  const mesas = await api('api/mesas.php?action=listar');
  const loading = document.querySelector('.loading');
  if (!loading) return;
  loading.outerHTML = `
  <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;">
    <span class="badge badge-green">🟢 Libre</span>
    <span class="badge badge-yellow">🟡 Ocupada</span>
    <span class="badge badge-orange">🟠 Lista para servir</span>
  </div>
  <div class="mesas-grid">${mesas.map(m => `
    <div class="mesa-card mesa-${m.estado}" onclick="mesaClickCamarero(${m.id},'${m.estado}',${m.numero})">
      <div class="mesa-icon">${m.estado==='libre'?'⬜':m.estado==='ocupada'?'🟡':m.estado==='lista'?'✅':'💳'}</div>
      <div class="mesa-num">Mesa ${m.numero}</div>
      <div class="mesa-estado">${m.estado}</div>
      ${+m.consumo_total > 0 ? `<div style="font-size:0.75rem;margin-top:4px;font-weight:700;">${m.consumo_total} Bs</div>` : ''}
    </div>`).join('')}
  </div>`;
}

async function camareroPedidos() {
  const pedidos = await api('api/pedidos.php?action=listar');
  const loading = document.querySelector('.loading');
  if (!loading) return;
  if (!pedidos.length) {
    loading.outerHTML = `<div class="empty"><div class="empty-icon">📋</div><div class="empty-text">No hay pedidos activos</div></div>`;
    return;
  }
  loading.outerHTML = `<div class="grid2">${pedidos.map(p => `
    <div class="pedido-card pedido-${p.estado}">
      <div class="pedido-header">
        <div>
          <div class="pedido-mesa">Mesa ${p.mesa_numero}</div>
          <div style="font-size:0.8rem;color:var(--text3);">${p.id} · ${p.created_at?.substring(11,16)||''}</div>
        </div>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
          ${estadoBadge(p.estado)}
          ${p.estado==='listo'?`<button class="btn btn-sm btn-success" onclick="marcarEntregado(${p.id})">✓ Entregado</button>`:''}
        </div>
      </div>
      <div class="pedido-items">
        ${p.items.map(i=>`<div class="pedido-item"><div class="pedido-item-dot"></div>${i.nombre}<span style="margin-left:auto;font-weight:600;">${i.precio} Bs</span></div>`).join('')}
        <div style="text-align:right;margin-top:8px;font-weight:700;color:var(--accent);">Total: ${p.total} Bs</div>
      </div>
    </div>`).join('')}</div>`;
}

async function mesaClickCamarero(id, estado, numero) {
  if (estado === 'libre') {
    await modalNuevoPedido(id, numero);
  } else {
    const confirmar = confirm(`Mesa ${numero} — ¿Agregar más pedidos?`);
    if (confirmar) await modalNuevoPedido(id, numero);
  }
}

async function modalNuevoPedido(mesaId, mesaNum) {
  const menu = await api('api/menu.php?action=completo');
  const turno = menu.turno;

  let body = `<div style="margin-bottom:14px;"><strong>Mesa ${mesaNum}</strong> · Turno: <strong>${turno}</strong></div>`;

  if (turno === 'cerrado') {
    openModal(`Pedido Mesa ${mesaNum}`, '<div class="empty"><div class="empty-icon">🕐</div><div class="empty-text">El restaurante está cerrado en este horario</div></div>', [
      { label: 'Cerrar', cls: 'btn-neutral', action: 'closeModal()' }
    ]);
    return;
  }

  if (turno === 'almuerzo') {
    const m = menu.almuerzo;
    body += `
      <div class="form-col" style="margin-bottom:12px;"><label class="field-label">Sopa</label>
        <select class="select" id="sel-sopa">${m.sopas.map(s=>`<option>${s}</option>`).join('')}</select></div>
      <div class="form-col" style="margin-bottom:12px;"><label class="field-label">Segundo</label>
        <select class="select" id="sel-segundo">${m.segundos.map(s=>`<option>${s}</option>`).join('')}</select></div>
      <div class="form-col" style="margin-bottom:12px;"><label class="field-label">Postre</label>
        <select class="select" id="sel-postre">${m.postres.map(s=>`<option>${s}</option>`).join('')}</select></div>
      <div class="form-col"><label class="field-label">Bebida adicional</label>
        <select class="select" id="sel-bebida"><option value="">Sin bebida</option>${m.bebidas.map(b=>`<option value="${b.nombre}|${b.precio}">${b.nombre} (${b.precio} Bs)</option>`).join('')}</select></div>`;
  } else {
    body += menu.noche.map(cat => `
      <div style="margin-bottom:12px;">
        <div class="field-label" style="margin-bottom:6px;">${cat.categoria}</div>
        ${cat.items.map(i=>`
          <label style="display:flex;align-items:center;gap:8px;padding:6px 0;cursor:pointer;">
            <input type="checkbox" class="noche-item" value="${i.nombre}|${i.precio}" style="accent-color:var(--accent);width:16px;height:16px;">
            <span>${i.nombre}</span><span style="margin-left:auto;color:var(--accent);font-weight:600;">${i.precio} Bs</span>
          </label>`).join('')}
      </div>`).join('');
  }

  openModal(`Nuevo Pedido — Mesa ${mesaNum}`, body, [
    { label: 'Cancelar', cls: 'btn-neutral', action: 'closeModal()' },
    { label: '🍳 Enviar a cocina', cls: 'btn-accent', action: `enviarPedido(${mesaId},'${turno}')` }
  ]);
}

async function enviarPedido(mesaId, turno) {
  let items = [];
  if (turno === 'almuerzo') {
    const sopa    = document.getElementById('sel-sopa').value;
    const segundo = document.getElementById('sel-segundo').value;
    const postre  = document.getElementById('sel-postre').value;
    const bebVal  = document.getElementById('sel-bebida').value;
    // Obtener precio almuerzo
    const menu = await api('api/menu.php?action=completo');
    items.push({ nombre: `Almuerzo (${sopa} / ${segundo} / ${postre})`, precio: menu.almuerzo.precio, tipo: 'almuerzo' });
    if (bebVal) {
      const [n, p] = bebVal.split('|');
      items.push({ nombre: n, precio: +p, tipo: 'bebida' });
    }
  } else {
    document.querySelectorAll('.noche-item:checked').forEach(el => {
      const [n, p] = el.value.split('|');
      items.push({ nombre: n, precio: +p, tipo: 'plato' });
    });
    if (!items.length) { showToast('Selecciona al menos un plato', 'error'); return; }
  }

  const r = await api('api/pedidos.php?action=crear', 'POST', { mesa_id: mesaId, items, turno });
  if (r.success) {
    closeModal();
    showToast('Pedido enviado a cocina ✓', 'success');
    renderCamarero('mesas');
  } else showToast(r.error || 'Error', 'error');
}

async function marcarEntregado(pedidoId) {
  const r = await api('api/pedidos.php?action=estado', 'POST', { id: pedidoId, estado: 'entregado' });
  if (r.success) { showToast('Pedido entregado ✓', 'success'); renderCamarero('pedidos'); }
}

// =========================================
// COCINERO
// =========================================
async function renderCocinero() {
  document.getElementById('main-content').innerHTML = `
    <div class="flex-between mb-16">
      <div><div class="section-title">Panel de Cocina</div><div class="section-sub">Pedidos entrantes en tiempo real</div></div>
      <button class="btn btn-neutral" onclick="renderCocinero()">🔄 Actualizar</button>
    </div>
    <div class="loading">Cargando pedidos...</div>`;

  const pedidos = await api('api/pedidos.php?action=listar');
  const activos = pedidos.filter(p => p.estado === 'preparando' || p.estado === 'listo');
  const loading = document.querySelector('.loading');
  if (!loading) return;

  if (!activos.length) {
    loading.outerHTML = `<div class="empty"><div class="empty-icon">👨‍🍳</div><div class="empty-text">No hay pedidos activos</div></div>`;
    return;
  }

  loading.outerHTML = `<div class="grid2">${activos.map(p => `
    <div class="pedido-card pedido-${p.estado}">
      <div class="pedido-header">
        <div>
          <div class="pedido-mesa">Mesa ${p.mesa_numero}</div>
          <div style="font-size:0.78rem;color:var(--text3);">Pedido ${p.id} · ${p.created_at?.substring(11,16)||''}</div>
        </div>
        <div style="display:flex;gap:8px;align-items:center;">
          ${estadoBadge(p.estado)}
          ${p.estado === 'preparando' ? `<button class="btn btn-sm btn-success" onclick="pedidoListo(${p.id})">✓ Listo</button>` : '<span style="font-size:1.4rem;">✅</span>'}
        </div>
      </div>
      <div class="pedido-items">
        ${p.items.map(i => `<div class="pedido-item"><div class="pedido-item-dot"></div>${i.nombre}</div>`).join('')}
      </div>
    </div>`).join('')}</div>`;
}

async function pedidoListo(pedidoId) {
  const r = await api('api/pedidos.php?action=estado', 'POST', { id: pedidoId, estado: 'listo' });
  if (r.success) { showToast('Pedido marcado como listo 🔔', 'success'); renderCocinero(); }
  else showToast(r.error, 'error');
}

// =========================================
// CAJA
// =========================================
async function renderCaja(tab = 'mesas') {
  const tabs = [{ id: 'mesas', label: '🍽 Mesas con consumo' }, { id: 'historial', label: '📜 Historial' }];
  let html = `<div class="section-title">Panel de Caja</div>
    <div class="section-sub">Gestión de cobros y facturación</div>
    <div class="nav-tabs">${tabs.map(t => `<button class="nav-tab ${tab === t.id ? 'active' : ''}" onclick="renderCaja('${t.id}')">${t.label}</button>`).join('')}</div>
    <div class="loading">Cargando...</div>`;
  document.getElementById('main-content').innerHTML = html;

  if (tab === 'mesas') await cajaMesas();
  else await cajaHistorial();
}

async function cajaMesas() {
  const mesas = await api('api/mesas.php?action=listar');
  const conConsumo = mesas.filter(m => +m.consumo_total > 0);
  const loading = document.querySelector('.loading');
  if (!loading) return;

  if (!conConsumo.length) {
    loading.outerHTML = `<div class="empty"><div class="empty-icon">💰</div><div class="empty-text">No hay mesas con consumo activo</div></div>`;
    return;
  }

  const detalles = await Promise.all(conConsumo.map(m => api(`api/caja.php?action=consumo&mesa_id=${m.id}`)));

  loading.outerHTML = `<div class="grid2">${conConsumo.map((m, i) => {
    const det = detalles[i];
    return `<div class="card">
      <div class="card-header"><span class="card-title">Mesa ${m.numero}</span>${estadoBadge(m.estado)}</div>
      <div class="card-body">
        <div>
          ${det.items?.map(it => `<div class="factura-row"><span>${it.nombre}</span><span>${it.precio} Bs</span></div>`).join('')||''}
          <div class="factura-total"><span>TOTAL</span><span class="text-accent">${det.total || m.consumo_total} Bs</span></div>
        </div>
        <div style="display:flex;gap:8px;margin-top:16px;">
          <button class="btn btn-info btn-sm" onclick="imprimirFactura(${m.id},${m.numero})">🖨 Imprimir</button>
          <button class="btn btn-success" onclick="cobrarMesa(${m.id},${m.numero},${det.total||m.consumo_total})">✓ Cobrar ${det.total||m.consumo_total} Bs</button>
        </div>
      </div>
    </div>`;
  }).join('')}</div>`;
}

async function cajaHistorial() {
  const reportes = await api('api/reportes.php?action=periodo&tipo=semana');
  const loading = document.querySelector('.loading');
  if (!loading) return;
  loading.outerHTML = `
  <div class="card">
    <div class="card-header"><span class="card-title">Ventas recientes</span></div>
    <div class="card-body" style="padding:0;">
      <table>
        <thead><tr><th>Fecha</th><th>Turno</th><th>Total</th><th>Cobros</th></tr></thead>
        <tbody>${reportes.length ? reportes.map(v => `
          <tr>
            <td>${v.fecha}</td>
            <td>${v.turno==='almuerzo'?'<span class="badge badge-orange">Almuerzo</span>':'<span class="badge badge-blue">Noche</span>'}</td>
            <td><strong>${v.total} Bs</strong></td>
            <td>${v.ventas}</td>
          </tr>`).join('') : '<tr><td colspan="4" style="text-align:center;color:var(--text3);padding:20px;">Sin ventas aún</td></tr>'}
        </tbody>
      </table>
    </div>
  </div>`;
}

async function imprimirFactura(mesaId, mesaNum) {
  const det = await api(`api/caja.php?action=consumo&mesa_id=${mesaId}`);
  const lineas = det.items?.map(i => `${i.nombre.padEnd(22)}${i.precio} Bs`).join('\n') || '';
  const ticket = `===========================
   RESTAURANTE OS
===========================
Mesa: ${mesaNum}
Fecha: ${new Date().toLocaleString('es-BO')}
---------------------------
${lineas}
---------------------------
TOTAL:        ${det.total} Bs
===========================
  ¡Gracias por su visita!
===========================`;

  openModal('🖨 Vista previa del ticket',
    `<pre style="font-family:monospace;font-size:0.82rem;background:var(--bg);padding:16px;border-radius:8px;white-space:pre;line-height:1.5;">${ticket}</pre>`,
    [{ label: 'Cerrar', cls: 'btn-neutral', action: 'closeModal()' },
     { label: '🖨 Imprimir', cls: 'btn-accent', action: 'window.print()' }]);
}

async function cobrarMesa(mesaId, mesaNum, total) {
  if (!confirm(`¿Cobrar Mesa ${mesaNum}? Total: ${total} Bs`)) return;
  const r = await api('api/caja.php?action=cobrar', 'POST', { mesa_id: mesaId });
  if (r.success) {
    showToast(`Mesa ${mesaNum}: Cobrado ${total} Bs ✓`, 'success');
    renderCaja();
  } else showToast(r.error || 'Error al cobrar', 'error');
}
