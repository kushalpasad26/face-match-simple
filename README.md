# Face Match Now

Build a minimal face verification web app with a very small, functional UI and a server-side verification API.

UI

Create a clean, minimal single-page interface with:

A file input to upload the reference_image.

A button to open the device's front camera and capture the selfie_image.

A small preview for both images.

A Verify Face button.

A simple result area showing:

Verified or Not Verified

The returned Euclidean distance.

Basic loading and error states.

No dashboard, authentication, navigation, accounts, database, animations, or unnecessary UI.

The UI should be responsive and work well on mobile devices.

Backend

Inputs:

reference_image: uploaded image.

selfie_image: image captured from the device front camera.

Use https://github.com/davidsandberg/facenet with a pretrained Inception-ResNet-v1 model.

Flow:

Detect exactly one face in each image using MTCNN.

Reject images containing zero or multiple faces.

Align and preprocess both faces as required by FaceNet.

Generate a 128-dimensional FaceNet embedding for each image.

Compare the embeddings using Euclidean distance.

Compare the distance against a configurable similarity threshold.

Return JSON:

{
  "verified": true,
  "distance": 0.72
}


Make the similarity threshold configurable through an environment variable.

Privacy

Perform all face detection, embedding generation, and comparison server-side.

Do not permanently store uploaded or captured images.

Process images in memory or temporary storage and remove them after processing.

Implementation

Keep the implementation as small and straightforward as possible.

Reuse the pretrained FaceNet model; do not train anything.

No authentication.

No database.

No dashboard.

No unnecessary dependencies.

Keep the frontend minimal rather than building a full application.

Provide clear setup and run instructions.

Include the required environment variable configuration.

Include basic validation and useful API/UI error messages.

The final result should be a tiny full-stack face verification app: minimal UI → API → FaceNet verification → simple result, with all actual face processing performed server-side.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/fcb834dd-c6b4-48be-b87a-de0b51134919).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
