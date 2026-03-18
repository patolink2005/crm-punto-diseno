import { createClient } from '@supabase/supabase-js';
import { writeFile, mkdir } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function performBackup() {
  console.log('Starting daily backup...');
  
  const tables = [
    'clients',
    'orders',
    'order_items',
    'products_config',
    'suppliers',
    'pipeline_stages',
    'profiles',
    'audit_logs'
  ];

  const backupData = {
    version: '1.0 (auto)',
    generated_at: new Date().toISOString(),
    tables: {}
  };

  try {
    for (const table of tables) {
      console.log(`Fetching table: ${table}...`);
      const { data, error } = await supabase.from(table).select('*');
      
      if (error) {
        console.error(`Error fetching table ${table}:`, error.message);
        backupData.tables[table] = { error: error.message };
        continue;
      }
      
      backupData.tables[table] = data || [];
    }

    const backupDir = join(__dirname, '../backups');
    await mkdir(backupDir, { recursive: true });

    const fileName = `backup_${new Date().toISOString().split('T')[0]}.json`;
    const filePath = join(backupDir, fileName);

    await writeFile(filePath, JSON.stringify(backupData, null, 2));

    console.log(`Backup completed successfully! Saved to: ${filePath}`);
  } catch (err) {
    console.error('Critical backup error:', err.message);
    process.exit(1);
  }
}

performBackup();
