// assets/app.js — RestaurantOS v2

// ============================================================
// UTILIDADES GLOBALES
// ============================================================
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
    `<button class="btn ${b.cls}" onclick="${b.action}">${b.label}</button>`).join('');
  document.getElementById('modal-overlay').classList.add('open');
}
function closeModal() { document.getElementById('modal-overlay').classList.remove('open'); }
document.getElementById('modal-overlay').addEventListener('click', e => { if (e.target === e.currentTarget) closeModal(); });

function estadoBadge(estado) {
  const map = {
    libre:'<span class="badge badge-green">Libre</span>',
    ocupada:'<span class="badge badge-yellow">Ocupada</span>',
    lista:'<span class="badge badge-orange">Lista ✓</span>',
    pagando:'<span class="badge badge-blue">Pagando</span>',
    preparando:'<span class="badge badge-yellow pulse">Preparando</span>',
    listo:'<span class="badge badge-green">Listo ✓</span>',
    entregado:'<span class="badge badge-blue">Entregado</span>',
    pagado:'<span class="badge badge-green">Pagado</span>',
  };
  return map[estado] || `<span class="badge">${estado}</span>`;
}

function categoriaLabel(cat) {
  return { sopa:'🍲 Sopa', segundo:'🍽 Segundo', postre:'🍮 Postre', noche:'🌙 Plato noche', bebida:'🥤 Bebida' }[cat] || cat;
}

async function logout() {
  await api('api/auth.php?action=logout', 'POST');
  window.location.href = 'index.php';
}

// ============================================================
// INIT
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  if (ROL === 'admin')         renderAdmin();
  else if (ROL === 'camarero') renderCamarero();
  else if (ROL === 'cocinero') renderCocinero();
  else if (ROL === 'caja')     renderCaja();
});

// ============================================================
// ADMINISTRADOR
// ============================================================
async function renderAdmin(tab = 'dashboard') {
  const tabs = [
    { id: 'dashboard', label: '📊 Dashboard' },
    { id: 'platos',    label: '🍴 Platos' },
    { id: 'menu',      label: '📅 Menú' },
    { id: 'mesas',     label: '🪑 Mesas' },
    { id: 'usuarios',  label: '👥 Usuarios' },
    { id: 'reportes',  label: '📈 Reportes' },
  ];
  document.getElementById('main-content').innerHTML =
    `<div class="section-title">Panel de Administrador</div>
     <div class="section-sub">Gestión completa del restaurante</div>
     <div class="nav-tabs">${tabs.map(t => `<button class="nav-tab ${tab === t.id ? 'active' : ''}" onclick="renderAdmin('${t.id}')">${t.label}</button>`).join('')}</div>
     <div id="tab-content"><div class="loading">Cargando...</div></div>`;

  if (tab === 'dashboard') await adminDashboard();
  else if (tab === 'platos')   await adminPlatos();
  else if (tab === 'menu')     await adminMenu();
  else if (tab === 'mesas')    await adminMesas();
  else if (tab === 'usuarios') await adminUsuarios();
  else if (tab === 'reportes') await adminReportes();
}

