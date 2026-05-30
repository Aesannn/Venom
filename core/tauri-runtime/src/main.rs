#[cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

mod services;
mod swarm;
mod spatial_sync;
mod ledger;

use services::{
    EventBus, PowerManager, ProcessSupervisor, SystemEvent, TelemetryEngine,
    WorkspacePersistence, UpdateSystem, SemanticMemoryGraph, SemanticMemoryNode, SemanticMemoryEdge
};
use std::sync::{Arc, Mutex};

// Shared thread-safe app state singleton registered into Tauri State manager
pub struct AppState {
    pub event_bus: Arc<EventBus>,
    pub supervisor: Arc<Mutex<ProcessSupervisor>>,
    pub telemetry: Arc<TelemetryEngine>,
    pub persistence: Arc<WorkspacePersistence>,
    pub power: Arc<PowerManager>,
    pub semantic: Arc<SemanticMemoryGraph>,
    pub swarm: Arc<swarm::SwarmNodeManager>,
    pub spatial_sync: Arc<spatial_sync::SpatialSyncServer>,
    pub ledger: Arc<ledger::TemporalLedger>,
}

#[tauri::command]
fn get_system_telemetry(state: tauri::State<'_, AppState>) -> String {
    let data = state.telemetry.fetch_data();
    serde_json::to_string(&data).unwrap_or_default()
}

#[tauri::command]
fn aether_dispatch_event(
    state: tauri::State<'_, AppState>,
    event_type: String,
    payload: String,
    sender: String,
) -> Result<String, String> {
    let event = SystemEvent {
        event_type,
        payload,
        sender,
        timestamp: std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs(),
    };
    state
        .event_bus
        .publish(event)
        .map(|c| format!("Event disseminated successfully to {} receivers", c))
}

#[tauri::command]
fn aether_get_processes(state: tauri::State<'_, AppState>) -> String {
    let procs = state.supervisor.lock().unwrap().get_processes();
    serde_json::to_string(&procs).unwrap_or_default()
}

#[tauri::command]
fn aether_recover_pid(state: tauri::State<'_, AppState>, pid: u32) -> bool {
    state.supervisor.lock().unwrap().recover_process(pid)
}

#[tauri::command]
fn aether_fail_pid(state: tauri::State<'_, AppState>, pid: u32) -> bool {
    state.supervisor.lock().unwrap().fail_process(pid)
}

#[tauri::command]
fn aether_save_workspace(
    state: tauri::State<'_, AppState>,
    state_json: String,
) -> Result<String, String> {
    state
        .persistence
        .save_state(&state_json)
        .map(|_| "Session serialized successfully to VFS local file".to_string())
}

#[tauri::command]
fn aether_load_workspace(state: tauri::State<'_, AppState>) -> Result<String, String> {
    state.persistence.load_state()
}

#[tauri::command]
fn aether_get_power_status(state: tauri::State<'_, AppState>) -> String {
    let status = state.power.get_status();
    serde_json::to_string(&status).unwrap_or_default()
}

#[tauri::command]
fn aether_set_power_profile(state: tauri::State<'_, AppState>, profile: String) -> bool {
    state.power.set_profile(&profile)
}

#[tauri::command]
fn aether_check_updates() -> String {
    let update = UpdateSystem::check_updates();
    serde_json::to_string(&update).unwrap_or_default()
}

#[tauri::command]
fn aether_semantic_get_graph(state: tauri::State<'_, AppState>) -> String {
    let nodes = state.semantic.nodes.lock().unwrap().clone();
    let edges = state.semantic.edges.lock().unwrap().clone();
    let res = serde_json::json!({
        "nodes": nodes,
        "edges": edges,
    });
    serde_json::to_string(&res).unwrap_or_default()
}

#[tauri::command]
fn aether_semantic_add_node(
    state: tauri::State<'_, AppState>,
    id: String,
    name: String,
    node_type: String,
    description: String,
    tags: Vec<String>,
    metadata: String,
) -> bool {
    let node = SemanticMemoryNode {
        id,
        name,
        node_type,
        description,
        tags,
        metadata,
    };
    state.semantic.add_node(node)
}

#[tauri::command]
fn aether_semantic_add_edge(
    state: tauri::State<'_, AppState>,
    source: String,
    target: String,
    relationship: String,
    weight: f32,
) -> bool {
    let edge = SemanticMemoryEdge {
        source,
        target,
        relationship,
        weight,
    };
    state.semantic.add_edge(edge)
}

#[tauri::command]
fn aether_semantic_clear_graph(state: tauri::State<'_, AppState>) -> bool {
    state.semantic.clear_graph()
}

#[tauri::command]
fn aether_semantic_query(state: tauri::State<'_, AppState>, tag: String) -> String {
    let matches = state.semantic.query_semantic_cosine(&tag);
    serde_json::to_string(&matches).unwrap_or_default()
}

