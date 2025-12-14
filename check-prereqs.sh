#!/bin/bash

# ANSI Color Codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
ORANGE='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}==============================================${NC}"
echo -e "${BLUE}       k3s Suite Prerequisite Checker         ${NC}"
echo -e "${BLUE}==============================================${NC}"
echo ""

OS_TYPE="unknown"
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    OS_TYPE="linux"
    echo -e "Detected OS: ${YELLOW}Linux${NC}"
elif [[ "$OSTYPE" == "darwin"* ]]; then
    OS_TYPE="mac"
    echo -e "Detected OS: ${YELLOW}macOS${NC}"
elif [[ "$OSTYPE" == "cygwin" ]] || [[ "$OSTYPE" == "msys" ]]; then
    OS_TYPE="windows"
    echo -e "Detected OS: ${YELLOW}Windows (Bash)${NC}"
    echo -e "${ORANGE}Note: This script is optimized for Mac/Linux. Windows users might need manual verification.${NC}"
else
    echo -e "Detected OS: ${YELLOW}Unknown ($OSTYPE)${NC}"
fi

echo ""
echo "Checking dependencies..."
echo "-----------------------------------"

check_cmd() {
    local cmd_name=$1
    local pretty_name=$2
    local install_mac=$3
    local install_linux=$4

    if command -v "$cmd_name" &> /dev/null; then
        echo -e "[${GREEN}✔${NC}] ${pretty_name} is installed."
        return 0
    else
        echo -e "[${RED}✘${NC}] ${pretty_name} is NOT installed."
        echo -e "    ${YELLOW}To install:${NC}"
        if [[ "$OS_TYPE" == "mac" ]]; then
             echo -e "    $install_mac"
        elif [[ "$OS_TYPE" == "linux" ]]; then
             echo -e "    $install_linux"
        else
             echo -e "    Please install $pretty_name manually."
        fi
        echo ""
        return 1
    fi
}

# 1. Node.js
check_cmd "node" "Node.js (Server)" \
    "brew install node" \
    "sudo apt install nodejs npm # (Debian/Ubuntu) or via NVM"

# 2. NPM
check_cmd "npm" "NPM (Package Manager)" \
    "Included with Node.js (brew install node)" \
    "sudo apt install npm # (Debian/Ubuntu)"

# 3. kubectl
check_cmd "kubectl" "kubectl (Kubernetes CLI)" \
    "brew install kubectl" \
    "curl -LO \"https://dl.k8s.io/release/\$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl\" && sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl"

# 4. Helm
# Helm is used for 'Install Otterize' feature
check_cmd "helm" "Helm (Package Manager for K8s)" \
    "brew install helm" \
    "curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash"

# 5. reg
# Used for Registry features
check_cmd "reg" "reg (Docker Registry Client)" \
    "brew install genuinetools/reg/reg" \
    "curl -L https://github.com/genuinetools/reg/releases/download/v0.16.1/reg-linux-amd64 -o reg && chmod +x reg && sudo mv reg /usr/local/bin/reg"

echo "-----------------------------------"
echo ""
echo "Check complete."
