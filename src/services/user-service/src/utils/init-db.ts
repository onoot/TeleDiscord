import { Pool } from 'pg';
import { config } from '../../config';



const createTableQuery = `
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    avatar VARCHAR(255),
    status VARCHAR(50) DEFAULT 'offline',
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    settings JSONB DEFAULT '{"notifications": true, "theme": "light", "language": "ru"}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS users_username_idx ON users(username);
CREATE INDEX IF NOT EXISTS users_email_idx ON users(email);
CREATE INDEX IF NOT EXISTS users_status_idx ON users(status);
`;

const createFriendshipsTableQuery = `
CREATE TABLE IF NOT EXISTS friendships (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    friend_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, friend_id),
    CHECK (user_id != friend_id)
);

CREATE INDEX IF NOT EXISTS friendships_user_id_idx ON friendships(user_id);
CREATE INDEX IF NOT EXISTS friendships_friend_id_idx ON friendships(friend_id);
CREATE INDEX IF NOT EXISTS friendships_status_idx ON friendships(status);
`;

const createBlockedUsersTableQuery = `
CREATE TABLE IF NOT EXISTS blocked_users (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    blocked_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, blocked_user_id),
    CHECK (user_id != blocked_user_id)
);

CREATE INDEX IF NOT EXISTS blocked_users_user_id_idx ON blocked_users(user_id);
CREATE INDEX IF NOT EXISTS blocked_users_blocked_user_id_idx ON blocked_users(blocked_user_id);
`;

const dropFunctionQuery = 'DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;';

const createFunctionQuery = `
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
`;

const dropTriggerQuery = 'DROP TRIGGER IF EXISTS update_users_updated_at ON users;';

const createTriggerQuery = `
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();
`;

// Создаем таблицу конфигурации
const createConfigTableQuery = `
CREATE TABLE IF NOT EXISTS config (
    key VARCHAR(255) PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO config (key, value, description) 
VALUES ('api_server_url', '/api/v1/users', 'URL основного сервера API')
ON CONFLICT (key) DO UPDATE 
SET value = EXCLUDED.value;
`;

interface PostgresError extends Error {
    position?: string;
    query?: string;
}

export async function initializeDatabase() {
    // Разделяем хост и порт из строки подключения
    const [host, port] = config.database.host.split(':');
    const pool = new Pool({
        host: host,
        port: 5432,
        database: config.database.database,
        user: config.database.username,
        password: config.database.password||""
    });

    try {
        console.log('Dropping existing tables...');
        console.log('Tables dropped successfully');

        console.log('Creating tables...');
        await pool.query(createTableQuery);
        await pool.query(createFriendshipsTableQuery);
        await pool.query(createBlockedUsersTableQuery);
        console.log('Tables created successfully');
        
        console.log('Dropping existing function...');
        console.log('Function dropped successfully');
        
        console.log('Creating new function...');
        await pool.query(createFunctionQuery);
        console.log('Function created successfully');
        
        console.log('Dropping existing trigger...');
        await pool.query(dropTriggerQuery);
        console.log('Trigger dropped successfully');
        
        console.log('Creating new trigger...');
        await pool.query(createTriggerQuery);
        console.log('Trigger created successfully');

        // Создаем таблицу конфигурации
        await pool.query(createConfigTableQuery);
        console.log('Config table created successfully');

        console.log('Database initialized successfully');
    } catch (error) {
        console.error('Error initializing database:', error);
        const pgError = error as PostgresError;
        if (pgError.position) {
            console.error('Error position:', pgError.position);
            console.error('Query:', pgError.query);
        }
        throw error;
    } finally {
        await pool.end();
    }
}

// Запускаем инициализацию если скрипт запущен напрямую
if (require.main === module) {
    initializeDatabase()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
} 