import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

const dataDir = path.join(process.cwd(), 'data')
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

const dbPath = path.join(dataDir, 'archive.db')

const db = new Database(dbPath)

db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('admin','archivist','borrower','maintenance','leader')),
    department TEXT,
    permission_level TEXT DEFAULT 'normal',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS warehouses (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    location TEXT,
    capacity INTEGER DEFAULT 0,
    used INTEGER DEFAULT 0,
    allowed_types TEXT,
    allowed_secrecy TEXT
  );

  CREATE TABLE IF NOT EXISTS shelves (
    id TEXT PRIMARY KEY,
    warehouse_id TEXT NOT NULL REFERENCES warehouses(id),
    code TEXT NOT NULL,
    position TEXT,
    capacity INTEGER DEFAULT 0,
    used INTEGER DEFAULT 0,
    allowed_materials TEXT
  );

  CREATE TABLE IF NOT EXISTS archives (
    id TEXT PRIMARY KEY,
    archive_number TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    type TEXT NOT NULL,
    secrecy_level TEXT NOT NULL,
    carrier_material TEXT NOT NULL,
    fonds TEXT,
    year INTEGER,
    department TEXT,
    description TEXT,
    status TEXT DEFAULT '在库' CHECK(status IN ('在库','借出','锁定')),
    warehouse_id TEXT REFERENCES warehouses(id),
    shelf_id TEXT REFERENCES shelves(id),
    barcode TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS borrows (
    id TEXT PRIMARY KEY,
    archive_id TEXT NOT NULL REFERENCES archives(id),
    user_id TEXT NOT NULL REFERENCES users(id),
    purpose TEXT,
    borrow_type TEXT NOT NULL,
    appointment_time DATETIME,
    expected_return DATETIME,
    actual_return DATETIME,
    status TEXT DEFAULT '待审批' CHECK(status IN ('待审批','已通过','已拒绝','借出中','已归还','已超期')),
    approval_result TEXT,
    overdue_fee REAL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS sensor_data (
    id TEXT PRIMARY KEY,
    warehouse_id TEXT NOT NULL REFERENCES warehouses(id),
    temperature REAL,
    humidity REAL,
    light_intensity REAL,
    harmful_gas REAL,
    recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS thresholds (
    id TEXT PRIMARY KEY,
    warehouse_id TEXT NOT NULL REFERENCES warehouses(id),
    parameter TEXT NOT NULL,
    min_value REAL,
    max_value REAL
  );

  CREATE TABLE IF NOT EXISTS alerts (
    id TEXT PRIMARY KEY,
    warehouse_id TEXT NOT NULL REFERENCES warehouses(id),
    type TEXT NOT NULL,
    parameter TEXT NOT NULL,
    value REAL,
    threshold REAL,
    status TEXT DEFAULT '未处理' CHECK(status IN ('未处理','处理中','已解决')),
    triggered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    resolved_at DATETIME
  );

  CREATE TABLE IF NOT EXISTS equipment (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    warehouse_id TEXT REFERENCES warehouses(id),
    running_hours REAL DEFAULT 0,
    switch_count INTEGER DEFAULT 0,
    status TEXT DEFAULT '运行中' CHECK(status IN ('运行中','停机','维修中')),
    last_maintenance DATETIME
  );

  CREATE TABLE IF NOT EXISTS maintenance_orders (
    id TEXT PRIMARY KEY,
    equipment_id TEXT NOT NULL REFERENCES equipment(id),
    type TEXT NOT NULL,
    description TEXT,
    team_id TEXT REFERENCES maintenance_teams(id),
    status TEXT DEFAULT '待处理' CHECK(status IN ('待处理','进行中','已完成')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME
  );

  CREATE TABLE IF NOT EXISTS maintenance_teams (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    members TEXT,
    specialty TEXT
  );

  CREATE TABLE IF NOT EXISTS spare_parts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    specification TEXT,
    quantity INTEGER DEFAULT 0,
    safety_stock INTEGER DEFAULT 10,
    warehouse_id TEXT REFERENCES warehouses(id)
  );

  CREATE INDEX IF NOT EXISTS idx_archives_status ON archives(status);
  CREATE INDEX IF NOT EXISTS idx_archives_type ON archives(type);
  CREATE INDEX IF NOT EXISTS idx_borrows_status ON borrows(status);
  CREATE INDEX IF NOT EXISTS idx_borrows_user ON borrows(user_id);
  CREATE INDEX IF NOT EXISTS idx_sensor_warehouse ON sensor_data(warehouse_id);
  CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status);
  CREATE INDEX IF NOT EXISTS idx_equipment_warehouse ON equipment(warehouse_id);
  CREATE INDEX IF NOT EXISTS idx_maintenance_status ON maintenance_orders(status);
`)

export default db
