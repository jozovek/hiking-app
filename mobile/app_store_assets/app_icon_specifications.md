# App Icon Design Specifications

## Concept

The Philadelphia Hiking Trails app icon should visually communicate the app's purpose while being recognizable and distinctive. The design should incorporate elements that represent both Philadelphia and hiking/trails.

## Design Elements

### Primary Elements

1. **Trail/Path**: A winding trail or path should be the central element, representing hiking trails.

2. **Philadelphia Skyline**: A simplified silhouette of the Philadelphia skyline along the bottom edge, featuring recognizable buildings like:
   - Liberty One
   - Comcast Center
   - City Hall with William Penn statue

3. **Nature Elements**: Stylized trees or foliage along the trail to represent the natural environment.

### Color Palette

- **Primary Background**: Forest Green (#2E7D32) - Representing nature and forests
- **Trail Color**: Light Tan/Beige (#E0D2B4) - Representing a dirt path
- **Skyline Color**: Dark Blue/Navy (#1A237E) or Black Silhouette
- **Accent Colors**: 
  - Light Green (#81C784) for foliage
  - Blue (#42A5F5) for water elements (optional)

## Style Guidelines

1. **Simplicity**: The design should be simple enough to be recognizable at small sizes.

2. **Flat Design**: Use a modern flat design approach with minimal gradients and shadows.

3. **Rounded Corners**: The icon should have rounded corners according to platform guidelines.

4. **Contrast**: Ensure good contrast between elements for visibility.

5. **Scalability**: Design must look good at all required sizes from 20x20px to 1024x1024px.

## Technical Specifications

### iOS Requirements

- Master Icon: 1024x1024 pixels (PNG, no alpha)
- Format: PNG
- Color Space: sRGB
- No transparency
- No rounded corners (iOS will apply this automatically)

### Android Requirements

- Adaptive Icon:
  - Foreground Layer: 108dp x 108dp (432x432 pixels @4x)
  - Background Layer: Solid color (Forest Green #2E7D32)
- Legacy Icon: 48dp x 48dp (192x192 pixels @4x)
- Play Store Icon: 512x512 pixels

## Variations

### Standard Icon
The main icon as described above.

### Monochrome Version
A single-color version for situations where color cannot be used:
- White icon on transparent background
- Black icon on transparent background

### Adaptive Icon (Android)
- **Foreground**: The trail and nature elements
- **Background**: Solid forest green with the Philadelphia skyline

## Example Mockup Description

The icon features a winding tan trail that starts at the bottom and curves up through the center of the icon. Along the trail are simplified green trees representing the natural environment. At the bottom of the icon is a simplified dark blue silhouette of the Philadelphia skyline, featuring recognizable buildings. The background is a forest green color that represents nature and the outdoors.

The overall effect should convey exploration, nature, and a connection to Philadelphia, making it clear that this is an app for discovering hiking trails in the Philadelphia area.

## Notes for Designer

- Ensure the icon is recognizable at small sizes (e.g., on a home screen)
- Test the icon against different backgrounds (light, dark, colorful)
- Provide all required sizes and formats for both iOS and Android
- The icon should work well in both square (iOS) and circular (Android) masks