// --- DASHBOARD ---
async function adminDashboard() {
  const [mesas, rep] = await Promise.all([api('api/mesas.php?action=listar'), api('api/reportes.php?action=resumen')]);
  const ocupadas = mesas.filter(m => m.estado !== 'libre').length;
  document.getElementById('tab-content').innerHTML = `
    <div class="grid4 mb-16">
      <div class="stat-card"><div class="stat-label">Mesas activas</div><div class="stat-value">${ocupadas}</div><div class="stat-sub">de ${mesas.length}</div></div>
      <div class="stat-card"><div class="stat-label">Ventas hoy</div><div class="stat-value">${rep.total_dia||0} Bs</div><div class="stat-sub">${rep.ventas_dia||0} cobros</div></div>
      <div class="stat-card"><div class="stat-label">Almuerzo</div><div class="stat-value">${rep.almuerzo?.total||0} Bs</div></div>
      <div class="stat-card"><div class="stat-label">Noche</div><div class="stat-value">${rep.noche?.total||0} Bs</div></div>
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

// --- MESAS (gestión) ---
async function adminMesas() {
  const mesas = await api('api/mesas.php?action=listar');
  document.getElementById('tab-content').innerHTML = `
    <div class="card" style="max-width:700px;">
      <div class="card-header">
        <span class="card-title">🪑 Gestión de Mesas</span>
        <button class="btn btn-accent btn-sm" onclick="modalNuevaMesa()">+ Agregar Mesa</button>
      </div>
      <div style="overflow-x:auto;">
        <table>
          <thead><tr><th>Número</th><th>Estado</th><th>Consumo actual</th><th>Pedidos activos</th><th>Acción</th></tr></thead>
          <tbody>${mesas.map(m => `
            <tr>
              <td><strong>Mesa ${m.numero}</strong></td>
              <td>${estadoBadge(m.estado)}</td>
              <td>${+m.consumo_total > 0 ? `<strong class="text-accent">${m.consumo_total} Bs</strong>` : '—'}</td>
              <td>${+m.pedidos_activos > 0 ? `<span class="badge badge-yellow">${m.pedidos_activos}</span>` : '—'}</td>
              <td>
                ${m.estado === 'libre' && +m.pedidos_activos === 0
                  ? `<button class="btn btn-sm btn-danger" onclick="eliminarMesa(${m.id}, ${m.numero})">Eliminar</button>`
                  : `<span class="text-muted" style="font-size:.8rem;">En uso</span>`}
              </td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>`;
}

function modalNuevaMesa() {
  openModal('Nueva Mesa',
    `<div class="form-col"><label class="field-label">Número de mesa</label>
     <input class="input" type="number" id="mesa-num" placeholder="Ej: 11" min="1"/></div>`,
    [{ label: 'Cancelar', cls: 'btn-neutral', action: 'closeModal()' },
     { label: 'Agregar Mesa', cls: 'btn-accent', action: 'crearMesa()' }]);
}

async function crearMesa() {
  const numero = +document.getElementById('mesa-num').value;
  if (!numero || numero < 1) return showToast('Ingresa un número válido', 'error');
  const r = await api('api/mesas.php?action=crear', 'POST', { numero });
  if (r.success) { closeModal(); showToast(`Mesa ${numero} creada ✓`, 'success'); renderAdmin('mesas'); }
  else showToast(r.error || 'Error', 'error');
}

async function eliminarMesa(id, numero) {
  if (!confirm(`¿Eliminar la Mesa ${numero}?`)) return;
  const r = await api('api/mesas.php?action=eliminar', 'POST', { id });
  if (r.success) { showToast(`Mesa ${numero} eliminada ✓`, 'success'); renderAdmin('mesas'); }
  else showToast(r.error || 'Error', 'error');
}

// --- PLATOS ---
async function adminPlatos(filtro = 'todos') {
  const platos = await api('api/platos.php?action=listar');
  const precioRes = await api('api/platos.php?action=menu_qr');
  const precioAlmuerzo = precioRes.almuerzo?.precio ?? 20;

  const cats = [
    { id: 'todos', label: 'Todos' },
    { id: 'sopa', label: '🍲 Sopas' },
    { id: 'segundo', label: '🍽 Segundos' },
    { id: 'postre', label: '🍮 Postres' },
    { id: 'noche', label: '🌙 Platos noche' },
    { id: 'bebida', label: '🥤 Bebidas' },
  ];

  const filtrados = filtro === 'todos' ? platos : platos.filter(p => p.categoria === filtro);

  document.getElementById('tab-content').innerHTML = `
    <div class="flex-between mb-16">
      <div style="display:flex;gap:8px;align-items:center;">
        <div style="font-size:.85rem;font-weight:600;color:var(--text2);">Precio almuerzo:</div>
        <input class="input" type="number" id="precio-alm" value="${precioAlmuerzo}" style="width:90px;padding:7px 10px;"/>
        <button class="btn btn-accent btn-sm" onclick="guardarPrecioAlmuerzo()">Guardar</button>
      </div>
      <button class="btn btn-accent" onclick="modalNuevoPlato()">+ Nuevo Plato</button>
    </div>
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:16px;">
      ${cats.map(c => `<button class="btn btn-sm ${filtro===c.id?'btn-accent':'btn-neutral'}" onclick="adminPlatos('${c.id}')">${c.label}</button>`).join('')}
    </div>
    ${filtrados.length === 0
      ? '<div class="empty"><div class="empty-icon">🍽</div><div class="empty-text">Sin platos en esta categoría</div></div>'
      : `<div class="grid3">${filtrados.map(p => platoCarta(p, true)).join('')}</div>`}`;
}

function platoCarta(p, esAdmin = false) {
  const agotadoClass = p.agotado == 1 ? 'plato-agotado-overlay' : '';
  const agotadoTag   = p.agotado == 1 ? '<span class="badge badge-red" style="font-size:.72rem;">Agotado</span>' : '';
  const img = p.imagen_url
    ? `<img class="plato-admin-img" src="${p.imagen_url}" alt="" onerror="this.style.display='none';this.nextSibling.style.display='flex'">`
    : '';
  const placeholder = `<div class="plato-admin-img-placeholder" ${p.imagen_url?'style="display:none"':''}>${categoriaEmoji(p.categoria)}</div>`;

  return `<div class="plato-admin-card ${agotadoClass}">
    ${img}${placeholder}
    <div class="plato-admin-body">
      <div class="flex-between mb-8">
        <span class="badge badge-gray" style="font-size:.72rem;">${categoriaLabel(p.categoria)}</span>
        ${agotadoTag}
      </div>
      <div class="plato-admin-nombre">${p.nombre}</div>
      ${p.descripcion ? `<div class="plato-admin-desc">${p.descripcion}</div>` : ''}
    </div>
    <div class="plato-admin-footer">
      <span class="plato-precio">${p.precio > 0 ? p.precio + ' Bs' : 'Incluido'}</span>
      ${esAdmin ? `<div style="display:flex;gap:6px;">
        <button class="btn btn-xs btn-info" onclick="modalEditarPlato(${JSON.stringify(p).replace(/"/g,'&quot;')})">✏</button>
        <button class="btn btn-xs btn-danger" onclick="eliminarPlato(${p.id})">✕</button>
      </div>` : ''}
    </div>
  </div>`;
}

function categoriaEmoji(cat) {
  return { sopa:'🍲', segundo:'🍽', postre:'🍮', noche:'🌙', bebida:'🥤' }[cat] || '🍴';
}

function modalNuevoPlato() {
  openModal('Nuevo Plato', platosForm({}), [
    { label: 'Cancelar', cls: 'btn-neutral', action: 'closeModal()' },
    { label: 'Crear Plato', cls: 'btn-accent', action: "guardarPlato(null)" }
  ]);
}

function modalEditarPlato(p) {
  openModal('Editar Plato', platosForm(p), [
    { label: 'Cancelar', cls: 'btn-neutral', action: 'closeModal()' },
    { label: 'Guardar', cls: 'btn-accent', action: `guardarPlato(${p.id})` },
    { label: 'Eliminar', cls: 'btn-danger', action: `eliminarPlato(${p.id})` }
  ]);
}

function platosForm(p) {
  return `
    <div class="form-col mb-16"><label class="field-label">Nombre del plato</label>
      <input class="input" id="p-nombre" value="${p.nombre||''}" placeholder="Ej: Sopa de maní"/></div>
    <div class="form-col mb-16"><label class="field-label">Descripción</label>
      <textarea class="textarea" id="p-desc" placeholder="Descripción breve del plato...">${p.descripcion||''}</textarea></div>
    <div class="form-row">
      <div class="form-col"><label class="field-label">Categoría</label>
        <select class="select" id="p-cat">
          <option value="sopa"    ${p.categoria==='sopa'   ?'selected':''}>🍲 Sopa</option>
          <option value="segundo" ${p.categoria==='segundo'?'selected':''}>🍽 Segundo</option>
          <option value="postre"  ${p.categoria==='postre' ?'selected':''}>🍮 Postre</option>
          <option value="noche"   ${p.categoria==='noche'  ?'selected':''}>🌙 Plato noche</option>
          <option value="bebida"  ${p.categoria==='bebida' ?'selected':''}>🥤 Bebida</option>
        </select></div>
      <div class="form-col"><label class="field-label">Precio (Bs)</label>
        <input class="input" type="number" id="p-precio" value="${p.precio||0}"/></div>
    </div>
    <div class="form-col mt-12">
      <label class="field-label">Imagen del plato</label>
      <div style="display:flex;gap:10px;margin-bottom:8px;">
        <button type="button" class="btn btn-sm btn-neutral" onclick="document.getElementById('p-file').click()">📁 Subir desde dispositivo</button>
        <span style="font-size:.8rem;color:var(--text3);align-self:center;">o pega una URL:</span>
      </div>
      <input type="file" id="p-file" accept="image/*" style="display:none" onchange="subirImagenPlato(this)"/>
      <input class="input" id="p-img" value="${p.imagen_url||''}" placeholder="https://... (URL de imagen)" oninput="previewImg(this.value)"/>
      <div id="upload-progress" style="display:none;font-size:.8rem;color:var(--text2);margin-top:6px;">⏳ Subiendo imagen...</div>
      ${p.imagen_url ? `<img id="img-preview" class="img-preview" src="${p.imagen_url}" style="display:block"/>` : `<img id="img-preview" class="img-preview"/>`}
    </div>`;
}

