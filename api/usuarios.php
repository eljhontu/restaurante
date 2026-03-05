<?php
// api/usuarios.php - Gestión de usuarios (solo admin)
require_once '../config/db.php';

verificarAuth();
verificarRol('admin');
header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? 'listar';
$pdo    = getDB();

// ---- LISTAR ----
if ($action === 'listar') {
    $stmt = $pdo->query("SELECT id, nombre, usuario, rol, activo, created_at FROM usuarios ORDER BY id");
    jsonResponse($stmt->fetchAll());
}

// ---- CREAR ----
elseif ($action === 'crear' && $method === 'POST') {
    $data     = json_decode(file_get_contents('php://input'), true);
    $nombre   = trim($data['nombre']   ?? '');
    $usuario  = trim($data['usuario']  ?? '');
    $password = $data['password'] ?? '';
    $rol      = $data['rol'] ?? '';

    if (!$nombre || !$usuario || !$password || !in_array($rol, ['admin','camarero','cocinero','caja'])) {
        jsonResponse(['error' => 'Todos los campos son requeridos'], 400);
    }

    // Verificar usuario único
    $check = $pdo->prepare("SELECT id FROM usuarios WHERE usuario = ?");
    $check->execute([$usuario]);
    if ($check->fetch()) jsonResponse(['error' => 'El usuario ya existe'], 409);

    $stmt = $pdo->prepare("INSERT INTO usuarios (nombre, usuario, password, rol) VALUES (?,?,?,?)");
    $stmt->execute([$nombre, $usuario, $password, $rol]);
    jsonResponse(['success' => true, 'id' => $pdo->lastInsertId()]);
}

// ---- ACTUALIZAR ----
elseif ($action === 'actualizar' && $method === 'POST') {
    $data    = json_decode(file_get_contents('php://input'), true);
    $id      = (int)($data['id'] ?? 0);
    $nombre  = trim($data['nombre'] ?? '');
    $rol     = $data['rol'] ?? '';
    $activo  = isset($data['activo']) ? (int)$data['activo'] : null;

    if ($nombre && $rol) {
        $pdo->prepare("UPDATE usuarios SET nombre = ?, rol = ? WHERE id = ?")->execute([$nombre, $rol, $id]);
    }
    if (!is_null($activo)) {
        $pdo->prepare("UPDATE usuarios SET activo = ? WHERE id = ?")->execute([$activo, $id]);
    }
    if (!empty($data['password'])) {
        $hash = password_hash($data['password'], PASSWORD_DEFAULT);
        $pdo->prepare("UPDATE usuarios SET password = ? WHERE id = ?")->execute([$hash, $id]);
    }
    jsonResponse(['success' => true]);
}

// ---- ELIMINAR ----
elseif ($action === 'eliminar' && $method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    $id   = (int)($data['id'] ?? 0);
    if ($id === (int)$_SESSION['usuario_id']) jsonResponse(['error' => 'No puedes eliminarte a ti mismo'], 400);
    $pdo->prepare("DELETE FROM usuarios WHERE id = ?")->execute([$id]);
    jsonResponse(['success' => true]);
}

else {
    jsonResponse(['error' => 'Acción no válida'], 400);
}
