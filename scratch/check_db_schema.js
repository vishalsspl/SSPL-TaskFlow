import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: './backend/.env' });

const { Client } = pg;
const client = new Client({
    connectionString: process.env.TENANT_DATABASE_URL,
});

async function main() {
    try {
        await client.connect();
        console.log('Connected to DB');
        const res = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'ChatMessage';
        `);
        console.log('ChatMessage columns:', res.rows);
    } catch (err) {
        console.error('DB ERROR:', err);
    } finally {
        await client.end();
    }
}

main();
