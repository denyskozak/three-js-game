import React, {useState, useLayoutEffect, useRef} from 'react';
import * as THREE from 'three';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

import Stats from 'three/addons/libs/stats.module.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {Octree} from 'three/addons/math/Octree.js';
import {OctreeHelper} from 'three/addons/helpers/OctreeHelper.js';
import {Capsule} from 'three/addons/math/Capsule.js';
import {GUI} from 'three/examples/jsm/libs/lil-gui.module.min.js';

let currentAnimation = '';

export function Game() {
    const containerRef = useRef(null);

    useLayoutEffect(() => {
        const socket = new WebSocket('ws://localhost:8080');

        // Store other players
        const players = {};

        // Character Model and Animation Variables
        let model, mixer, idleAction, walkAction, runAction, camera;
        let hp = 100, mana = 100
        let actions = [];
        let settings;


        // HP
        const hpBarContainer = document.createElement('div');
        hpBarContainer.style.position = 'absolute';
        hpBarContainer.style.width = '150px';
        hpBarContainer.style.height = '20px';
        hpBarContainer.style.backgroundColor = 'red';
        hpBarContainer.style.border = '2px solid black';
        hpBarContainer.style.borderRadius = '15px';
        hpBarContainer.style.overflow = 'hidden';
        hpBarContainer.style.top = '100px';
        hpBarContainer.style.left = '20px';
        hpBarContainer.style.visibility = 'hidden';

        // hpBarContainer.style.pointerEvents = 'none'; // Make it non-interactive
        // hpBarContainer.style.visibility = 'hidden'; // Initially hidden
        containerRef.current.appendChild(hpBarContainer);

        const hpBar = document.createElement('div');
        hpBar.style.width = '100%';
        hpBar.style.height = '100%';
        hpBar.style.backgroundColor = 'lime';
        hpBarContainer.appendChild(hpBar);

        // MANA
        const manaBarContainer = document.createElement('div');
        manaBarContainer.style.position = 'absolute';
        manaBarContainer.style.width = '150px';
        manaBarContainer.style.height = '20px';
        manaBarContainer.style.border = '2px solid black';
        manaBarContainer.style.borderRadius = '15px';
        manaBarContainer.style.overflow = 'hidden';
        manaBarContainer.style.top = '130px';
        manaBarContainer.style.left = '20px';
        manaBarContainer.style.visibility = 'hidden';

        // manaBarContainer.style.pointerEvents = 'none'; // Make it non-interactive
        // manaBarContainer.style.visibility = 'hidden'; // Initially hidden
        containerRef.current.appendChild(manaBarContainer);

        const manaBar = document.createElement('div');
        manaBar.style.width = '100%';
        manaBar.style.height = '100%';
        manaBar.style.backgroundColor = 'blue';
        manaBarContainer.appendChild(manaBar);

        // Function to update HP bar position and health
        function updateHPBar() {
            if (!model || !hpBarContainer) return;

            // hpBarContainer.style.left = `${screenPosition.x - 0}px`; // Center the bar
            // hpBarContainer.style.top = `${screenPosition.y - 200}px`; // Position slightly above the model
            hpBarContainer.style.visibility = 'visible'; // Ensure the bar is visible

            // Update health bar width based on player's health
            hpBar.style.width = `${hp}%`;
        }

        // Function to update HP bar position and health
        function updateManaBar() {
            if (!model || !manaBarContainer) return;

            // hpBarContainer.style.left = `${screenPosition.x - 0}px`; // Center the bar
            // hpBarContainer.style.top = `${screenPosition.y - 200}px`; // Position slightly above the model
            manaBarContainer.style.visibility = 'visible'; // Ensure the bar is visible

            // Update health bar width based on player's health
            manaBar.style.width = `${mana}%`;
        }

        // Function to handle damage and update health
        function takeDamage(amount) {
            hp = Math.max(0, hp - amount); // Ensure health doesn't go below 0
        }


        const isSocketOpen = () => socket.readyState === WebSocket.OPEN;
        let fireballModel; // Store the fireball model for reuse

        let cursor; // Global variable for the cursor object

        const clock = new THREE.Clock();

        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x88ccee);
        scene.fog = new THREE.Fog(0x88ccee, 0, 50);

        camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.rotation.order = 'YXZ';

        const fillLight1 = new THREE.HemisphereLight(0x8dc1de, 0x00668d, 1.5);
        fillLight1.position.set(2, 1, 1);
        scene.add(fillLight1);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 2.5);
        directionalLight.position.set(-5, 25, -1);
        directionalLight.castShadow = true;
        directionalLight.shadow.camera.near = 0.01;
        directionalLight.shadow.camera.far = 500;
        directionalLight.shadow.camera.right = 30;
        directionalLight.shadow.camera.left = -30;
        directionalLight.shadow.camera.top = 30;
        directionalLight.shadow.camera.bottom = -30;
        directionalLight.shadow.mapSize.width = 1024;
        directionalLight.shadow.mapSize.height = 1024;
        directionalLight.shadow.radius = 4;
        directionalLight.shadow.bias = -0.00006;
        scene.add(directionalLight);

        const renderer = new THREE.WebGLRenderer({antialias: true});
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setAnimationLoop(animate);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.VSMShadowMap;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        containerRef.current.appendChild(renderer.domElement);

        const stats = new Stats();
        stats.domElement.style.position = 'absolute';
        stats.domElement.style.top = '0px';
        containerRef.current.appendChild(stats.domElement);

        const GRAVITY = 30;

        const NUM_SPHERES = 100;
        const SPHERE_RADIUS = 0.2;

        const STEPS_PER_FRAME = 5;

        const sphereGeometry = new THREE.IcosahedronGeometry(SPHERE_RADIUS, 5);
        const sphereMaterial = new THREE.MeshLambertMaterial({color: 0xdede8d});

        const spheres = [];
        let sphereIdx = 0;

        for (let i = 0; i < NUM_SPHERES; i++) {

            const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
            sphere.castShadow = true;
            sphere.receiveShadow = true;

            scene.add(sphere);

            spheres.push({
                mesh: sphere,
                collider: new THREE.Sphere(new THREE.Vector3(0, -100, 0), SPHERE_RADIUS),
                velocity: new THREE.Vector3()
            });

        }

        const worldOctree = new Octree();

        const playerCollider = new Capsule(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 0), 0.35);

        const playerVelocity = new THREE.Vector3();
        const playerDirection = new THREE.Vector3();

        let playerOnFloor = false;
        let mouseTime = 0;

        const keyStates = {};

        const vector1 = new THREE.Vector3();
        const vector2 = new THREE.Vector3();
        const vector3 = new THREE.Vector3();

        // Set limits for the FOV
        const minFOV = 20;
        const maxFOV = 100;

        // Function to adjust the FOV (zoom)
        function adjustFOV(delta) {
            camera.fov = THREE.MathUtils.clamp(camera.fov + delta, minFOV, maxFOV);
            camera.updateProjectionMatrix(); // Update the projection matrix after changing the FOV
        }

        // Define the offset from the model for default follow camera position
        const cameraTarget = new THREE.Object3D();
        scene.add(cameraTarget);

        // Variables for camera rotation control
        let yaw = 0;
        let pitch = 0;

        // const mouse = new THREE.Vector2(); // Normalized device coordinates
        // const raycaster = new THREE.Raycaster(); // To project cursor onto the scene

        // function createCursor() {
        //     const cursorGeometry = new THREE.SphereGeometry(0.05, 16, 16); // Small sphere
        //     const cursorMaterial = new THREE.MeshBasicMaterial({color: 0xff0000}); // Red color
        //     cursor = new THREE.Mesh(cursorGeometry, cursorMaterial);
        //     scene.add(cursor);
        // }

        // Function to update the camera position and rotation
        function updateCameraPosition() {
            const playerPosition = new THREE.Vector3();
            playerCollider.getCenter(playerPosition); // Assuming `getCenter` exists

            // Calculate the offset from the player based on yaw and pitch
            const offset = new THREE.Vector3(
                Math.sin(yaw) * Math.cos(pitch),
                Math.sin(pitch),
                Math.cos(yaw) * Math.cos(pitch)
            ).multiplyScalar(1); // `distance` is the desired distance from the player

            // Set the camera's position relative to the player
            camera.position.copy(playerPosition).add(offset);

            // Set the cameraTarget position to player's position
            cameraTarget.position.copy(playerPosition);

            // Camera looks at the target object (which is at the player's position)
            camera.lookAt(cameraTarget.position);
        }

        // Event listener for mouse wheel scroll (for zooming in and out)
        window.addEventListener('wheel', (event) => {
            const delta = event.deltaY * 0.05; // Sensitivity adjustment
            adjustFOV(delta);
        });

        document.addEventListener('keydown', (event) => {

            keyStates[event.code] = true;

            switch(event.code) {
                case 'KeyE':
                    throwBall();
            }
        });

        document.addEventListener('keyup', (event) => {

            keyStates[event.code] = false;
        });

        containerRef.current.addEventListener('mousedown', (event) => {
            document.body.requestPointerLock();
            mouseTime = performance.now();
        });

        document.body.addEventListener('mousemove', (event) => {
            if (document.pointerLockElement === document.body) {
                yaw -= event.movementX / 500;
                pitch -= event.movementY / 500;

                // Constrain the pitch angle to prevent flipping
                pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch));
            }
        });

        // const renderCursor = () => {
        //     if (!model) return;
        //     raycaster.setFromCamera(mouse, camera);
        //
        //     const intersects = raycaster.intersectObjects(scene.children, true); // Intersect with all scene objects
        //     console.log('model ', model)
        //     if (intersects.length > 0) {
        //         const intersectionPoint = intersects[0].point; // Get the first intersection point
        //         cursor.position.copy(intersectionPoint); // Move the cursor to the intersection point
        //     }
        // }

        // Cursor
        // document.addEventListener('pointermove', (event) => {
        //     // Convert mouse position to normalized device coordinates (-1 to +1)
        //     mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        //     mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        //     mouse.z = 1;
        //     console.log('mouse.x ', mouse.x)
        //     console.log(' mouse.y ',  mouse.y)
        //     // Use the raycaster to find where the mouse intersects the scene
        //     renderCursor();
        // });

        window.addEventListener('resize', onWindowResize);

        function onWindowResize() {

            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();

            renderer.setSize(window.innerWidth, window.innerHeight);

        }

        const CAST_MANA_PRICE = 20;

        function throwBall() {
            if (!fireballModel || mana < CAST_MANA_PRICE) return; // Ensure the fireball model is loaded

            const fireball = SkeletonUtils.clone(fireballModel); // Clone the fireball model for reuse
            scene.add(fireball); // Add the fireball to the scene

            // Set the initial position of the fireball
            camera.getWorldDirection(playerDirection);
            fireball.position.copy(playerCollider.end).addScaledVector(playerDirection, playerCollider.radius * 1.5);

            // Set the velocity for the fireball
            const impulse = 15 + 30 * (1 - Math.exp((mouseTime - performance.now()) * 0.001));
            const velocity = playerDirection.clone().multiplyScalar(impulse);

            // Send the fireball data to the server
            socket.send(JSON.stringify({
                type: 'throwFireball',
                fireball: {
                    position: { x: fireball.position.x, y: fireball.position.y, z: fireball.position.z },
                    velocity: { x: velocity.x, y: velocity.y, z: velocity.z },
                    ownerId: '2' // Unique ID for the client
                }
            }));

            // Store velocity and collider information for the fireball
            spheres[sphereIdx] = {
                mesh: fireball,
                collider: new THREE.Sphere(new THREE.Vector3().copy(fireball.position), SPHERE_RADIUS),
                velocity: velocity,
            };

            // Set a timeout to remove the fireball after 2 seconds
            setTimeout(() => {
                scene.remove(fireball); // Remove the fireball from the scene
                spheres.splice(sphereIdx, 1); // Remove it from the array (optional)
            }, 1000);

            sphereIdx = (sphereIdx + 1) % spheres.length;
            mana = mana - CAST_MANA_PRICE;
        }


        function playerCollisions() {

            const result = worldOctree.capsuleIntersect(playerCollider);

            playerOnFloor = false;

            if (result) {

                playerOnFloor = result.normal.y > 0;

                if (!playerOnFloor) {

                    playerVelocity.addScaledVector(result.normal, -result.normal.dot(playerVelocity));

                }

                if (result.depth >= 1e-10) {

                    playerCollider.translate(result.normal.multiplyScalar(result.depth));

                }

            }

        }

        function updatePlayer(deltaTime) {

            let damping = Math.exp(-4 * deltaTime) - 1;

            if (!playerOnFloor) {

                playerVelocity.y -= GRAVITY * deltaTime;

                // small air resistance
                damping *= 0.1;

            }

            playerVelocity.addScaledVector(playerVelocity, damping);

            const deltaPosition = playerVelocity.clone().multiplyScalar(deltaTime);
            playerCollider.translate(deltaPosition);

            playerCollisions();
            // camera.position.copy(playerCollider.end);
        }

        function playerSphereCollision(sphere) {

            const center = vector1.addVectors(playerCollider.start, playerCollider.end).multiplyScalar(0.5);

            const sphere_center = sphere.collider.center;

            const r = playerCollider.radius + sphere.collider.radius;
            const r2 = r * r;

            // approximation: player = 3 spheres

            let touchedPlayer = false;
            for (const point of [playerCollider.start, playerCollider.end, center]) {

                const d2 = point.distanceToSquared(sphere_center);

                if (d2 < r2) {

                    const normal = vector1.subVectors(point, sphere_center).normalize();
                    const v1 = vector2.copy(normal).multiplyScalar(normal.dot(playerVelocity));
                    const v2 = vector3.copy(normal).multiplyScalar(normal.dot(sphere.velocity));

                    playerVelocity.add(v2).sub(v1);
                    sphere.velocity.add(v1).sub(v2);

                    const d = (r - Math.sqrt(d2)) / 2;
                    sphere_center.addScaledVector(normal, -d);
                    touchedPlayer = true;
                    break;
                }

            }

            if (touchedPlayer) { takeDamage(10)}

        }

        function spheresCollisions() {

            for (let i = 0, length = spheres.length; i < length; i++) {

                const s1 = spheres[i];

                for (let j = i + 1; j < length; j++) {

                    const s2 = spheres[j];

                    const d2 = s1.collider.center.distanceToSquared(s2.collider.center);
                    const r = s1.collider.radius + s2.collider.radius;
                    const r2 = r * r;

                    if (d2 < r2) {

                        const normal = vector1.subVectors(s1.collider.center, s2.collider.center).normalize();
                        const v1 = vector2.copy(normal).multiplyScalar(normal.dot(s1.velocity));
                        const v2 = vector3.copy(normal).multiplyScalar(normal.dot(s2.velocity));

                        s1.velocity.add(v2).sub(v1);
                        s2.velocity.add(v1).sub(v2);

                        const d = (r - Math.sqrt(d2)) / 2;

                        s1.collider.center.addScaledVector(normal, d);
                        s2.collider.center.addScaledVector(normal, -d);

                    }

                }

            }

        }

        function updateSpheres(deltaTime) {
            spheres.forEach(sphere => {
                if (!sphere.mesh) return;

                sphere.collider.center.addScaledVector(sphere.velocity, deltaTime);

                const result = worldOctree.sphereIntersect(sphere.collider);
                if (result) {
                    // Handle collision logic (e.g., explode fireball or bounce)
                    sphere.velocity.addScaledVector(result.normal, -result.normal.dot(sphere.velocity) * 1.5);
                    sphere.collider.center.add(result.normal.multiplyScalar(result.depth));
                } else {
                    // Apply gravity to fireball
                    sphere.velocity.y -= GRAVITY * deltaTime;
                }

                // Update the fireball position

                playerSphereCollision(sphere);

            });

            spheresCollisions(); // Handle collisions between spheres

            for (let sphere of spheres) {
                sphere.mesh.position.copy(sphere.collider.center);
            }
        }

        function getForwardVector() {

            camera.getWorldDirection(playerDirection);
            playerDirection.y = 0;
            playerDirection.normalize();

            return playerDirection;

        }

        function getSideVector() {

            camera.getWorldDirection(playerDirection);
            playerDirection.y = 0;
            playerDirection.normalize();
            playerDirection.cross(camera.up);

            return playerDirection;

        }

        function controls(deltaTime) {


            // Forward and backward movement for W and S
            const speedDelta = deltaTime * (playerOnFloor ? 25 : 8);

            // Rotate playerVelocity when pressing A or D
            if (keyStates['KeyA']) {

                playerVelocity.add(getSideVector().multiplyScalar(-speedDelta));
                setAnimation('Walk');

            }

            if (keyStates['KeyD']) {
                playerVelocity.add(getSideVector().multiplyScalar(speedDelta));
                setAnimation('Walk');
            }

            if (keyStates['KeyW']) {
                const forwardVector = new THREE.Vector3(
                    Math.sin(model.rotation.y),
                    0,
                    Math.cos(model.rotation.y)
                );
                playerVelocity.add(forwardVector.multiplyScalar(speedDelta));
                setAnimation('Run');
            }

            if (keyStates['KeyS']) {
                const backwardVector = new THREE.Vector3(
                    -Math.sin(model.rotation.y),
                    0,
                    -Math.cos(model.rotation.y)
                );
                playerVelocity.add(backwardVector.multiplyScalar(speedDelta));
                setAnimation('Idle');
            }

            // Space for jumping
            if (playerOnFloor && keyStates['Space']) {
                playerVelocity.y = 15;
            }
        }

        // Play or pause animations
        function playPause() {
            actions.forEach(action => settings.play ? action.play() : action.stop());
        }

        // Show or hide model
        function showModel(visibility) {
            model.visible = visibility;
        }

        // Deactivate all actions
        function deactivateAllActions() {
            actions.forEach(action => action.stop());
        }

        // Activate all actions
        function activateAllActions() {
            actions.forEach(action => action.play());
        }

        // Modify time scale for animations
        function modifyTimeScale(speed) {
            mixer.timeScale = speed;
        }

        // Fade between animations
        function fadeToAction(action, duration) {
            action.reset();
            action.play();
            action.fadeIn(duration);
            currentAnimation = '';
        }

        // Set animation based on action name
        function setAnimation(actionName) {
            // TODO return animation
            // switch (actionName) {
            //     case 'Idle':
            //         fadeToAction(idleAction, 0.5);
            //         break;
            //     case 'Walk':
            //         fadeToAction(walkAction, 0.1);
            //         break;
            //     case 'Run':
            //         fadeToAction(runAction, 0.05);
            //         break;
            // }
        }

        const loader = new GLTFLoader().setPath('./models/');


        loader.load('murloc_creature.glb', (gltf) => {
            const modelMurloc = gltf.scene;
            modelMurloc.scale.set(0.2, 0.2, 0.2);

            scene.add(modelMurloc);

            worldOctree.fromGraphNode(gltf.scene);
        });

        loader.load('valley_of_trials_-_world_of_warcraft_-_test_1.glb', (gltf) => {

            scene.add(gltf.scene);

            worldOctree.fromGraphNode(gltf.scene);

            gltf.scene.traverse(child => {

                if (child.isMesh) {

                    child.castShadow = true;
                    child.receiveShadow = true;

                    if (child.material.map) {

                        child.material.map.anisotropy = 4;

                    }

                }

            });

            const helper = new OctreeHelper(worldOctree);
            helper.visible = false;
            scene.add(helper);

            const gui = new GUI({width: 200});
            gui.add({debug: false}, 'debug')
                .onChange(function (value) {

                    helper.visible = value;

                });

        });

        loader.load('fireball.glb', (gltf) => {
            fireballModel = gltf.scene;
            fireballModel.scale.set(0.03, 0.03, 0.03); // Adjust size if needed
        });

        loader.load('judgement_armor.glb', function (gltf) {
            model = gltf.scene;
            model.traverse((object) => {
                if (object.isMesh) object.castShadow = true;
            });
            model.scale.set(0.4, 0.4, 0.4);

            scene.add(model);

            // mixer = new THREE.AnimationMixer(model);
            // const animations = gltf.animations;
            // idleAction = mixer.clipAction(animations[0]);
            // walkAction = mixer.clipAction(animations[3]);
            // runAction = mixer.clipAction(animations[1]);

            // actions = [idleAction, walkAction, runAction];
            // settings = {
            //     'show model': true,
            //     'play': true,
            //     'deactivate all': deactivateAllActions,
            //     'activate all': activateAllActions,
            //     'modify time scale': 1.0
            // };
            //
            // const panel = new GUI({width: 310});
            // panel.add(settings, 'show model').onChange(showModel);
            // panel.add(settings, 'play').onChange(playPause);
            // panel.add(settings, 'deactivate all');
            // panel.add(settings, 'activate all');
            // panel.add(settings, 'modify time scale', 0.0, 1.5, 0.01).onChange(modifyTimeScale);

            // activateAllActions();
        });

        function teleportPlayerIfOob() {
            if (camera.position.y <= -25) {
                playerCollider.start.set(0, 0.35, 0);
                playerCollider.end.set(0, 1, 0);
                playerCollider.radius = 0.35;
                camera.position.copy(playerCollider.end);
                camera.rotation.set(0, 0, 0);
            }
        }

        function updateModel() {
            if (model) {
                const playerPosition = new THREE.Vector3();
                playerCollider.getCenter(playerPosition);

                // Update model position and height
                model.position.copy(playerPosition);
                // model.position.y += 0.5; // Adjust the height to keep the model slightly above ground
                model.position.y -= 0.5;
                // Get the camera's forward direction
                const cameraDirection = new THREE.Vector3();
                camera.getWorldDirection(cameraDirection);

                // Calculate the direction the player is moving (opposite to camera's forward)
                const targetRotationY = Math.atan2(cameraDirection.x, cameraDirection.z);

                // Rotate the model to face the opposite direction
                model.rotation.y = THREE.MathUtils.lerp(model.rotation.y, targetRotationY, 0.1);
            }
        }


        // Example function to send player position updates to the server
        function sendPositionUpdate() {
            if (!playerCollider.start) return;

            const position = {
                x: playerCollider.start.x,
                y: playerCollider.start.y,
                z: playerCollider.start.z
            };

            if (isSocketOpen()) {
                socket.send(JSON.stringify({type: 'updatePosition', position}));
            }
        }

        function animate() {

            const deltaTime = Math.min(0.05, clock.getDelta()) / STEPS_PER_FRAME;
            // Update the character model and animations
            if (mixer) mixer.update(deltaTime);
            // we look for collisions in substeps to mitigate the risk of
            // an object traversing another too quickly for detection.

            for (let i = 0; i < STEPS_PER_FRAME; i++) {

                controls(deltaTime);

                updatePlayer(deltaTime);
                updateSpheres(deltaTime);

                teleportPlayerIfOob();
                updateModel();
                // renderCursor();
                updateCameraPosition();

            }
            updateHPBar();
            updateManaBar();
            sendPositionUpdate();

            renderer.render(scene, camera);
            stats.update();

        }

        // Function to create a new player in the scene
        function createPlayer(id) {
            if (model) {
                const player = SkeletonUtils.clone(model)
                player.position.set(0, 1, 0);
                scene.add(player);
                players[id] = player;
            }
        }

        // Function to update a player's position
        function updatePlayerPosition(id, position) {
            if (players[id]) {
                players[id].position.set(position.x, position.y, position.z);
            } else {
                createPlayer(id);
            }
        }

        // Function to remove a player from the scene
        function removePlayer(id) {
            if (players[id]) {
                scene.remove(players[id]);
                delete players[id];
            }
        }

        function addFireballToScene(fireballData) {
            const fireball = SkeletonUtils.clone(fireballModel); // Clone the model
            fireball.position.set(fireballData.position.x, fireballData.position.y, fireballData.position.z);

            scene.add(fireball);

            spheres.push({
                mesh: fireball,
                collider: new THREE.Sphere(new THREE.Vector3().copy(fireball.position), SPHERE_RADIUS),
                velocity: new THREE.Vector3(
                    fireballData.velocity.x,
                    fireballData.velocity.y,
                    fireballData.velocity.z
                ),
                ownerId: fireballData.ownerId
            });
        }

        // Handle incoming messages from the server
        socket.onmessage = async (event) => {
            let message = JSON.parse(event.data);


            switch (message.type) {
                case 'newFireball':
                    addFireballToScene(message.fireball);
                    break;
                case 'newPlayer':
                    createPlayer(message.fromId);
                    break;
                case 'updatePosition':
                    updatePlayerPosition(message.fromId, message.position);
                    break;
                case 'removePlayer':
                    removePlayer(message.id);
                    break;
            }
        };

        const manaInterval =
            setInterval(() => mana = mana < 100 ? mana + 10 : mana, 2000);

        return () => {
            clearInterval(manaInterval)
        }
    }, []);

    return (
        <div id="game-container" ref={containerRef}></div>
    );
}
