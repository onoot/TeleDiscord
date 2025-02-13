import { Pool } from 'pg';
import bcrypt from 'bcrypt';
import { config } from '../../config';

export interface UserSettings {
    notifications: boolean;
    theme: 'light' | 'dark';
    language: string;
}

export interface User {
    id: string;
    username: string;
    email: string;
    password: string;
    avatar?: string;
    status: 'online' | 'offline';
    emailVerified: boolean;
    settings: UserSettings;
    lastSeen?: Date;
    createdAt: Date;
    updatedAt: Date;
}

export class UserModelClass {
    private pool: Pool;

    constructor() {
        const [host, port] = config.database.host.split(':');
        this.pool = new Pool({
            host: host,
            port: 5432,
            database: config.database.database,
            user: config.database.username,
            password: config.database.password || undefined
        });
    }

    async findOne(conditions: Partial<User>): Promise<User | null> {
        const conditions_array = [];
        const values = [];
        let paramIndex = 1;

        for (const [key, value] of Object.entries(conditions)) {
            if (key === 'username' || key === 'email') {
                conditions_array.push(`${key} = $${paramIndex}`);
                values.push(value);
                paramIndex++;
            }
        }

        const whereClause = conditions_array.length > 0 
            ? `WHERE ${conditions_array.join(' OR ')}` 
            : '';
        
        const query = `SELECT * FROM users ${whereClause} LIMIT 1`;
        const result = await this.pool.query(query, values);
        return result.rows[0] || null;
    }

    async findById(id: string): Promise<User | null> {
        const query = 'SELECT * FROM users WHERE id = $1';
        const result = await this.pool.query(query, [id]);
        return result.rows[0] || null;
    }

    async create(userData: Partial<User>): Promise<User> {
        const keys = Object.keys(userData);
        const values = Object.values(userData);
        const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
        const columns = keys.join(', ');
        
        const query = `INSERT INTO users (${columns}) VALUES (${placeholders}) RETURNING *`;
        const result = await this.pool.query(query, values);
        
        return result.rows[0];
    }

    async save(user: Partial<User> & { id: string }): Promise<User> {
        const keys = Object.keys(user).filter(key => key !== 'id');
        const values = keys.map(key => user[key as keyof User]);
        const setClause = keys.map((key, index) => `${key} = $${index + 1}`).join(', ');
        
        const query = `
            UPDATE users 
            SET ${setClause}, updated_at = CURRENT_TIMESTAMP 
            WHERE id = $${values.length + 1} 
            RETURNING *
        `;
        
        const result = await this.pool.query(query, [...values, user.id]);
        return result.rows[0];
    }

    async comparePassword(user: User, password: string): Promise<boolean> {
        return bcrypt.compare(password, user.password);
    }

    async sendFriendRequest(userId: string, friendId: string): Promise<boolean> {
        const query = `
            INSERT INTO friendships (user_id, friend_id, status)
            VALUES ($1, $2, 'pending')
            ON CONFLICT (user_id, friend_id) DO NOTHING
            RETURNING *
        `;
        
        const result = await this.pool.query(query, [userId, friendId]);
        return result.rowCount ? result.rowCount > 0 : false;
    }

    async removeFriend(userId: string, friendId: string): Promise<boolean> {
        const query = `
            DELETE FROM friendships
            WHERE (user_id = $1 AND friend_id = $2)
               OR (user_id = $2 AND friend_id = $1)
        `;
        
        const result = await this.pool.query(query, [userId, friendId]);
        return result.rowCount ? result.rowCount > 0 : false;
    }