async function subirImagenPlato(input) {
  const file = input.files[0];
  if (!file) return;
  const progress = document.getElementById('upload-progress');
  if (progress) progress.style.display = 'block';
  const formData = new FormData();
  formData.append('imagen', file);
  try {
    const res  = await fetch('api/upload.php', { method: 'POST', body: formData });
    const data = await res.json();
    if (data.success) {
      document.getElementById('p-img').value = data.url;
      previewImg(data.url);
      showToast('Imagen subida ✓', 'success');
    } else {
      showToast(data.error || 'Error al subir imagen', 'error');
    }
  } catch(e) {
    showToast('Error de conexión', 'error');
  } finally {
    if (progress) progress.style.display = 'none';
  }
}

function previewImg(url) {
  const el = document.getElementById('img-preview');
  if (!el) return;
  if (url) { el.src = url; el.style.display = 'block'; }
  else el.style.display = 'none';
}

async function guardarPlato(id) {
  const nombre      = document.getElementById('p-nombre').value.trim();
  const descripcion = document.getElementById('p-desc').value.trim();
  const categoria   = document.getElementById('p-cat').value;
  const precio      = +document.getElementById('p-precio').value;
  const imagen_url  = document.getElementById('p-img').value.trim();
  if (!nombre) return showToast('El nombre es requerido', 'error');

  if (id) {
    const r = await api('api/platos.php?action=actualizar', 'POST', { id, nombre, descripcion, categoria, precio, imagen_url, agotado: 0 });
    if (r.success) { closeModal(); showToast('Plato actualizado ✓', 'success'); adminPlatos(); }
    else showToast(r.error || 'Error', 'error');
  } else {
    const r = await api('api/platos.php?action=crear', 'POST', { nombre, descripcion, categoria, precio, imagen_url });
    if (r.success) { closeModal(); showToast('Plato creado ✓', 'success'); adminPlatos(); }
    else showToast(r.error || 'Error', 'error');
  }
}

async function eliminarPlato(id) {
  if (!confirm('¿Eliminar este plato?')) return;
  const r = await api('api/platos.php?action=eliminar', 'POST', { id });
  if (r.success) { closeModal(); showToast('Plato eliminado ✓', 'success'); adminPlatos(); }
}

async function guardarPrecioAlmuerzo() {
  const precio = +document.getElementById('precio-alm').value;
  const r = await api('api/platos.php?action=precio_almuerzo', 'POST', { precio });
  r.success ? showToast('Precio actualizado ✓', 'success') : showToast(r.error, 'error');
}

// --- MENÚ (planificación diaria) ---
async function adminMenu() {
  const semana = await api('api/platos.php?action=menu_semana');
  const hoy    = new Date().toISOString().split('T')[0];

  document.getElementById('tab-content').innerHTML = `
    <div class="grid2">
      <div class="card">
        <div class="card-header"><span class="card-title">📅 Planificar menú por día</span></div>
        <div class="card-body">
          <div class="form-col mb-16">
            <label class="field-label">Fecha (solo hoy o fechas futuras)</label>
            <input class="input" type="date" id="planner-fecha" value="${hoy}" min="${hoy}" onchange="cargarPlannerDia()"/>
          </div>
          <div id="planner-content"><div class="loading">Cargando...</div></div>
          <div style="margin-top:16px;display:flex;gap:8px;">
            <button class="btn btn-accent" onclick="guardarPlanDia()">💾 Guardar menú del día</button>
            <button class="btn btn-neutral" onclick="limpiarPlanDia()">Limpiar</button>
          </div>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><span class="card-title">📆 Menús planificados</span></div>
        <div class="card-body" style="padding:0;">
          <table>
            <thead><tr><th>Fecha</th><th>Platos</th><th>Acción</th></tr></thead>
            <tbody>${semana.length
              ? semana.map(s => `<tr>
                  <td>${s.fecha}</td>
                  <td>${s.total} platos</td>
                  <td><button class="btn btn-xs btn-info" onclick="editarPlanFecha('${s.fecha}')">Editar</button></td>
                </tr>`).join('')
              : '<tr><td colspan="3" style="text-align:center;color:var(--text3);padding:20px;">Sin menús planificados</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    </div>`;

  cargarPlannerDia();
}

function editarPlanFecha(fecha) {
  const input = document.getElementById('planner-fecha');
  if (input) { input.value = fecha; input.min = ''; cargarPlannerDia(); }
}

let _todosPlatos = [];

