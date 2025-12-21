# --- STAGE 1: Install Dependencies ---
FROM composer:lts as deps
WORKDIR /app

# Since composer.json is in the ROOT, we reference it directly
RUN --mount=type=bind,source=composer.json,target=composer.json \
    --mount=type=bind,source=composer.lock,target=composer.lock \
    --mount=type=cache,target=/tmp/cache \
    composer install --no-dev --no-interaction

# --- STAGE 2: Final Runtime ---
FROM php:8.2.12-apache as final

# Install zip (needed for composer) and MySQL drivers
RUN apt-get update && apt-get install -y libzip-dev zip \
    && docker-php-ext-install pdo pdo_mysql zip \
    && a2enmod rewrite

# Production config
RUN mv "$PHP_INI_DIR/php.ini-production" "$PHP_INI_DIR/php.ini"

# Point Apache to backend/public
ENV APACHE_DOCUMENT_ROOT /var/www/html/backend/public
RUN sed -ri -e 's!/var/www/html!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/sites-available/*.conf
RUN sed -ri -e 's!/var/www/!${APACHE_DOCUMENT_ROOT}/!g' /etc/apache2/apache2.conf /etc/apache2/conf-available/*.conf

# 1. Copy everything from your root to the container
COPY . /var/www/html/

# 2. Copy the vendor folder from the deps stage INTO the backend folder
# This matches exactly what index.php line 14 is looking for
COPY --from=deps /app/vendor/ /var/www/html/backend/vendor/

# 3. Ensure permissions for the backend folders specifically
RUN chown -R www-data:www-data /var/www/html/backend/storage /var/www/html/backend/bootstrap/cache

# 4. (Make sure your Document Root is still this)
ENV APACHE_DOCUMENT_ROOT /var/www/html/backend/public

USER www-data