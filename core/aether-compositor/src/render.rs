use std::sync::Arc;
use wgpu::{
    util::DeviceExt,
    Adapter, BindGroup, BindGroupLayout, Device, Queue, RenderPipeline, ShaderModule, Surface,
    Texture, TextureView,
};

#[repr(C)]
#[derive(Copy, Clone, Debug, bytemuck::Pod, bytemuck::Zeroable)]
pub struct CompositorUniforms {
    pub resolution: [f32; 2],
    pub cursor_pos: [f32; 2],
    pub time: f32,
    pub active_workspace: u32, // 0 = dev, 1 = media, 2 = sys
    pub theme_accent: [f32; 3], // dynamic color theme (cyan/purple/green/orange)
    pub padding: f32,
}

pub struct AetherGPURenderer {
    pub device: Device,
    pub queue: Queue,
    pub render_pipeline: RenderPipeline,
    pub uniform_buffer: wgpu::Buffer,
    pub uniform_bind_group: BindGroup,
    pub vertex_buffer: wgpu::Buffer,
}

#[repr(C)]
#[derive(Copy, Clone, Debug, bytemuck::Pod, bytemuck::Zeroable)]
struct Vertex {
    position: [f32; 3],
    tex_coords: [f32; 2],
}

const VERTICES: &[Vertex] = &[
    Vertex { position: [-1.0, 1.0, 0.0], tex_coords: [0.0, 0.0] },
    Vertex { position: [-1.0, -1.0, 0.0], tex_coords: [0.0, 1.0] },
    Vertex { position: 1.0, -1.0, 0.0], tex_coords: [1.0, 1.0] },
    Vertex { position: [1.0, 1.0, 0.0], tex_coords: [1.0, 0.0] },
];

const INDICES: &[u16] = &[0, 1, 2, 0, 2, 3];

impl AetherGPURenderer {
    pub async fn new() -> Result<Self, Box<dyn std::error::Error>> {
        let instance = wgpu::Instance::default();
        
        // Request dedicated high-performance hardware adapter
        let adapter = instance.request_adapter(&wgpu::RequestAdapterOptions {
            power_preference: wgpu::PowerPreference::HighPerformance,
            compatible_surface: None,
            force_fallback_adapter: false,
        }).await.ok_or("Failed to request wgpu Vulkan graphics adapter.")?;

        let (device, queue) = adapter.request_device(
            &wgpu::DeviceDescriptor {
                label: Some("Aether GPU Device Core"),
                required_features: wgpu::Features::empty(),
                required_limits: wgpu::Limits::default(),
            },
            None,
        ).await?;

        // Write premium WGSL shader dynamically to compile background sheens, noise blurs and dynamic lighting
        let shader = device.create_shader_module(wgpu::ShaderModuleDescriptor {
            label: Some("Aether Compositor Shader"),
            source: wgpu::ShaderSource::Wgsl(std::borrow::Cow::Borrowed(
                r#"
                struct VertexInput {
                    @location(0) position: vec3<f32>,
                    @location(1) tex_coords: vec2<f32>,
                };

                struct VertexOutput {
                    @builtin(position) clip_position: vec4<f32>,
                    @location(0) tex_coords: vec2<f32>,
                };

                @vertex
                fn vs_main(model: VertexInput) -> VertexOutput {
                    var out: VertexOutput;
                    out.clip_position = vec4<f32>(model.position, 1.0);
                    out.tex_coords = model.tex_coords;
                    return out;
                }

                struct Uniforms {
                    resolution: vec2<f32>,
                    cursor_pos: vec2<f32>,
                    time: f32,
                    active_workspace: u32,
                    theme_accent: vec3<f32>,
                };

                @group(0) @binding(0)
                var<uniform> uniforms: Uniforms;

                @fragment
                fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
                    // GPU-level mathematical noise backdrop blending
                    let uv = in.tex_coords;
                    let cursor_dist = distance(in.clip_position.xy, uniforms.cursor_pos);
                    
                    // Dynamic workspace environmental mapping
                    var base_color = vec3<f32>(0.05, 0.05, 0.08); // dev background dark
                    var glow_amount = 0.0;
                    
                    if (uniforms.active_workspace == 1u) { // media workspace blur
                        base_color = vec3<f32>(0.12, 0.08, 0.05);
                        glow_amount = 0.35;
                    } else if (uniforms.active_workspace == 2u) { // sys core workspace blur
                        base_color = vec3<f32>(0.03, 0.08, 0.05);
                        glow_amount = 0.55;
                    }

                    // dynamic theme cursor radial glow mesh
                    let glow_radius = 280.0;
                    let glow = max(0.0, 1.0 - (cursor_dist / glow_radius)) * 0.15;
                    
                    let color = base_color + uniforms.theme_accent * glow;
                    return vec4<f32>(color, 0.95);
                }
                "#
            )),
        });

