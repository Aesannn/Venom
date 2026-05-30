use std::time::{Duration, Instant};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PerformanceProfile {
    Eco,               // 30 FPS targeting to conserve block power
    Balanced,          // 60 FPS targeting standard
    HyperPerformance,  // 120 FPS dynamic high-refresh targeting
}

pub struct AetherFramePacer {
    pub active_profile: PerformanceProfile,
    pub frame_count: u64,
    pub last_frame_time: Instant,
    pub accumulated_fps: f32,
}

impl AetherFramePacer {
    pub fn new() -> Self {
        Self {
            active_profile: PerformanceProfile::Balanced,
            frame_count: 0,
            last_frame_time: Instant::now(),
            accumulated_fps: 60.0,
        }
    }

    pub fn set_profile(&mut self, profile: PerformanceProfile) {
        self.active_profile = profile;
        println!("[PERFORMANCE CORE] Swapped frame-pacing scheduler profile to: {:?}", profile);
    }

    pub fn get_target_frame_duration(&self) -> Duration {
        match self.active_profile {
            PerformanceProfile::Eco => Duration::from_nanos(33_333_333),              // ~30 FPS interval
            PerformanceProfile::Balanced => Duration::from_nanos(16_666_667),         // ~60 FPS interval
            PerformanceProfile::HyperPerformance => Duration::from_nanos(8_333_333),  // ~120 FPS interval
        }
    }

    pub fn tick_frame(&mut self) -> f32 {
        self.frame_count += 1;
        
        let now = Instant::now();
        let elapsed = now.duration_since(self.last_frame_time);
        self.last_frame_time = now;

        let frame_time_secs = elapsed.as_secs_f32();
        let instantaneous_fps = if frame_time_secs > 0.0 {
            1.0 / frame_time_secs
        } else {
            60.0
        };

        // Smoothly aggregate rolling FPS calculations (exponential moving filter)
        self.accumulated_fps = self.accumulated_fps * 0.95 + instantaneous_fps * 0.05;

        self.accumulated_fps
    }

    pub fn suggest_profile_adjustment(&self, cpu_load: f32, on_battery: bool) -> Option<PerformanceProfile> {
        // Dynamic performance suggestions based on hardware battery status and system load
        if on_battery && self.active_profile != PerformanceProfile::Eco {
            return Some(PerformanceProfile::Eco);
        }
        if !on_battery && cpu_load > 85.0 && self.active_profile != PerformanceProfile::HyperPerformance {
            return Some(PerformanceProfile::HyperPerformance);
        }
        if !on_battery && cpu_load <= 85.0 && self.active_profile != PerformanceProfile::Balanced {
            return Some(PerformanceProfile::Balanced);
        }
        None
    }
}
