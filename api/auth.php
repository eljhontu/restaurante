<?php
// api/auth.php
require_once '../config/db.php';
iniciarSesion();
header('Content-Type: application/json; charset=utf-8');

$action = $_GET['action'] ?? '';

if ($action === 'login') {
    $data     = json_decode(file_get_contents('php://input'), true);
    $usuario  = trim($data['usuario'] ?? '');
    $password = $data['password'] ?? '';

    if (!$usuario || !$password) jsonResponse(['error' => 'Completa todos los campos'], 400);

    $pdo  = getDB();
    $stmt = $pdo->prepare("SELECT * FROM usuarios WHERE usuario = ? AND activo = 1");
    $stmt->execute([$usuario]);
    $user = $stmt->fetch();

    if (!$user) jsonResponse(['error' => 'Usuario no encontrado o inactivo'], 401);

    // Soporte para hash bcrypt Y contraseñas que aún no fueron hasheadas (setup pendiente)
    $ok = false;
    if (str_starts_with($user['password'], '$2y$') || str_starts_with($user['password'], '$2b$')) {
        $ok = password_verify($password, $user['password']);
    } else {
        // Contraseña en texto plano (solo durante setup) — hashear automáticamente
        if ($user['password'] === $password) {
            $ok = true;
            $newHash = password_hash($password, PASSWORD_DEFAULT);
            $pdo->prepare("UPDATE usuarios SET password = ? WHERE id = ?")->execute([$newHash, $user['id']]);
        }
    }

    if (!$ok) jsonResponse(['error' => 'Contraseña incorrecta'], 401);

    $_SESSION['usuario_id'] = $user['id'];
    $_SESSION['nombre']     = $user['nombre'] . ' ' . $user['apellido'];
    $_SESSION['usuario']    = $user['usuario'];
    $_SESSION['rol']        = $user['rol'];

    jsonResponse(['success' => true, 'usuario' => [
        'id'     => $user['id'],
        'nombre' => trim($user['nombre'] . ' ' . $user['apellido']),
        'usuario'=> $user['usuario'],
        'rol'    => $user['rol'],
    ], 'turno' => getTurno()]);
}

elseif ($action === 'logout') {
    session_destroy();
    jsonResponse(['success' => true]);
}

elseif ($action === 'check') {
    if (isset($_SESSION['usuario_id'])) {
        jsonResponse(['logueado' => true, 'usuario' => [
            'id'     => $_SESSION['usuario_id'],
            'nombre' => $_SESSION['nombre'],
            'usuario'=> $_SESSION['usuario'],
            'rol'    => $_SESSION['rol'],
        ], 'turno' => getTurno()]);
    } else {
        jsonResponse(['logueado' => false]);
    }
}

else jsonResponse(['error' => 'Acción no válida'], 400);
