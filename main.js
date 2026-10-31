import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

// --- 1. SCENE SETUP ---
const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x050000, 0.02);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
// Pulled camera back slightly so we can see the whole body
camera.position.set(0, 1, 12);
camera.lookAt(0, 1, 0);

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

const modelURL = 'https://threejs.org/examples/models/gltf/Soldier.glb'; // Change this to './chef.glb' later

let mixer = null;
const loader = new GLTFLoader();
const loadingScreen = document.getElementById('loader');

loader.load(modelURL, (gltf) => {
    const model = gltf.scene;
    
    // --- DYNAMIC SCALING ---
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    // SMALLER TARGET HEIGHT: Fits nicely on screen (Try 4.5 to 5.5)
    const targetHeight = 5.0; 
    const scaleFactor = targetHeight / size.y;
    
    model.scale.set(scaleFactor, scaleFactor, scaleFactor);

    // Recalculate to perfectly center the model at origin (0,0,0)
    box.setFromObject(model);
    box.getCenter(center);
    
    // Center exactly on X and Z, and adjust Y so feet are at the bottom
    model.position.x = -center.x;
    model.position.z = -center.z;
    model.position.y = -center.y; 

    model.traverse((node) => {
        if (node.isMesh) {
            node.castShadow = true;
            node.receiveShadow = true;
        }
    });

    chefGroup.add(model);

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
const wokGroup = new THREE.Group();
// Positioned to the right, at chest height
wokGroup.position.set(2.0, 1.5, 1.5); 
chefGroup.add(wokGroup);

const wok = new THREE.Mesh(
    new THREE.CylinderGeometry(1.2, 0.7, 0.5, 32), 
    new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.9, roughness: 0.3 })
);
wok.rotation.z = -Math.PI / 4;
wokGroup.add(wok);

// Handle
const handle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.08, 1.8),
    new THREE.MeshStandardMaterial({ color: 0x8b4513, roughness: 0.9 })
);
handle.position.set(1.5, 0.5, 0);
handle.rotation.z = Math.PI / 2;
wokGroup.add(handle);

const foodGroup = new THREE.Group();
scene.add(foodGroup);
const foodPieces = [];
const foodColors = [0xffaa00, 0xff5500, 0x00aa00, 0x884400];

for (let i = 0; i < 30; i++) {
    const size = 0.1 + Math.random() * 0.1;
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
let targetCameraY = 1;
let targetCameraZ = 12;
let targetChefRotY = 0;

window.addEventListener('scroll', () => {
    scrollY = window.scrollY;
    const maxScroll = document.body.scrollHeight - window.innerHeight;
    const scrollPercent = Math.min(scrollY / maxScroll, 1);

    // Zoom out slightly and pan up as user scrolls
    targetCameraY = 1 + (scrollPercent * 2); 
    targetCameraZ = 12 + (scrollPercent * 4);
    
    targetChefRotY = scrollPercent * Math.PI * 0.4; 
});

// --- 6. ANIMATION LOOP ---
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    const time = clock.getElapsedTime();

    if (mixer) mixer.update(0.016);

    // Wok Toss Animation
    const tossSpeed = 2.5;
    wokGroup.rotation.z = Math.sin(time * tossSpeed) * 0.4 - 0.2; 
    wokGroup.position.y = 1.5 + Math.sin(time * tossSpeed) * 0.2;
    wok.rotation.z = -Math.PI / 4 + Math.sin(time * tossSpeed) * 0.2;

    // Camera Movement
    camera.position.y += (targetCameraY - camera.position.y) * 0.05;
    camera.position.z += (targetCameraZ - camera.position.z) * 0.05;
    chefGroup.rotation.y += (targetChefRotY - chefGroup.rotation.y) * 0.05;
    
    // Look at the center of the chef
    const lookAtY = 1 + (scrollY / (document.body.scrollHeight - window.innerHeight)) * 1;
    camera.lookAt(0, lookAtY, 0);

    // Food Physics
    const wokWorldPos = new THREE.Vector3();
    wok.getWorldPosition(wokWorldPos);

    foodPieces.forEach((piece) => {
        if (!piece.userData.isFlying) {
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * 0.7;
            piece.position.set(
                wokWorldPos.x + Math.cos(angle) * radius,
                wokWorldPos.y,
                wokWorldPos.z + Math.sin(angle) * radius
            );

            if (Math.sin(time * tossSpeed) > 0.5 && Math.random() > 0.9) {
                piece.userData.isFlying = true;
                piece.userData.velocityY = 4 + Math.random() * 2;
                piece.userData.velocityX = (Math.random() - 0.5) * 2;
                piece.userData.velocityZ = (Math.random() - 0.5) * 2;
            }
        } else {
            piece.userData.velocityY -= 9.8 * 0.016;
            piece.position.y += piece.userData.velocityY * 0.016;
            piece.position.x += piece.userData.velocityX * 0.016;
            piece.position.z += piece.userData.velocityZ * 0.016;
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
