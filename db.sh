#!/bin/bash

# Configuration
SOFIA_MODE=${SOFIA_MODE:-local}
APP_PROPS="backend/src/main/resources/application.properties"
ENV_FILE=".env.${SOFIA_MODE}"

# Check for .env file in root or backend
if [ ! -f "$ENV_FILE" ]; then
    ENV_FILE="backend/.env.${SOFIA_MODE}"
fi

# Extract DB connection info
if [ -f "$APP_PROPS" ]; then
    DB_URL=$(grep "spring.datasource.url" "$APP_PROPS" | cut -d'=' -f2 | xargs)
    # Parse URL: jdbc:postgresql://host:port/dbname?currentSchema=schema
    DB_HOST=$(echo "$DB_URL" | sed -e 's|jdbc:postgresql://||' -e 's|/.*||' -e 's|:.*||')
    DB_PORT=$(echo "$DB_URL" | sed -e 's|jdbc:postgresql://||' -e 's|/.*||' | grep ":" | cut -d':' -f2)
    DB_PORT=${DB_PORT:-5432}
    DB_NAME=$(echo "$DB_URL" | sed -e 's|jdbc:postgresql://||' -e 's|?.*||' | cut -d'/' -f2)
    DB_SCHEMA=$(echo "$DB_URL" | grep -o "currentSchema=[^&]*" | cut -d'=' -f2)
    DB_SCHEMA=${DB_SCHEMA:-sofia}
fi

if [ -f "$ENV_FILE" ]; then
    DB_USERID=$(grep "^DB_USERNAME=" "$ENV_FILE" | cut -d'=' -f2 | xargs)
    if [ -z "$DB_USERID" ]; then
        DB_USERID=$(grep "^DB_USERID=" "$ENV_FILE" | cut -d'=' -f2 | xargs)
    fi
    DB_PASSWORD=$(grep "^DB_PASSWORD=" "$ENV_FILE" | cut -d'=' -f2 | xargs)
fi

# Show DB Info
echo "------------------------------------------"
echo " Database Connection Info"
echo "------------------------------------------"
echo " Host     : $DB_HOST"
echo " Port     : $DB_PORT"
echo " Database : $DB_NAME"
echo " User     : $DB_USERID"
echo " Schema   : $DB_SCHEMA"
echo " Mode     : $SOFIA_MODE"
echo " Env File : $ENV_FILE"
echo "------------------------------------------"

if [ -z "$DB_HOST" ] || [ -z "$DB_USERID" ]; then
    echo "Error: Could not extract database connection information."
    exit 1
fi

export PGPASSWORD=$DB_PASSWORD

function show_menu() {
    echo "Select an option:"
    echo "1) Table List"
    echo "2) Table Description"
    echo "3) Run SQL"
    echo "4) Full Backup"
    echo "q) Quit"
    read -p "Option: " choice
}

show_menu

case $choice in
    1)
        echo "Listing tables in schema '$DB_SCHEMA'..."
        psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERID" -d "$DB_NAME" -c "\dt ${DB_SCHEMA}.*"
        ;;
    2)
        echo "Available tables in schema '$DB_SCHEMA':"
        # Get tables into an array
        mapfile -t tables < <(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERID" -d "$DB_NAME" -t -A -c "SELECT tablename FROM pg_tables WHERE schemaname = '$DB_SCHEMA' ORDER BY tablename;")
        
        if [ ${#tables[@]} -eq 0 ]; then
            echo "No tables found in schema '$DB_SCHEMA'."
        else
            for i in "${!tables[@]}"; do
                printf "%3d) %s\n" $((i+1)) "${tables[$i]}"
            done
            
            read -p "Enter table number for description: " table_num
            if [[ "$table_num" =~ ^[0-9]+$ ]] && [ "$table_num" -ge 1 ] && [ "$table_num" -le "${#tables[@]}" ]; then
                selected_table="${tables[$((table_num-1))]}"
                echo "Describing table: $selected_table"
                psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERID" -d "$DB_NAME" -c "\d ${DB_SCHEMA}.${selected_table}"
            else
                echo "Invalid table number."
            fi
        fi
        ;;
    3)
        read -p "Enter SQL to run: " sql_query
        if [ -n "$sql_query" ]; then
            psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERID" -d "$DB_NAME" -c "SET search_path TO ${DB_SCHEMA}; $sql_query"
        fi
        ;;
    4)
        backup_file="backup_${DB_NAME}_$(date +%Y%m%d_%H%M%S).sql"
        echo "Starting full backup to $backup_file..."
        pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERID" -d "$DB_NAME" -f "$backup_file"
        echo "Backup completed: $backup_file"
        ;;
    q)
        echo "Exiting."
        exit 0
        ;;
    *)
        echo "Invalid option."
        exit 1
        ;;
esac