async function cargarPlannerDia() {
  const fecha = document.getElementById('planner-fecha')?.value;
  if (!fecha) return;
  document.getElementById('planner-content').innerHTML = '<div class="loading">Cargando platos...</div>';

  const [todosPlatos, planDia] = await Promise.all([
    api('api/platos.php?action=listar'),
    api(`api/platos.php?action=menu_dia_get&fecha=${fecha}`)
  ]);
  _todosPlatos = todosPlatos;
  const planIds = new Set(planDia.map(p => String(p.plato_id)));

  const secciones = [
    { key: 'sopa',    label: '🍲 Sopas',       turno: 'almuerzo', precheck: false },
    { key: 'segundo', label: '🍽 Segundos',     turno: 'almuerzo', precheck: false },
    { key: 'postre',  label: '🍮 Postres',      turno: 'almuerzo', precheck: false },
    { key: 'noche',   label: '🌙 Platos noche', turno: 'noche',    precheck: true },
    { key: 'bebida',  label: '🥤 Bebidas',      turno: 'noche',    precheck: true },
  ];

  let html = '';
  for (const sec of secciones) {
    const items = todosPlatos.filter(p => p.categoria === sec.key);
    if (!items.length) continue;
    // Si hay plan guardado, usar ese; si no, usar precheck
    const esPlanNuevo = planIds.size === 0;
    html += `
      <div style="margin-bottom:14px;">
        <div class="field-label" style="margin-bottom:6px;">${sec.label}</div>
        <div style="max-height:160px;overflow-y:auto;border:1px solid var(--border);border-radius:8px;padding:4px 0;">
          ${items.map(p => {
            const checked = planIds.has(String(p.id)) || (esPlanNuevo && sec.precheck);
            return `<label style="display:flex;align-items:center;gap:8px;padding:8px 12px;cursor:pointer;transition:background .15s;" onmouseover="this.style.background='var(--bg)'" onmouseout="this.style.background=''">
              <input type="checkbox" class="plan-check" data-id="${p.id}" data-turno="${sec.turno}" ${checked?'checked':''} style="accent-color:var(--accent);width:15px;height:15px;flex-shrink:0;">
              <span style="font-size:.88rem;font-weight:500;">${p.nombre}</span>
              ${p.agotado?'<span class="badge badge-red" style="font-size:.68rem;margin-left:auto;">Agotado</span>':''}
            </label>`;
          }).join('')}
        </div>
      </div>`;
  }
  document.getElementById('planner-content').innerHTML = html || '<div class="empty-text">Sin platos en el catálogo</div>';
}

async function guardarPlanDia() {
  const fecha = document.getElementById('planner-fecha').value;
  const checks = document.querySelectorAll('.plan-check:checked');
  const platos = Array.from(checks).map(c => ({ plato_id: +c.dataset.id, turno: c.dataset.turno }));

  const r = await api('api/platos.php?action=menu_dia_set', 'POST', { fecha, platos });
  if (r.success) { showToast(`Menú del ${fecha} guardado ✓`, 'success'); adminMenu(); }
  else showToast(r.error || 'Error', 'error');
}

function limpiarPlanDia() {
  document.querySelectorAll('.plan-check').forEach(c => c.checked = false);
}

// --- HORARIOS ---
async function adminHorarios() {
  const horarios = await api('api/horarios.php?action=get');
  const h = {};
  horarios.forEach(x => h[x.turno] = x);

  document.getElementById('tab-content').innerHTML = `
    <div class="card" style="max-width:600px;">
      <div class="card-header"><span class="card-title">🕐 Configuración de Horarios</span></div>
      <div class="card-body">
        <p style="font-size:.88rem;color:var(--text2);margin-bottom:20px;">Define en qué horas del día se activa cada turno. Usa formato 24h (0–23).</p>
        <div class="horario-row">
          <span class="horario-label">🌞 Almuerzo</span>
          <span style="font-size:.85rem;color:var(--text3);">De</span>
          <input class="input horario-input" type="number" min="0" max="23" id="alm-ini" value="${h.almuerzo?.hora_inicio??11}"/>
          <span style="font-size:.85rem;color:var(--text3);">hasta</span>
          <input class="input horario-input" type="number" min="0" max="23" id="alm-fin" value="${h.almuerzo?.hora_fin??16}"/>
          <span style="font-size:.82rem;color:var(--text3);">hrs</span>
          <button class="btn btn-accent btn-sm" onclick="guardarHorario('almuerzo')">Guardar</button>
        </div>
        <div class="horario-row">
          <span class="horario-label">🌙 Noche</span>
          <span style="font-size:.85rem;color:var(--text3);">De</span>
          <input class="input horario-input" type="number" min="0" max="23" id="noc-ini" value="${h.noche?.hora_inicio??18}"/>
          <span style="font-size:.85rem;color:var(--text3);">hasta</span>
          <input class="input horario-input" type="number" min="0" max="23" id="noc-fin" value="${h.noche?.hora_fin??23}"/>
          <span style="font-size:.82rem;color:var(--text3);">hrs</span>
          <button class="btn btn-accent btn-sm" onclick="guardarHorario('noche')">Guardar</button>
        </div>
        <div style="margin-top:16px;padding:12px;background:var(--yellow-bg);border-radius:8px;font-size:.82rem;color:var(--yellow);">
          ⚠ Los cambios afectan inmediatamente al sistema (qué menú se muestra en el QR, qué turno registran los pedidos).
        </div>
      </div>
    </div>`;
}

async function guardarHorario(turno) {
  const ini = +(document.getElementById(`${turno==='almuerzo'?'alm':'noc'}-ini`).value);
  const fin = +(document.getElementById(`${turno==='almuerzo'?'alm':'noc'}-fin`).value);
  const r = await api('api/horarios.php?action=actualizar', 'POST', { turno, hora_inicio: ini, hora_fin: fin });
  r.success ? showToast(`Horario de ${turno} actualizado ✓`, 'success') : showToast(r.error, 'error');
}

