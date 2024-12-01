<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once 'config.php';
$conn = getPDOConnection();

try {
    $id = filter_var($_GET['id'], FILTER_VALIDATE_INT);
    if (!$id) {
        throw new Exception("Invalid user ID");
    }

    // First get current user data
    $stmt = $conn->prepare("SELECT * FROM user_data WHERE id = ? FOR UPDATE");
    $stmt->execute([$id]);
    $currentData = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$currentData) {
        throw new Exception("User not found");
    }

    // Check if user is already banned
    if (isUserBanned($id)) {
        // Return last valid data instead
        $lastValidData = getLastValidData($id);
        if ($lastValidData) {
            echo json_encode([
                "status" => "success",
                "data" => $lastValidData
            ]);
            exit;
        }
    }

    // Get and validate new values
    $newCoins = filter_var($_GET['coins'], FILTER_VALIDATE_INT);
    $newTickets = filter_var($_GET['tickets'], FILTER_VALIDATE_INT);
    $newTonBalance = filter_var($_GET['ton_balance'], FILTER_VALIDATE_FLOAT);
    $newStarsBalance = filter_var($_GET['stars_balance'], FILTER_VALIDATE_INT);

    // Check for suspicious changes
    $suspiciousChanges = false;
    $maxAllowedChanges = [
        'coins' => 21000,
        'tickets' => 10,
        'ton_balance' => 1.0,
        'stars_balance' => 100
    ];

    $changes = [
        'coins' => abs($newCoins - $currentData['coins']),
        'tickets' => abs($newTickets - $currentData['tickets']),
        'ton_balance' => abs($newTonBalance - $currentData['ton_balance']),
        'stars_balance' => abs($newStarsBalance - $currentData['stars_balance'])
    ];

    foreach ($changes as $field => $change) {
        if ($change > $maxAllowedChanges[$field]) {
            $suspiciousChanges = true;
            error_log("Suspicious change detected for user $id: $field changed by $change");
            break;
        }
    }

    if ($suspiciousChanges) {
        // Store last valid data
        $stmt = $conn->prepare("INSERT INTO user_data_backup (user_id, data, backup_date) 
                               VALUES (?, ?, NOW())");
        $stmt->execute([$id, json_encode($currentData)]);

        // Add to ban list
        $stmt = $conn->prepare("INSERT INTO banned_users (user_id, reason, banned_at) 
                               VALUES (?, ?, NOW())");
        $stmt->execute([$id, "Suspicious balance changes detected"]);

        // Return last valid data
        echo json_encode([
            "status" => "success",
            "data" => $currentData
        ]);
        exit;
    }

    // If no suspicious changes, proceed with update
    $stmt = $conn->prepare("UPDATE user_data SET 
        coins = ?, 
        tickets = ?, 
        ton_balance = ?, 
        stars_balance = ? 
        WHERE id = ?");
        
    $stmt->execute([
        $newCoins,
        $newTickets,
        $newTonBalance,
        $newStarsBalance,
        $id
    ]);

    echo json_encode([
        "status" => "success",
        "data" => [
            "coins" => $newCoins,
            "tickets" => $newTickets,
            "ton_balance" => $newTonBalance,
            "stars_balance" => $newStarsBalance
        ]
    ]);

} catch (Exception $e) {
    error_log("Error in balance.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        "status" => "error", 
        "message" => $e->getMessage()
    ]);
} 