use crate::error::{AppError, Result};
use crate::plugins::sidecar::InvestigationDossier;
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InvestigationHistoryItem {
    pub id: String,
    pub target: String,
    pub target_type: String,
    pub trust_score: u32,
    pub summary: String,
    pub created_at: String,
}

pub struct DbState {
    pub conn: Mutex<Connection>,
}

impl DbState {
    pub fn new_in_memory() -> Result<Self> {
        let conn = Connection::open_in_memory()
            .map_err(|e| AppError::DatabaseError(e.to_string()))?;
        init_schema(&conn)?;
        Ok(Self {
            conn: Mutex::new(conn),
        })
    }

    pub fn new_file(path: &str) -> Result<Self> {
        let conn = Connection::open(path)
            .map_err(|e| AppError::DatabaseError(e.to_string()))?;
        
        // Performance & Reliability Pragmas per AGENTS.md
        conn.execute_batch(
            "PRAGMA journal_mode = WAL;
             PRAGMA busy_timeout = 5000;
             PRAGMA synchronous = NORMAL;"
        ).map_err(|e| AppError::DatabaseError(format!("Pragma setup error: {}", e)))?;

        init_schema(&conn)?;
        Ok(Self {
            conn: Mutex::new(conn),
        })
    }
}

fn init_schema(conn: &Connection) -> Result<()> {
    conn.execute(
        "CREATE TABLE IF NOT EXISTS investigations (
            id TEXT PRIMARY KEY,
            target TEXT NOT NULL,
            target_type TEXT NOT NULL,
            trust_score INTEGER NOT NULL,
            summary TEXT NOT NULL,
            raw_dossier TEXT NOT NULL,
            created_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_investigations_created_at ON investigations (created_at DESC);",
        [],
    ).map_err(|e| AppError::DatabaseError(format!("Schema initialization error: {}", e)))?;
    Ok(())
}

pub fn save_dossier(conn: &Connection, dossier: &InvestigationDossier) -> Result<()> {
    let raw_json = serde_json::to_string(dossier)
        .map_err(|e| AppError::SerializationError(e.to_string()))?;

    conn.execute(
        "INSERT OR REPLACE INTO investigations (id, target, target_type, trust_score, summary, raw_dossier, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![
            dossier.id,
            dossier.target,
            dossier.target_type,
            dossier.trust_score,
            dossier.summary,
            raw_json,
            dossier.created_at,
        ],
    ).map_err(|e| AppError::DatabaseError(format!("Failed to save dossier: {}", e)))?;

    Ok(())
}

pub fn get_history(conn: &Connection, limit: u32) -> Result<Vec<InvestigationHistoryItem>> {
    let mut stmt = conn.prepare(
        "SELECT id, target, target_type, trust_score, summary, created_at
         FROM investigations
         ORDER BY created_at DESC
         LIMIT ?1"
    ).map_err(|e| AppError::DatabaseError(e.to_string()))?;

    let rows = stmt.query_map(params![limit], |row| {
        Ok(InvestigationHistoryItem {
            id: row.get(0)?,
            target: row.get(1)?,
            target_type: row.get(2)?,
            trust_score: row.get(3)?,
            summary: row.get(4)?,
            created_at: row.get(5)?,
        })
    }).map_err(|e| AppError::DatabaseError(e.to_string()))?;

    let mut list = Vec::new();
    for r in rows {
        if let Ok(item) = r {
            list.push(item);
        }
    }

    Ok(list)
}

pub fn delete_dossier(conn: &Connection, id: &str) -> Result<bool> {
    let affected = conn.execute(
        "DELETE FROM investigations WHERE id = ?1",
        params![id],
    ).map_err(|e| AppError::DatabaseError(format!("Delete error: {}", e)))?;

    Ok(affected > 0)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sqlite_in_memory_save_and_retrieve() {
        let db = DbState::new_in_memory().expect("in-memory db failed");
        let conn = db.conn.lock().unwrap();

        let dossier = InvestigationDossier {
            id: "test-id-123".to_string(),
            target: "alice_crypto".to_string(),
            target_type: "username".to_string(),
            trust_score: 85,
            created_at: "2026-08-31T20:00:00Z".to_string(),
            summary: "Test summary".to_string(),
            red_flags: vec![],
            profiles: vec![],
            raw_findings: serde_json::json!({}),
        };

        save_dossier(&conn, &dossier).expect("save failed");

        let history = get_history(&conn, 10).expect("history failed");
        assert_eq!(history.len(), 1);
        assert_eq!(history[0].target, "alice_crypto");
        assert_eq!(history[0].trust_score, 85);

        let deleted = delete_dossier(&conn, "test-id-123").expect("delete failed");
        assert!(deleted);

        let after_del = get_history(&conn, 10).expect("history after delete failed");
        assert_eq!(after_del.len(), 0);
    }
}
