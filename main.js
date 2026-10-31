import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

// --- 1. SCENE SETUP ---
const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x050000, 0.02);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
// Camera moved back a bit to fit the larger model
camera.position.set(0, 2, 15);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
renderer.toneMapping = THREE.ACESFilmicToneMapping; 
container.appendChild(renderer.domElement);

// --- 2. REALISTIC LIGHTING ---
const pmremGenerator = new THREE.PMREMGenerator(renderer);
scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;

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

// *** REPLACE THIS URL WITH YOUR OWN CHEF MODEL ***
const modelURL = 'https://threejs.org/examples/models/gltf/Soldier.glb';

let mixer = null;
const loader = new GLTFLoader();
const loadingScreen = document.getElementById('loader');

loader.load(modelURL, (gltf) => {
    const model = gltf.scene;
    
    // --- DYNAMIC SCALING MAGIC ---
    // 1. Calculate the exact bounding box of whatever model is loaded
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    // 2. Set how tall we want the model to be on screen
    // The camera is at Z=15. A height of 8 or 9 will fill up most of the screen.
    const targetHeight = 8.5; 
    const scaleFactor = targetHeight / size.y;
    
    // 3. Apply the scale
    model.scale.set(scaleFactor, scaleFactor, scaleFactor);

    // 4. Recalculate to perfectly center the model
    box.setFromObject(model);
    box.getCenter(center);
    
    // Center the model at X=0, Z=0, and adjust Y so feet are near the bottom
    model.position.x = -center.x;
    model.position.z = -center.z;
    model.position.y = -center.y - 2; // Push down slightly

    model.traverse((node) => {
        if (node.isMesh) {
            node.castShadow = true;
            node.receiveShadow = true;
        }
    });

    chefGroup.add(model);

    // Play built-in animations if the model has them
    if (gltf.animations && gltf.animations.length > 0) {
        mixer = new THREE.AnimationMixer(model);
        const action = mixer.clipAction(gltf.animations[0]);
        action.play();
    }

    loadingScreen.classList.add('hidden');
    
}, undefined, (error) => {
    console.error('Error loading model:', error);
    loadingScreen.innerHTML = '<h2>Error loading 3D Model</h2>';
});

// --- 4. THE WOK & FOOD PHYSICS ---
// We attach the wok to the chefGroup so it rotates with the chef when scrolling
const wokGroup = new THREE.Group();
wokGroup.position.set(2.5, 1.5, 2.5); // Positioned to the right and front of the chef
chefGroup.add(wokGroup);

const wok = new THREE.Mesh(
    new THREE.CylinderGeometry(1.8, 1.0, 0.7, 32), // Made the wok bigger too
    new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.9, roughness: 0.3 })
);
wok.rotation.z = -Math.PI / 4;
wokGroup.add(wok);

// Handle for the Wok
const handle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.1, 2.5),
    new THREE.MeshStandardMaterial({ color: 0x8b4513, roughness: 0.9 })
);
handle.position.set(2.2, 0.8, 0);
handle.rotation.z = Math.PI / 2;
wokGroup.add(handle);

const foodGroup = new THREE.Group();
scene.add(foodGroup);
const foodPieces = [];
const foodColors = [0xffaa00, 0xff5500, 0x00aa00, 0x884400];

for (let i = 0; i < 30; i++) {
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
let targetCameraZ = 15;
let targetChefRotY = 0;

window.addEventListener('scroll', () => {
    scrollY = window.scrollY;
    const maxScroll = document.body.scrollHeight - window.innerHeight;
    const scrollPercent = Math.min(scrollY / maxScroll, 1);

    // As user scrolls, zoom out and pan slightly
    targetCameraY = 2 - (scrollPercent * 3); 
    targetCameraZ = 15 + (scrollPercent * 5);
    
    // Rotate the chef to show his side profile as you scroll
    targetChefRotY = scrollPercent * Math.PI * 0.4; 
});

// --- 6. ANIMATION LOOP ---
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    const time = clock.getElapsedTime();

    if (mixer) mixer.update(0.016);

    // Animate the Wok Tossing (Up and down motion)
    const tossSpeed = 2.5;
    wokGroup.rotation.z = Math.sin(time * tossSpeed) * 0.4 - 0.2; 
    wokGroup.position.y = 1.5 + Math.sin(time * tossSpeed) * 0.3; // Move wok up and down
    wok.rotation.z = -Math.PI / 4 + Math.sin(time * tossSpeed) * 0.2;

    // Smooth Camera Movement
    camera.position.y += (targetCameraY - camera.position.y) * 0.05;
    camera.position.z += (targetCameraZ - camera.position.z) * 0.05;
    chefGroup.rotation.y += (targetChefRotY - chefGroup.rotation.y) * 0.05;
    
    const lookAtY = 1 - (scrollY / (document.body.scrollHeight - window.innerHeight)) * 2;
    camera.lookAt(0, lookAtY, 0);

    // Food Physics
    const wokWorldPos = new THREE.Vector3();
    wok.getWorldPosition(wokWorldPos);

    foodPieces.forEach((piece) => {
        if (!piece.userData.isFlying) {
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * 1.0;
            piece.position.set(
                wokWorldPos.x + Math.cos(angle) * radius,
                wokWorldPos.y,
                wokWorldPos.z + Math.sin(angle) * radius
            );

            if (Math.sin(time * tossSpeed) > 0.5 && Math.random() > 0.9) {
                piece.userData.isFlying = true;
                piece.userData.velocityY = 6 + Math.random() * 3;
                piece.userData.velocityX = (Math.random() - 0.5) * 3;
                piece.userData.velocityZ = (Math.random() - 0.5) * 3;
            }
        } else {
            piece.userData.velocityY -= 9.8 * 0.016;
            piece.position.y += piece.userData.velocityY * 0.016;
            piece.position.x += piece.userData.velocityX * 0.016;
            piece.position.z += piece.userData.velocityZ * 0.016;
            piece.rotation.x += 0.1;
            piece.rotation.y += 0.1;

            if (piece.position.y < wokWorldPos.y - 1.5) piece.userData.isFlying = false;
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
