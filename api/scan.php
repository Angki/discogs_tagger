<?php
header('Content-Type: application/json');
require '../vendor/autoload.php';

use Dotenv\Dotenv;
use App\Controllers\ScanController;

$dotenv = Dotenv::createImmutable(__DIR__ . '/../');
$dotenv->load();

$controller = new ScanController();
$controller->handleRequest();
