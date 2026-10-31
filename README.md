# 🥢 Golden Dragon - Premium 3D Restaurant Website

An immersive, cinematic multi-page website for a high-end Chinese Restaurant located at the **iTowers, Gaborone, Botswana (near Room50Two)**.

This version moves away from primitive shapes and uses a **.glb 3D model loader** to render a realistic human character, complete with an environment map for true-to-life lighting and reflections.

## ✨ Features

*   **Realistic 3D Model Loading:** Uses `GLTFLoader` to load a fully rigged 3D human.
*   **Environment Mapping:** Uses Three.js `RoomEnvironment` to cast realistic global illumination and reflections onto the 3D model (no more dark, dull 3D).
*   **Cinematic Scroll:** As you scroll down the homepage, the camera smoothly pans, pulls back, and rotates the 3D model to reveal different angles.
*   **Custom Physics:** A separate physics system handles a wok and flying food pieces (chicken/veggies) that toss in the air independently of the 3D character.
*   **Loading Screen:** A beautiful gold spinner hides the blank screen while the heavy 3D model downloads.

## ⚠️ How to change the 3D Chef Model (CRITICAL)

The code currently loads a placeholder human model from the Three.js official examples. To make the owners happy, you **must** replace it with a Chef model.

1. Go to **Sketchfab.com** or **Mixamo.com**.
2. Search for "Chef".
3. Download the model as a **GLB** file (ensure it's a public domain or paid model you have rights to).
4. Put the `.glb` file in your project folder (e.g., `chef.glb`).
5. Open `main.js` and find this line (around line 40):
   `const modelURL = 'https://threejs.org/examples/models/gltf/Soldier.glb';`
6. Change it to:
   `const modelURL = './chef.glb';`

*(Note: If the downloaded model has animations, the code is already set up to automatically play the first animation in the file!)*

## 📁 File Structure

*   `index.html`: Homepage (Scrollable 3D).
*   `menu.html`: The Menu page.
*   `about.html`: The Restaurant Story.
*   `contact.html`: Location & Booking form.
*   `style.css`: Shared styling (Dark/Red/Gold aesthetic).
*   `main.js`: Three.js scene, GLB loading, Physics, and Scroll logic.

## 🚀 How to Run Locally

Because this uses ES Modules and loads external `.glb` files, you **cannot** just double-click the HTML file.

1. Open the project folder in **VS Code**.
2. Install the **Live Server** extension.
3. Right-click `index.html` and click **"Open with Live Server"**.

## 🌐 Deploying to GitHub Pages

1. Create a repository on GitHub.
2. Upload all files (including your `chef.glb`).
3. Go to **Settings** > **Pages** > **Deploy from a branch** > Select `main` and `/ (root)`.
4. Save and wait 2 minutes for the live link!
