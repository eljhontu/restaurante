<?php

require_once 'config/db.php';

$pdo  = getDB();
$hash = password_hash('1234', PASSWORD_DEFAULT);


$pdo->prepare("UPDATE usuarios SET password = ? WHERE password = 'CAMBIAR'")->execute([$hash]);

// Verificar
$stmt = $pdo->query("SELECT nombre, usuario, rol FROM usuarios");
$users = $stmt->fetchAll();

echo '<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<title>Restaurante ALEJA — Setup</title>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600&display=swap" rel="stylesheet">
<style>
  body{font-family:DM Sans,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#F7F3EE;}
  .box{background:#fff;border-radius:16px;padding:40px;max-width:480px;width:100%;box-shadow:0 8px 32px rgba(0,0,0,.1);}
  h2{color:#C8541A;font-size:1.5rem;margin-bottom:8px;}
  p{color:#6B5E52;font-size:.9rem;margin-bottom:20px;}
  table{width:100%;border-collapse:collapse;}
  th,td{padding:10px 12px;text-align:left;border-bottom:1px solid #E2D9CE;font-size:.88rem;}
  th{color:#9B8E84;font-size:.78rem;text-transform:uppercase;}
  .ok{display:inline-block;background:#EAF5EE;color:#2D7A4F;padding:3px 10px;border-radius:20px;font-size:.75rem;font-weight:600;}
  .btn{display:block;margin-top:24px;padding:13px;background:#C8541A;color:#fff;text-align:center;border-radius:10px;text-decoration:none;font-weight:600;}
</style></head><body>
<div class="box">
  <h2>✅ Instalación completada</h2>
  <p>Las contraseñas han sido configuradas correctamente. Usuarios del sistema:</p>
  <table>
    <thead><tr><th>Nombre</th><th>Usuario</th><th>Rol</th><th>Estado</th></tr></thead>
    <tbody>';
foreach ($users as $u) {
    echo "<tr><td>{$u['nombre']}</td><td><strong>{$u['usuario']}</strong></td><td>{$u['rol']}</td><td><span class='ok'>Activo</span></td></tr>";
}
echo '  </tbody></table>
  <p style="margin-top:16px;font-size:.82rem;background:#FEF9E7;padding:12px;border-radius:8px;color:#B07D0A;">
    ⚠️ <strong>Contraseña de todos los usuarios: 1234</strong><br>
    Cámbiala desde el Panel de Administrador → Usuarios.
  </p>
  <a class="btn" href="index.php">Ir al sistema →</a>
</div></body></html>';