#[tauri::command]
fn aether_launch_app(app_name: String) -> Result<String, String> {
    let command = match app_name.to_lowercase().as_str() {
        "vscode" | "code" => Some("code"),
        "terminal" | "wt" => Some("wt"),
        "cmd" => Some("cmd"),
        "spotify" => Some("spotify"),
        "chrome" | "browser" => Some("chrome"),
        _ => None,
    };

    if let Some(cmd) = command {
        #[cfg(target_os = "windows")]
        {
            std::process::Command::new("cmd")
                .args(&["/C", "start", "", cmd])
                .spawn()
                .map_err(|e| format!("Failed to spawn process: {}", e))?;
        }
        #[cfg(not(target_os = "windows"))]
        {
            std::process::Command::new(cmd)
                .spawn()
                .map_err(|e| format!("Failed to spawn process: {}", e))?;
        }
        Ok(format!("Successfully launched {}", app_name))
    } else {
        Err(format!("Application '{}' is not registered in the OS map", app_name))
    }
}

#[tauri::command]
fn aether_create_workspace_file(path_str: String, content: String) -> Result<String, String> {
    use std::fs::File;
    use std::io::Write;
    use std::path::PathBuf;

    let mut filepath = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
    filepath.push(&path_str);

    if let Some(parent) = filepath.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }

    let mut file = File::create(&filepath).map_err(|e| e.to_string())?;
    file.write_all(content.as_bytes()).map_err(|e| e.to_string())?;

    Ok(format!("Successfully wrote file to absolute disk path: {:?}", filepath))
}

#[tauri::command]
fn aether_capture_screen() -> Result<String, String> {
    let script = r#"
        Add-Type -AssemblyName System.Windows.Forms
        Add-Type -AssemblyName System.Drawing
        $bounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
        $bmp = New-Object System.Drawing.Bitmap $bounds.Width, $bounds.Height
        $graphics = [System.Drawing.Graphics]::FromImage($bmp)
        $graphics.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.Size)
        $ms = New-Object System.IO.MemoryStream
        $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Jpeg)
        $bmp.Dispose()
        $graphics.Dispose()
        [System.Convert]::ToBase64String($ms.ToArray())
    "#;

    let output = std::process::Command::new("powershell")
        .args(&["-NoProfile", "-Command", script])
        .output()
        .map_err(|e| e.to_string())?;

    let base64_str = String::from_utf8(output.stdout)
        .map_err(|e| e.to_string())?
        .trim()
        .to_string();

    Ok(base64_str)
}

// ========================================================
// NEW ECOSYSTEM SYSTEM INTEGRATION COMMANDS
// ========================================================

#[tauri::command]
fn aether_swarm_spawn_agent(
    state: tauri::State<'_, AppState>,
    id: String,
    name: String,
    role: String,
    instructions: String,
) -> bool {
    state.swarm.spawn_agent(id, name, role, instructions);
    true
}

#[tauri::command]
fn aether_swarm_get_agents(state: tauri::State<'_, AppState>) -> String {
    let agents = state.swarm.agents.lock().unwrap().clone();
    serde_json::to_string(&agents).unwrap_or_default()
}

#[tauri::command]
fn aether_swarm_trigger_task(state: tauri::State<'_, AppState>, task: String) -> bool {
    state.swarm.trigger_task(task);
    true
}

#[tauri::command]
fn aether_spatial_sync_broadcast(state: tauri::State<'_, AppState>, payload: String) -> bool {
    state.spatial_sync.broadcast_state(&payload);
    true
}

#[tauri::command]
fn aether_ledger_record_snapshot(
    state: tauri::State<'_, AppState>,
    active_file: String,
    file_content_diff: String,
    terminal_command: String,
    status_state: String,
    notes: String,
) -> bool {
    state.ledger.record_snapshot(active_file, file_content_diff, terminal_command, status_state, notes);
    true
}

#[tauri::command]
fn aether_ledger_get_history(state: tauri::State<'_, AppState>) -> String {
    let hist = state.ledger.get_history();
    serde_json::to_string(&hist).unwrap_or_default()
}

fn main() {
    let spatial_sync = Arc::new(spatial_sync::SpatialSyncServer::new(4444));
    spatial_sync.start();

    let app_state = AppState {
        event_bus: Arc::new(EventBus::new()),
        supervisor: Arc::new(Mutex::new(ProcessSupervisor::new())),
        telemetry: Arc::new(TelemetryEngine::new()),
        persistence: Arc::new(WorkspacePersistence::new()),
        power: Arc::new(PowerManager::new()),
        semantic: Arc::new(SemanticMemoryGraph::new()),
        swarm: Arc::new(swarm::SwarmNodeManager::new()),
        spatial_sync,
        ledger: Arc::new(ledger::TemporalLedger::new()),
    };

    tauri::Builder::default()
        .manage(app_state)
        .invoke_handler(tauri::generate_handler![
            get_system_telemetry,
            aether_dispatch_event,
            aether_get_processes,
            aether_recover_pid,
            aether_fail_pid,
            aether_save_workspace,
            aether_load_workspace,
            aether_get_power_status,
            aether_set_power_profile,
            aether_check_updates,
            aether_semantic_get_graph,
            aether_semantic_add_node,
            aether_semantic_add_edge,
            aether_semantic_clear_graph,
            aether_semantic_query,
            aether_launch_app,
            aether_create_workspace_file,
            aether_capture_screen,
            
            // New Ecosystem Commands
            aether_swarm_spawn_agent,
            aether_swarm_get_agents,
            aether_swarm_trigger_task,
            aether_spatial_sync_broadcast,
            aether_ledger_record_snapshot,
            aether_ledger_get_history
        ])
        .run(tauri::generate_context!())
        .expect("error while running aether core runtime");
}
