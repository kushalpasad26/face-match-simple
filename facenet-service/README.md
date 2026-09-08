# FaceNet verification service

Small Python service that does all the face work: MTCNN detection, alignment,
FaceNet (Inception-ResNet-v1) embeddings, Euclidean distance. The web app calls
it and never sees a model.

## Setup

```bash
git clone https://github.com/davidsandberg/facenet.git
cd facenet-service
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# make facenet's helpers importable
export PYTHONPATH=/path/to/facenet/src:$PYTHONPATH

# pretrained model (VGGFace2, Inception-ResNet-v1) from the facenet README
mkdir -p model && unzip 20180402-114759.zip -d model/
```

## Environment variables

| Variable               | Default                  | Meaning                                  |
| ---------------------- | ------------------------ | ---------------------------------------- |
| `FACENET_MODEL_PATH`   | `./model/20180402-114759`| Folder with the pretrained model         |
| `FACE_MATCH_THRESHOLD` | `1.0`                    | Distance below this counts as a match    |
| `PORT`                 | `5000`                   | Port to listen on                        |

## Run

```bash
python app.py
# POST /verify  {"reference_image": "...", "selfie_image": "...", "threshold": 1.0}
# -> {"verified": true, "distance": 0.72}
```

Errors return HTTP 400 with `{"error": "No face detected in the selfie."}` when
an image has zero or more than one face.

Then point the web app at it by setting `FACENET_SERVICE_URL` (e.g.
`http://localhost:5000`) and optionally `FACE_MATCH_THRESHOLD`.

Images are decoded in memory only — nothing is written to disk or stored.
