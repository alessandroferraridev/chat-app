# syntax=docker/dockerfile:1

FROM composer:2 AS composer_deps
WORKDIR /app
COPY composer.json composer.lock ./
RUN composer install --no-dev --prefer-dist --no-interaction --no-progress --optimize-autoloader --no-scripts

FROM node:22-alpine AS frontend_build
WORKDIR /app
ARG VITE_APP_NAME=ChatApp
ARG VITE_REVERB_APP_KEY=local-key
ARG VITE_REVERB_HOST=localhost
ARG VITE_REVERB_PORT=9000
ARG VITE_REVERB_SCHEME=http
ENV VITE_APP_NAME=$VITE_APP_NAME
ENV VITE_REVERB_APP_KEY=$VITE_REVERB_APP_KEY
ENV VITE_REVERB_HOST=$VITE_REVERB_HOST
ENV VITE_REVERB_PORT=$VITE_REVERB_PORT
ENV VITE_REVERB_SCHEME=$VITE_REVERB_SCHEME
COPY package.json package-lock.json* ./
RUN npm install --no-audit --no-fund
COPY resources ./resources
COPY public ./public
COPY vite.config.js tsconfig.json ./
RUN npm run build

FROM php:8.4-apache AS runtime
WORKDIR /var/www/html

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        libpq-dev \
        libzip-dev \
        unzip \
        git \
        supervisor \
    && docker-php-ext-install pdo_pgsql bcmath pcntl zip opcache \
    && a2enmod rewrite headers \
    && rm -rf /var/lib/apt/lists/*

ENV APACHE_DOCUMENT_ROOT=/var/www/html/public
RUN sed -ri -e 's!/var/www/html!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/sites-available/*.conf \
    && sed -ri -e 's!/var/www/!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/apache2.conf /etc/apache2/conf-available/*.conf

COPY . .
COPY --from=composer_deps /app/vendor ./vendor
COPY --from=frontend_build /app/public/build ./public/build
COPY docker/supervisord.conf /etc/supervisor/conf.d/supervisord.conf
COPY docker/start.sh /usr/local/bin/start-container

RUN mkdir -p storage/framework/cache storage/framework/sessions storage/framework/views \
    && rm -f bootstrap/cache/*.php \
    && php artisan package:discover --ansi \
    && chmod +x /usr/local/bin/start-container \
    && chown -R www-data:www-data storage bootstrap/cache \
    && chmod -R ug+rwx storage bootstrap/cache

EXPOSE 80 9000

CMD ["/usr/local/bin/start-container"]
