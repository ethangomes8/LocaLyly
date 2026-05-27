# LocaLyly

LocaLyly is a premium, real-time geolocation sharing web application designed for seamless location tracking between users. Built with an emphasis on modern UI/UX design, it features an advanced "Liquid Glass" aesthetic and responsive layouts.

## Features

- Real-Time Geolocation: Live tracking and map synchronization between session participants.
- Secure Sessions: Private session rooms with access codes.
- Dynamic Theming: Integrated light and dark modes with a custom "Slate and Peach" color palette.
- Premium UI: Hardware-accelerated glassmorphism interfaces, smooth transitions, and refined SVG iconography.
- Progressive Web App: Installable as a standalone application on mobile and desktop devices.
- Battery Efficiency: Eco mode to reduce geolocation polling frequency and save battery life.

## Technology Stack

- Frontend: Vanilla HTML5, CSS3 (CSS Variables, Backdrop Filters), Vanilla JavaScript (ES6+).
- Map Engine: Leaflet.js with OpenStreetMap tiles.
- Backend & Database: Supabase (PostgreSQL, Realtime Subscriptions, Authentication).
- Build Tool: Vite.

## Installation and Setup

1. Clone the repository:
   git clone https://github.com/ethangomes8/LocaLyly.git

2. Navigate to the project directory:
   cd LocaLyly

3. Install dependencies:
   npm install

4. Configure environment variables:
   Ensure you have a configured Supabase project. Add your Supabase URL and anonymous key directly or via a .env file depending on your build configuration.

5. Run the development server:
   npm run dev

6. Build for production:
   npm run build

## Architecture

The application logic is decoupled into specific modules:
- main.js: Application entry point and state management.
- auth.js: User authentication handling.
- map.js: Leaflet map initialization and marker management.
- session.js: Session creation, joining, and management.
- geolocation.js: GPS tracking and coordinate calculations.
- supabase.js: Database communication and real-time channels.
- pwa.js: Service worker registration and installation prompts.

## License

All rights reserved.