// --- USUARIOS ---
async function adminUsuarios() {
  const usuarios = await api('api/usuarios.php?action=listar');
  document.getElementById('tab-content').innerHTML = `
    <div class="card">
      <div class="card-header">
        <span class="card-title">Gestión de Usuarios</span>
        <button class="btn btn-accent btn-sm" onclick="modalNuevoUsuario()">+ Nuevo Usuario</button>
      </div>
      <div style="overflow-x:auto;">
        <table>
          <thead><tr><th>Nombre</th><th>Apellido</th><th>Teléfono</th><th>Usuario</th><th>Rol</th><th>Estado</th><th>Acciones</th></tr></thead>
          <tbody>${usuarios.map(u => `
            <tr>
              <td>${u.nombre}</td>
              <td>${u.apellido||'—'}</td>
              <td>${u.telefono||'—'}</td>
              <td><code style="background:var(--bg);padding:2px 8px;border-radius:5px;font-size:.82rem;">${u.usuario}</code></td>
              <td><span class="role-badge role-${u.rol}">${u.rol}</span></td>
              <td>${u.activo==1?'<span class="badge badge-green">Activo</span>':'<span class="badge badge-red">Inactivo</span>'}</td>
              <td style="display:flex;gap:6px;flex-wrap:wrap;">
                <button class="btn btn-sm btn-info" onclick='modalEditarUsuario(${JSON.stringify(u).replace(/'/g,"&#39;")})'>Editar</button>
                <button class="btn btn-sm btn-warning" onclick="toggleUsuario(${u.id},${u.activo})">${u.activo==1?'Desactivar':'Activar'}</button>
                <button class="btn btn-sm btn-danger" onclick="eliminarUsuario(${u.id})">Eliminar</button>
              </td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>`;
}

function modalNuevoUsuario() {
  openModal('Nuevo Usuario', usuarioForm({}), [
    { label: 'Cancelar', cls: 'btn-neutral', action: 'closeModal()' },
    { label: 'Crear Usuario', cls: 'btn-accent', action: 'guardarUsuario(null)' }
  ]);
}

function modalEditarUsuario(u) {
  openModal('Editar Usuario', usuarioForm(u), [
    { label: 'Cancelar', cls: 'btn-neutral', action: 'closeModal()' },
    { label: 'Guardar', cls: 'btn-accent', action: `guardarUsuario(${u.id})` }
  ]);
}

function usuarioForm(u) {
  return `
    <div class="form-row">
      <div class="form-col"><label class="field-label">Nombre</label><input class="input" id="u-nombre" value="${u.nombre||''}" placeholder="Nombre"/></div>
      <div class="form-col"><label class="field-label">Apellido</label><input class="input" id="u-apellido" value="${u.apellido||''}" placeholder="Apellido"/></div>
    </div>
    <div class="form-row mt-12">
      <div class="form-col"><label class="field-label">Teléfono</label><input class="input" id="u-telefono" value="${u.telefono||''}" placeholder="7XXXXXXX"/></div>
      <div class="form-col"><label class="field-label">Rol</label>
        <select class="select" id="u-rol">
          <option value="camarero" ${u.rol==='camarero'?'selected':''}>🧑‍💼 Camarero</option>
          <option value="cocinero" ${u.rol==='cocinero'?'selected':''}>👨‍🍳 Cocinero</option>
          <option value="caja"     ${u.rol==='caja'?'selected':''}>💰 Caja</option>
          <option value="admin"    ${u.rol==='admin'?'selected':''}>👑 Admin</option>
        </select></div>
    </div>
    <div class="form-row mt-12">
      <div class="form-col"><label class="field-label">Usuario</label><input class="input" id="u-usuario" value="${u.usuario||''}" placeholder="usuario" ${u.id?'readonly style="opacity:.6"':''}"/></div>
      <div class="form-col"><label class="field-label">${u.id?'Nueva contraseña (vacío = sin cambio)':'Contraseña'}</label><input class="input" type="password" id="u-pass" placeholder="contraseña"/></div>
    </div>`;
}

async function guardarUsuario(id) {
  const nombre   = document.getElementById('u-nombre').value.trim();
  const apellido = document.getElementById('u-apellido').value.trim();
  const telefono = document.getElementById('u-telefono').value.trim();
  const usuario  = document.getElementById('u-usuario').value.trim();
  const password = document.getElementById('u-pass').value;
  const rol      = document.getElementById('u-rol').value;

  if (!nombre) return showToast('El nombre es requerido', 'error');

  if (id) {
    const r = await api('api/usuarios.php?action=actualizar', 'POST', { id, nombre, apellido, telefono, rol, password });
    if (r.success) { closeModal(); showToast('Usuario actualizado ✓', 'success'); adminUsuarios(); }
    else showToast(r.error || 'Error', 'error');
  } else {
    if (!usuario || !password) return showToast('Usuario y contraseña son requeridos', 'error');
    const r = await api('api/usuarios.php?action=crear', 'POST', { nombre, apellido, telefono, usuario, password, rol });
    if (r.success) { closeModal(); showToast('Usuario creado ✓', 'success'); adminUsuarios(); }
    else showToast(r.error || 'Error', 'error');
  }
}

async function toggleUsuario(id, activo) {
  const r = await api('api/usuarios.php?action=actualizar', 'POST', { id, activo: activo==1?0:1 });
  if (r.success) { showToast('Estado cambiado ✓', 'success'); adminUsuarios(); }
}

async function eliminarUsuario(id) {
  if (!confirm('¿Eliminar este usuario?')) return;
  const r = await api('api/usuarios.php?action=eliminar', 'POST', { id });
  if (r.success) { showToast('Eliminado ✓', 'success'); adminUsuarios(); }
  else showToast(r.error, 'error');
}

// --- REPORTES ---
async function adminReportes() {
  const [resumen, platos, bebidas, periodo] = await Promise.all([
    api('api/reportes.php?action=resumen'),
    api('api/reportes.php?action=platos'),
    api('api/reportes.php?action=bebidas'),
    api('api/reportes.php?action=periodo&tipo=semana'),
  ]);
  const maxP = Math.max(...platos.map(p => +p.cantidad), 1);
  const maxB = Math.max(...bebidas.map(b => +b.cantidad), 1);

  document.getElementById('tab-content').innerHTML = `
    <div class="grid4 mb-16">
      <div class="stat-card"><div class="stat-label">Total hoy</div><div class="stat-value">${resumen.total_dia||0} Bs</div></div>
      <div class="stat-card"><div class="stat-label">Ventas</div><div class="stat-value">${resumen.ventas_dia||0}</div></div>
      <div class="stat-card"><div class="stat-label">Almuerzo</div><div class="stat-value">${resumen.almuerzo?.total||0} Bs</div></div>
      <div class="stat-card"><div class="stat-label">Noche</div><div class="stat-value">${resumen.noche?.total||0} Bs</div></div>
    </div>
    <div class="grid2">
      <div class="card">
        <div class="card-header"><span class="card-title">🍽 Más vendidos</span></div>
        <div class="card-body">
          ${platos.length ? platos.map(p => `
            <div class="chart-bar-row">
              <div class="chart-bar-label">${p.nombre}</div>
              <div class="chart-bar-track"><div class="chart-bar-fill" style="width:${(+p.cantidad/maxP*100).toFixed(0)}%"></div></div>
              <div class="chart-bar-value">${p.cantidad}</div>
            </div>`).join('') : '<div class="text-muted" style="font-size:.88rem;">Sin datos</div>'}
        </div>
      </div>
      <div class="card">
        <div class="card-header"><span class="card-title">🥤 Bebidas</span></div>
        <div class="card-body">
          ${bebidas.length ? bebidas.map(b => `
            <div class="chart-bar-row">
              <div class="chart-bar-label">${b.nombre}</div>
              <div class="chart-bar-track"><div class="chart-bar-fill" style="width:${(+b.cantidad/maxB*100).toFixed(0)}%;background:var(--blue)"></div></div>
              <div class="chart-bar-value">${b.cantidad}</div>
            </div>`).join('') : '<div class="text-muted" style="font-size:.88rem;">Sin datos</div>'}
        </div>
      </div>
    </div>
    <div class="card mt-16">
      <div class="card-header"><span class="card-title">Ventas recientes</span></div>
      <div style="overflow-x:auto;">
        <table>
          <thead><tr><th>Fecha</th><th>Turno</th><th>Total</th><th>Cobros</th></tr></thead>
          <tbody>${periodo.length ? periodo.map(v => `
            <tr>
              <td>${v.fecha}</td>
              <td>${v.turno==='almuerzo'?'<span class="badge badge-orange">Almuerzo</span>':'<span class="badge badge-blue">Noche</span>'}</td>
              <td><strong>${v.total} Bs</strong></td>
              <td>${v.ventas}</td>
            </tr>`).join('') : '<tr><td colspan="4" style="text-align:center;color:var(--text3);padding:20px;">Sin ventas registradas</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>`;
}