    async findMany(searchQuery: { username?: { ilike: string }; email?: { ilike: string } }, options: { skip: number; limit: number }): Promise<User[]> {
        const conditions = [];
        const values = [];
        let paramIndex = 1;

        if (searchQuery.username?.ilike) {
            conditions.push(`username ILIKE $${paramIndex}`);
            values.push(`%${searchQuery.username.ilike}%`);
            paramIndex++;
        }

        if (searchQuery.email?.ilike) {
            conditions.push(`email ILIKE $${paramIndex}`);
            values.push(`%${searchQuery.email.ilike}%`);
            paramIndex++;
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' OR ')}` : '';
        
        const searchSql = `
            SELECT * FROM users
            ${whereClause}
            ORDER BY username
            OFFSET $${paramIndex} LIMIT $${paramIndex + 1}
        `;

        const result = await this.pool.query(searchSql, [...values, options.skip, options.limit]);
        return result.rows;
    }

    async count(searchQuery: { username?: { ilike: string }; email?: { ilike: string } }): Promise<number> {
        const conditions = [];
        const values = [];
        let paramIndex = 1;

        if (searchQuery.username?.ilike) {
            conditions.push(`username ILIKE $${paramIndex}`);
            values.push(`%${searchQuery.username.ilike}%`);
            paramIndex++;
        }

        if (searchQuery.email?.ilike) {
            conditions.push(`email ILIKE $${paramIndex}`);
            values.push(`%${searchQuery.email.ilike}%`);
            paramIndex++;
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' OR ')}` : '';
        
        const countSql = `
            SELECT COUNT(*) as count
            FROM users
            ${whereClause}
        `;

        const result = await this.pool.query(countSql, values);
        return parseInt(result.rows[0].count);
    }

    async getFriends(userId: string): Promise<User[]> {
        const query = `
            SELECT u.*
            FROM users u
            JOIN friendships f ON (f.friend_id = u.id OR f.user_id = u.id)
            WHERE (f.user_id = $1 OR f.friend_id = $1)
              AND f.status = 'accepted'
              AND u.id != $1
        `;
        
        const result = await this.pool.query(query, [userId]);
        return result.rows;
    }

    async getFriendRequests(userId: string): Promise<{
        incoming: Array<{ id: string; userId: string; friendId: string; status: string; createdAt: Date; username: string; avatar: string }>;
        outgoing: Array<{ id: string; userId: string; friendId: string; status: string; createdAt: Date; username: string; avatar: string }>;
    }> {
        const incomingQuery = `
            SELECT f.*, u.username, u.avatar, u.status
            FROM friendships f
            JOIN users u ON f.user_id = u.id
            WHERE f.friend_id = $1 AND f.status = 'pending'
        `;
        
        const outgoingQuery = `
            SELECT f.*, u.username, u.avatar, u.status
            FROM friendships f
            JOIN users u ON f.friend_id = u.id
            WHERE f.user_id = $1 AND f.status = 'pending'
        `;
        
        const [incoming, outgoing] = await Promise.all([
            this.pool.query(incomingQuery, [userId]),
            this.pool.query(outgoingQuery, [userId])
        ]);
        
        return {
            incoming: incoming.rows,
            outgoing: outgoing.rows
        };
    }

    async getMutualFriends(userId1: string, userId2: string): Promise<User[]> {
        const query = `
            SELECT DISTINCT u.*
            FROM users u
            JOIN friendships f1 ON (f1.friend_id = u.id OR f1.user_id = u.id)
            JOIN friendships f2 ON (f2.friend_id = u.id OR f2.user_id = u.id)
            WHERE ((f1.user_id = $1 OR f1.friend_id = $1) AND f1.status = 'accepted')
              AND ((f2.user_id = $2 OR f2.friend_id = $2) AND f2.status = 'accepted')
              AND u.id != $1 AND u.id != $2
        `;

        const result = await this.pool.query(query, [userId1, userId2]);
        return result.rows;
    }

    async getFriendshipStatus(userId1: string, userId2: string): Promise<string> {
        const query = `
            SELECT status
            FROM friendships
            WHERE (user_id = $1 AND friend_id = $2)
               OR (user_id = $2 AND friend_id = $1)
            LIMIT 1
        `;

        const result = await this.pool.query(query, [userId1, userId2]);
        return result.rows[0]?.status || 'none';
    }
}

export const UserModel = new UserModelClass();