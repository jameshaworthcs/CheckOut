#!/bin/bash

# Variables
DB_USER="checkout"
DB_NAME="checkout"
OUTPUT_DIR="./db_export"
SCHEMA_AND_DATA_FILE="$OUTPUT_DIR/schema_and_data.sql"
SCHEMA_ONLY_FILE="$OUTPUT_DIR/schema_only.sql"
COMBINED_FILE="$OUTPUT_DIR/checkout_combined.sql"

# Tables for schema and data
TABLES="Courses Institutions Modules Years globalapp perms tibl_dev users_dev"

# Prompt for MySQL password
read -sp "Enter MySQL password for user '$DB_USER': " DB_PASS
echo

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Step 1: Export schema and data for specific tables
echo "Exporting schema and data for selected tables..."
sudo mysqldump -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" $TABLES > "$SCHEMA_AND_DATA_FILE"
if [ $? -ne 0 ]; then
    echo "Error exporting schema and data. Exiting."
    exit 1
fi

# Step 2: Export schema for the entire database
echo "Exporting full schema for all tables..."
sudo mysqldump -u "$DB_USER" -p"$DB_PASS" --no-data "$DB_NAME" > "$SCHEMA_ONLY_FILE"
if [ $? -ne 0 ]; then
    echo "Error exporting full schema. Exiting."
    exit 1
fi

# Step 3: Remove schema for the selected tables from the full schema
echo "Filtering schema-only export to exclude selected tables..."
grep -Ev "(CREATE TABLE|INSERT INTO).*($TABLES)" "$SCHEMA_ONLY_FILE" > "$OUTPUT_DIR/schema_other_tables.sql"
if [ $? -ne 0 ]; then
    echo "Error filtering schema-only export. Exiting."
    exit 1
fi

# Step 4: Combine schema and data with remaining schema-only export
echo "Combining schema and data with remaining schema-only export..."
cat "$SCHEMA_AND_DATA_FILE" "$OUTPUT_DIR/schema_other_tables.sql" > "$COMBINED_FILE"
if [ $? -ne 0 ]; then
    echo "Error combining schema and data. Exiting."
    exit 1
fi

echo "Export complete. Combined SQL file located at: $COMBINED_FILE"
