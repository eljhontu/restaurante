<?php
// api/pedidos.php - Gestión de pedidos
require_once '../config/db.php';

verificarAuth();
header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? 'listar';
$pdo    = getDB();

// ---- LISTAR PEDIDOS ----
if ($action === 'listar') {
    $estado = $_GET['estado'] ?? null;
    $sql = "
        SELECT p.*, m.numero as mesa_numero,
               GROUP_CONCAT(pi.nombre ORDER BY pi.id SEPARATOR '||') as items_nombres,
               GROUP_CONCAT(pi.precio ORDER BY pi.id SEPARATOR '||') as items_precios,
               GROUP_CONCAT(pi.tipo  ORDER BY pi.id SEPARATOR '||') as items_tipos
        FROM pedidos p
        JOIN mesas m ON m.id = p.mesa_id
        LEFT JOIN pedido_items pi ON pi.pedido_id = p.id
    ";
    $params = [];
    if ($estado) {
        $sql .= " WHERE p.estado = ?";
        $params[] = $estado;
    } else {
        $sql .= " WHERE p.estado != 'pagado'";
    }
    $sql .= " GROUP BY p.id ORDER BY p.created_at DESC";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $pedidos = $stmt->fetchAll();

    foreach ($pedidos as &$p) {
        $nombres = explode('||', $p['items_nombres'] ?? '');
        $precios = explode('||', $p['items_precios'] ?? '');
        $tipos   = explode('||', $p['items_tipos']   ?? '');
        $p['items'] = [];
        foreach ($nombres as $i => $n) {
            if ($n) $p['items'][] = [
                'nombre' => $n,
                'precio' => (float)($precios[$i] ?? 0),
                'tipo'   => $tipos[$i] ?? 'plato'
            ];
        }
        unset($p['items_nombres'], $p['items_precios'], $p['items_tipos']);
    }
    jsonResponse($pedidos);
}

// ---- CREAR PEDIDO ----
elseif ($action === 'crear' && $method === 'POST') {
    verificarRol('admin','camarero');
    $data    = json_decode(file_get_contents('php://input'), true);
    $mesa_id = (int)($data['mesa_id'] ?? 0);
    $items   = $data['items'] ?? [];
    $turno   = $data['turno'] ?? getTurno();

    if (!$mesa_id || empty($items)) {
        jsonResponse(['error' => 'Mesa e items requeridos'], 400);
    }

    $total = array_sum(array_column($items, 'precio'));

    $pdo->beginTransaction();
    try {
        // Crear pedido
        $stmt = $pdo->prepare("INSERT INTO pedidos (mesa_id, estado, turno, total) VALUES (?, 'preparando', ?, ?)");
        $stmt->execute([$mesa_id, $turno, $total]);
        $pedido_id = $pdo->lastInsertId();

        // Insertar items
        $stmt2 = $pdo->prepare("INSERT INTO pedido_items (pedido_id, nombre, precio, tipo) VALUES (?, ?, ?, ?)");
        foreach ($items as $item) {
            $stmt2->execute([$pedido_id, $item['nombre'], $item['precio'], $item['tipo'] ?? 'plato']);
        }

        // Actualizar consumo y estado de la mesa
        $stmt3 = $pdo->prepare("UPDATE mesas SET consumo_total = consumo_total + ?, estado = 'ocupada' WHERE id = ?");
        $stmt3->execute([$total, $mesa_id]);

        $pdo->commit();
        jsonResponse(['success' => true, 'pedido_id' => $pedido_id]);

    } catch (Exception $e) {
        $pdo->rollBack();
        jsonResponse(['error' => 'Error al crear pedido: ' . $e->getMessage()], 500);
    }
}

// ---- CAMBIAR ESTADO ----
elseif ($action === 'estado' && $method === 'POST') {
    $data       = json_decode(file_get_contents('php://input'), true);
    $pedido_id  = (int)($data['id'] ?? 0);
    $nuevo_estado = $data['estado'] ?? '';
    $estados_validos = ['preparando','listo','entregado','pagado'];

    if (!in_array($nuevo_estado, $estados_validos)) jsonResponse(['error' => 'Estado no válido'], 400);

    // Verificar permisos por rol
    $rol = $_SESSION['rol'];
    if ($nuevo_estado === 'listo'     && !in_array($rol, ['admin','cocinero']))  jsonResponse(['error' => 'Sin permisos'], 403);
    if ($nuevo_estado === 'entregado' && !in_array($rol, ['admin','camarero']))  jsonResponse(['error' => 'Sin permisos'], 403);

    $stmt = $pdo->prepare("UPDATE pedidos SET estado = ? WHERE id = ?");
    $stmt->execute([$nuevo_estado, $pedido_id]);

    // Si el pedido está listo, cambiar estado de la mesa
    if ($nuevo_estado === 'listo') {
        $stmt2 = $pdo->prepare("SELECT mesa_id FROM pedidos WHERE id = ?");
        $stmt2->execute([$pedido_id]);
        $ped = $stmt2->fetch();
        if ($ped) {
            $stmt3 = $pdo->prepare("UPDATE mesas SET estado = 'lista' WHERE id = ?");
            $stmt3->execute([$ped['mesa_id']]);
        }
    }

    jsonResponse(['success' => true]);
}

else {
    jsonResponse(['error' => 'Acción no válida'], 400);
}
