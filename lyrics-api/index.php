<?php
// lyrics-api/index.php

require_once __DIR__ . '/vendor/autoload.php';
use SpotifyLyricsApi\Spotify;
use Dotenv\Dotenv;

// Load environment variables
$dotenv = Dotenv::createImmutable(__DIR__);
$dotenv->load();

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

$trackid = $_GET['trackid'] ?? null;

if (!$trackid) {
    http_response_code(400);
    echo json_encode(['error' => true, 'message' => 'trackid parameter is required!']);
    exit;
}

try {
    $sp_dc = $_ENV['SP_DC'] ?? null;
    if (!$sp_dc) {
        throw new Exception('SP_DC environment variable is not set.');
    }

    $spotify = new Spotify($sp_dc);
    $spotify->checkTokenExpire();
    $response = $spotify->getLyrics(track_id: $trackid);
    echo $response;
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => true, 'message' => $e->getMessage()]);
}