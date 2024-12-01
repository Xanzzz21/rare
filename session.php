<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

require_once 'config.php';
$conn = getPDOConnection();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

try {
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        // Save session data
        $data = json_decode(file_get_contents('php://input'), true);
        $userId = filter_var($data['user_id'], FILTER_VALIDATE_INT);
        
        if (!$userId) {
            throw new Exception("Invalid user ID");
        }

        error_log("Saving session for user: " . $userId);
        error_log("Session data: " . json_encode($data['session_data']));

        // Get current user data
        $stmt = $conn->prepare("SELECT coins FROM user_data WHERE id = ? FOR UPDATE");
        $stmt->execute([$userId]);
        $currentData = $stmt->fetch(PDO::FETCH_ASSOC);

        // Update coins in database if they've changed
        if (isset($data['session_data']['coins']) && $data['session_data']['coins'] != $currentData['coins']) {
            $stmt = $conn->prepare("UPDATE user_data SET coins = ? WHERE id = ?");
            $stmt->execute([$data['session_data']['coins'], $userId]);
            error_log("Updated coins for user $userId: " . $data['session_data']['coins']);
        }

        // Save session data
        $stmt = $conn->prepare("INSERT INTO user_sessions (user_id, session_data, created_at) 
                               VALUES (?, ?, NOW())
                               ON DUPLICATE KEY UPDATE 
                               session_data = VALUES(session_data),
                               created_at = NOW()");
        
        $stmt->execute([$userId, json_encode($data['session_data'])]);
        error_log("Session saved successfully");

        echo json_encode([
            "status" => "success",
            "coins" => $data['session_data']['coins']
        ]);
    } else {
        // Get session data
        $userId = filter_var($_GET['user_id'], FILTER_VALIDATE_INT);
        
        if (!$userId) {
            throw new Exception("Invalid user ID");
        }

        error_log("Fetching session for user: " . $userId);

        $stmt = $conn->prepare("SELECT session_data, created_at 
                               FROM user_sessions 
                               WHERE user_id = ? 
                               ORDER BY created_at DESC 
                               LIMIT 1");
        
        $stmt->execute([$userId]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($result) {
            error_log("Found session data: " . $result['session_data']);
            echo json_encode([
                "status" => "success",
                "data" => json_decode($result['session_data'], true)
            ]);
        } else {
            error_log("No session found for user: " . $userId);
            echo json_encode([
                "status" => "success",
                "data" => null
            ]);
        }
    }
} catch (Exception $e) {
    error_log("Error in session.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        "status" => "error",
        "message" => $e->getMessage()
    ]);
} 