<?php
// index.php - Página de login 
require_once 'config/db.php';
iniciarSesion();

// Si ya está logueado, redirigir al dashboard
if (isset($_SESSION['usuario_id'])) {
    header('Location: dashboard.php');
    exit;
}
?>
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Restaurante ALEJA — Login</title>
<link rel="stylesheet" href="assets/style.css">
<link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet">
</head>
<body class="login-body">

<div class="login-screen">
  <div class="login-card">
    <div class="login-logo">
      <h1>🍽 Restaurante ALEJA</h1>
      <p>Sistema de Gestión</p>
    </div>

    <div id="login-error" class="alert alert-error" style="display:none;"></div>

    <div class="form-group">
      <label>Usuario</label>
      <input type="text" id="login-user" placeholder="Tu usuario" autocomplete="username"/>
    </div>
    <div class="form-group">
      <label>Contraseña</label>
      <input type="password" id="login-pass" placeholder="Tu contraseña" autocomplete="current-password"/>
    </div>

    <button class="btn-primary" id="btn-login">Entrar al Sistema</button>

    <p class="login-hint">
      <a href="qr.php" target="_blank" style="color:var(--accent);">📱 Ver menú QR (vista cliente)</a>
    </p>
  </div>
</div>

<script>
document.getElementById('btn-login').addEventListener('click', doLogin);
document.getElementById('login-pass').addEventListener('keydown', e => { if(e.key==='Enter') doLogin(); });

async function doLogin() {
  const usuario  = document.getElementById('login-user').value.trim();
  const password = document.getElementById('login-pass').value;
  const err      = document.getElementById('login-error');

  if (!usuario || !password) {
    err.textContent = 'Completa todos los campos';
    err.style.display = 'block';
    return;
  }

  document.getElementById('btn-login').textContent = 'Entrando...';

  try {
    const res = await fetch('api/auth.php?action=login', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({usuario, password})
    });
    const data = await res.json();

    if (data.success) {
      window.location.href = 'dashboard.php';
    } else {
      err.textContent = data.error || 'Error al iniciar sesión';
      err.style.display = 'block';
      document.getElementById('btn-login').textContent = 'Entrar al Sistema';
    }
  } catch(e) {
    err.textContent = 'Error de conexión';
    err.style.display = 'block';
    document.getElementById('btn-login').textContent = 'Entrar al Sistema';
  }
}
</script>
</body>
</html>
