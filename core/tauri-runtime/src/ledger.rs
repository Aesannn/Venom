use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LedgerSnapshot {
    pub timestamp: u64,
    pub active_file: String,
    pub file_content_diff: String,
    pub terminal_command: String,
    pub status_state: String,
    pub notes: String,
}

pub struct TemporalLedger {
    pub history: Mutex<Vec<LedgerSnapshot>>,
}

impl TemporalLedger {
    pub fn new() -> Self {
        let ledger = Self {
            history: Mutex::new(Vec::new()),
        };
        ledger.init_mock_history();
        ledger
    }

    fn init_mock_history(&self) {
        let mut history = self.history.lock().unwrap();
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();

        // 3 Hours ago
        history.push(LedgerSnapshot {
            timestamp: now - 10800,
            active_file: "core/tauri-runtime/src/services.rs".to_string(),
            file_content_diff: "- let final_temp = temperature.unwrap_or_else(|| {\n-     48.5 + (time_factor * 2.2)\n- });\n+ let final_temp = temperature.unwrap_or_else(|| {\n+     32.0 + (time_factor * 1.5) // Optimal eco cooling active\n+ });".to_string(),
            terminal_command: "cargo check".to_string(),
            status_state: "SUCCESS".to_string(),
            notes: "Configured optimized eco temperature monitoring bounds.".to_string(),
        });

        // 1 Hour ago
        history.push(LedgerSnapshot {
            timestamp: now - 3600,
            active_file: "apps/shell/src/components/BootScreen.tsx".to_string(),
            file_content_diff: "- const BOOT_TIMEOUT = 5000;\n+ const BOOT_TIMEOUT = 1200; // Accelerated system launch".to_string(),
            terminal_command: "npm run build".to_string(),
            status_state: "SUCCESS".to_string(),
            notes: "Accelerated boot screen countdown sequence timeout.".to_string(),
        });

        // 15 Minutes ago
        history.push(LedgerSnapshot {
            timestamp: now - 900,
            active_file: "core/aether-compositor/src/spatial.rs".to_string(),
            file_content_diff: "- let s = win.current.scale;\n+ let s = win.current.scale * 1.05; // Elevated projection scale factor".to_string(),
            terminal_command: "cargo run".to_string(),
            status_state: "FAILED".to_string(),
            notes: "Modified scale projection factor multiplier. Caused coordinate rendering boundary anomalies.".to_string(),
        });
    }

    pub fn record_snapshot(
        &self,
        active_file: String,
        file_content_diff: String,
        terminal_command: String,
        status_state: String,
        notes: String,
    ) {
        let mut history = self.history.lock().unwrap();
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();

        history.push(LedgerSnapshot {
            timestamp: now,
            active_file,
            file_content_diff,
            terminal_command,
            status_state,
            notes,
        });
    }

    pub fn get_history(&self) -> Vec<LedgerSnapshot> {
        self.history.lock().unwrap().clone()
    }
}
