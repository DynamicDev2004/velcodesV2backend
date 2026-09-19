import {DatabaseSync} from 'node:sqlite';
import {mkdirSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
export function openDatabase(path){if(path!==':memory:')mkdirSync(dirname(resolve(path)),{recursive:true,mode:0o700});const db=new DatabaseSync(path);db.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');db.exec(`
CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,email TEXT NOT NULL UNIQUE,name TEXT NOT NULL,password TEXT NOT NULL,role TEXT NOT NULL DEFAULT 'client' CHECK(role IN ('admin','worker','client')),verified INTEGER NOT NULL DEFAULT 0,active INTEGER NOT NULL DEFAULT 1,must_change INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),expires_at INTEGER NOT NULL,created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS auth_tokens(token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),kind TEXT NOT NULL CHECK(kind IN ('verify','reset','invite')),expires_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS guests(token_hash TEXT PRIMARY KEY,id TEXT NOT NULL UNIQUE,name TEXT NOT NULL DEFAULT 'Visitor',email TEXT NOT NULL DEFAULT '',expires_at INTEGER NOT NULL,created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS projects(id TEXT PRIMARY KEY,name TEXT NOT NULL,description TEXT NOT NULL DEFAULT '',client_id TEXT NOT NULL REFERENCES users(id),status TEXT NOT NULL DEFAULT 'planning',progress INTEGER NOT NULL DEFAULT 0 CHECK(progress BETWEEN 0 AND 100),due_date TEXT NOT NULL DEFAULT '',created_at TEXT NOT NULL,updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS assignments(project_id TEXT NOT NULL REFERENCES projects(id),user_id TEXT NOT NULL REFERENCES users(id),PRIMARY KEY(project_id,user_id));
CREATE TABLE IF NOT EXISTS conversations(id TEXT PRIMARY KEY,guest_id TEXT REFERENCES guests(id),client_id TEXT REFERENCES users(id),project_id TEXT UNIQUE REFERENCES projects(id),subject TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'open',created_at TEXT NOT NULL,updated_at TEXT NOT NULL,CHECK(guest_id IS NOT NULL OR client_id IS NOT NULL));
CREATE TABLE IF NOT EXISTS messages(id TEXT PRIMARY KEY,conversation_id TEXT NOT NULL REFERENCES conversations(id),sender_id TEXT REFERENCES users(id),guest_id TEXT REFERENCES guests(id),sender_name TEXT NOT NULL,body TEXT NOT NULL,client_key TEXT NOT NULL,created_at TEXT NOT NULL,UNIQUE(conversation_id,client_key));
CREATE TABLE IF NOT EXISTS change_requests(id TEXT PRIMARY KEY,project_id TEXT NOT NULL REFERENCES projects(id),author_id TEXT NOT NULL REFERENCES users(id),title TEXT NOT NULL,body TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'submitted',created_at TEXT NOT NULL,updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS invoices(id TEXT PRIMARY KEY,number TEXT NOT NULL UNIQUE,project_id TEXT NOT NULL REFERENCES projects(id),client_id TEXT NOT NULL REFERENCES users(id),description TEXT NOT NULL,amount_cents INTEGER NOT NULL CHECK(amount_cents>0),currency TEXT NOT NULL,due_date TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'draft',notes TEXT NOT NULL DEFAULT '',created_at TEXT NOT NULL,updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS activity(id TEXT PRIMARY KEY,project_id TEXT REFERENCES projects(id),actor_id TEXT REFERENCES users(id),body TEXT NOT NULL,created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS email_outbox(id TEXT PRIMARY KEY,to_email TEXT NOT NULL,subject TEXT NOT NULL,body TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'pending',attempts INTEGER NOT NULL DEFAULT 0,next_attempt INTEGER NOT NULL DEFAULT 0,last_error TEXT NOT NULL DEFAULT '',created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS rate_limits(key TEXT PRIMARY KEY,count INTEGER NOT NULL,reset_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS idx_projects_client ON projects(client_id);
CREATE INDEX IF NOT EXISTS idx_assignments_user ON assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_guest ON conversations(guest_id);
CREATE INDEX IF NOT EXISTS idx_conversations_client ON conversations(client_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id,created_at,id);
CREATE INDEX IF NOT EXISTS idx_requests_project ON change_requests(project_id);
CREATE INDEX IF NOT EXISTS idx_invoices_client ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_activity_project ON activity(project_id,created_at);
CREATE INDEX IF NOT EXISTS idx_outbox_status ON email_outbox(status,next_attempt);
`);return db;}
export function transaction(db,fn){db.exec('BEGIN IMMEDIATE');try{const result=fn();db.exec('COMMIT');return result}catch(e){db.exec('ROLLBACK');throw e}}
