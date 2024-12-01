<?php
// Strict error handling
error_reporting(E_ALL);
ini_set('display_errors', 0); // Don't display errors to users
ini_set('display_startup_errors', 0);
ini_set('log_errors', 1);

// Set timezone
date_default_timezone_set('UTC');

// Create error log file
$error_log_file = __DIR__ . '/error.log';
if (!file_exists($error_log_file)) {
    touch($error_log_file);
    chmod($error_log_file, 0666);
}
ini_set('error_log', $error_log_file);

// Database configuration
$servername = "localhost";
$db_username = "u_aireview";
$db_password = "secret2";
$dbname = "aireview";
$dsn = "mysql:host=$servername;dbname=$dbname;charset=utf8mb4";

// Bot token
$bot_token = '7659168554:AAFajrC6wLuU-l0PmMCbsemao9KFYsTJw60';

// Global PDO connection
$pdo = null;

try {
    $pdo = new PDO($dsn, $db_username, $db_password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
        PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4"
    ]);
    error_log("Database connection successful");
} catch (PDOException $e) {
    error_log("Database connection failed: " . $e->getMessage());
    http_response_code(500);
    die(json_encode(["error" => "Database connection failed"]));
}

// Function to verify Telegram authorization
function verifyTelegramAuth($initData) {
    global $bot_token;
    
    try {
        error_log("Verifying auth for initData: " . substr($initData, 0, 100));
        
        // Parse the initData
        parse_str($initData, $auth_data);
        if (empty($auth_data)) {
            throw new Exception("Failed to parse initData");
        }
        
        if (!isset($auth_data['hash'])) {
            throw new Exception("Hash not found in auth_data");
        }

        // Extract and verify hash
        $check_hash = $auth_data['hash'];
        unset($auth_data['hash']);
        
        // Get bot_id from token
        $bot_id = explode(':', $bot_token)[0];
        
        // Build data check string
        $data_check_arr = [];
        foreach ($auth_data as $key => $value) {
            if ($key === 'user') {
                $value = json_encode(json_decode($value, true), JSON_UNESCAPED_SLASHES);
            }
            $data_check_arr[] = "$key=$value";
        }
        sort($data_check_arr);
        $data_check_string = $bot_id . "\n" . implode("\n", $data_check_arr);
        
        // Calculate hash
        $secret_key = hash_hmac('sha256', 'WebAppData', $bot_token, true);
        $hash = bin2hex(hash_hmac('sha256', $data_check_string, $secret_key));
        
        if (strcmp($hash, $check_hash) !== 0) {
            throw new Exception("Invalid hash");
        }

        // Check auth date
        if (!isset($auth_data['auth_date']) || (time() - $auth_data['auth_date']) > 86400) {
            throw new Exception("Auth date expired");
        }

        // Parse user data
        if (!isset($auth_data['user'])) {
            throw new Exception("User data not found");
        }
        
        $user_data = json_decode($auth_data['user'], true);
        if (!$user_data || !isset($user_data['id'])) {
            throw new Exception("Invalid user data");
        }

        return ['success' => true, 'user_data' => $user_data];
        
    } catch (Exception $e) {
        error_log("Auth verification failed: " . $e->getMessage());
        return ['success' => false, 'error' => $e->getMessage()];
    }
}

// Function to validate and sanitize input
function sanitizeInput($value, $type = 'string') {
    switch ($type) {
        case 'int':
            return filter_var($value, FILTER_VALIDATE_INT);
        case 'float':
            return filter_var($value, FILTER_VALIDATE_FLOAT);
        case 'string':
            return filter_var($value, FILTER_SANITIZE_STRING);
        default:
            return null;
    }
}

// Function to handle database errors
function handleDbError($e) {
    error_log("Database error: " . $e->getMessage());
    error_log("Stack trace: " . $e->getTraceAsString());
    http_response_code(500);
    die(json_encode(["error" => "Database error"]));
}

// Function to send JSON response
function sendJsonResponse($data, $status = 200) {
    http_response_code($status);
    header('Content-Type: application/json');
    echo json_encode($data);
    exit;
}

function getPDOConnection() {
    $servername = "localhost";
    $username = "u_aireview";
    $password = "secret2";
    $dbname = "aireview";

    try {
        $conn = new PDO("mysql:host=$servername;dbname=$dbname", $username, $password);
        // Set PDO to throw exceptions on error
        $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        return $conn;
    } catch(PDOException $e) {
        die(json_encode(["error" => "Connection failed: " . $e->getMessage()]));
    }
}

// Add these constants to config.php
define('MAX_USERNAME_LENGTH', 64);
define('MAX_STRING_LENGTH', 255);
define('MAX_COINS', 999999999); // Set reasonable maximum values

// Add these functions to config.php
function trackDataChanges($userId, $oldData, $newData) {
    global $pdo;
    
    // Check for suspicious changes
    $suspiciousChanges = false;
    
    // Define maximum allowed changes
    $maxAllowedChange = [
        'coins' => 10000,
        'tickets' => 10,
        'ton_balance' => 1.0,
        'stars_balance' => 100
    ];
    
    foreach ($maxAllowedChange as $field => $maxChange) {
        if (isset($oldData[$field]) && isset($newData[$field])) {
            $change = abs($newData[$field] - $oldData[$field]);
            if ($change > $maxChange) {
                $suspiciousChanges = true;
                break;
            }
        }
    }
    
    if ($suspiciousChanges) {
        // Silently add to ban list
        $stmt = $pdo->prepare("INSERT INTO banned_users (user_id, reason, banned_at) VALUES (?, 'Suspicious data changes', NOW())");
        $stmt->execute([$userId]);
        
        // Store the last valid data
        $stmt = $pdo->prepare("INSERT INTO user_data_backup (user_id, data, backup_date) VALUES (?, ?, NOW())");
        $stmt->execute([$userId, json_encode($oldData)]);
    }
}

function getLastValidData($userId) {
    global $pdo;
    
    $stmt = $pdo->prepare("SELECT data FROM user_data_backup WHERE user_id = ? ORDER BY backup_date DESC LIMIT 1");
    $stmt->execute([$userId]);
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    
    return $result ? json_decode($result['data'], true) : null;
}

function isUserBanned($userId) {
    global $pdo;
    
    $stmt = $pdo->prepare("SELECT 1 FROM banned_users WHERE user_id = ?");
    $stmt->execute([$userId]);
    return $stmt->rowCount() > 0;
}

error_log("Config file loaded successfully");
?> 