        // Initialize Uniform metrics buffers
        let initial_uniforms = CompositorUniforms {
            resolution: [1920.0, 1080.0],
            cursor_pos: [960.0, 540.0],
            time: 0.0,
            active_workspace: 0,
            theme_accent: [0.13, 0.82, 0.93], // cyan theme accent
            padding: 0.0,
        };

        let uniform_buffer = device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some("Compositor Uniforms Buffer"),
            contents: bytemuck::cast_slice(&[initial_uniforms]),
            usage: wgpu::BufferUsages::UNIFORM | wgpu::BufferUsages::COPY_DST,
        });

        let uniform_bind_group_layout = device.create_bind_group_layout(&wgpu::BindGroupLayoutDescriptor {
            entries: &[
                wgpu::BindGroupLayoutEntry {
                    binding: 0,
                    visibility: wgpu::ShaderStages::FRAGMENT,
                    ty: wgpu::BindingType::Buffer {
                        ty: wgpu::BufferBindingType::Uniform,
                        has_dynamic_offset: false,
                        min_binding_size: None,
                    },
                    count: None,
                }
            ],
            label: Some("Uniform Bind Group Layout"),
        });

        let uniform_bind_group = device.create_bind_group(&wgpu::BindGroupDescriptor {
            layout: &uniform_bind_group_layout,
            entries: &[
                wgpu::BindGroupEntry {
                    binding: 0,
                    resource: uniform_buffer.as_entire_binding(),
                }
            ],
            label: Some("Uniform Bind Group"),
        });

        let pipeline_layout = device.create_pipeline_layout(&wgpu::PipelineLayoutDescriptor {
            label: Some("Render Pipeline Layout"),
            bind_group_layouts: &[&uniform_bind_group_layout],
            push_constant_ranges: &[],
        });

        let render_pipeline = device.create_render_pipeline(&wgpu::RenderPipelineDescriptor {
            label: Some("Compositor Render Pipeline"),
            layout: Some(&pipeline_layout),
            vertex: wgpu::VertexState {
                module: &shader,
                entry_point: "vs_main",
                buffers: &[
                    wgpu::VertexBufferLayout {
                        array_stride: std::mem::size_of::<Vertex>() as wgpu::BufferAddress,
                        step_mode: wgpu::VertexStepMode::Vertex,
                        attributes: &[
                            wgpu::VertexAttribute {
                                offset: 0,
                                shader_location: 0,
                                format: wgpu::VertexFormat::Float32x3,
                            },
                            wgpu::VertexAttribute {
                                offset: std::mem::size_of::<[f32; 3]>() as wgpu::BufferAddress,
                                shader_location: 1,
                                format: wgpu::VertexFormat::Float32x2,
                            },
                        ],
                    }
                ],
            },
            fragment: Some(wgpu::FragmentState {
                module: &shader,
                entry_point: "fs_main",
                targets: &[Some(wgpu::ColorTargetState {
                    format: wgpu::TextureFormat::Rgba8UnormSrgb,
                    blend: Some(wgpu::BlendState::REPLACE),
                    write_mask: wgpu::ColorWrites::ALL,
                })],
            }),
            primitive: wgpu::PrimitiveState::default(),
            depth_stencil: None,
            multisample: wgpu::MultisampleState::default(),
            multiview: None,
        });

        let vertex_buffer = device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some("Quad Vertex Buffer"),
            contents: bytemuck::cast_slice(VERTICES),
            usage: wgpu::BufferUsages::VERTEX,
        });

        println!("[AETHER GPU ENGINE] Render Pipeline compiled successfully. 3D spatial compositer ready.");

        Ok(Self {
            device,
            queue,
            render_pipeline,
            uniform_buffer,
            uniform_bind_group,
            vertex_buffer,
        })
    }

    pub fn update_metrics(
        &self,
        time: f32,
        cursor: [f32; 2],
        workspace: u32,
        theme_accent: [f32; 3],
    ) {
        let uniforms = CompositorUniforms {
            resolution: [1920.0, 1080.0],
            cursor_pos: cursor,
            time,
            active_workspace: workspace,
            theme_accent,
            padding: 0.0,
        };
        self.queue.write_buffer(&self.uniform_buffer, 0, bytemuck::cast_slice(&[uniforms]));
    }
}
