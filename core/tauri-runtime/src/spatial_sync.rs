use std::net::{TcpListener, TcpStream};
use std::io::Write;
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;

pub struct SpatialSyncServer {
    pub port: u16,
    pub active_connections: Arc<Mutex<Vec<TcpStream>>>,
}

impl SpatialSyncServer {
    pub fn new(port: u16) -> Self {
        Self {
            port,
            active_connections: Arc::new(Mutex::new(Vec::new())),
        }
    }

    pub fn start(&self) {
        let port = self.port;
        let connections = Arc::clone(&self.active_connections);

        thread::spawn(move || {
            let listener = match TcpListener::bind(format!("127.0.0.1:{}", port)) {
                Ok(l) => l,
                Err(e) => {
                    println!("[SPATIAL SYNC ERROR] Failed to bind TCP listener: {}", e);
                    return;
                }
            };
            println!("[SPATIAL SYNC] WebSocket/TCP server active on 127.0.0.1:{}", port);

            for stream in listener.incoming() {
                match stream {
                    Ok(mut stream) => {
                        println!("[SPATIAL SYNC] External telemetry monitor connected.");
                        
                        // Basic HTTP handshaking/header processing could go here.
                        // For a pure TCP data stream connection:
                        let _ = stream.write_all(b"HTTP/1.1 200 OK\r\nContent-Type: application/json\r\n\r\n");
                        
                        let mut conns = connections.lock().unwrap();
                        conns.push(stream);
                    }
                    Err(e) => {
                        println!("[SPATIAL SYNC ERROR] Incoming connection failed: {}", e);
                    }
                }
            }
        });

        // Spawn a background heartbreaker / state broadcaster thread
        let connections_clone = Arc::clone(&self.active_connections);
        thread::spawn(move || {
            loop {
                thread::sleep(Duration::from_secs(2));
                
                let mut conns = connections_clone.lock().unwrap();
                // Filter out broken pipes
                conns.retain_mut(|stream| {
                    let heartbeat_payload = r#"{"type":"HEARTBEAT","status":"OPTIMAL"}"#;
                    match stream.write_all(format!("{}\n", heartbeat_payload).as_bytes()) {
                        Ok(_) => true,
                        Err(_) => false, // Remove disconnected clients
                    }
                });
            }
        });
    }

    pub fn broadcast_state(&self, payload: &str) {
        let mut conns = self.active_connections.lock().unwrap();
        conns.retain_mut(|stream| {
            match stream.write_all(format!("{}\n", payload).as_bytes()) {
                Ok(_) => true,
                Err(_) => false,
            }
        });
    }
}
