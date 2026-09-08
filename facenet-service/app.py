"""Minimal FaceNet verification service.

Wraps davidsandberg/facenet (pretrained Inception-ResNet-v1) + MTCNN.
Images are decoded in memory only and never written to disk.

POST /verify  {"reference_image": "<data url or base64>",
               "selfie_image": "<data url or base64>",
               "threshold": 1.0}
->            {"verified": true, "distance": 0.72}
"""

import base64
import io
import os

import numpy as np
import tensorflow as tf
from flask import Flask, jsonify, request
from flask_cors import CORS
from PIL import Image
from scipy import misc  # noqa: F401  (facenet dependency)

import align.detect_face  # from davidsandberg/facenet src/
import facenet  # from davidsandberg/facenet src/

MODEL_PATH = os.environ.get("FACENET_MODEL_PATH", "./model/20180402-114759")
DEFAULT_THRESHOLD = float(os.environ.get("FACE_MATCH_THRESHOLD", "1.0"))
IMAGE_SIZE = 160
MARGIN = 32

app = Flask(__name__)
CORS(app)

# --- load models once ---
graph = tf.Graph()
sess = tf.compat.v1.Session(graph=graph)
with graph.as_default():
    with sess.as_default():
        pnet, rnet, onet = align.detect_face.create_mtcnn(sess, None)
        facenet.load_model(MODEL_PATH)
        images_placeholder = graph.get_tensor_by_name("input:0")
        embeddings = graph.get_tensor_by_name("embeddings:0")
        phase_train_placeholder = graph.get_tensor_by_name("phase_train:0")


def decode_image(payload, label):
    if not isinstance(payload, str) or not payload:
        raise ValueError(f"{label} is missing.")
    if payload.startswith("data:"):
        payload = payload.split(",", 1)[-1]
    try:
        raw = base64.b64decode(payload)
        img = Image.open(io.BytesIO(raw)).convert("RGB")
    except Exception:
        raise ValueError(f"{label} is not a readable image.")
    return np.asarray(img)


def extract_face(img, label):
    bounding_boxes, _ = align.detect_face.detect_face(
        img, 20, pnet, rnet, onet, [0.6, 0.7, 0.7], 0.709
    )
    if len(bounding_boxes) == 0:
        raise ValueError(f"No face detected in the {label}.")
    if len(bounding_boxes) > 1:
        raise ValueError(f"More than one face detected in the {label}.")

    det = np.squeeze(bounding_boxes[0, 0:4])
    h, w = img.shape[:2]
    x1 = max(int(det[0] - MARGIN / 2), 0)
    y1 = max(int(det[1] - MARGIN / 2), 0)
    x2 = min(int(det[2] + MARGIN / 2), w)
    y2 = min(int(det[3] + MARGIN / 2), h)
    face = Image.fromarray(img[y1:y2, x1:x2, :]).resize(
        (IMAGE_SIZE, IMAGE_SIZE), Image.BILINEAR
    )
    return facenet.prewhiten(np.asarray(face))


def embed(faces):
    feed = {images_placeholder: faces, phase_train_placeholder: False}
    return sess.run(embeddings, feed_dict=feed)


@app.post("/verify")
def verify():
    body = request.get_json(silent=True) or {}
    try:
        ref = decode_image(body.get("reference_image"), "reference photo")
        selfie = decode_image(body.get("selfie_image"), "selfie")
        faces = np.stack(
            [extract_face(ref, "reference photo"), extract_face(selfie, "selfie")]
        )
    except ValueError as err:
        return jsonify({"error": str(err)}), 400

    try:
        threshold = float(body.get("threshold") or DEFAULT_THRESHOLD)
    except (TypeError, ValueError):
        threshold = DEFAULT_THRESHOLD

    vecs = embed(faces)
    distance = float(np.linalg.norm(vecs[0] - vecs[1]))

    # drop image data from memory as soon as we are done
    del ref, selfie, faces

    return jsonify({"verified": bool(distance < threshold), "distance": round(distance, 4)})


@app.get("/health")
def health():
    return jsonify({"ok": True})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", "5000")))
