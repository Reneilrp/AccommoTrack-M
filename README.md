# AccommoTrack

This repository contains the **Laravel backend**, the **React Native (Expo) mobile app**, and the **React (Vite) web admin UI** for AccommoTrack. This `README.md` provides a step-by-step guide to clone, install dependencies, configure, and run every part of the project.

---

## Table of Contents

1. Prerequisites
2. Clone the repository
3. Backend — install & run
4. UI — install & run (Mobile + Web Admin)
5. Start XAMPP and database setup
6. Useful commands
7. Troubleshooting

---

## 1. Prerequisites

Make sure you have the following installed on your machine:

* Git
* Node.js (LTS recommended)
* npm (comes with Node.js)
* PHP (compatible with your Laravel version)
* Composer (for Laravel dependencies, if required)
* XAMPP (Apache + MySQL)
* Expo CLI (optional: `npm install -g expo-cli`) or use `npx expo`
* A code editor (VSCode recommended)

---

## 2. Clone the repository

Open a terminal (Git Bash / Command Prompt / PowerShell) and run:

```bash
git clone https://github.com/Reneilrp/AccommoTrack-M.git
cd AccommoTrack-m
```
Then git checkout testing or git switch testing

---

## 3. Backend — Install & Run

The backend folder contains the Laravel API. Follow these steps:

1. Open a terminal and go into the backend folder:

```bash
cd backend
```

2. Install JavaScript dependencies (if your backend uses npm for tooling):

```bash
npm install
```

> Note: If your Laravel backend requires PHP dependencies, run:
>
> ```bash
> composer install
> ```
>

3. Set up your `.env` inside backend folder file (database and app settings).

```env
APP_NAME=AccommoTrack
APP_ENV=local
APP_DEBUG=true
APP_URL=http://127.0.0.1:8000/

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=AccommoTrack-M
DB_USERNAME=root
DB_PASSWORD=    # (default for XAMPP is empty)
```

4. Generate application key (Laravel):

```bash
php artisan key:generate
```

5. Run migrations (if applicable):

```bash
php artisan migrate
```

6. Start the Laravel development server **binding to your machine IP** (so mobile devices can reach it):

```bash
php artisan serve --host="YOUR_LAPTOP_IP_ADDRESS" --port=8000
```

Replace `YOUR_LAPTOP_IP_ADDRESS` with your local network IP (see Section 5).

---

## 4. UI — Install & Run (Mobile + Web Admin)

All UI projects live under the `UI` folder. You will install each separately.

1. Open a terminal and navigate to the `UI` folder:

```bash
cd UI
```

### 4.1 Mobile app (AccommoTrackMobile)

```bash
cd AccommoTrackMobile
npm install

# Start Expo
npx expo start
```

* This opens Expo Developer Tools in your browser.
* To test on a physical device, install **Expo Go** and scan the QR code.
* If you need to point the app to the Laravel API, set the API URL in the mobile app's config or `.env` (e.g., `http://YOUR_LAPTOP_IP_ADDRESS:8000`).

### 4.2 Web Admin UI (web-admin-ui)

Open another terminal (or another tab/window) and run:

```bash
cd UI/web-admin-ui
npm install
npm run dev
```

* The Vite dev server usually opens at `http://localhost:5173` (or a port shown in the terminal).
* If the web admin needs to access the backend, configure its API base URL to `http://YOUR_LAPTOP_IP_ADDRESS:8000`.

---

## 5. Start XAMPP and Database Setup

1. Launch the **XAMPP Control Panel** and start **Apache** and **MySQL**.
2. Create a database for the project using phpMyAdmin ([http://localhost/phpmyadmin](http://localhost/phpmyadmin)) or the MySQL CLI. DB-Name= AccommoTrack-M
3. Update the Laravel `.env` DB settings as shown earlier.
4. Look For the DatabaseSchema Inside Backend/Database/DatabaseSchema. Dont mind the STI(Soon to Integrate) DatabaseSchema
### How to find YOUR_LAPTOP_IP_ADDRESS (Windows)

* Open Command Prompt or Git Bash and run:

```bash
ipconfig
```

* Look for the `IPv4 Address` under the active network adapter (e.g., `192.168.x.x`). Use that IP when running `php artisan serve --host="<IP>"` and for mobile app API URL.

---

## 6. Useful Commands Summary

**Repo root**

```bash
# clone
git clone <repo>
```

**Backend**

```bash
cd backend
npm install        # if applicable
composer install   # if Laravel uses Composer
php artisan key:generate
php artisan migrate
php artisan serve --host="YOUR_LAPTOP_IP_ADDRESS" --port=8000
```

**Mobile**

```bash
cd UI/AccommoTrackMobile
npm install
npx expo start
```

**Web Admin**

```bash
cd UI/web-admin-ui
npm install
npm run dev
```

---

## 7. Troubleshooting & Tips

* If your mobile device cannot reach the Laravel API, ensure:

  * Your laptop and mobile are on the **same Wi‑Fi network**.
  * The `php artisan serve` host is set to your laptop IP (not `127.0.0.1`).
  * Firewall is not blocking incoming connections to the chosen port (8000).

* If `composer` or `php` commands fail, verify PHP is installed and available in your PATH.

* If Vite uses a different port, check the terminal output to find the correct URL.

* If your backend uses API authentication, ensure any API tokens or CORS settings are configured.

---
