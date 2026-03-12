import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { Rhino3dmLoader } from 'three/examples/jsm/loaders/3DMLoader'
import rhino3dm from 'rhino3dm'

// Scene variables
let scene, camera, renderer, controls, raycaster, mouse
let rhino = null

// Materials
const defaultMaterial = new THREE.MeshPhysicalMaterial({ 
    color: 0xadd8e6,
    metalness: 0.7,
    roughness: 0.3,
    transparent: true,
    opacity: 0.9,
    side: THREE.DoubleSide
})

const selectedMaterial = defaultMaterial.clone()
selectedMaterial.color.setHex(0xffff00)

// Initialize the scene
async function init() {
    // Debug check for container
    console.log('All elements with ID "container":', document.querySelectorAll('#container'));
    console.log('Container element:', document.getElementById('container'));
    
    // Initialize rhino3dm
    rhino = await rhino3dm()
    console.log('Rhino3dm loaded')
    
    // Create scene
    scene = new THREE.Scene()
    scene.background = new THREE.Color(0x1f2937) // Tailwind gray-800

    // Get viewer container dimensions
    const container = document.getElementById('viewer')
    const rect = container.getBoundingClientRect()
    const width = rect.width
    const height = rect.height

    // Setup camera
    camera = new THREE.PerspectiveCamera(65, width / height, 0.1, 1000)
    camera.position.set(10, 10, 10)

    // Setup renderer with proper pixel ratio
    renderer = new THREE.WebGLRenderer({ 
        antialias: true,
        powerPreference: "high-performance"
    })
    renderer.setPixelRatio(1) // Force 1:1 pixel ratio for consistent behavior
    renderer.setSize(width, height)
    renderer.shadowMap.enabled = true
    container.appendChild(renderer.domElement)

    // Make sure canvas fills container
    renderer.domElement.style.width = '100%'
    renderer.domElement.style.height = '100%'

    // Setup controls
    controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.05

    // Setup raycaster for object selection
    raycaster = new THREE.Raycaster()
    mouse = new THREE.Vector2()

    // Add initial lights
    setupLights()

    // Handle window resizing
    window.addEventListener('resize', onWindowResize, false)

    // Handle file input and object selection
    document.getElementById('fileInput').addEventListener('change', handleFileSelect)
    renderer.domElement.addEventListener('click', onMouseClick, false)

    // Camera controls
    document.getElementById('btn-top').addEventListener('click', () => setCameraView('top'));
    document.getElementById('btn-front').addEventListener('click', () => setCameraView('front'));
    document.getElementById('btn-right').addEventListener('click', () => setCameraView('right'));
    document.getElementById('btn-perspective').addEventListener('click', () => setCameraView('perspective'));

    animate()
}

function setCameraView(viewType) {
    if (!scene || scene.children.length === 0) return;

    // Find the main object to frame
    const object = scene.children.find(child => child.type === 'Group' || child.type === 'Object3D') || scene;
    const box = new THREE.Box3().setFromObject(object);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = camera.fov * (Math.PI / 180);
    const cameraDistance = Math.abs(maxDim / Math.sin(fov / 2) / 1.5);

    controls.target.copy(center);

    switch(viewType) {
        case 'top':
            camera.position.set(center.x, center.y, center.z + cameraDistance);
            camera.up.set(0, 1, 0);
            break;
        case 'front':
            camera.position.set(center.x, center.y - cameraDistance, center.z);
            camera.up.set(0, 0, 1);
            break;
        case 'right':
            camera.position.set(center.x + cameraDistance, center.y, center.z);
            camera.up.set(0, 0, 1);
            break;
        case 'perspective':
            camera.position.set(center.x + cameraDistance * 0.7, center.y - cameraDistance * 0.7, center.z + cameraDistance * 0.7);
            camera.up.set(0, 0, 1);
            break;
    }

    camera.lookAt(center);
    controls.update();
}

function setupLights() {
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1)
    scene.add(hemiLight)

    const dirLight = new THREE.DirectionalLight(0xffffff, 1)
    dirLight.position.set(1, 1, 1)
    dirLight.castShadow = true
    scene.add(dirLight)
}

// Store the latest diamonds data globally so we can export/filter it
let currentDiamondsMap = new Map();

