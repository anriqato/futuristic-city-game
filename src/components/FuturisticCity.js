import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

const FuturisticCity = () => {
  const mountRef = useRef(null);
  const [score, setScore] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [hoverBuilding, setHoverBuilding] = useState(null);

  useEffect(() => {
    if (!gameStarted) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050a30);
    
    // Camera setup
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 40, 100);
    camera.lookAt(0, 0, 0);
    
    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth * 0.8, window.innerHeight * 0.8);
    renderer.shadowMap.enabled = true;
    mountRef.current.appendChild(renderer.domElement);
    
    // Lights
    const ambientLight = new THREE.AmbientLight(0x404040, 2);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(50, 100, 50);
    directionalLight.castShadow = true;
    scene.add(directionalLight);
    
    // Grid of buildings
    const cityGroup = new THREE.Group();
    scene.add(cityGroup);
    
    const buildingColors = [
      0x00ffff, // Cyan
      0xff00ff, // Magenta
      0x7b68ee, // Medium slate blue
      0x1e90ff, // Dodger blue
      0x32cd32  // Lime green
    ];
    
    const buildings = [];
    const gridSize = 10;
    const spacing = 15;
    
    for (let x = -gridSize/2; x < gridSize/2; x++) {
      for (let z = -gridSize/2; z < gridSize/2; z++) {
        const height = Math.random() * 30 + 10;
        const width = Math.random() * 5 + 5;
        const depth = Math.random() * 5 + 5;
        
        const geometry = new THREE.BoxGeometry(width, height, depth);
        
        // Create emissive material for glow effect
        const colorIndex = Math.floor(Math.random() * buildingColors.length);
        const color = buildingColors[colorIndex];
        
        const material = new THREE.MeshStandardMaterial({
          color: color,
          emissive: color,
          emissiveIntensity: 0.2,
          metalness: 0.8,
          roughness: 0.2
        });
        
        const building = new THREE.Mesh(geometry, material);
        building.position.set(x * spacing, height/2, z * spacing);
        building.castShadow = true;
        building.receiveShadow = true;
        
        // Store original color and position for interactivity
        building.userData = {
          originalColor: color,
          originalHeight: height,
          isInteractive: Math.random() > 0.7, // Only some buildings are interactive
          points: Math.floor(Math.random() * 10) + 1
        };
        
        buildings.push(building);
        cityGroup.add(building);
      }
    }
    
    // Ground
    const groundGeometry = new THREE.PlaneGeometry(500, 500);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x0a0a0a,
      roughness: 0.8,
      metalness: 0.2
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
    
    // Grid lines for ground
    const gridHelper = new THREE.GridHelper(200, 50, 0x00ffff, 0x00ffff);
    gridHelper.position.y = 0.1;
    gridHelper.material.opacity = 0.2;
    gridHelper.material.transparent = true;
    scene.add(gridHelper);
    
    // Skybox with stars
    const starGeometry = new THREE.BufferGeometry();
    const starMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.5
    });
    
    const starVertices = [];
    for (let i = 0; i < 10000; i++) {
      const x = (Math.random() - 0.5) * 2000;
      const y = (Math.random() - 0.5) * 2000;
      const z = (Math.random() - 0.5) * 2000;
      starVertices.push(x, y, z);
    }
    
    starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
    const stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);
    
    // Raycaster for mouse interaction
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    
    function onMouseMove(event) {
      // Calculate mouse position in normalized device coordinates
      // (-1 to +1) for both components
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      
      // Update the raycaster
      raycaster.setFromCamera(mouse, camera);
      
      // Calculate objects intersecting the ray
      const intersects = raycaster.intersectObjects(buildings);
      
      // Reset all buildings
      buildings.forEach(building => {
        if (building.userData.isInteractive) {
          building.material.emissiveIntensity = 0.2;
        }
      });
      
      // Highlight hovered building
      if (intersects.length > 0 && intersects[0].object.userData.isInteractive) {
        const hoveredBuilding = intersects[0].object;
        hoveredBuilding.material.emissiveIntensity = 0.5;
        setHoverBuilding({
          points: hoveredBuilding.userData.points,
          position: {
            x: hoveredBuilding.position.x,
            y: hoveredBuilding.position.y,
            z: hoveredBuilding.position.z
          }
        });
      } else {
        setHoverBuilding(null);
      }
    }
    
    function onClick(event) {
      // Update the raycaster
      raycaster.setFromCamera(mouse, camera);
      
      // Calculate objects intersecting the ray
      const intersects = raycaster.intersectObjects(buildings);
      
      if (intersects.length > 0) {
        const clickedBuilding = intersects[0].object;
        
        if (clickedBuilding.userData.isInteractive) {
          // Add points
          setScore(prevScore => prevScore + clickedBuilding.userData.points);
          
          // Visual effect
          clickedBuilding.userData.isInteractive = false;
          clickedBuilding.material.emissive = new THREE.Color(0xffffff);
          clickedBuilding.material.emissiveIntensity = 1;
          
          // Animate building growing
          const targetHeight = clickedBuilding.userData.originalHeight * 1.5;
          const originalY = clickedBuilding.position.y;
          
          // Animation
          const growTween = {
            progress: 0,
            update: function() {
              const scale = 1 + this.progress * 0.5;
              clickedBuilding.scale.y = scale;
              clickedBuilding.position.y = originalY + (clickedBuilding.userData.originalHeight * (scale - 1)) / 2;
            }
          };
          
          // Simple animation loop for the growth
          const animateGrowth = function() {
            growTween.progress += 0.05;
            if (growTween.progress <= 1) {
              growTween.update();
              requestAnimationFrame(animateGrowth);
            }
          };
          
          animateGrowth();
          
          // Reset after a delay
          setTimeout(() => {
            clickedBuilding.material.emissive = new THREE.Color(clickedBuilding.userData.originalColor);
            clickedBuilding.material.emissiveIntensity = 0.2;
            clickedBuilding.scale.y = 1;
            clickedBuilding.position.y = originalY;
            clickedBuilding.userData.isInteractive = true;
          }, 3000);
        }
      }
    }
    
    // Add event listeners
    renderer.domElement.addEventListener('mousemove', onMouseMove, false);
    renderer.domElement.addEventListener('click', onClick, false);
    
    // Rotating camera
    let cameraAngle = 0;
    
    // Animation loop
    function animate() {
      requestAnimationFrame(animate);
      
      // Slowly rotate the camera around the city
      cameraAngle += 0.001;
      camera.position.x = Math.sin(cameraAngle) * 120;
      camera.position.z = Math.cos(cameraAngle) * 120;
      camera.lookAt(0, 0, 0);
      
      // Make buildings pulsate slightly
      buildings.forEach(building => {
        if (building.userData.isInteractive) {
          building.material.emissiveIntensity = 0.2 + Math.sin(Date.now() * 0.001) * 0.1;
        }
      });
      
      renderer.render(scene, camera);
    }
    
    // Start animation
    animate();
    
    // Resize handler
    function handleResize() {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth * 0.8, window.innerHeight * 0.8);
    }
    
    window.addEventListener('resize', handleResize);
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('mousemove', onMouseMove);
      renderer.domElement.removeEventListener('click', onClick);
      mountRef.current && mountRef.current.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, [gameStarted]);
  
  return (
    <div className="flex flex-col items-center w-full min-h-screen bg-black text-white p-4">
      <h1 className="text-4xl font-bold mb-4 text-cyan-400">Neon Cityscape Explorer</h1>
      
      {!gameStarted ? (
        <div className="flex flex-col items-center justify-center bg-gray-900 p-8 rounded-lg mb-6 max-w-md">
          <h2 className="text-2xl mb-4">Welcome to the Future</h2>
          <p className="mb-6 text-center">Explore a vibrant cyberpunk city. Click on glowing buildings to collect points and reveal their energy patterns.</p>
          <button 
            onClick={() => setGameStarted(true)} 
            className="bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-2 px-6 rounded-full transition-colors"
          >
            Start Exploration
          </button>
        </div>
      ) : (
        <>
          <div className="flex justify-between w-full max-w-4xl mb-4">
            <div className="bg-gray-800 p-3 rounded-lg">
              <span className="font-bold text-cyan-400">SCORE:</span> {score}
            </div>
            {hoverBuilding && (
              <div className="bg-gray-800 p-3 rounded-lg">
                <span className="font-bold text-cyan-400">POINTS:</span> {hoverBuilding.points}
              </div>
            )}
          </div>
          
          <div 
            ref={mountRef} 
            className="w-full flex justify-center items-center cursor-crosshair rounded-lg overflow-hidden"
          ></div>
          
          <div className="mt-4 bg-gray-900 p-4 rounded-lg max-w-md text-center">
            <p>Click on glowing buildings to collect energy points. Watch out for special patterns!</p>
          </div>
        </>
      )}
    </div>
  );
};

export default FuturisticCity;