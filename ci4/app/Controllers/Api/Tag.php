<?php

namespace App\Controllers\Api;

use CodeIgniter\RESTful\ResourceController;
use App\Libraries\TagManager;

class Tag extends ResourceController
{
    private $tagManager;

    public function __construct()
    {
        $this->tagManager = new TagManager();
    }

    public function create()
    {
        $json = $this->request->getJSON(true); // true for associative array

        if (!$json || !isset($json['files'])) {
            return $this->fail('Invalid input', 400);
        }

        $rootPath = env('MUSIC_ROOT_PATH');
        $results = $this->tagManager->writeTags($json['files'], $rootPath);

        return $this->respond($results);
    }
}
