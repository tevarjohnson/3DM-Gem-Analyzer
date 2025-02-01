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
    const containerWidth = container.clientWidth
    const containerHeight = container.clientHeight

    // Setup camera
    camera = new THREE.PerspectiveCamera(65, containerWidth / containerHeight, 0.1, 1000)
    camera.position.set(10, 10, 10)

    // Setup renderer
    renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setSize(containerWidth, containerHeight)
    renderer.shadowMap.enabled = true
    container.appendChild(renderer.domElement)

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
    window.addEventListener('click', onMouseClick, false)

    animate()
}

function setupLights() {
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1)
    scene.add(hemiLight)

    const dirLight = new THREE.DirectionalLight(0xffffff, 1)
    dirLight.position.set(1, 1, 1)
    dirLight.castShadow = true
    scene.add(dirLight)
}

// Handle file selection
async function handleFileSelect(event) {
    const file = event.target.files[0]
    if (!file) return

    // Show loader
    const loader = document.getElementById('loader')
    if (loader) loader.style.display = 'block'

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
                if (loader) loader.style.display = 'none'

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

                // Center camera on object
                const box = new THREE.Box3().setFromObject(object)
                const center = box.getCenter(new THREE.Vector3())
                const size = box.getSize(new THREE.Vector3())
                const maxDim = Math.max(size.x, size.y, size.z)
                
                camera.position.set(
                    center.x + maxDim * 2,
                    center.y + maxDim * 2,
                    center.z + maxDim * 2
                )
                controls.target.copy(center)
                camera.lookAt(center)
                controls.update()

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
            },
            error => {
                console.error('Error loading 3DM:', error)
                if (loader) loader.style.display = 'none'
                
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
        if (loader) loader.style.display = 'none'
        
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
            console.log('Found diamond mesh:', child.name);
            diamondCount++;
            
            const positions = child.geometry.attributes.position.array;
            let minX = Infinity, maxX = -Infinity;
            let minY = Infinity, maxY = -Infinity;
            let minZ = Infinity, maxZ = -Infinity;
            
            for (let i = 0; i < positions.length; i += 3) {
                const vertex = new THREE.Vector3(
                    positions[i],
                    positions[i + 1],
                    positions[i + 2]
                ).applyMatrix4(child.matrixWorld);
                minX = Math.min(minX, vertex.x);
                maxX = Math.max(maxX, vertex.x);
                minY = Math.min(minY, vertex.y);
                maxY = Math.max(maxY, vertex.y);
                minZ = Math.min(minZ, vertex.z);
                maxZ = Math.max(maxZ, vertex.z);
            }
        
            let sizeX, sizeY, sizeZ, shape, key;
            sizeZ = roundToTenth(maxZ - minZ);
            const lowerName = child.name.toLowerCase();
        
            if (lowerName.includes('emerald')) {
                const rawWidth = maxX - minX;
                const rawHeight = maxY - minY;
                sizeX = roundToTenth(Math.max(rawWidth, rawHeight));
                sizeY = roundToTenth(Math.min(rawWidth, rawHeight));
                shape = child.name;
                key = `${sizeX} x ${sizeY}`;
            } else if (lowerName.includes('round')) {
                const diameter = roundToTenth(Math.max(maxX - minX, maxY - minY));
                sizeX = sizeY = diameter;
                shape = child.name;
                key = `${diameter} x ${diameter}`;
            } else {
                sizeX = roundToTenth(maxX - minX);
                sizeY = roundToTenth(maxY - minY);
                shape = child.name;
                key = `${sizeX} x ${sizeY}`;
            }
        
            if (!diamonds.has(key)) {
                diamonds.set(key, {
                    count: 0,
                    sizeX,
                    sizeY,
                    sizeZ,
                    shape
                });
            }
            diamonds.get(key).count++;
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
    html += '<div class="space-y-4">';

    for (const sizeKey of sortedSizes) {
        const entry = diamonds.get(sizeKey)
        
        html += `
            <div class="bg-gray-50 rounded-lg p-4 border border-gray-200">
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
    console.log('Summary panel created successfully');
}

function onMouseClick(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1

    raycaster.setFromCamera(mouse, camera)

    // Get all meshes in the scene
    const meshes = []
    scene.traverse((child) => {
        if (child.isMesh) {
            // Reset material
            child.material = defaultMaterial.clone()
            if (child.userData.attributes?.drawColor) {
                const color = child.userData.attributes.drawColor
                child.material.color.setRGB(
                    color.r / 255,
                    color.g / 255,
                    color.b / 255
                )
            }
            meshes.push(child)
        }
    })

    const intersects = raycaster.intersectObjects(meshes, true)

    // Remove existing info container
    let container = document.getElementById('container')
    if (container) container.remove()

    if (intersects.length > 0) {
        const object = intersects[0].object
        
        // Highlight selected object
        object.material = selectedMaterial.clone()

        // Create info container
        container = document.createElement('div')
        container.id = 'container'
        container.style.position = 'absolute'
        container.style.top = '10px'
        container.style.right = '10px'
        container.style.backgroundColor = 'rgba(0, 0, 0, 0.8)'
        container.style.color = 'white'
        container.style.padding = '10px'
        container.style.borderRadius = '5px'
        container.style.maxWidth = '300px'

        let html = '<h3>Object Information</h3>'

        // Add name if available
        if (object.name) {
            html += `<p><strong>Name:</strong> ${object.name}</p>`
        }

        // Add geometry measurements
        if (object.geometry) {
            html += '<h4>Geometry Measurements</h4>'
            
            const vertexCount = object.geometry.attributes.position.count
            const triangleCount = object.geometry.index ? 
                object.geometry.index.count / 3 : 
                object.geometry.attributes.position.count / 3

            // Get the geometry vertices
            const positions = object.geometry.attributes.position.array
            let minX = Infinity, minY = Infinity, minZ = Infinity
            let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity

            // Calculate bounds from vertices
            for (let i = 0; i < positions.length; i += 3) {
                const vertex = new THREE.Vector3(positions[i], positions[i + 1], positions[i + 2])
                // Apply object's transformation
                vertex.applyMatrix4(object.matrixWorld)
                
                minX = Math.min(minX, vertex.x)
                minY = Math.min(minY, vertex.y)
                minZ = Math.min(minZ, vertex.z)
                maxX = Math.max(maxX, vertex.x)
                maxY = Math.max(maxY, vertex.y)
                maxZ = Math.max(maxZ, vertex.z)
            }

            // Calculate dimensions
            const sizeX = Math.abs(maxX - minX).toFixed(2)
            const sizeY = Math.abs(maxY - minY).toFixed(2)
            const sizeZ = Math.abs(maxZ - minZ).toFixed(2)
            
            html += `<p><strong>Vertices:</strong> ${vertexCount.toLocaleString()}</p>`
            html += `<p><strong>Triangles:</strong> ${Math.floor(triangleCount).toLocaleString()}</p>`
            html += `<p><strong>Size X:</strong> ${sizeX} mm</p>`
            html += `<p><strong>Size Y:</strong> ${sizeY} mm</p>`
            html += `<p><strong>Size Z:</strong> ${sizeZ} mm</p>`

            // Add diameter for round objects (if X and Y are very close)
            if (Math.abs(parseFloat(sizeX) - parseFloat(sizeY)) < 0.1) {
                html += `<p><strong>Diameter:</strong> ${sizeX} mm</p>`
            }

            // Try to get size from user strings if available
            if (object.userData.attributes?.userStrings) {
                for (const [key, value] of object.userData.attributes.userStrings) {
                    if (key.toLowerCase().includes('size') || 
                        key.toLowerCase().includes('diameter') ||
                        key.toLowerCase().includes('width') ||
                        key.toLowerCase().includes('height')) {
                        html += `<p><strong>Rhino ${key}:</strong> ${value}</p>`
                    }
                }
            }
        }

        // Add material properties
        html += '<h4>Material Properties</h4>'
        if (object.material) {
            html += `<p><strong>Color:</strong> #${object.material.color.getHexString()}</p>`
            html += `<p><strong>Metalness:</strong> ${object.material.metalness}</p>`
            html += `<p><strong>Roughness:</strong> ${object.material.roughness}</p>`
            html += `<p><strong>Opacity:</strong> ${object.material.opacity}</p>`
        }

        // Add user strings if available
        if (object.userData.attributes?.userStrings) {
            html += '<h4>Properties</h4>'
            for (const [key, value] of object.userData.attributes.userStrings) {
                if (!key.toLowerCase().includes('size') && 
                    !key.toLowerCase().includes('diameter') &&
                    !key.toLowerCase().includes('width') &&
                    !key.toLowerCase().includes('height')) {
                    html += `<p><strong>${key}:</strong> ${value}</p>`
                }
            }
        }

        container.innerHTML = html
        document.body.appendChild(container)
    }
}

function onWindowResize() {
    const container = document.getElementById('viewer')
    if (!container) return
    
    const containerWidth = container.clientWidth
    const containerHeight = container.clientHeight
    
    camera.aspect = containerWidth / containerHeight
    camera.updateProjectionMatrix()
    renderer.setSize(containerWidth, containerHeight)
}

function animate() {
    requestAnimationFrame(animate)
    controls.update()
    renderer.render(scene, camera)
}

// Start the application
init()