// ============================================================
// CAMARERO
// ============================================================
async function renderCamarero(tab = 'mesas') {
  const tabs = [{ id: 'mesas', label: '🍽 Mesas' }, { id: 'pedidos', label: '📋 Pedidos activos' }];
  document.getElementById('main-content').innerHTML =
    `<div class="section-title">Panel de Camarero</div>
     <div class="section-sub">Gestiona mesas y pedidos</div>
     <div class="nav-tabs">${tabs.map(t => `<button class="nav-tab ${tab===t.id?'active':''}" onclick="renderCamarero('${t.id}')">${t.label}</button>`).join('')}</div>
     <div id="tab-content"><div class="loading">Cargando...</div></div>`;

  if (tab === 'mesas')   await camareroMesas();
  else                   await camareroPedidos();
}

async function camareroMesas() {
  const mesas = await api('api/mesas.php?action=listar');
  document.getElementById('tab-content').innerHTML = `
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;">
      <span class="badge badge-green">🟢 Libre</span>
      <span class="badge badge-yellow">🟡 Ocupada</span>
      <span class="badge badge-orange">🟠 Lista</span>
    </div>
    <div class="mesas-grid">${mesas.map(m => `
      <div class="mesa-card mesa-${m.estado}" onclick="mesaClickCamarero(${m.id},'${m.estado}',${m.numero})">
        <div class="mesa-icon">${m.estado==='libre'?'⬜':m.estado==='ocupada'?'🟡':m.estado==='lista'?'✅':'💳'}</div>
        <div class="mesa-num">Mesa ${m.numero}</div>
        <div class="mesa-estado">${m.estado}</div>
        ${+m.consumo_total>0?`<div style="font-size:.75rem;margin-top:4px;font-weight:700;">${m.consumo_total} Bs</div>`:''}
      </div>`).join('')}
    </div>`;
}

async function camareroPedidos() {
  const pedidos = await api('api/pedidos.php?action=listar');
  if (!pedidos.length) {
    document.getElementById('tab-content').innerHTML = '<div class="empty"><div class="empty-icon">📋</div><div class="empty-text">Sin pedidos activos</div></div>';
    return;
  }
  document.getElementById('tab-content').innerHTML = `<div class="grid2">${pedidos.map(p => `
    <div class="pedido-card pedido-${p.estado}">
      <div class="pedido-header">
        <div><div class="pedido-mesa">Mesa ${p.mesa_numero}</div><div style="font-size:.78rem;color:var(--text3);">${p.id} · ${p.created_at?.substring(11,16)||''}</div></div>
        <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">
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
  await modalNuevoPedidoCamarero(id, numero);
}

async function modalNuevoPedidoCamarero(mesaId, mesaNum) {
  const menu  = await api('api/platos.php?action=menu_qr');
  const turno = menu.turno; // 'almuerzo' o 'noche' (nunca 'cerrado' con el nuevo getTurno)
  const a = menu.almuerzo;
  const n = menu.noche;

  let body = `
    <div style="margin-bottom:14px;font-size:.9rem;"><strong>Mesa ${mesaNum}</strong></div>
    <div class="form-col mb-16">
      <label class="field-label">Turno</label>
      <select class="select" id="sel-turno" onchange="actualizarFormPedido(${mesaId})">
        <option value="almuerzo" ${turno==='almuerzo'?'selected':''}>🌞 Almuerzo</option>
        <option value="noche"    ${turno==='noche'   ?'selected':''}>🌙 Noche</option>
      </select>
    </div>
    <div id="pedido-form-content"></div>`;

  openModal(`Pedido — Mesa ${mesaNum}`, body, [
    { label: 'Cancelar', cls: 'btn-neutral', action: 'closeModal()' },
    { label: '🍳 Enviar a cocina', cls: 'btn-accent', action: `enviarPedidoModal(${mesaId},${a.precio||20})` }
  ]);

  // Guardar menú globalmente para el form dinámico
  window._menuActual = menu;
  actualizarFormPedido(mesaId);
}

function actualizarFormPedido(mesaId) {
  const turno = document.getElementById('sel-turno')?.value;
  const menu  = window._menuActual;
  if (!menu) return;
  const a = menu.almuerzo;
  const n = menu.noche;
  const container = document.getElementById('pedido-form-content');
  if (!container) return;

  if (turno === 'almuerzo') {
    const sopas    = a.sopas?.filter(p => !p.agotado) || [];
    const segundos = a.segundos?.filter(p => !p.agotado) || [];
    const postres  = a.postres?.filter(p => !p.agotado) || [];
    const bebidas  = a.bebidas || [];
    container.innerHTML = `
      <div class="form-col mb-12"><label class="field-label">🍲 Sopa</label>
        <select class="select" id="sel-sopa">${sopas.map(s=>`<option value="${s.nombre}">${s.nombre}</option>`).join('')||'<option>Sin sopas disponibles</option>'}</select></div>
      <div class="form-col mb-12"><label class="field-label">🍽 Segundo</label>
        <select class="select" id="sel-segundo">${segundos.map(s=>`<option value="${s.nombre}">${s.nombre}</option>`).join('')||'<option>Sin segundos disponibles</option>'}</select></div>
      <div class="form-col mb-12"><label class="field-label">🍮 Postre</label>
        <select class="select" id="sel-postre">${postres.map(s=>`<option value="${s.nombre}">${s.nombre}</option>`).join('')||'<option>Sin postres disponibles</option>'}</select></div>
      <div class="form-col"><label class="field-label">🥤 Bebida adicional</label>
        <select class="select" id="sel-bebida"><option value="">Sin bebida</option>${bebidas.map(b=>`<option value="${b.nombre}|${b.precio}">${b.nombre} (+${b.precio} Bs)</option>`).join('')}</select></div>`;
  } else {
    const platos = [...(n.platos||[]), ...(n.bebidas||[])];
    container.innerHTML = platos.length
      ? `<div style="max-height:260px;overflow-y:auto;border:1px solid var(--border);border-radius:8px;">
          ${platos.map(p => `
            <label style="display:flex;align-items:center;gap:10px;padding:10px 12px;cursor:pointer;border-bottom:1px solid var(--border);">
              <input type="checkbox" class="noche-item" value="${p.nombre}|${p.precio}" ${p.agotado?'disabled':''} style="accent-color:var(--accent);width:16px;height:16px;">
              <span style="${p.agotado?'color:var(--text3);text-decoration:line-through;':''}">${p.nombre}</span>
              <span style="margin-left:auto;color:var(--accent);font-weight:600;">${p.precio} Bs</span>
              ${p.agotado?'<span class="badge badge-red" style="font-size:.7rem;">Agotado</span>':''}
            </label>`).join('')}
        </div>`
      : '<div class="empty-text">Sin platos en el menú de hoy</div>';
  }
}

