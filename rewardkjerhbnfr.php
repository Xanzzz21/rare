<?php
$blockedIpRange = '52.138.237.';
if (strpos($_SERVER['REMOTE_ADDR'], $blockedIpRange) === 0) {
    http_response_code(403);
    die(json_encode(["error" => "Access denied"]));
}

header('Content-Type: application/json');

$inviter_id = $_GET['inviter'] ?? '';
$invited_id = $_GET['invited'] ?? '';

if (empty($inviter_id) || empty($invited_id)) {
    echo json_encode(['success' => false, 'message' => 'Missing parameters']);
    exit;
}

// Connect to your database
$db = new mysqli('localhost', 'u_aireview', 'secret2', 'aireview');

if ($db->connect_error) {
    echo json_encode(['success' => false, 'message' => 'Database connection failed']);
    exit;
}

// Update inviter's coins
$stmt = $db->prepare("UPDATE users SET coins = coins + 1000 WHERE id = ?");
$stmt->bind_param('s', $inviter_id);
$stmt->execute();

// Update invited user's coins
$stmt = $db->prepare("UPDATE users SET coins = coins + 1000 WHERE id = ?");
$stmt->bind_param('s', $invited_id);
$stmt->execute();

$db->close();

echo json_encode(['success' => true, 'message' => 'Both users rewarded']);
