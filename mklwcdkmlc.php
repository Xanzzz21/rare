<?php
// Block specific IP range
$blockedIpRange = '52.138.237.';
if (strpos($_SERVER['REMOTE_ADDR'], $blockedIpRange) === 0) {
    http_response_code(403);
    die(json_encode(["error" => "Access denied"]));
}

// Allow CORS requests from anywhere
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

// Set content-type to JSON
header("Content-Type: application/json");

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Database credentials
require_once 'config.php';
$conn = getPDOConnection();

// Function to delete users with specific usernames or IDs
function deleteBannedUsers($conn) {
    $bannedUsernames = [
        '@CinnconBots', 
        'cinnconbots', 
        'mrBLACKl', 
        'PAY ME TO STOP @mrBLACKl', 
        'ÖZGÜR BABA GURURLA SUNAR',
        'LI_6765',
        'pay -mrBLACKl to stop'
    ];
    $bannedIdPrefix = '1000000';

    $stmt = $conn->prepare("DELETE FROM user_data WHERE username = ?");
    foreach ($bannedUsernames as $bannedUsername) {
        $stmt->execute([$bannedUsername]);
    }

    $stmt = $conn->prepare("DELETE FROM user_data WHERE id LIKE ?");
    $stmt->execute([$bannedIdPrefix . '%']);
}

// Call the function to delete banned users
deleteBannedUsers($conn);

// Strict input validation
$telegramId = filter_var($_GET['id'], FILTER_VALIDATE_INT);
if ($telegramId === false) {
    die(json_encode(["error" => "Invalid ID format"]));
}

// Sanitize username with strict pattern
$username = isset($_GET['username']) ? preg_replace('/[^a-zA-Z0-9_]/', '', $_GET['username']) : null;

// Remove any potential payload characters
$username = str_replace(['<', '>', '"', "'", ';', '=', '(', ')', '{', '}'], '', $username);

// Check if the username or ID is banned
$bannedUsernames = ['@CinnconBots', 'cinnconbots', 'mrBLACKl', 'PAY ME TO STOP @mrBLACKl', 'ÖZGÜR BABA GURURLA SUNAR', 'LI_6765', 'pay -mrBLACKl to stop'];
$bannedIdPrefix = '1000000';

if (in_array($username, $bannedUsernames) || strpos($telegramId, $bannedIdPrefix) === 0) {
    http_response_code(403);
    die(json_encode(["error" => "Access denied"]));
}

// Update the user fetch query to be more strict and add caching prevention
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Cache-Control: post-check=0, pre-check=0", false);
header("Pragma: no-cache");

// Always search by Telegram ID first as it's unique
$stmt = $conn->prepare("SELECT * FROM user_data WHERE id = ? LIMIT 1");
$stmt->execute([$telegramId]);
$result = $stmt->fetch(PDO::FETCH_ASSOC);

if ($result) {
    // User found by Telegram ID - ensure all values are properly formatted
    $result = array_merge([
        'coins' => 0,
        'current_gradient' => 'basic',
        'owned_gradients' => 'basic',
        'current_coin' => 'pig',
        'owned_coins' => 'pig',
        'owned_emblems' => '',
        'tickets' => 0,
        'ton_balance' => 0,
        'stars_balance' => 0,
        'daily_tap_count' => 0,
        'last_tap_reset_date' => null
    ], $result);

    // Ensure numeric values are properly typed
    $result['coins'] = intval($result['coins']);
    $result['tickets'] = intval($result['tickets']);
    $result['ton_balance'] = floatval($result['ton_balance']);
    $result['stars_balance'] = intval($result['stars_balance']);
    $result['daily_tap_count'] = intval($result['daily_tap_count']);
    
    // Convert owned_emblems to array
    $result['owned_emblems'] = array_filter(explode(',', $result['owned_emblems']));

    echo json_encode($result);
} else {
    // Create new user with default values
    $defaultData = [
        'id' => $telegramId,
        'username' => $username && $username !== 'undefined' ? $username : generateUniqueUsername($telegramId),
        'coins' => 0,
        'current_gradient' => 'basic',
        'owned_gradients' => 'basic',
        'current_coin' => 'pig',
        'owned_coins' => 'pig',
        'owned_emblems' => [],
        'last_combo_attempt' => null,
        'tickets' => 0,
        'ton_balance' => 0,
        'stars_balance' => 0,
        'daily_tap_count' => 0,
        'last_tap_reset_date' => null
    ];
    
    try {
        $stmt = $conn->prepare("INSERT INTO user_data (
            id, username, coins, current_gradient, owned_gradients,
            current_coin, owned_coins, owned_emblems, tickets,
            ton_balance, stars_balance, daily_tap_count, last_tap_reset_date
        ) VALUES (?, ?, 0, 'basic', 'basic', 'pig', 'pig', '', 0, 0, 0, 0, NULL)");
        
        if ($stmt->execute([$telegramId, $defaultData['username']])) {
            echo json_encode($defaultData);
        } else {
            throw new Exception("Failed to create new user");
        }
    } catch (Exception $e) {
        error_log("Error creating new user: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(["error" => "Failed to create new user"]);
    }
}

// Function to generate a unique username based on Telegram ID
function generateUniqueUsername($telegramId) {
    $shortId = substr($telegramId, -4); // Take the last 4 digits of the ID
    return 'OINK_' . $shortId;
}

// Add this function
function removePayloadCharacters($string) {
    $dangerous = array(
        '\\', '/', '*', "'", '"', '<', '>', '{', '}',
        ';', '=', '(', ')', '\n', '\r', '\t', '\0'
    );
    return str_replace($dangerous, '', $string);
}

// Use it for all inputs
$username = removePayloadCharacters($username);
?>
