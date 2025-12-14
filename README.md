# k3s Suite

**One-Stop Solution for On-Premise Kubernetes Development**

k3s Suite is a lightweight, all-in-one dashboard designed to simplify the management of your local Kubernetes (k3s) clusters and local Docker registries. It provides a unified interface to visualize cluster resources and manage your local container images, making on-premise development seamless and efficient.

## Features

-   **Cluster Visualization**: Real-time view of your k3s cluster resources including Nodes, Pods, Deployments, Services, Ingresses, and more.
-   **YAML Editor**: Built-in, read-only safe YAML viewer with editing capabilities and validation to modify resource configurations on the fly.
-   **Local Registry Management**: Integrated interface for `reg` (Docker Registry V2 client) to browse and manage images in your local Docker registry.
-   **Namespace Filtering**: Easily filter resources by namespace.
-   **Resource Management**: Quick actions to view, edit, and update resources.

## Prerequisites

Before running k3s Suite, ensure you have the following installed:

1.  **Node.js**: Required to run the application server. [Download Node.js](https://nodejs.org/)
2.  **k3s**: A lightweight Kubernetes distribution. [Install k3s](https://k3s.io/)
    -   Ensure your `kubectl` is configured to point to your k3s cluster (usually `/etc/rancher/k3s/k3s.yaml`).
3.  **reg**: Docker Registry v2 command-line client.
    -   **Mac (Homebrew)**: `brew install reg`
    -   **Linux**:
        ```bash
        curl -jfL https://github.com/genuinetools/reg/releases/download/v0.16.1/reg-linux-amd64 -o /usr/local/bin/reg
        chmod +x /usr/local/bin/reg
        ```

## Installation

1.  **Clone the repository**:
    ```bash
    git clone <repository-url>
    cd k3s-suite
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

## Usage

1.  **Start the server**:
    ```bash
    model index.js
    # or
    npm start
    ```

2.  **Access the Dashboard**:
    Open your browser and navigate to `http://localhost:3001`.

## Configuration

### Local Registry Setup

If you are running a local Docker registry (e.g., `docker run -d -p 5000:5000 --name registry registry:2`), k3s Suite can connect to it:

1.  Navigate to the **Repositories** tab in the sidebar.
2.  If `reg` is installed but not configured, you will see a setup form.
3.  Enter your registry URL (e.g., `localhost:5000`).
4.  Click **Save Configuration**.

If the `reg` tool is missing, the dashboard will provide installation instructions.

## Contributing

Contributions are welcome! Please fork the repository and submit a pull request.
