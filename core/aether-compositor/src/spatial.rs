pub struct SpatialCoordinates {
    pub x: f32,
    pub y: f32,
    pub z_depth: f32, // elevation: focused is 0.0, inactive recedes to -1.0
    pub scale: f32,   // scale: focused is 1.0, inactive recedes to 0.965
    pub rotate_x: f32, // dynamic inertial tilt physics
    pub rotate_y: f32,
}

pub struct SpatialWindow {
    pub id: String,
    pub title: String,
    pub current: SpatialCoordinates,
    pub target: SpatialCoordinates,
    pub is_focused: bool,
}

pub struct SpatialEngine {
    pub windows: Vec<SpatialWindow>,
    pub screen_width: u32,
    pub screen_height: u32,
}

impl SpatialEngine {
    pub fn new(w: u32, h: u32) -> Self {
        Self {
            windows: Vec::new(),
            screen_width: w,
            screen_height: h,
        }
    }

    pub fn register_window(&mut self, id: String, title: String) {
        let initial = SpatialCoordinates {
            x: 100.0,
            y: 70.0,
            z_depth: -0.5,
            scale: 0.965,
            rotate_x: 0.0,
            rotate_y: 0.0,
        };

        let win = SpatialWindow {
            id,
            title,
            current: initial,
            target: initial,
            is_focused: false,
        };

        self.windows.push(win);
        println!("[SPATIAL ENGINE] Window registered in spatial coordinate database.");
    }

    pub fn focus_window(&mut self, id: &str) {
        for win in &mut self.windows {
            if win.id == id {
                win.is_focused = true;
                // Elevate active window to the front plane
                win.target.z_depth = 0.0;
                win.target.scale = 1.0;
                println!("[SPATIAL ENGINE] Elevated window '{}' to active focal plane.", win.title);
            } else if win.is_focused {
                win.is_focused = false;
                // Recede previously focused windows back into the spatial depth layer
                win.target.z_depth = -1.0;
                win.target.scale = 0.965;
            }
        }
    }

    pub fn update_tilts(&mut self, id: &str, rx: f32, ry: f32) {
        if let Some(win) = self.windows.iter_mut().find(|w| w.id == id) {
            win.target.rotate_x = rx;
            win.target.rotate_y = ry;
        }
    }

    pub fn update_layout_ticks(&mut self, delta_time: f32) {
        // Smoothly interpolate spatial properties (Spring physics emulation)
        let lerp_factor = (delta_time * 8.0).min(1.0); // spring damper

        for win in &mut self.windows {
            win.current.x += (win.target.x - win.current.x) * lerp_factor;
            win.current.y += (win.target.y - win.current.y) * lerp_factor;
            win.current.z_depth += (win.target.z_depth - win.current.z_depth) * lerp_factor;
            win.current.scale += (win.target.scale - win.current.scale) * lerp_factor;
            win.current.rotate_x += (win.target.rotate_x - win.current.rotate_x) * lerp_factor;
            win.current.rotate_y += (win.target.rotate_y - win.current.rotate_y) * lerp_factor;
        }
    }

    pub fn get_projection_matrix(&self, win_id: &str) -> Option<[[f32; 4]; 4]> {
        let win = self.windows.iter().find(|w| w.id == win_id)?;
        
        // Formulate 3D matrix math using scale, rotation and translation parameters
        // standard model projection coordinates array:
        let s = win.current.scale;
        let tx = win.current.x / self.screen_width as f32 * 2.0 - 1.0;
        let ty = -(win.current.y / self.screen_height as f32 * 2.0 - 1.0);
        let tz = win.current.z_depth;

        // Simplify translation matrix with Z-depth offsets
        Some([
            [s, 0.0, 0.0, 0.0],
            [0.0, s, 0.0, 0.0],
            [0.0, 0.0, 1.0, 0.0],
            [tx, ty, tz, 1.0],
        ])
    }
}
