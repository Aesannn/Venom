use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SwarmAgent {
    pub id: String,
    pub name: String,
    pub role: String, // "Architect", "Tester", "Reviewer"
    pub instructions: String,
    pub current_task: Option<String>,
    pub status: String, // "IDLE", "WORKING", "COMPILING", "SUCCESS", "FAILED"
    pub logs: Vec<String>,
    pub last_active: u64,
}

pub struct SwarmNodeManager {
    pub agents: Arc<Mutex<Vec<SwarmAgent>>>,
}

impl SwarmNodeManager {
    pub fn new() -> Self {
        let manager = Self {
            agents: Arc::new(Mutex::new(Vec::new())),
        };
        manager.init_default_agents();
        manager
    }

    fn init_default_agents(&self) {
        let mut agents = self.agents.lock().unwrap();
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();

        agents.push(SwarmAgent {
            id: "agent-arch".to_string(),
            name: "Ivar-Architect".to_string(),
            role: "Architect".to_string(),
            instructions: "Write clean modular backend code, structure directory files, and optimize runtime performance.".to_string(),
            current_task: None,
            status: "IDLE".to_string(),
            logs: vec!["[SYSTEM] Architect node initialized and standing by.".to_string()],
            last_active: now,
        });

        agents.push(SwarmAgent {
            id: "agent-test".to_string(),
            name: "Ivar-Tester".to_string(),
            role: "Tester".to_string(),
            instructions: "Audit backend implementations, scan for circular dependencies or memory leaks, and run automated sandboxed test suites.".to_string(),
            current_task: None,
            status: "IDLE".to_string(),
            logs: vec!["[SYSTEM] Tester node initialized and standing by.".to_string()],
            last_active: now,
        });
    }

    pub fn spawn_agent(&self, id: String, name: String, role: String, instructions: String) {
        let mut agents = self.agents.lock().unwrap();
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();

        agents.push(SwarmAgent {
            id: id.clone(),
            name: name.clone(),
            role: role.clone(),
            instructions,
            current_task: None,
            status: "IDLE".to_string(),
            logs: vec![format!("[SYSTEM] Agent '{}' ({}) spawned successfully.", name, role)],
            last_active: now,
        });
    }

    pub fn trigger_task(&self, task_description: String) {
        let agents = Arc::clone(&self.agents);
        
        // Spawn asynchronous worker thread simulating agent swarm processing
        thread::spawn(move || {
            let now = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap_or_default()
                .as_secs();

            {
                let mut active_agents = agents.lock().unwrap();
                for agent in active_agents.iter_mut() {
                    agent.status = "WORKING".to_string();
                    agent.current_task = Some(task_description.clone());
                    agent.last_active = now;
                    agent.logs.push(format!("[TASK SPUN] Received task: '{}'", task_description));
                }
            }

            // Simulate step 1: Architect writes code
            thread::sleep(Duration::from_secs(4));
            {
                let mut active_agents = agents.lock().unwrap();
                if let Some(arch) = active_agents.iter_mut().find(|a| a.role == "Architect") {
                    arch.status = "COMPILING".to_string();
                    arch.logs.push("[ARCHITECT] Completed core architecture endpoints. Writing to local sandboxed cache...".to_string());
                    arch.logs.push("[ARCHITECT] Launching preliminary build checks...".to_string());
                }
            }

            // Simulate step 2: Tester audits
            thread::sleep(Duration::from_secs(4));
            {
                let mut active_agents = agents.lock().unwrap();
                if let Some(tester) = active_agents.iter_mut().find(|a| a.role == "Tester") {
                    tester.status = "WORKING".to_string();
                    tester.logs.push("[TESTER] Intercepted new code cache from Architect. Auditing imports and references...".to_string());
                    tester.logs.push("[TESTER] Running semantic sanitization check. No memory leaks detected.".to_string());
                }
            }

            // Simulate step 3: Completed loop
            thread::sleep(Duration::from_secs(3));
            {
                let mut active_agents = agents.lock().unwrap();
                for agent in active_agents.iter_mut() {
                    agent.status = "SUCCESS".to_string();
                    agent.current_task = None;
                    agent.logs.push("[SWARM SUCCESS] Collaborative loop terminated. Test suite passes with 100% stability.".to_string());
                }
            }
        });
    }
}
