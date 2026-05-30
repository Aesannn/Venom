# AETHER-OS Spatial Desktop Shell Nix Derivation
# Defines custom packaging and build-system dependencies for reproducible deployment.

{ lib
, rustPlatform
, fetchFromGitHub
, pkg-config
, glib
, gtk3
, webkitgtk
, libsoup
, openssl
, nodejs
, wrapGAppsHook
, systemd
, libinput
, libxkbcommon
, wayland
, mesa
, seatd
}:

rustPlatform.buildRustPackage rec {
  pname = "aether-shell";
  version = "1.0.0";

  src = ../../..; # Point to monorepo root directory

  cargoLock = {
    lockFile = ../../tauri-runtime/Cargo.lock;
  };

  nativeBuildInputs = [
    pkg-config
    wrapGAppsHook
    nodejs
  ];

  buildInputs = [
    glib
    gtk3
    webkitgtk
    libsoup
    openssl
    systemd
    libinput
    libxkbcommon
    wayland
    mesa
    seatd
  ];

  # Pre-build phases: Compile spatial UI web asset package and warm up compositor binary
  preBuild = ''
    export HOME=$TMPDIR
    npm ci
    npm run build --workspace=apps/shell
  '';

  # Configure post-install launcher scripting for Wayland kiosk
  postInstall = ''
    mkdir -p $out/bin
    cat > $out/bin/aether-shell-launcher <<EOF
    #!/bin/sh
    # Absolute environmental optimizations for kiosk-compositor execution
    export WEBKIT_DISABLE_COMPOSITING_MODE=0
    export WEBKIT_FORCE_SANDBOX=0
    export GDK_BACKEND=wayland
    export TAURI_PLATFORM=linux
    
    exec $out/bin/tauri-runtime
    EOF
    chmod +x $out/bin/aether-shell-launcher
  '';

  meta = with lib; {
    description = "Spatial AI-native user shell and computing environment for AETHER-OS";
    homepage = "https://github.com/aether-os/platform";
    license = licenses.mit;
    platforms = platforms.linux;
    maintainers = [ "AETHER Core Systems Architect" ];
  };
}
