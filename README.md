# College Admission System

Welcome to the College & Admissions Portal for GAYATRI JUNIOR & DEGREE COLLEGE. This system handles online admission applications for academic sessions and includes a backend server for email sending and static file serving.

## Features

- **Admissions Portal**: Interface for students to apply online (`apply.html`).
- **Dashboard & Status**: Pages to view application status (`dashboard.html`, `status.html`).
- **Admin Interface**: Administrative dashboard for managing applications (`admin.html`).
- **Headless Screenshot Utility**: Built-in tool in the `tools` directory to capture headless Chrome screenshots of the site at common breakpoints.

## Tech Stack

- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Backend**: Node.js, Express.js, CORS, body-parser, dotenv
- **Tooling**: Puppeteer for automated screenshots

## Getting Started

### Prerequisites

- Node.js (v14 or higher recommended)
- npm (Node Package Manager)

### Installation

1. Clone or download the repository.
2. Install the required dependencies:

```bash
npm install
```

### Running the Application

To start the backend server and serve the frontend files locally:

```bash
npm start
```
or 
```bash
npm run dev
```

The server will typically run on `http://localhost:5000` (or whichever port is defined in your `.env` file).

- **Frontend Access**: Navigate to `http://localhost:5000`
- **Health Check**: Check the server status at `http://localhost:5000/api/health`

### Deployment

This app can be deployed to Netlify using the included `netlify.toml`. Set the Firebase variables
from `.env` in Netlify's Site configuration under Environment variables. Netlify exposes them only
to the Firebase configuration function; `.env` is not deployed. The frontend fetches configuration
from `/.netlify/functions/firebase-config` in production.

The existing `server.js` remains the local and Node-hosting backend. Use `npm start` locally or on
Render/Railway. Do not run `generate-firebase-config.js` for Netlify deployment.

## Environment Variables

You can configure the application using a `.env` file in the root directory. 
Important variables include:
- `PORT`: The port number the server runs on (default: 5000).

## Screenshots Utility

To automatically capture screenshots of all major portal pages across different device viewports:

```bash
npm run screenshot
```

Refer to `tools/README_SCREENS.md` for more details about the screenshot utility.

## License

This project is licensed under the MIT License.
