<?php
// dashboard.php - Panel principal (todos los roles)
require_once 'config/db.php';
iniciarSesion();

if (!isset($_SESSION['usuario_id'])) {
    header('Location: index.php');
    exit;
}

$rol    = $_SESSION['rol'];
$nombre = $_SESSION['nombre'];
$turno  = getTurno();

$roleLabels = ['admin'=>'👑 Administrador','camarero'=>'🧑‍💼 Camarero','cocinero'=>'👨‍🍳 Cocinero','caja'=>'💰 Caja'];
$roleLabel  = $roleLabels[$rol] ?? $rol;
?>
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>RestaurantOS — <?= htmlspecialchars($roleLabel) ?></title>
<link rel="stylesheet" href="assets/style.css">
<link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet">
</head>
<body>

<!-- TOPBAR -->
<div class="topbar">
  <div style="display:flex;align-items:center;gap:16px;">
    <span class="topbar-brand">🍽 RestaurantOS</span>
    <span class="badge badge-orange" id="turno-badge">
      <?= $turno==='almuerzo' ? '🌞 Turno Almuerzo' : ($turno==='noche' ? '🌙 Turno Noche' : '⏸ Sin turno') ?>
    </span>
  </div>
  <div class="topbar-right">
    <span class="topbar-user"><?= htmlspecialchars($nombre) ?></span>
    <span class="role-badge role-<?= $rol ?>"><?= $roleLabel ?></span>
    <a href="qr.php" target="_blank" class="btn-logout" title="Ver menú QR">📱</a>
    <button class="btn-logout" onclick="logout()">Salir</button>
  </div>
</div>

<!-- CONTENIDO PRINCIPAL -->
<div class="main-content" id="main-content">
  <div class="loading">Cargando panel...</div>
</div>

<!-- MODAL -->
<div class="modal-overlay" id="modal-overlay">
  <div class="modal" id="modal">
    <div class="modal-header">
      <span class="modal-title" id="modal-title"></span>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <div class="modal-body" id="modal-body"></div>
    <div class="modal-footer" id="modal-footer"></div>
  </div>
</div>

<!-- Pasar datos PHP → JS -->
<script>
const ROL   = '<?= $rol ?>';
const TURNO = '<?= $turno ?>';
</script>
<script src="assets/app.js"></script>
</body>
</html>
