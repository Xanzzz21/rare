<?php
require_once 'config.php';

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    die(json_encode(["error" => "Method not allowed"]));
}

// Verify Telegram authorization
$initData = $_POST['initData'] ?? null;
if (!$initData) {
    die(json_encode(["error" => "initData is required"]));
}

$auth_result = verifyTelegramAuth($initData, $bot_token);
if (!$auth_result['success']) {
    die(json_encode(["error" => $auth_result['error']]));
}

$user_data = $auth_result['user_data'];
$user_id = $user_data['id'];

try {
    $pdo = new PDO($dsn, $db_username, $db_password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);

    // Start transaction
    $pdo->beginTransaction();

    // Get current user data
    $stmt = $pdo->prepare("SELECT coins, daily_tap_count, last_tap_reset_date FROM user_data WHERE id = ? FOR UPDATE");
    $stmt->execute([$user_id]);
    $user = $stmt->fetch();

    if (!$user) {
        $pdo->rollBack();
        die(json_encode(["error" => "User not found"]));
    }

    // Check daily tap limit
    $today = date('Y-m-d');
    if ($user['last_tap_reset_date'] !== $today) {
        // Reset daily tap count
        $daily_tap_count = 1;
    } else {
        $daily_tap_count = $user['daily_tap_count'] + 1;
        if ($daily_tap_count > 8000) {
            $pdo->rollBack();
            die(json_encode(["error" => "Daily tap limit reached"]));
        }
    }

    // Update coins and tap count
    $stmt = $pdo->prepare("
        UPDATE user_data 
        SET coins = coins + 1,
            daily_tap_count = ?,
            last_tap_reset_date = ?
        WHERE id = ?
    ");
    $stmt->execute([$daily_tap_count, $today, $user_id]);

    // Commit transaction
    $pdo->commit();

    // Return updated coin count
    $stmt = $pdo->prepare("SELECT coins FROM user_data WHERE id = ?");
    $stmt->execute([$user_id]);
    $updated_coins = $stmt->fetchColumn();

    echo json_encode([
        "success" => true,
        "coins" => $updated_coins,
        "daily_tap_count" => $daily_tap_count
    ]);

} catch (PDOException $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log("Database error: " . $e->getMessage());
    http_response_code(500);
    die(json_encode(["error" => "Database error"]));
}
?> 