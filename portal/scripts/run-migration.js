#!/usr/bin/env node
/**
 * Run Supabase migration via SQL Editor API
 * Usage: node scripts/run-migration.js
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

async function runMigration(migrationFile) {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Missing SUPABASE credentials in .env');
    process.exit(1);
  }

  const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', migrationFile);

  if (!fs.existsSync(migrationPath)) {
    console.error(`Migration file not found: ${migrationPath}`);
    process.exit(1);
  }

  const sql = fs.readFileSync(migrationPath, 'utf-8');
  console.log(`Running migration: ${migrationFile}`);
  console.log(`SQL length: ${sql.length} characters`);

  try {
    // Use Supabase RPC endpoint to execute raw SQL
    // This requires the pg_graphql extension or we use the REST API directly
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
      },
      body: JSON.stringify({ query: sql }),
    });

    if (!response.ok) {
      // If RPC doesn't exist, provide manual instructions
      const errorText = await response.text();
      console.log('');
      console.log('='.repeat(70));
      console.log('MANUAL MIGRATION REQUIRED');
      console.log('='.repeat(70));
      console.log('');
      console.log('The exec_sql RPC function is not available.');
      console.log('Please run this migration manually in Supabase Studio:');
      console.log('');
      console.log(`1. Go to: ${SUPABASE_URL.replace('.supabase.co', '.supabase.com')}/project/zaqqidtmwcgtwvvxjizz/sql/new`);
      console.log('2. Copy and paste the SQL from:');
      console.log(`   ${migrationPath}`);
      console.log('3. Click "Run" to execute');
      console.log('');
      console.log('='.repeat(70));
      return false;
    }

    const result = await response.json();
    console.log('Migration completed successfully!');
    console.log('Result:', result);
    return true;
  } catch (error) {
    console.error('Migration failed:', error.message);
    return false;
  }
}

// Run the foundation analysis migration
runMigration('006_foundation_analysis.sql');
