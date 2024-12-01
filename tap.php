<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once 'config.php';
$conn = getPDOConnection();

try {
    $id = filter_var($_POST['id'], FILTER_VALIDATE_INT);
    if (!$id) {
        throw new Exception("Invalid user ID");
    }

    // First get current data with row lock
    $stmt = $conn->prepare("SELECT daily_tap_count, last_tap_reset_date, coins FROM user_data WHERE id = ? FOR UPDATE");
    $stmt->execute([$id]);
    $currentData = $stmt->fetch(PDO::FETCH_ASSOC);

    $today = date('Y-m-d');

    // Initialize daily_tap_count
    $daily_tap_count = 0;

    // Check if we need to reset the count
    if (!$currentData['last_tap_reset_date'] || $currentData['last_tap_reset_date'] !== $today) {
        // New day, start from 1
        $daily_tap_count = 1;
    } else {
        // Same day, add exactly 1 to current count
        $daily_tap_count = intval($currentData['daily_tap_count']) + 1;
    }

    // Make sure we don't exceed the limit
    if ($daily_tap_count > 8000) {
        throw new Exception("Daily tap limit reached");
    }

    // Calculate new coin balance
    $new_coins = intval($currentData['coins']) + 1;

    error_log("User $id: Current count: " . $currentData['daily_tap_count'] . ", New count: $daily_tap_count, New coins: $new_coins");

    // Update both tap count and coins
    $stmt = $conn->prepare("UPDATE user_data SET 
        daily_tap_count = ?,
        last_tap_reset_date = ?,
        coins = ?
        WHERE id = ?");
        
    $stmt->execute([$daily_tap_count, $today, $new_coins, $id]);

    echo json_encode([
        "status" => "success",
        "daily_tap_count" => $daily_tap_count,
        "last_tap_reset_date" => $today,
        "coins" => $new_coins
    ]);

} catch (Exception $e) {
    error_log("Error in tap.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        "status" => "error", 
        "message" => $e->getMessage()
    ]);
} 