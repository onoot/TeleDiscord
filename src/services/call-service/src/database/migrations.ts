import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import { config } from '../../config';

export async function runMigrations() {
    const pool = new Pool({
        host: config.database.host,
        port: config.database.port,
        user: config.database.username,
        password: config.database.password||"",
        database: config.database.database
    });

    try {
        // Создаем таблицу для отслеживания миграций, если она не существует
        await pool.query(`
            CREATE TABLE IF NOT EXISTS migrations (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Читаем все файлы миграций
        const migrationsDir = path.join(__dirname, 'migrations');
        const files = fs.readdirSync(migrationsDir)
            .filter(file => file.endsWith('.sql'))
            .sort();

        // Получаем список выполненных миграций
        const { rows: executedMigrations } = await pool.query(
            'SELECT name FROM migrations'
        );
        const executedMigrationNames = executedMigrations.map(row => row.name);

        // Выполняем новые миграции
        for (const file of files) {
            if (!executedMigrationNames.includes(file)) {
                console.log(`Выполняется миграция: ${file}`);
                const filePath = path.join(migrationsDir, file);
                const sql = fs.readFileSync(filePath, 'utf-8');

                await pool.query('BEGIN');
                try {
                    await pool.query(sql);
                    await pool.query(
                        'INSERT INTO migrations (name) VALUES ($1)',
                        [file]
                    );
                    await pool.query('COMMIT');
                    console.log(`Миграция ${file} успешно выполнена`);
                } catch (error) {
                    await pool.query('ROLLBACK');
                    throw error;
                }
            }
        }

        console.log('Все миграции выполнены успешно');
    } catch (error) {
        console.error('Ошибка при выполнении миграций:', error);
        throw error;
    } finally {
        await pool.end();
    }
} 