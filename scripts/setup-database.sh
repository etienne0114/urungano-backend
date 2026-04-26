#!/bin/bash

# URUNGANO Database Setup Script
# This script sets up the PostgreSQL database for the URUNGANO application

set -e

echo "🗄️  Setting up URUNGANO Database..."

# Configuration
DB_NAME="urungano"
DB_USER="postgres"
DB_HOST="localhost"
DB_PORT="5432"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    print_error "PostgreSQL is not installed or not in PATH"
    echo "Please install PostgreSQL first:"
    echo "  - Ubuntu/Debian: sudo apt-get install postgresql postgresql-contrib"
    echo "  - macOS: brew install postgresql"
    echo "  - Windows: Download from https://www.postgresql.org/download/"
    exit 1
fi

print_status "PostgreSQL found"

# Check if PostgreSQL service is running
if ! pg_isready -h $DB_HOST -p $DB_PORT &> /dev/null; then
    print_warning "PostgreSQL service is not running"
    echo "Starting PostgreSQL service..."
    
    # Try to start PostgreSQL (different commands for different systems)
    if command -v systemctl &> /dev/null; then
        sudo systemctl start postgresql
    elif command -v brew &> /dev/null; then
        brew services start postgresql
    else
        print_error "Could not start PostgreSQL automatically"
        echo "Please start PostgreSQL manually and run this script again"
        exit 1
    fi
fi

print_status "PostgreSQL service is running"

# Check if database exists
if psql -h $DB_HOST -p $DB_PORT -U $DB_USER -lqt | cut -d \| -f 1 | grep -qw $DB_NAME; then
    print_warning "Database '$DB_NAME' already exists"
    read -p "Do you want to recreate it? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Dropping existing database..."
        psql -h $DB_HOST -p $DB_PORT -U $DB_USER -c "DROP DATABASE IF EXISTS $DB_NAME;"
    else
        print_status "Using existing database"
        exit 0
    fi
fi

# Create database
echo "Creating database '$DB_NAME'..."
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -c "CREATE DATABASE $DB_NAME;"

print_status "Database '$DB_NAME' created successfully"

# Run setup SQL script if it exists
if [ -f "scripts/setup-database.sql" ]; then
    echo "Running setup SQL script..."
    psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f scripts/setup-database.sql
    print_status "Setup SQL script executed"
fi

# Verify database connection
echo "Verifying database connection..."
if psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "SELECT version();" &> /dev/null; then
    print_status "Database connection verified"
else
    print_error "Failed to connect to database"
    exit 1
fi

echo
echo "🎉 Database setup completed successfully!"
echo
echo "Next steps:"
echo "1. Update backend/.env with your database credentials if needed"
echo "2. Install dependencies: cd backend && npm install"
echo "3. Start the application: npm run start:dev"
echo "4. The application will create tables automatically on first run"
echo "5. Optionally run seeds: npm run seed"
echo
echo "Database connection details:"
echo "  Host: $DB_HOST"
echo "  Port: $DB_PORT"
echo "  Database: $DB_NAME"
echo "  User: $DB_USER"