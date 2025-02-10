import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateInitialTables1707579361624 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Создаем расширение для UUID если его нет
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

        // Проверяем существование таблицы servers
        const serversExists = await queryRunner.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'servers'
            );
        `);

        if (!serversExists[0].exists) {
            await queryRunner.query(`
                CREATE TABLE servers (
                    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                    name VARCHAR NOT NULL,
                    description VARCHAR,
                    icon VARCHAR,
                    creator_id INTEGER NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);
        }

        // Проверяем существование таблицы channels
        const channelsExists = await queryRunner.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'channels'
            );
        `);

        if (!channelsExists[0].exists) {
            await queryRunner.query(`
                CREATE TABLE channels (
                    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                    name VARCHAR NOT NULL,
                    description VARCHAR,
                    type VARCHAR NOT NULL,
                    server_id UUID NOT NULL REFERENCES servers(id),
                    is_private BOOLEAN DEFAULT false,
                    active_call JSONB,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);
        }

        // Проверяем существование таблицы roles
        const rolesExists = await queryRunner.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'roles'
            );
        `);

        if (!rolesExists[0].exists) {
            await queryRunner.query(`
                CREATE TABLE roles (
                    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                    name VARCHAR NOT NULL,
                    color VARCHAR,
                    server_id UUID NOT NULL REFERENCES servers(id),
                    permissions TEXT[],
                    is_default BOOLEAN DEFAULT false,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);
        }

        // Проверяем существование таблицы users
        const usersExists = await queryRunner.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'users'
            );
        `);

        if (!usersExists[0].exists) {
            await queryRunner.query(`
                CREATE TABLE users (
                    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                    username VARCHAR NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);
        }

        // Проверяем существование связующих таблиц
        const serverMembersExists = await queryRunner.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'server_members'
            );
        `);

        if (!serverMembersExists[0].exists) {
            await queryRunner.query(`
                CREATE TABLE server_members (
                    server_id UUID REFERENCES servers(id),
                    user_id INTEGER REFERENCES users(id),
                    PRIMARY KEY (server_id, user_id)
                )
            `);
        }

        const channelRolePermissionsExists = await queryRunner.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'channel_role_permissions'
            );
        `);

        if (!channelRolePermissionsExists[0].exists) {
            await queryRunner.query(`
                CREATE TABLE channel_role_permissions (
                    channel_id UUID REFERENCES channels(id),
                    role_id UUID REFERENCES roles(id),
                    PRIMARY KEY (channel_id, role_id)
                )
            `);
        }

        const userRolesExists = await queryRunner.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'user_roles'
            );
        `);

        if (!userRolesExists[0].exists) {
            await queryRunner.query(`
                CREATE TABLE user_roles (
                    user_id INTEGER REFERENCES users(id),
                    role_id UUID REFERENCES roles(id),
                    PRIMARY KEY (user_id, role_id)
                )
            `);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Удаляем таблицы в обратном порядке, только если они существуют
        await queryRunner.query(`DROP TABLE IF EXISTS user_roles`);
        await queryRunner.query(`DROP TABLE IF EXISTS channel_role_permissions`);
        await queryRunner.query(`DROP TABLE IF EXISTS server_members`);
        await queryRunner.query(`DROP TABLE IF EXISTS users`);
        await queryRunner.query(`DROP TABLE IF EXISTS roles`);
        await queryRunner.query(`DROP TABLE IF EXISTS channels`);
        await queryRunner.query(`DROP TABLE IF EXISTS servers`);
    }
} 