// Handle file selection
async function handleFileSelect(event) {
    const file = event.target.files[0]
    if (!file) return

    // Reset current map
    currentDiamondsMap.clear();

    // Show loader
    const loader = document.getElementById('loader')
    const progressBar = document.getElementById('progress-bar')
    const progressText = document.getElementById('progress-text')

    if (loader) {
        loader.classList.remove('hidden')
        if (progressBar) progressBar.style.width = '0%'
        if (progressText) progressText.textContent = '0%'
    }

    // Get container element
    const container = document.getElementById('diamond-summary-container')
    console.log('Container element in handleFileSelect:', container)

    // Clear previous summary
    if (container) {
        container.innerHTML = `
            <div class="text-sm text-gray-500">
                Loading model...
            </div>
        `
    } else {
        console.error('Container element not found in handleFileSelect')
    }

    try {
        // Load with Three.js
        const loader3dm = new Rhino3dmLoader()
        loader3dm.setLibraryPath('https://unpkg.com/rhino3dm@8.4.0/')

        const url = URL.createObjectURL(file)
        
        loader3dm.load(url, 
            function(object) {
                // Hide loader
                if (loader) loader.classList.add('hidden')

                // Clear existing objects
                while(scene.children.length > 0){ 
                    scene.remove(scene.children[0]); 
                }
                
                // Reset lights
                setupLights()

                // Process materials
                object.traverse(child => {
                    if (child.isMesh) {
                        // Apply default material
                        const material = defaultMaterial.clone()
                        
                        // Keep original color if available
                        if (child.userData.attributes?.drawColor) {
                            const color = child.userData.attributes.drawColor
                            material.color.setRGB(
                                color.r / 255,
                                color.g / 255,
                                color.b / 255
                            )
                        }
                        
                        child.material = material
                        child.castShadow = true
                        child.receiveShadow = true
                    }
                })

                // Add to scene
                scene.add(object)

                // Center camera on the loaded object
                centerCameraOnObject(object)

                // Create summary panel with delay to ensure DOM is ready
                setTimeout(() => {
                    const container = document.getElementById('diamond-summary-container')
                    console.log('Container element before summary:', container)
                    
                    try {
                        createSummaryPanel(object)
                    } catch (error) {
                        console.error('Error creating summary:', error)
                        if (container) {
                            container.innerHTML = `
                                <div class="bg-red-50 p-4 rounded-lg">
                                    <p class="text-red-800">Error creating diamond summary: ${error.message || 'Unknown error'}</p>
                                </div>
                            `
                        } else {
                            console.error('Container still not found after timeout')
                        }
                    }
                }, 500) // Increased timeout to 500ms

                URL.revokeObjectURL(url)
            },
            progress => {
                const percent = (progress.loaded / progress.total * 100)
                console.log(percent.toFixed(2) + '% loaded')
                if (progressBar) progressBar.style.width = `${percent}%`
                if (progressText) progressText.textContent = `${percent.toFixed(0)}%`
            },
            error => {
                console.error('Error loading 3DM:', error)
                if (loader) loader.classList.add('hidden')
                
                const container = document.getElementById('diamond-summary-container')
                if (container) {
                    container.innerHTML = `
                        <div class="bg-red-50 p-4 rounded-lg">
                            <p class="text-red-800">Error loading file: ${error.message || 'Unknown error'}</p>
                        </div>
                    `
                }
            }
        )

    } catch (error) {
        console.error('Error processing file:', error)
        if (loader) loader.classList.add('hidden')
        
        const container = document.getElementById('diamond-summary-container')
        if (container) {
            container.innerHTML = `
                <div class="bg-red-50 p-4 rounded-lg">
                    <p class="text-red-800">Error processing file: ${error.message || 'Unknown error'}</p>
                </div>
            `
        }
    }
}

function centerCameraOnObject(object) {
    const box = new THREE.Box3().setFromObject(object);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    
    // Get the largest dimension to ensure the object fits in view
    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = camera.fov * (Math.PI / 180);
    const cameraDistance = Math.abs(maxDim / Math.sin(fov / 2) / 1.5);
    
    camera.position.copy(center);
    camera.position.z += cameraDistance;
    camera.lookAt(center);
    
    // Update controls target to the center of the object
    controls.target.copy(center);
    controls.update();
}

