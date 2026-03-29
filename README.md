# Zentinel One - Employee Fraud Detection Dashboard (Initial Prototype)

Zentinel One is a front-end analytics dashboard designed for detecting and investigating insider threats, unauthorized data exfiltration, and anomalous employee access patterns. It was conceptualized and built as a solution for the iDEA 2.0 Hackathon (Problem Statement PS1).

## Key Features

- **Activity Telemetry**: Parses employee activity baselines and login histories from CSV streams.
- **AI-Powered Triaging**: Integrates with the Groq API (LLaMA 3) to digest complex anomaly events and generate human-readable reports to expedite investigations.
- **Interactive Dashboard**: Visualizes live activity feeds, risk score trajectories, and behavioral heatmaps tracking data exports, logins, and configurations.
- **Simulated Real-Time Events**: Ships with an embedded dataset of log activity designed to simulate a genuine insider threat and data exfiltration scenario.

## Tech Stack

- **Frontend Structure:** Vanilla HTML5, CSS3, JavaScript (ES6+)
- **Data Visualization:** Chart.js
- **Generative AI Assistant:** Groq REST API 

## How to Run

Zentinel One is a pure Single Page Application (SPA). There are no backend requirements, `node_modules`, or database dependencies.

1. Clone or download the repository to your local machine.
2. Open `index.html` directly in any modern web browser.
3. Once the dashboard appears, navigate to the **Dashboard** tab.
4. Click **"Start Live Monitoring"** to initiate the simulated event feed.

## Project Structure

- `index.html`: Main UI template, modal definitions, and layout architecture.
- `styles.css`: Design system, CSS custom variables, and basic animations.
- `app.js`: Core telemetry processing, file parsing, and core state logic.
- `app2.js`: UI event listeners, Chart.js integrations, real-time simulation logic, and Groq integration methods.
- `sample_data/`: Contains the master CSV files utilized natively by the SPA.

## Security Disclaimer

*Note: For the sake of a frictionless hackathon demonstration, the Groq API Key is currently hard-coded inside the JavaScript logic. In a true production deployment, this key would be relocated to a `.env` file and all LLM requests would be securely proxied through a dedicated backend server.*
