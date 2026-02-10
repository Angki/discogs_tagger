<?php

namespace App\Libraries;

use getID3;
use getid3_lib;
use getid3_writetags;

class TagManager
{
    private $getID3;

    public function __construct()
    {
        $this->getID3 = new getID3;
    }

    /**
     * Read tags from a file.
     *
     * @param string $filePath
     * @param string $rootPath
     * @return array
     */
    public function readTags($filePath, $rootPath)
    {
        $info = $this->getID3->analyze($filePath);
        getid3_lib::CopyTagsToComments($info);

        $tags = $info['comments_html'] ?? [];

        $artist = $tags['artist'][0] ?? '';
        $album_artist = $tags['band'][0] ?? ($tags['album_artist'][0] ?? '');
        $title = $tags['title'][0] ?? basename($filePath);
        $album = $tags['album'][0] ?? '';
        $year = $tags['year'][0] ?? '';
        $genre = $tags['genre'][0] ?? '';
        $track = $tags['track_number'][0] ?? '';
        $publisher = $tags['publisher'][0] ?? ($tags['label'][0] ?? '');

        $cover = null;
        if (isset($info['comments']['picture'][0])) {
            $pic = $info['comments']['picture'][0];
            $mime = $pic['image_mime'] ?? 'image/jpeg';
            $data = $pic['data'];
            $cover = 'data:' . $mime . ';base64,' . base64_encode($data);
        }

        return [
            'name' => basename($filePath),
            // Use str_ireplace for case-insensitive replacement to be safe on Windows
            'path' => str_ireplace(realpath($rootPath), '', $filePath),
            'artist' => $artist,
            'album_artist' => $album_artist,
            'title' => $title,
            'album' => $album,
            'year' => $year,
            'genre' => $genre,
            'track' => $track,
            'publisher' => $publisher,
            'cover' => $cover
        ];
    }

    public function writeTags($filesData, $rootPath)
    {
        $tagwriter = new getid3_writetags;
        $tagwriter->tag_encoding = 'UTF-8';
        $tagwriter->tagformats = ['id3v2.3'];
        $tagwriter->overwrite_tags = true;
        // Note: overwrite_tags = true wipes existing tags. 
        // We must re-supply existing tags (Art, Genre) if we want to keep them.

        $results = [];

        foreach ($filesData as $file) {
            // Fix: If file['path'] implies absolute path or leads with slash, handle carefully.
            // But we stripped root path in readTags.
            // So $file['path'] should be "\Artist\Album\Song.mp3".
            // realpath($root . $file['path']) works.

            // Check if path is erroneously absolute (contains :)
            $relativePath = $file['path'];
            if (strpos($relativePath, ':') !== false) {
                // It's absolute. Try to strip root again or use as is if it matches root?
                // Safer: just verify it starts with root.
                if (stripos($relativePath, $rootPath) === 0) {
                    // It is full path.
                    $fullPath = $relativePath;
                } else {
                    // Mismatch ? 
                    $results[] = ['file' => $file['path'], 'status' => 'error', 'message' => 'Invalid path structure (' . $relativePath . ')'];
                    continue;
                }
            } else {
                $fullPath = realpath($rootPath . DIRECTORY_SEPARATOR . $relativePath);
            }

            if (!$fullPath || !file_exists($fullPath)) {
                // Debugging aid: include the attempted path in error
                $attempted = $rootPath . DIRECTORY_SEPARATOR . $relativePath;
                $results[] = ['file' => $file['path'], 'status' => 'error', 'message' => 'File not found on disk. Attempted: ' . $attempted];
                continue;
            }

            // 1. Analyze existing file to get current Art and Genre
            $currentInfo = $this->getID3->analyze($fullPath);
            getid3_lib::CopyTagsToComments($currentInfo);

            // Genre: Keep existing unless empty? User said "keep genre from existing file"
            // So we prefer the file's genre over the one in $file['genre'] (which implies ignoring Discogs genre)
            $existingGenre = $currentInfo['comments']['genre'][0] ?? '';
            $finalGenre = !empty($existingGenre) ? $existingGenre : ($file['genre'] ?? '');

            // Artwork Logic
            $finalPicture = null;

            // A. Check if file already has art
            if (isset($currentInfo['comments']['picture'][0])) {
                $existingPic = $currentInfo['comments']['picture'][0];

                // Construct a clean array for writeTags
                // id3v2writer expects: data, picturetypeid, description, mime
                $finalPicture = [
                    'data' => $existingPic['data'],
                    'picturetypeid' => $existingPic['picturetypeid'] ?? 0x03, // Default to cover
                    'description' => $existingPic['description'] ?? 'cover',
                    'mime' => $existingPic['image_mime'] ?? ($existingPic['mime'] ?? 'image/jpeg')
                ];
            }
            // B. If no art, check folder for common images
            else {
                $dir = dirname($fullPath);
                $commonNames = ['cover.jpg', 'folder.jpg', 'front.jpg', 'cover.png', 'folder.png', 'artwork.jpg'];
                foreach ($commonNames as $name) {
                    $imgPath = $dir . DIRECTORY_SEPARATOR . $name;
                    if (file_exists($imgPath)) {
                        $imgData = file_get_contents($imgPath);
                        $mime = mime_content_type($imgPath);

                        $finalPicture = [
                            'data' => $imgData,
                            'picturetypeid' => 0x03,
                            'description' => 'cover',
                            'mime' => $mime
                        ];
                        break;
                    }
                }
            }

            $tagwriter->filename = $fullPath;

            $tagData = [
                'title' => [$file['title'] ?? ''],
                'artist' => [$file['artist'] ?? ''],
                'album' => [$file['album'] ?? ''],
                'year' => [$file['year'] ?? ''],
                'genre' => [$finalGenre],
                'track_number' => [$file['track'] ?? ''],
                'publisher' => [$file['publisher'] ?? ''], // New Publisher Tag
            ];

            // Re-attach artwork if found
            if ($finalPicture) {
                $tagData['attached_picture'] = [$finalPicture];
            }

            // Handle Album Artist
            if (!empty($file['album_artist'])) {
                $tagData['band'] = [$file['album_artist']];
                $tagData['part_of_a_set'] = []; // Clear disc number if not handled, or handle it? Keeping simple for now.
            }

            $tagwriter->tag_data = $tagData;

            if ($tagwriter->WriteTags()) {
                $results[] = ['file' => $file['path'], 'status' => 'success'];
            } else {
                $results[] = ['file' => $file['path'], 'status' => 'error', 'message' => implode(', ', $tagwriter->errors)];
            }
        }

        return $results;
    }
}
