import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

// --- 1. SCENE SETUP ---
const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x050000, 0.02);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 2, 12);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
renderer.toneMapping = THREE.ACESFilmicToneMapping; // Cinematic color grading
container.appendChild(renderer.domElement);

// --- 2. REALISTIC LIGHTING (Environment Map) ---
// This is CRUCIAL for making .glb models look good. It gives realistic reflections.
const pmremGenerator = new THREE.PMREMGenerator(renderer);
scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;

// Add warm restaurant lights on top of the environment
const ambientLight = new THREE.AmbientLight(0xffaa88, 0.5);
scene.add(ambientLight);

const spotLight = new THREE.SpotLight(0xffdd99, 500);
spotLight.position.set(5, 10, 5);
spotLight.angle = Math.PI / 3;
spotLight.penumbra = 0.8;
spotLight.castShadow = true;
scene.add(spotLight);

// --- 3. LOADING THE 3D CHEF MODEL ---
const chefGroup = new THREE.Group();
scene.add(chefGroup);

// *** IMPORTANT: REPLACE THIS URL WITH YOUR OWN CHEF MODEL ***
// You can download realistic human models from Sketchfab or Mixamo. 
// For this example, we are loading a public domain human soldier model.
const modelURL = 'https://threejs.org/examples/models/gltf/Soldier.glb';

let mixer = null; // For playing animations built into the GLB
const loader = new GLTFLoader();
const loadingScreen = document.getElementById('loader');

loader.load(modelURL, (gltf) => {
    const model = gltf.scene;
    
    // Scale and position the model appropriately
    model.scale.set(1.5, 1.5, 1.5);
    model.position.y = -2; 
    model.rotation.y = Math.PI; // Face the camera

    // Enable shadows on the model
    model.traverse((node) => {
        if (node.isMesh) {
            node.castShadow = true;
            node.receiveShadow = true;
        }
    });

    chefGroup.add(model);

    // If the model has built-in animations, play them
    if (gltf.animations && gltf.animations.length > 0) {
        mixer = new THREE.AnimationMixer(model);
        // Play the first animation found in the file
        const action = mixer.clipAction(gltf.animations[0]);
        action.play();
    }

    // Hide Loading Screen
    loadingScreen.classList.add('hidden');
    
}, undefined, (error) => {
    console.error('Error loading model:', error);
    loadingScreen.innerHTML = '<h2>Error loading 3D Model</h2>';
});

// --- 4. THE WOK & FOOD PHYSICS ---
// We create a separate group for the wok so we can toss it independently of the GLB model's rig
const wokGroup = new THREE.Group();
wokGroup.position.set(1.5, 1, 1.5); // Positioned in front of the chef
scene.add(wokGroup);

const wok = new THREE.Mesh(
    new THREE.CylinderGeometry(1.5, 0.8, 0.6, 32), 
    new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.9, roughness: 0.3 })
);
wok.rotation.z = -Math.PI / 4;
wokGroup.add(wok);

const foodGroup = new THREE.Group();
scene.add(foodGroup);
const foodPieces = [];
const foodColors = [0xffaa00, 0xff5500, 0x00aa00, 0x884400];

for (let i = 0; i < 25; i++) {
    const size = 0.15 + Math.random() * 0.15;
    const piece = new THREE.Mesh(
        new THREE.BoxGeometry(size, size, size), 
        new THREE.MeshStandardMaterial({ color: foodColors[Math.floor(Math.random() * foodColors.length)], roughness: 0.6 })
    );
    piece.castShadow = true;
    piece.userData = { velocityY: 0, velocityX: 0, velocityZ: 0, isFlying: false };
    foodGroup.add(piece);
    foodPieces.push(piece);
}

// --- 5. SCROLL INTERACTION ---
let scrollY = 0;
let targetCameraY = 2;
let targetCameraZ = 12;
let targetChefRotY = 0;

window.addEventListener('scroll', () => {
    scrollY = window.scrollY;
    const maxScroll = document.body.scrollHeight - window.innerHeight;
    const scrollPercent = Math.min(scrollY / maxScroll, 1);

    // Move camera based on scroll
    targetCameraY = 2 - (scrollPercent * 3); 
    targetCameraZ = 12 + (scrollPercent * 5);
    
    // Rotate the chef group to show different angles
    targetChefRotY = scrollPercent * Math.PI * 0.5; 
});

// --- 6. ANIMATION LOOP ---
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    const time = clock.getElapsedTime();

    // Update GLB Model Animations
    if (mixer) mixer.update(0.016);

    // Animate the Wok Tossing
    const tossSpeed = 2.5;
    wokGroup.rotation.z = Math.sin(time * tossSpeed) * 0.4 - 0.2; 
    wok.rotation.z = -Math.PI / 4 + Math.sin(time * tossSpeed) * 0.2;

    // Smooth Camera Scroll (Lerp)
    camera.position.y += (targetCameraY - camera.position.y) * 0.05;
    camera.position.z += (targetCameraZ - camera.position.z) * 0.05;
    chefGroup.rotation.y += (targetChefRotY - chefGroup.rotation.y) * 0.05;
    
    // Camera lookAt logic
    const lookAtY = 1 - (scrollY / (document.body.scrollHeight - window.innerHeight)) * 2;
    camera.lookAt(0, lookAtY, 0);

    // Food Physics
    const wokWorldPos = new THREE.Vector3();
    wok.getWorldPosition(wokWorldPos);

    foodPieces.forEach((piece) => {
        if (!piece.userData.isFlying) {
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * 0.8;
            piece.position.set(
                wokWorldPos.x + Math.cos(angle) * radius,
                wokWorldPos.y,
                wokWorldPos.z + Math.sin(angle) * radius
            );

            // Randomly launch food when wok moves up
            if (Math.sin(time * tossSpeed) > 0.5 && Math.random() > 0.9) {
                piece.userData.isFlying = true;
                piece.userData.velocityY = 5 + Math.random() * 3;
                piece.userData.velocityX = (Math.random() - 0.5) * 2;
                piece.userData.velocityZ = (Math.random() - 0.5) * 2;
            }
        } else {
            // Gravity
            piece.userData.velocityY -= 9.8 * 0.016;
            piece.position.y += piece.userData.velocityY * 0.016;
            piece.position.x += piece.userData.velocityX * 0.016;
            piece.position.z += piece.userData.velocityZ * 0.016;
            
            // Spin
            piece.rotation.x += 0.1;
            piece.rotation.y += 0.1;

            if (piece.position.y < wokWorldPos.y - 1) piece.userData.isFlying = false;
        }
    });

    renderer.render(scene, camera);
}

animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