async function enviarPedidoModal(mesaId, precioAlmuerzo) {
  const turno = document.getElementById('sel-turno')?.value || 'almuerzo';
  await enviarPedido(mesaId, turno, precioAlmuerzo);
}

async function enviarPedido(mesaId, turno, precioAlmuerzo) {
  let items = [];
  if (turno === 'almuerzo') {
    const sopa    = document.getElementById('sel-sopa')?.value;
    const segundo = document.getElementById('sel-segundo')?.value;
    const postre  = document.getElementById('sel-postre')?.value;
    const bebVal  = document.getElementById('sel-bebida')?.value;
    if (!sopa) return showToast('Selecciona las opciones', 'error');
    items.push({ nombre: `Almuerzo (${sopa} / ${segundo} / ${postre})`, precio: precioAlmuerzo, tipo: 'almuerzo' });
    if (bebVal) { const [n,p] = bebVal.split('|'); items.push({ nombre: n, precio: +p, tipo: 'bebida' }); }
  } else {
    document.querySelectorAll('.noche-item:checked').forEach(el => {
      const [n,p] = el.value.split('|');
      items.push({ nombre: n, precio: +p, tipo: 'plato' });
    });
    if (!items.length) return showToast('Selecciona al menos un plato', 'error');
  }

  const r = await api('api/pedidos.php?action=crear', 'POST', { mesa_id: mesaId, items, turno });
  if (r.success) { closeModal(); showToast('Pedido enviado ✓', 'success'); renderCamarero('mesas'); }
  else showToast(r.error || 'Error', 'error');
}

async function marcarEntregado(pedidoId) {
  const r = await api('api/pedidos.php?action=estado', 'POST', { id: pedidoId, estado: 'entregado' });
  if (r.success) { showToast('Entregado ✓', 'success'); renderCamarero('pedidos'); }
}

// ============================================================
// COCINERO
// ============================================================
async function renderCocinero(tab = 'pedidos') {
  const tabs = [
    { id: 'pedidos', label: '🍳 Pedidos' },
    { id: 'menu',    label: '📋 Menú del día' },
  ];
  document.getElementById('main-content').innerHTML =
    `<div class="flex-between" style="margin-bottom:6px;">
       <div class="section-title">Panel de Cocina</div>
       <button class="btn btn-neutral" onclick="renderCocinero('${tab}')">🔄 Actualizar</button>
     </div>
     <div class="section-sub">Pedidos en tiempo real</div>
     <div class="nav-tabs">${tabs.map(t=>`<button class="nav-tab ${tab===t.id?'active':''}" onclick="renderCocinero('${t.id}')">${t.label}</button>`).join('')}</div>
     <div id="tab-content"><div class="loading">Cargando...</div></div>`;

  if (tab === 'pedidos') await cocineroMostrarPedidos();
  else                   await cocineroMenu();
}

async function cocineroMostrarPedidos() {
  const pedidos = await api('api/pedidos.php?action=listar');
  const activos = pedidos.filter(p => p.estado === 'preparando' || p.estado === 'listo');
  if (!activos.length) {
    document.getElementById('tab-content').innerHTML = '<div class="empty"><div class="empty-icon">👨‍🍳</div><div class="empty-text">Sin pedidos activos</div></div>';
    return;
  }
  document.getElementById('tab-content').innerHTML = `<div class="grid2">${activos.map(p => `
    <div class="pedido-card pedido-${p.estado}">
      <div class="pedido-header">
        <div><div class="pedido-mesa">Mesa ${p.mesa_numero}</div><div style="font-size:.78rem;color:var(--text3);">${p.id} · ${p.created_at?.substring(11,16)||''}</div></div>
        <div style="display:flex;gap:6px;align-items:center;">
          ${estadoBadge(p.estado)}
          ${p.estado==='preparando'?`<button class="btn btn-sm btn-success" onclick="pedidoListo(${p.id})">✓ Listo</button>`:'<span style="font-size:1.3rem;">✅</span>'}
        </div>
      </div>
      <div class="pedido-items">
        ${p.items.map(i=>`<div class="pedido-item"><div class="pedido-item-dot"></div>${i.nombre}</div>`).join('')}
      </div>
    </div>`).join('')}</div>`;
}

