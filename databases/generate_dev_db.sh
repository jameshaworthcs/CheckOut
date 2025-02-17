#!/bin/bash

# Variables
DB_USER="checkout"
DB_NAME="checkout_dev"
SCHEMA_FILE="schema_only.sql"
DATA_FILE="data_only.sql"
COMBINED_FILE="checkout_combined.sql"
TEMP_USERS_FILE="temp_users.sql"

# Tables to include data
DATA_TABLES="Courses Institutions Modules Years globalapp perms tibl_test_test_course_0 users_dev"

# Prompt for MySQL password
read -sp "Enter MySQL password for user '$DB_USER': " DB_PASS
echo

# Step 1: Export schema for all tables
echo "Exporting schema for all tables..."
mysqldump -u "$DB_USER" -p"$DB_PASS" --no-data "$DB_NAME" > "$SCHEMA_FILE"
if [ $? -ne 0 ]; then
    echo "Error exporting schema. Exiting."
    exit 1
fi

# Step 2: Export data for specific tables
echo "Exporting data for selected tables..."
mysqldump -u "$DB_USER" -p"$DB_PASS" --no-create-info "$DB_NAME" $DATA_TABLES > "$DATA_FILE"
if [ $? -ne 0 ]; then
    echo "Error exporting data. Exiting."
    exit 1
fi

# Step 3: Replace `users` with `users_dev` schema and data
echo "Replacing 'users' with 'users_dev' in the dump..."
# Extract schema for users_dev
awk '
BEGIN {found=0}
/^CREATE TABLE `users_dev`/ {found=1}
found {print}
found && /^;$/ {found=0}
' "$SCHEMA_FILE" > "$TEMP_USERS_FILE"
if [ ! -s "$TEMP_USERS_FILE" ]; then
    echo "Error extracting schema for users_dev. Exiting."
    exit 1
fi

# Rename 'users_dev' to 'users' in the extracted schema
sed -i 's/`users_dev`/`users`/g' "$TEMP_USERS_FILE"

# Remove `users` and `users_dev` schema from the main schema file
awk '
BEGIN {skip=0}
/^CREATE TABLE `users`/ {skip=1}
/^CREATE TABLE `users_dev`/ {skip=1}
skip && /^;$/ {skip=0; next}
!skip {print}
' "$SCHEMA_FILE" > "$SCHEMA_FILE.tmp" && mv "$SCHEMA_FILE.tmp" "$SCHEMA_FILE"

# Extract data for users_dev and rename it to users
mysqldump -u "$DB_USER" -p"$DB_PASS" --no-create-info "$DB_NAME" users_dev | sed 's/`users_dev`/`users`/g' >> "$TEMP_USERS_FILE"
if [ $? -ne 0 ]; then
    echo "Error extracting data for users_dev. Exiting."
    exit 1
fi

# Step 4: Combine schema and data into the final file
echo "Combining schema and data into a single SQL file..."
cat "$SCHEMA_FILE" "$TEMP_USERS_FILE" "$DATA_FILE" > "$COMBINED_FILE"
if [ $? -ne 0 ]; then
    echo "Error combining schema and data. Exiting."
    exit 1
fi

# Cleanup
rm "$TEMP_USERS_FILE"

echo "Export complete. Combined SQL file located at: $COMBINED_FILE"
