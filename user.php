<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Telegram-Init-Data");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once 'config.php';
$conn = getPDOConnection();

try {
    // Get and validate user ID
    $id = filter_var($_GET['id'], FILTER_VALIDATE_INT);
    if (!$id) {
        throw new Exception("Invalid user ID");
    }

    // First get current user data
    $stmt = $conn->prepare("SELECT * FROM user_data WHERE id = ?");
    $stmt->execute([$id]);
    $currentData = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$currentData) {
        throw new Exception("User not found");
    }

    // Get and validate updates
    $allowedUpdates = [
        'current_gradient' => filter_var($_GET['current_gradient'], FILTER_SANITIZE_STRING),
        'current_coin' => filter_var($_GET['current_coin'], FILTER_SANITIZE_STRING),
        'current_emblem' => filter_var(urldecode($_GET['current_emblem']), FILTER_SANITIZE_STRING),
        'owned_emblems' => filter_var($_GET['owned_emblems'], FILTER_SANITIZE_STRING),
        'last_reward_date' => date('Y-m-d')
    ];

    // Validate allowed items
    $validGradients = ['basic', 'sunset', 'forest', 'lavender', 'fire', 'northern-lights', 'gold', 'pig', 'purple', 'black-dark'];
    $validCoins = ['pig', 'banknote', 'binance', 'telegram'];
    $validEmblems = ['crown', 'star', 'heart', 'diamond', 'bolt', 'fire', 'telegram', 'jedi', 'bitcoin', 'poo', 'johny', ''];

    // Validate current selections
    if (!in_array($allowedUpdates['current_gradient'], $validGradients)) {
        $allowedUpdates['current_gradient'] = 'basic';
    }
    if (!in_array($allowedUpdates['current_coin'], $validCoins)) {
        $allowedUpdates['current_coin'] = 'pig';
    }
    if (!in_array($allowedUpdates['current_emblem'], $validEmblems)) {
        $allowedUpdates['current_emblem'] = '';
    }

    // Parse owned items
    $ownedGradients = explode(',', $currentData['owned_gradients']);
    $ownedCoins = explode(',', $currentData['owned_coins']);
    
    // Handle owned emblems properly
    $currentOwnedEmblems = !empty($currentData['owned_emblems']) ? 
        explode(',', $currentData['owned_emblems']) : 
        [];
    $newOwnedEmblems = !empty($allowedUpdates['owned_emblems']) ? 
        explode(',', $allowedUpdates['owned_emblems']) : 
        [];
    $ownedEmblems = array_unique(array_merge($currentOwnedEmblems, $newOwnedEmblems));
    $ownedEmblems = array_filter($ownedEmblems); // Remove empty values

    // When buying new emblem, add it to owned list
    if (!empty($allowedUpdates['current_emblem']) && !in_array($allowedUpdates['current_emblem'], $ownedEmblems)) {
        $ownedEmblems[] = $allowedUpdates['current_emblem'];
    }

    // Verify ownership (except for newly bought items)
    if (!in_array($allowedUpdates['current_gradient'], $ownedGradients)) {
        throw new Exception("Gradient not owned");
    }
    if (!in_array($allowedUpdates['current_coin'], $ownedCoins)) {
        throw new Exception("Coin not owned");
    }

    // Update database
    $stmt = $conn->prepare("UPDATE user_data SET 
        current_gradient = ?,
        current_coin = ?,
        current_emblem = ?,
        owned_emblems = ?,
        last_reward_date = ?
        WHERE id = ?");
        
    $success = $stmt->execute([
        $allowedUpdates['current_gradient'],
        $allowedUpdates['current_coin'],
        $allowedUpdates['current_emblem'],
        implode(',', $ownedEmblems),
        $allowedUpdates['last_reward_date'],
        $id
    ]);

    if (!$success) {
        throw new Exception("Failed to update user preferences");
    }

    echo json_encode([
        "status" => "success",
        "last_reward_date" => $allowedUpdates['last_reward_date'],
        "updates" => [
            "current_gradient" => $allowedUpdates['current_gradient'],
            "current_coin" => $allowedUpdates['current_coin'],
            "current_emblem" => $allowedUpdates['current_emblem'],
            "owned_emblems" => implode(',', $ownedEmblems)
        ]
    ]);

} catch (Exception $e) {
    error_log("Error in user.php: " . $e->getMessage());
    error_log("Request data: " . json_encode($_GET));
    http_response_code(500);
    echo json_encode([
        "status" => "error", 
        "message" => $e->getMessage()
    ]);
} 