function createSummaryPanel(object) {
    console.log('Creating summary panel...');
    
    // Get the container element
    const container = document.getElementById('diamond-summary-container')
    if (!container) {
        console.error('Diamond summary container element not found');
        return;
    }
    console.log('Found container element');
    
    // Scale factor to convert from model units to millimeters
    const SCALE_TO_MM = 1 / 39.2

    // Function to round to nearest 0.10
    function roundToTenth(num) {
        return (Math.round(Math.abs(num) * 10) / 10).toFixed(2)
    }

    // Collect all diamonds and their measurements
    const diamonds = new Map() // key: "sizeX x sizeY", value: object with details
    let diamondCount = 0;
    
    object.updateMatrixWorld(true);
    console.log('Traversing object...');

    object.traverse(child => {
        if (child.isMesh && child.name.toLowerCase().includes('diamond')) {
            // Check for valid geometry before adding to summary
            if (!child.geometry || !child.geometry.attributes || !child.geometry.attributes.position) {
                console.warn('Diamond mesh has no valid geometry:', child.name);
                return;
            }

            console.log('Found diamond mesh:', child.name);
            diamondCount++;
            
            const dimensions = calculateObjectDimensions(child)
            
            let key = `${dimensions.sizeX} x ${dimensions.sizeY}`
            if (!diamonds.has(key)) {
                diamonds.set(key, {
                    count: 0,
                    sizeX: dimensions.sizeX,
                    sizeY: dimensions.sizeY,
                    sizeZ: dimensions.sizeZ,
                    shape: child.name
                });
            }
            diamonds.get(key).count++
        }
    });

    console.log(`Found ${diamondCount} diamonds`);
    
    if (diamondCount === 0) {
        container.innerHTML = `
            <div class="bg-yellow-50 p-4 rounded-lg">
                <p class="text-yellow-800">No diamonds found in the model. Make sure your model contains meshes with "diamond" in their names.</p>
            </div>
        `;
        return;
    }

    currentDiamondsMap = diamonds;

    // Create HTML content
    let html = `
        <div class="mb-6">
            <div class="bg-violet-50 rounded-lg p-4 mb-4">
                <p class="text-lg font-semibold text-violet-900">
                    Total Diamonds: ${Array.from(diamonds.values()).reduce((sum, entry) => sum + entry.count, 0)}
                </p>
            </div>
        </div>
    `;
    
    // Sort sizes from largest to smallest
    const sortedSizes = Array.from(diamonds.keys()).sort((a, b) => {
        const sizeA = parseFloat(a.split('x')[0])
        const sizeB = parseFloat(b.split('x')[0])
        return sizeB - sizeA
    });

    // Create grid layout for diamond groups
    html += '<div class="space-y-4 diamond-list">';

    for (const sizeKey of sortedSizes) {
        const entry = diamonds.get(sizeKey)
        const idStr = `diamond-group-${sizeKey.replace(/[^a-zA-Z0-9]/g, '-')}`
        
        html += `
            <div id="${idStr}" class="diamond-group-item bg-gray-50 rounded-lg p-4 border border-gray-200 cursor-pointer transition-colors hover:bg-gray-100" data-size-key="${sizeKey}">
                <div class="flex justify-between items-center mb-3">
                    <h3 class="text-gray-900 font-medium">Size: ${sizeKey} mm</h3>
                    <span class="bg-violet-100 text-violet-800 px-2 py-1 rounded text-sm font-medium">
                        Count: ${entry.count}
                    </span>
                </div>
                <div class="grid grid-cols-2 gap-2 text-sm text-gray-600">
                    <div>Height: ${entry.sizeZ} mm</div>
                    ${Math.abs(parseFloat(entry.sizeX) - parseFloat(entry.sizeY)) < 0.1 ? 
                        `<div>Diameter: ${entry.sizeX} mm</div>` : ''}
                    ${entry.shape ? `<div class="col-span-2">Shape: ${entry.shape}</div>` : ''}
                </div>
            </div>
        `;
    }

    html += '</div>';

    console.log('Updating container with HTML');
    // Update the container content
    container.innerHTML = html;

    // Add hover event listeners for highlighting
    const groupItems = container.querySelectorAll('.diamond-group-item');
    groupItems.forEach(item => {
        item.addEventListener('mouseenter', () => {
            const sizeKey = item.getAttribute('data-size-key');
            highlightDiamondGroup(sizeKey);
        });
        item.addEventListener('mouseleave', () => {
            clearHighlighting();
        });
    });

    console.log('Summary panel created successfully');
}

