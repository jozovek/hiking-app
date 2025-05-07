# Build Process for Philadelphia Hiking Trails App

This document explains the build process for the Philadelphia Hiking Trails app using Expo EAS Build. EAS Build is a hosted service that builds your app on Expo's servers, allowing you to create native binaries for iOS and Android without setting up a local build environment.

## Prerequisites

- Expo account (sign up at https://expo.dev)
- EAS CLI installed globally: `npm install -g eas-cli`
- Logged in to EAS CLI: `eas login`

## Build Profiles

The app has three build profiles defined in `eas.json`:

1. **Development**: For development and testing during active development
   - Includes development client for faster iteration
   - Internal distribution only

2. **Preview**: For testing before production release
   - Internal distribution for testing
   - Android: Builds APK for easy installation
   - iOS: Builds for simulator and TestFlight

3. **Production**: For App Store and Play Store releases
   - Optimized for production
   - Automatic version incrementation
   - Configured for store submission

## Build Commands

The following npm scripts are available for building the app:

### Preview Builds

```bash
# Build for both platforms
npm run build:preview

# Build for Android only
npm run build:preview:android

# Build for iOS only
npm run build:preview:ios
```

### Production Builds

```bash
# Build for both platforms
npm run build:production

# Build for Android only
npm run build:production:android

# Build for iOS only
npm run build:production:ios
```

### Submitting to App Stores

```bash
# Submit to Google Play Store
npm run submit:android

# Submit to Apple App Store
npm run submit:ios
```

## CI/CD Pipeline

The app uses GitHub Actions for continuous integration and deployment. The workflow is defined in `.github/workflows/eas-build.yml`.

### Workflow Triggers

- **Manual trigger**: Can be triggered manually from GitHub Actions UI
- **Push to main branch**: Triggers a preview build
- **Push to production branch**: Triggers a production build

### Environment Setup

To use the CI/CD pipeline, you need to set up the following secret in your GitHub repository:

- `EXPO_TOKEN`: Your Expo access token (generate at https://expo.dev/settings/access-tokens)

## App Signing

### Android

For Android, you need to configure app signing in the EAS dashboard:

1. Go to https://expo.dev
2. Navigate to your project
3. Go to "Credentials" > "Android"
4. Follow the instructions to set up your keystore

### iOS

For iOS, you need to configure app signing in the EAS dashboard:

1. Go to https://expo.dev
2. Navigate to your project
3. Go to "Credentials" > "iOS"
4. Follow the instructions to set up your certificates and provisioning profiles

## Environment Variables

The build profiles include environment variables that can be used to configure the app for different environments:

- `APP_ENV`: Set to "development", "preview", or "production" depending on the build profile

To add more environment variables:

1. Add them to the `env` section of the appropriate build profile in `eas.json`
2. Access them in your app using `process.env.VARIABLE_NAME`

## Version Management

The production build profile includes `"autoIncrement": true`, which automatically increments the build number for each build. This ensures that each build has a unique version number.

To manually update the version:

1. Update the `version` field in `app.json`
2. For Android, update the `versionCode` in `app.json`
3. For iOS, update the `buildNumber` in `app.json`

## Troubleshooting

### Common Issues

1. **Build fails with "Invalid credentials"**
   - Make sure you're logged in to EAS CLI: `eas login`
   - Check that your Expo account has access to the project

2. **iOS build fails with certificate errors**
   - Go to the EAS dashboard and check your iOS credentials
   - You may need to generate new certificates or provisioning profiles

3. **Android build fails with keystore errors**
   - Go to the EAS dashboard and check your Android credentials
   - You may need to generate a new keystore

### Getting Help

- Check the EAS Build logs in the Expo dashboard
- Run `eas build:list` to see the status of your builds
- Consult the [Expo documentation](https://docs.expo.dev/build/introduction/)
