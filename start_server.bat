@echo off
cd ci4
echo Starting Discogs Tagger...
echo Open http://localhost:8080 in your browser.
php -S localhost:8080 -t public
pause
