import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateServerIconColumn1707579361625 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Сначала изменим тип колонки на varchar
        await queryRunner.query(`
            ALTER TABLE servers 
            ALTER COLUMN icon TYPE varchar
            USING icon::varchar
        `);

        // Затем добавим возможность null значений
        await queryRunner.query(`
            ALTER TABLE servers 
            ALTER COLUMN icon DROP NOT NULL
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Откатим изменения в обратном порядке
        await queryRunner.query(`
            ALTER TABLE servers 
            ALTER COLUMN icon SET NOT NULL
        `);

        await queryRunner.query(`
            ALTER TABLE servers 
            ALTER COLUMN icon TYPE text
            USING icon::text
        `);
    }
} 