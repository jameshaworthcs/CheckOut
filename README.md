<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" 
            srcset="https://checkout.ac/static/images/1.3-white.png">
    <img width="300" alt="CheckOut Logo" 
         src="https://checkout.ac/static/images/chk_d_v.svg">
  </picture>
</p>

> [!IMPORTANT]  
> CheckOut is no longer actively maintained. To contribute to this repository, please fork it. This project is licensed under the MIT License.

Welcome to the **CheckOut** repository! Follow these instructions to get the application up and running smoothly.

---

## **Table of Contents**

1. [Clone the Repository](#1-clone-the-repository)
2. [Install Node.js](#2-install-nodejs)
3. [Install Dependencies](#3-install-dependencies)
4. [Set Up MySQL](#4-set-up-mysql)
   - [Install MySQL](#41-install-mysql)
   - [Import the Database](#42-import-the-database)
   - [Create the MySQL User](#43-create-the-mysql-user)
5. [Configure Environment Variables](#5-configure-environment-variables)
6. [Run the Application](#6-run-the-application)

---

## **1. Clone the Repository**

Start by cloning the repository from GitHub:

```bash
git clone https://github.com/jameshaworthcs/CheckOut.git
cd CheckOut
```

---

## **2. Install Node.js**

Ensure Node.js is installed on your machine:

### **On Ubuntu**

1. Update your package list:
   ```bash
   sudo apt update
   ```
2. Install Node.js and npm:
   ```bash
   sudo apt install nodejs npm -y
   ```
3. Verify the installation:
   ```bash
   node -v
   npm -v
   ```

---

## **3. Install Dependencies**

Install the required dependencies for the project:

```bash
npm install
```

---

## **4. Set Up MySQL**

### **4.1 Install MySQL**

Install MySQL and configure it for the project:

1. Install MySQL server:
   ```bash
   sudo apt install mysql-server -y
   ```
2. Start MySQL:
   ```bash
   sudo service mysql start
   ```
3. Secure MySQL installation:
   ```bash
   sudo mysql_secure_installation
   ```
   - Set a strong root password.
   - Answer "Yes" to all prompts to secure the installation.

---

### **4.2 Create the MySQL User**

Create a MySQL user specifically for the application:

1. Log in to MySQL as root:
   ```bash
   sudo mysql -u root -p
   ```
2. Enable password
   ```sql
   CREATE USER 'checkout'@'localhost' IDENTIFIED WITH mysql_native_password BY 'development';
   ```
3. Grant the user access to the `checkout_dev` database:
   ```sql
   GRANT ALL PRIVILEGES ON checkout_dev.* TO 'checkout'@'localhost';
   ```
4. Create database
   ```sql
   CREATE DATABASE checkout_dev;
   ```
5. Flush privileges
   ```sql
   FLUSH PRIVILEGES;
   ```
6. Exit the MySQL shell:
   ```sql
   EXIT;
   ```

---

### **4.3 Import the Database**

1. Use the schema file from: /databases/checkout_schema.sql

2. Import the schema into MySQL:

   **Note:** it will ask you for a password, use password 'development'. **Ignore error about users_dev not existing.**

   ```bash
   sudo mysql -u checkout -p checkout_dev < checkout_combined.sql
   ```

3. Configure timezone support

   **Note:** it will ask you for a password, use password 'development'. **Ignore unable to load errors.**
   Run the below command:

   ```bash
   sudo mysql_tzinfo_to_sql /usr/share/zoneinfo | sudo mysql -u root -p mysql
   ```

---

## **5. Configure Environment Variables**

1. Make a copy of the `.env.example` file:
   ```bash
   cp .env.example .env.local
   ```
2. No changes are needed to the `.env.local` file for basic functionality. The defaults will work provided MySQL is correctly set up.

3. For email functionality (optional):
   - Set `GOOGLE_EMAIL`: The Gmail address to send emails from
   - Set `GOOGLE_APPKEY`: Your Gmail App Password (generated from Google Account settings)
   Note: If these are not set, the application will skip sending emails and log messages to the console instead.

---

## **6. Run the Application**

The project uses TypeScript and can be started using:

```bash
npm start
```

## **7. Login as sysop**

To login as sysop, use the following API key in the 'Login with API key' form on the login page:

```bash
apikey: local
```

This will run the application using `ts-node`. The application should now be running and ready to use!

### **Development**

The project uses TypeScript for development. Make sure you have all development dependencies installed by running:

```bash
npm install
```

Key development dependencies include:

- TypeScript
- ts-node
- Various type definitions (@types/\*)

**Note:** The project was halfway through being converted from JavaScript to TypeScript when it was discontinued, so be prepared to disable your type checker before diving in!

---

## **Need Help?**

This project is no longer maintained. For any other inquiries, please reach out to JEM MEDIA at legal@jemedia.xyz.
