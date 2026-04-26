-- URUNGANO Database Setup Script
-- Run this script as PostgreSQL superuser to set up the database

-- Create database
CREATE DATABASE urungano
    WITH 
    OWNER = postgres
    ENCODING = 'UTF8'
    LC_COLLATE = 'en_US.UTF-8'
    LC_CTYPE = 'en_US.UTF-8'
    TABLESPACE = pg_default
    CONNECTION LIMIT = -1;

-- Connect to the urungano database
\c urungano;

-- Create extensions if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create application user (optional, for production)
-- CREATE USER urungano_user WITH PASSWORD 'change_this_password';
-- GRANT ALL PRIVILEGES ON DATABASE urungano TO urungano_user;
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO urungano_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO urungano_user;

-- Note: Tables will be created automatically by TypeORM when the application starts
-- due to synchronize: true in development mode

COMMENT ON DATABASE urungano IS 'URUNGANO ReproHealth 3D Application Database';