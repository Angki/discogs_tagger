<?php

use CodeIgniter\Router\RouteCollection;

/**
 * @var RouteCollection $routes
 */
$routes->get('/', 'Home::index');

$routes->group('api', ['namespace' => 'App\Controllers\Api'], function ($routes) {
    $routes->get('scan', 'Scan::index');
    $routes->get('search', 'Search::index');
    $routes->post('tag', 'Tag::create');
});
