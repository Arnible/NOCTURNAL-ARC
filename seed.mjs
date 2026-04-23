import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import path from 'path';

const dbPath = path.join(process.cwd(), 'nocturnal.db');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

console.log('Setting up database schema...');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'vendor',
    business_name TEXT,
    business_type TEXT,
    registration_number TEXT,
    score INTEGER DEFAULT 0,
    is_eligible_for_loan BOOLEAN DEFAULT 0,
    is_eligible_for_insurance BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS mobile_accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    contact_number TEXT NOT NULL,
    institution_name TEXT,
    account_number TEXT,
    status TEXT DEFAULT 'active',
    FOREIGN KEY (user_id) REFERENCES users (id)
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mobile_account_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    amount REAL NOT NULL,
    date DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'completed',
    FOREIGN KEY (mobile_account_id) REFERENCES mobile_accounts (id)
  );

  CREATE TABLE IF NOT EXISTS loans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
  );

  CREATE TABLE IF NOT EXISTS insurance_policies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    policy_type TEXT NOT NULL,
    coverage REAL NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
  );

  CREATE TABLE IF NOT EXISTS system_alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    type TEXT,
    message TEXT,
    old_score INTEGER,
    new_score INTEGER,
    is_read BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
  );
`);

console.log('Seeding mock data...');

const adminExists = db.prepare('SELECT id FROM users WHERE email = ?').get('admin@nocturnal.co');
if (!adminExists) {
  const hash = bcrypt.hashSync('admin', 10);
  db.prepare('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)').run(
    'Alex Rivera',
    'admin@nocturnal.co',
    hash,
    'admin'
  );
  console.log('Created admin: admin@nocturnal.co / admin');
}

const vendorExists = db.prepare('SELECT id FROM users WHERE email = ?').get('vendor@velvetdyn.co');
if (!vendorExists) {
  const hash = bcrypt.hashSync('vendor', 10);
  const info = db.prepare('INSERT INTO users (name, email, password, role, business_name, business_type, score, is_eligible_for_loan, is_eligible_for_insurance) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
    'Jane Doe',
    'vendor@velvetdyn.co',
    hash,
    'vendor',
    'Velvet Dynamics Inc.',
    'B2B Logistics',
    82,
    1,
    1
  );
  
  const vendorId = info.lastInsertRowid;
  
  // Create Mobile Account
  const macct = db.prepare('INSERT INTO mobile_accounts (user_id, contact_number, institution_name) VALUES (?, ?, ?)').run(
    vendorId,
    'MOB-8021-X90',
    'Global Tech Bank'
  );
  const macctId = macct.lastInsertRowid;

  // Insert 15 transactions
  const insertTx = db.prepare('INSERT INTO transactions (mobile_account_id, type, amount, date) VALUES (?, ?, ?, ?)');
  
  const sampleAmounts = [12450, 4200, 85000, 2100, 15600, 3000, 1200, 5000, 8000, 15000, 200, 400, 1100, 800, 9500];
  const types = ['inbound', 'outbound', 'inbound', 'inbound', 'outbound', 'inbound', 'outbound', 'inbound', 'outbound', 'inbound', 'outbound', 'outbound', 'inbound', 'inbound', 'inbound'];
  
  for(let i=0; i<15; i++) {
    const d = new Date();
    d.setDate(d.getDate() - (15 - i));
    insertTx.run(macctId, types[i], sampleAmounts[i], d.toISOString());
  }

  // Create sub-prime vendor
  const info2 = db.prepare('INSERT INTO users (name, email, password, role, business_name, business_type, score, is_eligible_for_loan, is_eligible_for_insurance) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
    'John Subprime',
    'bad@vendor.co',
    hash,
    'vendor',
    'Aethelgard Retail',
    'Luxury Goods',
    62,
    0,
    0
  );

  console.log('Created mock vendors.');
}

console.log('Database setup complete.');
