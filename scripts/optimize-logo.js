const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Path to the source PNG file
const inputFile = path.join(process.cwd(), 'public/images/logo.png');
// Path to the output JPG file
const outputFile = path.join(process.cwd(), 'public/images/logo.jpg');

// Check if source file exists
if (!fs.existsSync(inputFile)) {
  console.error(`Source file not found: ${inputFile}`);
  process.exit(1);
}

// Dimensions for the output image - increased for better quality
const width = 300;
const height = 300;

// First create a pure white canvas
sharp({
  create: {
    width: width,
    height: height,
    channels: 4,
    background: { r: 255, g: 255, b: 255, alpha: 1 }
  }
})
  .jpeg({
    quality: 100  // Use highest quality for the white background
  })
  .toBuffer()
  .then(whiteCanvas => {
    // Then process the logo and overlay it on the white canvas
    return sharp(inputFile)
      // Extract the logo and remove any background
      .resize({
        width: width - 40,
        height: height - 40,
        fit: 'contain',
        position: 'center',
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .toBuffer()
      .then(resizedLogo => {
        // Composite the logo onto the white canvas
        return sharp(whiteCanvas)
          .composite([
            {
              input: resizedLogo,
              gravity: 'center'
            }
          ])
          .jpeg({
            quality: 90,
            progressive: true
          })
          .toFile(outputFile);
      });
  })
  .then(() => {
    console.log(`Successfully created optimized logo with white background at: ${outputFile}`);
    
    // Log file sizes for comparison
    const originalSize = fs.statSync(inputFile).size;
    const optimizedSize = fs.statSync(outputFile).size;
    
    console.log(`Original size: ${(originalSize / 1024).toFixed(2)} KB`);
    console.log(`Optimized size: ${(optimizedSize / 1024).toFixed(2)} KB`);
    console.log(`Reduction: ${((1 - optimizedSize / originalSize) * 100).toFixed(2)}%`);
  })
  .catch(err => {
    console.error('Error optimizing image:', err);
  }); 