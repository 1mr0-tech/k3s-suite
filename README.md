```text
  _    ____          _____       _ _       
 | | _|___ \        / ____|     (_) |      
 | |/ / __) |___   | (___  _   _ _| |_ ___ 
 |   < |__ </ __|   \___ \| | | | | __/ _ \
 | |\ \___) \__ \   ____) | |_| | | ||  __/
 |_| \_\____/___/  |_____/ \__,_|_|\__\___|
                                           
```

# k3s Suite

**One-Stop Solution for Custom Kubernetes Development**

k3s Suite is a comprehensive dashboard designed to simplify the management of your local Kubernetes clusters (k3s, k3d, etc.) and Docker registries. It bridges the gap between cluster visualization, resource management, and local container workflows.

## Features

### ☸️ Cluster Management
-   **Multi-Cluster Support**: Seamlessly switch between different Kubernetes contexts (`k3d`, `minikube`, etc.) directly from the sidebar.
-   **Real-Time Visualization**: View Nodes, Pods, Deployments, Services, Ingresses, ConfigMaps, and Secrets.
-   **Namespace Filtering**: Focus on specific namespaces to declutter your view.

### ➕ Create & Manage Resources
-   **Interactive Creation**: Floating Action Button (FAB) (+) to easily create new resources.
-   **Smart Templates**: Start quickly with built-in templates for Deployments, Services, Ingresses, and more.
-   **Clone Existing Workloads**: "Duplicate" existing resources by selecting them from a list—perfect for debugging or creating variants.
-   **Direct Apply**: Uses `kubectl apply` under the hood to handle standard Kubernetes manifests robustly.
-   **Target Namespace**: Choose exactly where your new resource lands.

### 📝 Smart YAML Editor
-   **Syntax Highlighting**: Integrated **CodeMirror** editor for reading and editing Kubernetes resources.
-   **Validation**: Catch syntax errors before applying changes.
-   **One-Click Apply**: Edit and save configurations directly to the cluster.

### 🕸️ Network Visualization (Powered by Otterize)
-   **Cluster Map**: Visualize the network traffic and relationships between your workloads.
-   **Otterize Integration**: One-click installation of Otterize components to enable traffic intents mapping.
-   **Interactive Graph**: Powered by **Vis.js** for a dynamic, interactive experience.
-   **Access Graph**: Side panel detailing exactly "who calls whom" in your cluster.

### 🐳 Local Registry Manager
-   **Browse Images**: View repositories and tags in your local Docker registry.
-   **Authentication Support**: Compatible with secure registries (Username/Password) and self-signed certificates.
-   **Insecure Registry Support**: Detailed guidance for configuring Docker to accept insecure local registries.

### 🔒 Air-Gap Friendly
-   **Offline Detection**: Automatically detects lack of internet access.
-   **Fallbacks**: Gracefully downgrades features (e.g., standard text area instead of CodeMirror) when CDNs are unreachable.

---

## Prerequisites

To ensure a smooth setup, we provide a helper script to check for dependencies.

**Run the Prerequisite Checker:**
```bash
./check-prereqs.sh
```

**Manual Requirements:**
1.  **Node.js** (v14+): Required to run the application server.
2.  **Kubectl**: Configured to access your cluster.
3.  **Helm**: Required for installing Otterize (Network Map).
4.  **reg**: The `genuinetools/reg` CLI tool for Docker Registry interaction.
    -   *Mac*: `brew install genuinetools/reg/reg`
    -   *Linux*: Download binary from [GitHub Releases](https://github.com/genuinetools/reg/releases).

---

## Installation

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/1mr0-tech/k3s-suite.git
    cd k3s-suite
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Start the server**:
    ```bash
    node index.js
    ```

4.  **Access the Dashboard**:
    Open [http://localhost:3001](http://localhost:3001) in your browser.

---

## Guide & Walkthrough

### 1. Connecting to a Cluster
The app automatically loads your `~/.kube/config`.
-   Use the **Context Selector** at the top of the sidebar to choose your active cluster.
-   The dashboard will refresh to show resources from the selected context.

### 2. Creating Resources
1.  Click the blue **+** button at the bottom-right.
2.  **Template Mode**: Select a resource type (e.g., Deployment) to get a starter YAML.
3.  **Clone Mode**: Select "Clone Existing", pick a namespace and resource type, and load the YAML from a running workload.
4.  Edit the YAML in the editor.
5.  Select a **Target Namespace** (or leave default).
6.  Click **Apply to Cluster**.

### 3. Using the Network Map
1.  Click **"View Cluster Map"** in the header.
2.  If the map is empty, click **"Install Otterize"** (Requires Helm).
3.  Once installed, traffic between services will be visualized as arrows on the graph.

### 4. Configuring a Local Registry
1.  Navigate to **Repositories** in the sidebar.
2.  Enter your Registry URL (e.g., `http://localhost:5000` or `https://my-reg.local`).
3.  (Optional) Enter Username/Password.
4.  Toggle **SSL** based on your registry setup.
5.  Click **Save**.

---

## Troubleshooting

-   **"Registry Error: HTTPS Client to HTTP Server"**:
    -   Cause: You are trying to connect via HTTPS to an insecure HTTP registry.
    -   Fix: Uncheck the **"Secure (SSL)"** toggle in the settings. Ensure your Docker daemon is configured with `"insecure-registries": ["your-registry-url"]`.

-   **"Network Map Unavailable"**:
    -   Cause: No internet access to load Vis.js, or Otterize not installed.
    -   Fix: Connect to internet for the map visualization. Click "Install Otterize" to generate the data.

-   **"YAML Editor Offline Mode"**:
    -   Cause: No internet access to load CodeMirror CDN.
    -   Correction: The editor falls back to a basic text area. Functionality (Save/Edit) remains intact, just without colors.

## License
MIT
