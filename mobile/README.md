# Philadelphia Hiking Trails Mobile App

This is the mobile app for the Philadelphia Hiking Trails project. It provides a user-friendly interface for exploring hiking trails in the Philadelphia area.

## Features

- Browse and search for hiking trails in Philadelphia
- View trail details including difficulty, length, and elevation
- See trail locations on an interactive map
- Filter trails by distance, difficulty, and other criteria
- Save favorite trails for offline access
- Get directions to trailheads

## Project Structure

```
mobile/
├── assets/              # Static assets (images, fonts, database)
├── src/                 # Source code
│   ├── components/      # Reusable UI components
│   ├── screens/         # App screens
│   ├── navigation/      # Navigation configuration
│   ├── database/        # Database integration
│   ├── models/          # Data models
│   ├── utils/           # Utility functions
│   └── hooks/           # Custom React hooks
├── App.tsx              # Entry point
└── babel.config.js      # Babel configuration
```

## Prerequisites

- Node.js (v14 or later)
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (for Mac users) or Android Emulator

## Getting Started

1. Install dependencies:

```bash
cd mobile
npm install
```

2. Start the development server:

```bash
npm start
```

3. Run on a device or simulator:
   - Press `i` to open in iOS Simulator
   - Press `a` to open in Android Emulator
   - Scan the QR code with the Expo Go app on your physical device

## Database

The app uses a SQLite database that contains trail data collected and processed by the data pipeline. The database is bundled with the app to enable offline functionality.

## Dependencies

- React Native
- Expo
- React Navigation
- Expo SQLite
- React Native Maps
- Expo Location

## Development Notes

- The app is built with TypeScript for type safety
- It follows a component-based architecture for better maintainability
- The navigation is implemented using React Navigation
- The database is accessed through a service layer that abstracts the SQLite implementation
