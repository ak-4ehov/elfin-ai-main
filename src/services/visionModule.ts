import { ImageAnnotatorClient, protos } from '@google-cloud/vision';
import fs from 'fs';
import path from 'path';
import { BoundingBox, VisionElement } from './types';

const client: ImageAnnotatorClient = new ImageAnnotatorClient({
  keyFilename: path.join(__dirname, '../../filepath.json'), // Adjust the path as needed
});

// Helper function to check if two bounding boxes overlap
function boundingBoxesOverlap(boundingBox1: BoundingBox, boundingBox2: BoundingBox, margin: number = 5): boolean {
  return !(
    boundingBox1.x + boundingBox1.width + margin < boundingBox2.x ||
    boundingBox2.x + boundingBox2.width + margin < boundingBox1.x ||
    boundingBox1.y + boundingBox1.height + margin < boundingBox2.y ||
    boundingBox2.y + boundingBox2.height + margin < boundingBox1.y
  );
}

// Helper function to convert vertices to a BoundingBox with x, y, width, and height
function convertToBoundingBox(vertices: { x: number; y: number }[]): BoundingBox {
  const minX = Math.min(...vertices.map(v => v.x));
  const maxX = Math.max(...vertices.map(v => v.x));
  const minY = Math.min(...vertices.map(v => v.y));
  const maxY = Math.max(...vertices.map(v => v.y));

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

export async function analyzeImageWithVisionAPI(imagePath: string): Promise<VisionElement[]> {
  // Read the screenshot image as a buffer
  const imageBuffer = fs.readFileSync(imagePath);

  try {
    const request: protos.google.cloud.vision.v1.IAnnotateImageRequest = {
      image: { content: imageBuffer },
      features: [
        { type: protos.google.cloud.vision.v1.Feature.Type.OBJECT_LOCALIZATION },
        { type: protos.google.cloud.vision.v1.Feature.Type.TEXT_DETECTION },
      ],
    };

    const [response] = await client.batchAnnotateImages({ requests: [request] });

    if (!response || !response.responses || response.responses.length === 0) {
      console.log('No response from Vision API.');
      return [];
    }

    const visionResponse = response.responses[0];

    if (!visionResponse.localizedObjectAnnotations || !visionResponse.textAnnotations) {
      console.log('No objects or text detected.');
      return [];
    }

    const interactiveLabels = [
      'button', 'toggle', 'checkbox', 'radio button', 'dropdown', 'select',
      'slider', 'icon', 'image', 'rectangle', 'shape', 'link', 'tab', 'menu'
    ];

    const potentialUIElements: VisionElement[] = visionResponse.localizedObjectAnnotations
      .filter(obj =>
        interactiveLabels.some(label => obj.name?.toLowerCase().includes(label.toLowerCase())) &&
        obj.score !== undefined && obj.score !== null && obj.score >= 0.75 // Confidence threshold
      )
      .map((element) => ({
        name: element.name || '',
        boundingBox: convertToBoundingBox(
          // Filter out vertices with undefined or null x/y
          element.boundingPoly?.normalizedVertices
            ?.filter(vertex => vertex.x !== undefined && vertex.y !== undefined && vertex.x !== null && vertex.y !== null)
            .map(vertex => ({ x: vertex.x as number, y: vertex.y as number })) || []
        ),
        recognizedText: '', // To be filled later
      }));

    // Associate recognized text with UI elements
    potentialUIElements.forEach(uiElement => {
      const matchingText = visionResponse.textAnnotations?.find(textAnnotation => {
        const textBoundingPoly = textAnnotation.boundingPoly?.normalizedVertices?.map((vertex) => ({
          x: vertex.x || 0,
          y: vertex.y || 0,
        }));

        // Convert textBoundingPoly to a BoundingBox
        const textBoundingBox = textBoundingPoly ? convertToBoundingBox(textBoundingPoly) : null;

        return textBoundingBox && boundingBoxesOverlap(uiElement.boundingBox, textBoundingBox);
      });

      if (matchingText && matchingText.description) {
        uiElement.recognizedText = matchingText.description;
      }
    });

    return potentialUIElements;
  } catch (error) {
    console.error('Error analyzing image:', error);
    return [];
  }
}

