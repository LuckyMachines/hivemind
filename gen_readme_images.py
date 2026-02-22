"""Generate README images for Hivemind via ComfyUI API (SDXL, 200 steps, CFG 9.5)."""
import json
import urllib.request
import urllib.error
import time
import uuid
import os
import sys

COMFY_URL = "http://localhost:8188"
OUTPUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "images")


def queue_prompt(prompt):
    data = json.dumps({"prompt": prompt, "client_id": str(uuid.uuid4())}).encode("utf-8")
    req = urllib.request.Request(
        f"{COMFY_URL}/prompt", data=data, headers={"Content-Type": "application/json"}
    )
    resp = urllib.request.urlopen(req)
    return json.loads(resp.read())


def get_history(prompt_id):
    try:
        resp = urllib.request.urlopen(f"{COMFY_URL}/history/{prompt_id}")
        return json.loads(resp.read())
    except urllib.error.URLError:
        return {}


def download_image(filename, subfolder, output_path):
    params = urllib.parse.urlencode({"filename": filename, "subfolder": subfolder, "type": "output"})
    url = f"{COMFY_URL}/view?{params}"
    urllib.request.urlretrieve(url, output_path)


def wait_and_download(name, prompt_id, timeout=1200):
    start = time.time()
    while time.time() - start < timeout:
        history = get_history(prompt_id)
        if prompt_id in history:
            status = history[prompt_id].get("status", {})
            if status.get("status_str") == "error":
                msgs = status.get("messages", [])
                print(f"  ERROR on {name}: {msgs}", file=sys.stderr)
                return None
            outputs = history[prompt_id].get("outputs", {})
            for node_id, node_output in outputs.items():
                if "images" in node_output:
                    for img_info in node_output["images"]:
                        fname = img_info["filename"]
                        subfolder = img_info.get("subfolder", "")
                        dest = os.path.join(OUTPUT_DIR, f"{name}.png")
                        download_image(fname, subfolder, dest)
                        print(f"  -> {dest}")
                        return dest
        elapsed = int(time.time() - start)
        print(f"  [{name}] waiting... {elapsed}s", flush=True)
        time.sleep(5)
    print(f"  TIMEOUT on {name}", file=sys.stderr)
    return None


import urllib.parse

# --- Image definitions ---
IMAGES = [
    {
        "name": "hivemind_hero",
        "positive": (
            "A luminous digital hivemind network floating in deep space, "
            "interconnected glowing nodes and neural pathways forming a collective intelligence, "
            "bioluminescent hexagonal honeycomb grid pattern radiating energy, "
            "cosmic nebula background in deep blues and purples, "
            "golden and cyan energy flows connecting crystalline mind-nodes, "
            "cyberpunk meets organic neural network aesthetic, "
            "epic cinematic wide shot, digital art masterpiece, 8k ultra detailed, "
            "volumetric lighting, ray tracing, dramatic composition"
        ),
        "negative": (
            "text, watermark, signature, blurry, low quality, deformed, ugly, "
            "amateur, simple, flat, boring, stock photo, jpeg artifacts, noise"
        ),
        "width": 1216,
        "height": 832,
        "seed": 42,
    },
    {
        "name": "hivemind_game",
        "positive": (
            "A futuristic circular arena with holographic players standing in a ring, "
            "collectively voting on glowing multiple-choice options floating above them, "
            "four answer choices displayed as luminous holographic panels A B C D, "
            "each player connected by threads of light to a central hivemind nexus orb, "
            "neon blue and purple atmosphere, blockchain hexagonal patterns on the floor, "
            "futuristic competitive trivia game show in a crystalline stadium, "
            "digital art, vibrant electric colors, 8k detailed, cinematic overhead angle"
        ),
        "negative": (
            "text, watermark, signature, blurry, low quality, deformed, ugly, "
            "amateur, simple, flat, boring, stock photo, realistic human faces, "
            "jpeg artifacts, noise"
        ),
        "width": 1024,
        "height": 1024,
        "seed": 777,
    },
    {
        "name": "hivemind_chain",
        "positive": (
            "A futuristic blockchain smart contract network visualization, "
            "glowing interconnected cubes and nodes representing smart contracts, "
            "Polygon network purple and blue neon aesthetic, "
            "decentralized nodes connected by beams of streaming data, "
            "code and transaction data flowing between floating crystalline structures, "
            "oracle nodes feeding external data into the network as golden streams, "
            "isometric perspective floating in dark void, cyberpunk technology illustration, "
            "digital art, 8k ultra detailed, volumetric fog, cinematic lighting"
        ),
        "negative": (
            "text, watermark, signature, blurry, low quality, deformed, ugly, "
            "amateur, simple, flat, boring, stock photo, jpeg artifacts, noise"
        ),
        "width": 1216,
        "height": 832,
        "seed": 1337,
    },
]


def build_workflow(img):
    return {
        "1": {
            "class_type": "CheckpointLoaderSimple",
            "inputs": {"ckpt_name": "SDXL/sd_xl_base_1.0.safetensors"},
        },
        "2": {
            "class_type": "CLIPTextEncodeSDXL",
            "inputs": {
                "clip": ["1", 1],
                "width": img["width"],
                "height": img["height"],
                "crop_w": 0,
                "crop_h": 0,
                "target_width": img["width"],
                "target_height": img["height"],
                "text_g": img["positive"],
                "text_l": img["positive"],
            },
        },
        "3": {
            "class_type": "CLIPTextEncode",
            "inputs": {"clip": ["1", 1], "text": img["negative"]},
        },
        "4": {
            "class_type": "EmptyLatentImage",
            "inputs": {
                "width": img["width"],
                "height": img["height"],
                "batch_size": 1,
            },
        },
        "5": {
            "class_type": "KSampler",
            "inputs": {
                "model": ["1", 0],
                "positive": ["2", 0],
                "negative": ["3", 0],
                "latent_image": ["4", 0],
                "seed": img["seed"],
                "steps": 200,
                "cfg": 9.5,
                "sampler_name": "dpmpp_2m_sde",
                "scheduler": "karras",
                "denoise": 1.0,
            },
        },
        "6": {
            "class_type": "VAEDecode",
            "inputs": {"samples": ["5", 0], "vae": ["1", 2]},
        },
        "7": {
            "class_type": "SaveImage",
            "inputs": {"images": ["6", 0], "filename_prefix": img["name"]},
        },
    }


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    print(f"Generating {len(IMAGES)} images (200 steps, CFG 9.5, SDXL)")
    print(f"Output: {OUTPUT_DIR}\n")

    jobs = []
    for img in IMAGES:
        workflow = build_workflow(img)
        result = queue_prompt(workflow)
        pid = result["prompt_id"]
        jobs.append((img["name"], pid))
        print(f"Queued: {img['name']} (id={pid})")

    print(f"\nAll queued. Waiting for generation...\n")

    results = []
    for name, pid in jobs:
        print(f"[{name}] generating...")
        path = wait_and_download(name, pid)
        if path:
            results.append((name, path))
            print(f"[{name}] done!\n")
        else:
            print(f"[{name}] FAILED\n")

    print(f"\n{'='*50}")
    print(f"Completed: {len(results)}/{len(IMAGES)}")
    for name, path in results:
        print(f"  {path}")


if __name__ == "__main__":
    main()
