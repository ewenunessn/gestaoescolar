import fs from 'fs';
import path from 'path';
import db from './src/database';

async function run() {
  const files = [
    'src/migrations/add_suspenso_status.sql'
  ];

  console.log('Starting migrations...');
  
  // Test connection
  try {
    await db.testConnection();
  } catch (err) {
    console.error('Failed to connect to database:', err);
    process.exit(1);
  }
  
  for (const file of files) {
    const filePath = path.join(process.cwd(), file);
    if (fs.existsSync(filePath)) {
      console.log(`Running ${file}...`);
      const sql = fs.readFileSync(filePath, 'utf-8');
      try {
        await db.query(sql);
        console.log(`✅ ${file} executed successfully.`);
      } catch (err: any) {
        console.error(`❌ Error executing ${file}:`, err.message);
      }
    } else {
      console.warn(`⚠️ File not found: ${file}`);
    }
  }
  
  console.log('Done.');
  process.exit(0);
}

run();
