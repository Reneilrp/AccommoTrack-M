#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

echo "🚀 Starting Deployment..."

cd /var/www/accommotrack/backend

echo "📥 Pulling latest code..."
# Replace 'beta-testing' with 'master' or your production branch if needed
git pull origin beta-testing

export COMPOSER_ALLOW_SUPERUSER=1
echo "📦 Installing composer dependencies..."
composer install --no-interaction --prefer-dist --optimize-autoloader --no-dev --ignore-platform-reqs

echo "🗄️ Running database migrations..."
php artisan migrate --force

echo "🧹 Clearing and optimizing caches..."
php artisan optimize:clear
php artisan optimize

echo "🔄 Restarting queue workers..."
php artisan queue:restart

echo "⚡ Reloading PHP-FPM..."
# We use sudo here, so running this script will prompt for your server password
sudo systemctl reload php8.3-fpm

echo "✅ Deployment finished successfully!"
