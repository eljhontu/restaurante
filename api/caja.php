<?php
// api/caja.php - Gestión de cobros
require_once '../config/db.php';

verificarAuth();
verificarRol('admin','caja');
header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';
$pdo    = getDB();

// ---- VER CONSUMO DE MESA ----
if ($action === 'consumo') {
    $mesa_id = (int)($_GET['mesa_id'] ?? 0);

    $stmt = $pdo->prepare("
        SELECT p.id as pedido_id, p.turno, p.total, p.created_at,
               pi.nombre, pi.precio, pi.tipo
        FROM pedidos p
        JOIN pedido_items pi ON pi.pedido_id = p.id
        WHERE p.mesa_id = ? AND p.estado != 'pagado'
        ORDER BY p.created_at, pi.id
    ");
    $stmt->execute([$mesa_id]);
    $rows = $stmt->fetchAll();

    $items = [];
    $total = 0;
    foreach ($rows as $r) {
        $items[] = ['nombre' => $r['nombre'], 'precio' => (float)$r['precio']];
        $total += (float)$r['precio'];
    }

    $stmtM = $pdo->prepare("SELECT numero FROM mesas WHERE id = ?");
    $stmtM->execute([$mesa_id]);
    $mesa = $stmtM->fetch();

    jsonResponse(['mesa_numero' => $mesa['numero'] ?? $mesa_id, 'items' => $items, 'total' => $total]);
}

// ---- COBRAR MESA ----
elseif ($action === 'cobrar' && $method === 'POST') {
    $data    = json_decode(file_get_contents('php://input'), true);
    $mesa_id = (int)($data['mesa_id'] ?? 0);

    // Obtener total de pedidos activos
    $stmt = $pdo->prepare("SELECT SUM(total) as total, turno FROM pedidos WHERE mesa_id = ? AND estado != 'pagado' GROUP BY turno ORDER BY created_at DESC LIMIT 1");
    $stmt->execute([$mesa_id]);
    $res = $stmt->fetch();
    $total = (float)($res['total'] ?? 0);
    $turno = $res['turno'] ?? getTurno();

    $pdo->beginTransaction();
    try {
        // Registrar venta
        $stmt2 = $pdo->prepare("INSERT INTO ventas (mesa_id, total, turno, fecha, hora) VALUES (?,?,?,CURDATE(),CURTIME())");
        $stmt2->execute([$mesa_id, $total, $turno]);

        // Marcar pedidos como pagados
        $pdo->prepare("UPDATE pedidos SET estado = 'pagado' WHERE mesa_id = ? AND estado != 'pagado'")->execute([$mesa_id]);

        // Liberar mesa
        $pdo->prepare("UPDATE mesas SET estado = 'libre', consumo_total = 0 WHERE id = ?")->execute([$mesa_id]);

        $pdo->commit();
        jsonResponse(['success' => true, 'total_cobrado' => $total]);

    } catch (Exception $e) {
        $pdo->rollBack();
        jsonResponse(['error' => 'Error al cobrar: ' . $e->getMessage()], 500);
    }
}

else {
    jsonResponse(['error' => 'Acción no válida'], 400);
}
