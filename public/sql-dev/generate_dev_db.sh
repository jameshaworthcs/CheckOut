#!/bin/bash

# Variables
DB_USER="checkout"
DB_NAME="checkout"
OUTPUT_DIR="./db_export"
SCHEMA_FILE="$OUTPUT_DIR/schema_only.sql"
DATA_FILE="$OUTPUT_DIR/data_only.sql"
COMBINED_FILE="$OUTPUT_DIR/checkout_combined.sql"

# Tables to include data
DATA_TABLES="Courses Institutions Modules Years globalapp perms tibl_dev users_dev"

# Prompt for MySQL password
read -sp "Enter MySQL password for user '$DB_USER': " DB_PASS
echo

# Create output directory
mkdir -p "$OUTPUT_DIR"

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

# Step 3: Combine schema and data into one file
echo "Combining schema and data into a single SQL file..."
cat "$SCHEMA_FILE" "$DATA_FILE" > "$COMBINED_FILE"
if [ $? -ne 0 ]; then
    echo "Error combining schema and data. Exiting."
    exit 1
fi

echo "Export complete. Combined SQL file located at: $COMBINED_FILE"
