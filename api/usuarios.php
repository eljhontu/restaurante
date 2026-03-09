<?php
// api/usuarios.php
require_once '../config/db.php';
verificarAuth();
verificarRol('admin');
header('Content-Type: application/json; charset=utf-8');

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? 'listar';
$pdo    = getDB();

if ($action === 'listar') {
    $stmt = $pdo->query("SELECT id, nombre, apellido, telefono, usuario, rol, activo, created_at FROM usuarios ORDER BY id");
    jsonResponse($stmt->fetchAll());
}

elseif ($action === 'crear' && $method === 'POST') {
    $d        = json_decode(file_get_contents('php://input'), true);
    $nombre   = trim($d['nombre']   ?? '');
    $apellido = trim($d['apellido'] ?? '');
    $telefono = trim($d['telefono'] ?? '');
    $usuario  = trim($d['usuario']  ?? '');
    $password = $d['password'] ?? '';
    $rol      = $d['rol'] ?? '';

    if (!$nombre || !$usuario || !$password || !in_array($rol, ['admin','camarero','cocinero','caja']))
        jsonResponse(['error' => 'Todos los campos son requeridos'], 400);

    $check = $pdo->prepare("SELECT id FROM usuarios WHERE usuario = ?");
    $check->execute([$usuario]);
    if ($check->fetch()) jsonResponse(['error' => 'El usuario ya existe'], 409);

    $hash = password_hash($password, PASSWORD_DEFAULT);
    $pdo->prepare("INSERT INTO usuarios (nombre, apellido, telefono, usuario, password, rol) VALUES (?,?,?,?,?,?)")
        ->execute([$nombre, $apellido, $telefono, $usuario, $hash, $rol]);
    jsonResponse(['success' => true, 'id' => $pdo->lastInsertId()]);
}

elseif ($action === 'actualizar' && $method === 'POST') {
    $d        = json_decode(file_get_contents('php://input'), true);
    $id       = (int)($d['id'] ?? 0);
    $nombre   = trim($d['nombre']   ?? '');
    $apellido = trim($d['apellido'] ?? '');
    $telefono = trim($d['telefono'] ?? '');
    $rol      = $d['rol'] ?? '';
    $activo   = isset($d['activo']) ? (int)$d['activo'] : null;

    if ($nombre) {
        $pdo->prepare("UPDATE usuarios SET nombre=?, apellido=?, telefono=?, rol=? WHERE id=?")
            ->execute([$nombre, $apellido, $telefono, $rol, $id]);
    }
    if (!is_null($activo)) {
        $pdo->prepare("UPDATE usuarios SET activo=? WHERE id=?")->execute([$activo, $id]);
    }
    if (!empty($d['password'])) {
        $hash = password_hash($d['password'], PASSWORD_DEFAULT);
        $pdo->prepare("UPDATE usuarios SET password=? WHERE id=?")->execute([$hash, $id]);
    }
    jsonResponse(['success' => true]);
}

elseif ($action === 'eliminar' && $method === 'POST') {
    $d  = json_decode(file_get_contents('php://input'), true);
    $id = (int)($d['id'] ?? 0);
    if ($id === (int)$_SESSION['usuario_id']) jsonResponse(['error' => 'No puedes eliminarte a ti mismo'], 400);
    $pdo->prepare("DELETE FROM usuarios WHERE id=?")->execute([$id]);
    jsonResponse(['success' => true]);
}

else jsonResponse(['error' => 'Acción no válida'], 400);
