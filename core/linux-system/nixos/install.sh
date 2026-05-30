#!/usr/bin/env bash
# ==============================================================================
# AETHER-OS Production Installation & Bootstrap Script
# Orchestrates automated partitioning, volume binding, and NixOS image compilation.
# ==============================================================================

set -euo pipefail

# Cinematic ANSI Color outputs
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${CYAN}================================================================${NC}"
echo -e "${CYAN}       AETHER-OS Production System Installation Target          ${NC}"
echo -e "${CYAN}================================================================${NC}"
echo ""

# 1. Hardware Verification Pre-Checks
echo -e "[*] Running system diagnostics pre-checks..."
if [ ! -d /sys/firmware/efi ]; then
    echo -e "${RED}[ERROR] UEFI firmware directory not detected. AETHER-OS requires UEFI boot mode.${NC}"
    exit 1
fi
echo -e "${GREEN}[✔] UEFI firmware interface detected.${NC}"

# Search for target block storage device
TARGET_DISK=$(lsblk -d -n -o NAME,TYPE | grep -E "disk|nvme" | head -n 1 | awk '{print $1}')
if [ -z "$TARGET_DISK" ]; then
    echo -e "${RED}[ERROR] No installable block storage device identified.${NC}"
    exit 1
fi
DISK_PATH="/dev/$TARGET_DISK"
echo -e "${GREEN}[✔] Target block device identified: ${DISK_PATH} (${YELLOW}Caution: All data will be wiped!${NC})"

# 2. Partitioning Disk (GPT Layout: EFI System, Nix Store, Persistence Store)
echo -e "[*] Compiling partition layout maps on ${DISK_PATH}..."
parted --script "${DISK_PATH}" -- \
    mklabel gpt \
    mkpart ESP fat32 1MiB 512MiB \
    set 1 esp on \
    mkpart nixos_nix ext4 512MiB 40GiB \
    mkpart nixos_persist ext4 40GiB 100%

# Partition naming convention resolution
if [[ "$DISK_PATH" == *"nvme"* || "$DISK_PATH" == *"mmcblk"* ]]; then
    PART_EFI="${DISK_PATH}p1"
    PART_NIX="${DISK_PATH}p2"
    PART_PERSIST="${DISK_PATH}p3"
else
    PART_EFI="${DISK_PATH}1"
    PART_NIX="${DISK_PATH}2"
    PART_PERSIST="${DISK_PATH}3"
fi

# 3. Partition Formatting & Label Assignment
echo -e "[*] Formatting EFI System Partition (FAT32)..."
mkfs.vfat -F 32 -n ESP "$PART_EFI"

echo -e "[*] Formatting Nix Store Partition (Ext4)..."
mkfs.ext4 -F -L nixos_nix "$PART_NIX"

echo -e "[*] Formatting Persistence Layer Partition (Ext4)..."
mkfs.ext4 -F -L nixos_persist "$PART_PERSIST"

# 4. Mount Topology Construction
echo -e "[*] Initializing memory mounts structures under /mnt..."
mount -t tmpfs -o size=4G,mode=755 none /mnt

mkdir -p /mnt/nix
mount /dev/disk/by-label/nixos_nix /mnt/nix

mkdir -p /mnt/persist
mount /dev/disk/by-label/nixos_persist /mnt/persist

mkdir -p /mnt/boot
mount /dev/disk/by-label/ESP /mnt/boot

# Establish persistent binds
mkdir -p /mnt/persist/etc/nixos
mkdir -p /mnt/etc
ln -s /mnt/persist/etc/nixos /mnt/etc/nixos

# 5. Declarative Config Placement
echo -e "[*] Generating declarative NixOS system configurations..."
cp -r /core/linux-system/nixos/* /mnt/etc/nixos/

# Generate standard seat hardware-configuration
nixos-generate-config --root /mnt

# 6. Immutable System Bootstrap
echo -e "${CYAN}[*] Bootstrapping immutable NixOS system derivation. Compiling assets...${NC}"
nixos-install --no-root-passwd --root /mnt

echo ""
echo -e "${GREEN}================================================================${NC}"
echo -e "${GREEN}    AETHER-OS Production Installation Finished Successfully!   ${NC}"
echo -e "${GREEN}    De-mount /mnt media, remove USB seat, and reboot to launch.  ${NC}"
echo -e "${GREEN}================================================================${NC}"
