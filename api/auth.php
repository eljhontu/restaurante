<?php
// api/auth.php - Login y logout
require_once '../config/db.php';

iniciarSesion();
header('Content-Type: application/json');

$action = $_GET['action'] ?? '';

// ---- LOGIN ----
if ($action === 'login') {
    $data = json_decode(file_get_contents('php://input'), true);
    $usuario = trim($data['usuario'] ?? '');
    $password = $data['password'] ?? '';

    if (!$usuario || !$password) {
        jsonResponse(['error' => 'Usuario y contraseña requeridos'], 400);
    }

    $pdo = getDB();
    $stmt = $pdo->prepare("SELECT * FROM usuarios WHERE usuario = ? AND activo = 1");
    $stmt->execute([$usuario]);
    $user = $stmt->fetch();

    if (!$user || $password !== $user['password']) {
        jsonResponse(['error' => 'Usuario o contraseña incorrectos'], 401);
    }

    $_SESSION['usuario_id'] = $user['id'];
    $_SESSION['nombre']      = $user['nombre'];
    $_SESSION['usuario']     = $user['usuario'];
    $_SESSION['rol']         = $user['rol'];

    jsonResponse([
        'success' => true,
        'usuario' => [
            'id'     => $user['id'],
            'nombre' => $user['nombre'],
            'usuario'=> $user['usuario'],
            'rol'    => $user['rol'],
        ],
        'turno' => getTurno()
    ]);
}

// ---- LOGOUT ----
elseif ($action === 'logout') {
    session_destroy();
    jsonResponse(['success' => true]);
}

// ---- VERIFICAR SESIÓN ----
elseif ($action === 'check') {
    if (isset($_SESSION['usuario_id'])) {
        jsonResponse([
            'logueado' => true,
            'usuario'  => [
                'id'     => $_SESSION['usuario_id'],
                'nombre' => $_SESSION['nombre'],
                'usuario'=> $_SESSION['usuario'],
                'rol'    => $_SESSION['rol'],
            ],
            'turno' => getTurno()
        ]);
    } else {
        jsonResponse(['logueado' => false]);
    }
}

else {
    jsonResponse(['error' => 'Acción no válida'], 400);
}