async function cocineroMenu() {
  const menu = await api('api/platos.php?action=menu_qr');
  const todos = [...(menu.almuerzo?.sopas||[]), ...(menu.almuerzo?.segundos||[]), ...(menu.almuerzo?.postres||[]), ...(menu.noche?.platos||[]), ...(menu.almuerzo?.bebidas||[]), ...(menu.noche?.bebidas||[])];

  if (!todos.length) {
    document.getElementById('tab-content').innerHTML = '<div class="empty"><div class="empty-icon">📋</div><div class="empty-text">Sin platos en el menú de hoy</div></div>';
    return;
  }

  document.getElementById('tab-content').innerHTML = `
    <p style="font-size:.88rem;color:var(--text2);margin-bottom:16px;">Marca los platos que se han <strong>agotado</strong> para que no aparezcan disponibles en el menú.</p>
    <div class="grid3">${todos.map(p => `
      <div class="plato-admin-card ${p.agotado?'plato-agotado-overlay':''}">
        ${p.imagen_url ? `<img class="plato-admin-img" src="${p.imagen_url}" alt="" onerror="this.style.display='none'">` : `<div class="plato-admin-img-placeholder">${categoriaEmoji(p.categoria)}</div>`}
        <div class="plato-admin-body">
          <span class="badge badge-gray" style="font-size:.72rem;margin-bottom:6px;">${categoriaLabel(p.categoria)}</span>
          <div class="plato-admin-nombre">${p.nombre}</div>
          ${p.descripcion?`<div class="plato-admin-desc">${p.descripcion}</div>`:''}
        </div>
        <div class="plato-admin-footer">
          ${p.agotado ? '<span class="badge badge-red">⚠ Agotado</span>' : '<span class="badge badge-green">Disponible</span>'}
          <button class="btn btn-xs ${p.agotado?'btn-success':'btn-danger'}" onclick="toggleAgotado(${p.id},${p.agotado})">
            ${p.agotado ? '✓ Reponer' : '⚠ Agotar'}
          </button>
        </div>
      </div>`).join('')}
    </div>`;
}

async function pedidoListo(pedidoId) {
  const r = await api('api/pedidos.php?action=estado', 'POST', { id: pedidoId, estado: 'listo' });
  if (r.success) { showToast('Pedido listo 🔔', 'success'); renderCocinero('pedidos'); }
}

async function toggleAgotado(id, agotado) {
  const r = await api('api/platos.php?action=actualizar', 'POST', { id, agotado: agotado ? 0 : 1 });
  if (r.success) { showToast(agotado ? 'Plato repuesto ✓' : 'Plato marcado como agotado', 'success'); cocineroMenu(); }
}

// ============================================================
// CAJA
// ============================================================
async function renderCaja(tab = 'mesas') {
  const tabs = [{ id: 'mesas', label: '🍽 Mesas' }, { id: 'historial', label: '📜 Historial' }];
  document.getElementById('main-content').innerHTML =
    `<div class="section-title">Panel de Caja</div>
     <div class="section-sub">Cobros y facturación</div>
     <div class="nav-tabs">${tabs.map(t=>`<button class="nav-tab ${tab===t.id?'active':''}" onclick="renderCaja('${t.id}')">${t.label}</button>`).join('')}</div>
     <div id="tab-content"><div class="loading">Cargando...</div></div>`;

  if (tab === 'mesas') await cajaMesas();
  else                 await cajaHistorial();
}

async function cajaMesas() {
  const mesas = await api('api/mesas.php?action=listar');
  const conConsumo = mesas.filter(m => +m.consumo_total > 0);
  if (!conConsumo.length) {
    document.getElementById('tab-content').innerHTML = '<div class="empty"><div class="empty-icon">💰</div><div class="empty-text">Sin mesas con consumo activo</div></div>';
    return;
  }
  const detalles = await Promise.all(conConsumo.map(m => api(`api/caja.php?action=consumo&mesa_id=${m.id}`)));
  document.getElementById('tab-content').innerHTML = `<div class="grid2">${conConsumo.map((m,i) => {
    const det = detalles[i];
    return `<div class="card">
      <div class="card-header"><span class="card-title">Mesa ${m.numero}</span>${estadoBadge(m.estado)}</div>
      <div class="card-body">
        ${det.items?.map(it=>`<div class="factura-row"><span>${it.nombre}</span><span>${it.precio} Bs</span></div>`).join('')||''}
        <div class="factura-total"><span>TOTAL</span><span class="text-accent">${det.total||m.consumo_total} Bs</span></div>
        <div style="display:flex;gap:8px;margin-top:16px;">
          <button class="btn btn-info btn-sm" onclick="imprimirFactura(${m.id},${m.numero})">🖨 Imprimir</button>
          <button class="btn btn-success" onclick="cobrarMesa(${m.id},${m.numero},${det.total||m.consumo_total})">✓ Cobrar</button>
        </div>
      </div>
    </div>`;
  }).join('')}</div>`;
}

async function cajaHistorial() {
  const reportes = await api('api/reportes.php?action=periodo&tipo=semana');
  document.getElementById('tab-content').innerHTML = `
    <div class="card">
      <div class="card-header"><span class="card-title">Ventas recientes</span></div>
      <div style="overflow-x:auto;">
        <table>
          <thead><tr><th>Fecha</th><th>Turno</th><th>Total</th><th>Cobros</th></tr></thead>
          <tbody>${reportes.length ? reportes.map(v => `
            <tr>
              <td>${v.fecha}</td>
              <td>${v.turno==='almuerzo'?'<span class="badge badge-orange">Almuerzo</span>':'<span class="badge badge-blue">Noche</span>'}</td>
              <td><strong>${v.total} Bs</strong></td>
              <td>${v.ventas}</td>
            </tr>`).join('') : '<tr><td colspan="4" style="text-align:center;color:var(--text3);padding:20px;">Sin ventas</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>`;
}

async function imprimirFactura(mesaId, mesaNum) {
  const det = await api(`api/caja.php?action=consumo&mesa_id=${mesaId}`);
  const lineas = det.items?.map(i => `${i.nombre.substring(0,22).padEnd(22)} ${i.precio} Bs`).join('\n') || '';
  const ticket = `===========================\n   RESTAURANTE OS\n===========================\nMesa: ${mesaNum}\nFecha: ${new Date().toLocaleString('es-BO')}\n---------------------------\n${lineas}\n---------------------------\nTOTAL:        ${det.total} Bs\n===========================\n  ¡Gracias por su visita!\n===========================`;
  openModal('🖨 Vista previa',
    `<pre style="font-family:monospace;font-size:.82rem;background:var(--bg);padding:16px;border-radius:8px;white-space:pre;line-height:1.5;">${ticket}</pre>`,
    [{ label: 'Cerrar', cls: 'btn-neutral', action: 'closeModal()' },
     { label: '🖨 Imprimir', cls: 'btn-accent', action: 'window.print()' }]);
}

async function cobrarMesa(mesaId, mesaNum, total) {
  if (!confirm(`¿Cobrar Mesa ${mesaNum}? Total: ${total} Bs`)) return;
  const r = await api('api/caja.php?action=cobrar', 'POST', { mesa_id: mesaId });
  if (r.success) { showToast(`Mesa ${mesaNum}: Cobrado ✓`, 'success'); renderCaja(); }
  else showToast(r.error || 'Error al cobrar', 'error');
}
