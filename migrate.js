require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

async function runMigration() {
    try {
        console.log('🔄 Connecting to database...');
        
        const sqlFile = fs.readFileSync(
            path.join(__dirname, 'migrations', 'init.sql'),
            'utf8'
        );

        console.log('🔄 Running migration...');
        await pool.query(sqlFile);
        
        console.log('✅ Migration completed successfully!');
        
        // Verify tables created
        const result = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name;
        `);
        
        console.log('\n📋 Tables created:');
        result.rows.forEach(row => {
            console.log(`   - ${row.table_name}`);
        });
        
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

runMigration();
