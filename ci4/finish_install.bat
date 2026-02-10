@echo off
echo Installing implementation dependencies...
composer require guzzlehttp/guzzle james-heinrich/getid3 vlucas/phpdotenv --ignore-platform-reqs

echo Checking Framework...
if not exist "vendor\codeigniter4\framework" (
    echo Framework missing. Installing...
    composer require codeigniter4/framework --ignore-platform-reqs
)

echo Done! Please ensure your web server points to ci4/public.
pause
