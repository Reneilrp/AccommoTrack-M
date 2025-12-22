FROM php:8.2.12-apache

# 1. System setup (Do this first - it rarely changes)
RUN apt-get update && apt-get install -y libzip-dev zip unzip git \
    && docker-php-ext-install pdo pdo_mysql zip \
    && a2enmod rewrite

# 2. Tools
COPY --from=composer:lts /usr/bin/composer /usr/bin/composer

# 3. Apache Config (Do this BEFORE copying code)
ENV APACHE_DOCUMENT_ROOT /var/www/html/backend/public
RUN sed -ri -e 's!/var/www/html!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/sites-available/*.conf
RUN sed -ri -e 's!/var/www/!${APACHE_DOCUMENT_ROOT}/!g' /etc/apache2/apache2.conf /etc/apache2/conf-available/*.conf

# 4. Working Directory
WORKDIR /var/www/html

# 5. Copy Code (Do this late because code changes often)
COPY . .

# 6. Install Dependencies
RUN cd backend && composer install --no-interaction --optimize-autoloader

# 7. Permissions (MUST stay as ROOT to change ownership)
RUN chown -R www-data:www-data /var/www/html/backend/storage /var/www/html/backend/bootstrap/cache