// Global listener setup for export and filtering
document.getElementById('btn-export-csv').addEventListener('click', () => {
    if (currentDiamondsMap.size === 0) {
        alert("No diamond data to export.");
        return;
    }

    let csvContent = "data:text/csv;charset=utf-8,";
    // Header
    csvContent += "Size (mm),Count,Height (mm),Shape\n";

    Array.from(currentDiamondsMap.entries()).forEach(([sizeKey, entry]) => {
        csvContent += `"${sizeKey}",${entry.count},${entry.sizeZ},"${entry.shape || ''}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "diamond_summary.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
});

document.getElementById('summary-search').addEventListener('input', (event) => {
    const query = event.target.value.toLowerCase();
    const items = document.querySelectorAll('.diamond-group-item');
    items.forEach(item => {
        const text = item.innerText.toLowerCase();
        if (text.includes(query)) {
            item.style.display = 'block';
        } else {
            item.style.display = 'none';
        }
    });
});

function highlightDiamondGroup(sizeKey) {
    scene.traverse((child) => {
        if (child.isMesh && child.name.toLowerCase().includes('diamond')) {
            const dimensions = calculateObjectDimensions(child);
            const childSizeKey = `${dimensions.sizeX} x ${dimensions.sizeY}`;

            if (childSizeKey === sizeKey) {
                if (!child.userData.originalMaterial) {
                    child.userData.originalMaterial = child.material.clone();
                }
                const highlightMaterial = child.userData.originalMaterial.clone();
                highlightMaterial.emissive.setHex(0x0066ff);
                highlightMaterial.emissiveIntensity = 0.5;
                child.material = highlightMaterial;
            } else {
                if (child.userData.originalMaterial) {
                    child.material = child.userData.originalMaterial;
                }
            }
        }
    });
}

function clearHighlighting() {
    scene.traverse((child) => {
        if (child.isMesh && child.userData.originalMaterial) {
            child.material = child.userData.originalMaterial;
        }
    });
}

// Calculate dimensions for an object based on its geometry and type
function calculateObjectDimensions(object) {
    if (!object || !object.geometry || !object.geometry.attributes || !object.geometry.attributes.position) {
        return {
            sizeX: '0.00',
            sizeY: '0.00',
            sizeZ: '0.00',
            isRound: false,
            vertexCount: 0,
            triangleCount: 0
        }
    }

    object.geometry.computeBoundingBox();
    const bbox = object.geometry.boundingBox;

    // Get the global scale of the object
    const scale = new THREE.Vector3();
    object.matrixWorld.decompose(new THREE.Vector3(), new THREE.Quaternion(), scale);

    // Calculate raw dimensions using local bounding box and global scale
    // This provides OBB-like measurements regardless of object rotation
    const sizeX = (Math.abs(bbox.max.x - bbox.min.x) * scale.x).toFixed(2)
    const sizeY = (Math.abs(bbox.max.y - bbox.min.y) * scale.y).toFixed(2)
    const sizeZ = (Math.abs(bbox.max.z - bbox.min.z) * scale.z).toFixed(2)
    
    let displaySizeX = sizeX
    let displaySizeY = sizeY
    
    // Adjust dimensions based on object type
    const lowerName = object.name.toLowerCase()
    if (lowerName.includes('round')) {
        const diameter = Math.max(parseFloat(sizeX), parseFloat(sizeY)).toFixed(2)
        displaySizeX = displaySizeY = diameter
    } else if (lowerName.includes('emerald')) {
        const rawWidth = parseFloat(sizeX)
        const rawHeight = parseFloat(sizeY)
        displaySizeX = Math.max(rawWidth, rawHeight).toFixed(2)
        displaySizeY = Math.min(rawWidth, rawHeight).toFixed(2)
    }

    return {
        sizeX: displaySizeX,
        sizeY: displaySizeY,
        sizeZ,
        isRound: lowerName.includes('round'),
        vertexCount: object.geometry.attributes.position.count,
        triangleCount: object.geometry.index ? 
            Math.floor(object.geometry.index.count / 3) : 
            Math.floor(object.geometry.attributes.position.count / 3)
    }
}

function onWindowResize() {
    const container = document.getElementById('viewer')
    const rect = container.getBoundingClientRect()
    const width = rect.width
    const height = rect.height
    
    camera.aspect = width / height
    camera.updateProjectionMatrix()
    
    renderer.setSize(width, height)
}

function onMouseClick(event) {
    event.preventDefault()
    
    // Get the canvas-relative coordinates
    const rect = renderer.domElement.getBoundingClientRect()
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

    // Update the picking ray with the camera and mouse position
    raycaster.setFromCamera(mouse, camera)

    // Calculate objects intersecting the picking ray
    const intersects = raycaster.intersectObjects(scene.children, true)

    // Reset all materials
    scene.traverse((child) => {
        if (child.isMesh && child.userData.originalMaterial) {
            child.material = child.userData.originalMaterial
        }
    })

    const propertiesContainer = document.getElementById('object-properties-container')

    if (intersects.length > 0) {
        const object = intersects[0].object
        if (object.isMesh) {
            // Store original material if not already stored
            if (!object.userData.originalMaterial) {
                object.userData.originalMaterial = object.material.clone()
            }
            
            // Create highlighted material
            const highlightMaterial = object.userData.originalMaterial.clone()
            highlightMaterial.emissive.setHex(0x666600)
            highlightMaterial.emissiveIntensity = 0.5
            
            // Apply highlighted material
            object.material = highlightMaterial
            
            console.log('Selected object:', object.name)

            if (!propertiesContainer) return;
            
            let html = '<div class="space-y-4">'
            
            // Add name if available
            if (object.name) {
                html += `
                    <div class="border-b pb-2">
                        <p class="text-sm font-semibold text-gray-900 break-words">${object.name}</p>
                    </div>`
            }

            // Add geometry measurements
            if (object.geometry && object.geometry.attributes && object.geometry.attributes.position) {
                html += '<div class="space-y-2">'
                html += '<h4 class="text-xs font-semibold uppercase tracking-wide text-gray-500">Geometry</h4>'
                
                const dimensions = calculateObjectDimensions(object)
                
                html += `
                    <div class="grid grid-cols-2 gap-x-2 gap-y-1 text-sm">
                        <div class="text-gray-500">Vertices:</div>
                        <div class="text-gray-900 text-right">${dimensions.vertexCount.toLocaleString()}</div>
                        
                        <div class="text-gray-500">Triangles:</div>
                        <div class="text-gray-900 text-right">${dimensions.triangleCount.toLocaleString()}</div>
                        
                        <div class="text-gray-500">Size X:</div>
                        <div class="text-gray-900 text-right">${dimensions.sizeX} mm</div>
                        
                        <div class="text-gray-500">Size Y:</div>
                        <div class="text-gray-900 text-right">${dimensions.sizeY} mm</div>
                        
                        <div class="text-gray-500">Size Z:</div>
                        <div class="text-gray-900 text-right">${dimensions.sizeZ} mm</div>`

                if (dimensions.isRound) {
                    html += `
                        <div class="text-gray-500">Diameter:</div>
                        <div class="text-gray-900 text-right">${dimensions.sizeX} mm</div>`
                }

                html += '</div></div>'
            }

            // Add material properties
            if (object.material) {
                html += `
                    <div class="space-y-2 mt-4">
                        <h4 class="text-xs font-semibold uppercase tracking-wide text-gray-500">Material</h4>
                        <div class="grid grid-cols-2 gap-x-2 gap-y-1 text-sm">
                            <div class="text-gray-500">Color:</div>
                            <div class="text-gray-900 text-right">#${object.material.color.getHexString()}</div>
                            
                            <div class="text-gray-500">Metalness:</div>
                            <div class="text-gray-900 text-right">${object.material.metalness}</div>
                            
                            <div class="text-gray-500">Roughness:</div>
                            <div class="text-gray-900 text-right">${object.material.roughness}</div>
                            
                            <div class="text-gray-500">Opacity:</div>
                            <div class="text-gray-900 text-right">${object.material.opacity}</div>
                        </div>
                    </div>`
            }

            html += '</div>'
            propertiesContainer.innerHTML = html
        }
    } else {
        if (propertiesContainer) {
            propertiesContainer.innerHTML = `
                <div class="text-sm text-gray-500">
                    Select an object in the viewer to see its properties.
                </div>
            `;
        }
    }
}

function animate() {
    requestAnimationFrame(animate)
    controls.update()
    renderer.render(scene, camera)
}

// Start the application
init()
