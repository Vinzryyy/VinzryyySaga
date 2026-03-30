# Archive Images

This folder contains all gallery images for the Armeniaca website.

## How to Add New Images

1. **Add images to this folder** (`/public/archive/`)
   - Supported formats: `.jpg`, `.png`, `.webp`
   - Recommended naming: `img-XXX.jpg` (e.g., `img-366.jpg`, `img-367.jpg`)

2. **Regenerate gallery data**
   ```bash
   npm run generate-gallery
   ```

3. **Rebuild the website**
   ```bash
   npm run build
   ```

## Current Stats

- **Total Images:** Auto-generated from folder contents
- **Eras:** Automatically computed from image metadata

## Notes

- Images are automatically assigned to years (2023-2025) based on their filename number
- The first 6 images are marked as "featured" for the homepage
- All images use local paths (`/archive/filename.jpg`) for faster loading
