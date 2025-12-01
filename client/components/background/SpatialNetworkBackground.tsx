"use client"

import React, { useEffect, useRef } from 'react'
import * as THREE from 'three'

interface SpatialNetworkBackgroundProps {
  particleCount?: number
  connectionDistance?: number
  primaryColor?: string  // Main color for nodes and edges (e.g., "#1B3139")
  secondaryColor?: string // Optional secondary color for variation
  particleOpacity?: number // 0-1
  lineOpacity?: number // 0-1
  particleSize?: number // 1-5
  lineWidth?: number // 0.5-3
  animationSpeed?: number // 0.5-2
}

export function SpatialNetworkBackground({
  particleCount = 60,
  connectionDistance = 60,
  primaryColor = '#1B3139',
  secondaryColor = '#1B3139',
  particleOpacity = 0.4,
  lineOpacity = 0.5,
  particleSize = 2.5,
  lineWidth = 1,
  animationSpeed = 1
}: SpatialNetworkBackgroundProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<{
    scene: THREE.Scene
    camera: THREE.PerspectiveCamera
    renderer: THREE.WebGLRenderer
    particles: THREE.Points
    lines: THREE.LineSegments
    particlePositions: Float32Array
    particleVelocities: Float32Array
    animationId: number | null
  } | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) return

    const container = containerRef.current
    const width = container.clientWidth
    const height = container.clientHeight

    // Convert hex colors to THREE.Color
    const primaryThreeColor = new THREE.Color(primaryColor)
    const secondaryThreeColor = new THREE.Color(secondaryColor)

    // Scene setup
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(60, width / height, 1, 1000)
    camera.position.z = 150

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance'
    })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(width, height)
    container.appendChild(renderer.domElement)

    // Subtle fog for depth
    scene.fog = new THREE.FogExp2(0x000000, 0.0015)

    // Particle system
    const particlePositions = new Float32Array(particleCount * 3)
    const particleSizes = new Float32Array(particleCount)
    const particleVelocities = new Float32Array(particleCount * 3)

    // Initialize particles in 3D volume
    const baseVelocity = 0.035 * animationSpeed
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3
      particlePositions[i3] = (Math.random() - 0.5) * 200     // x
      particlePositions[i3 + 1] = (Math.random() - 0.5) * 200 // y
      particlePositions[i3 + 2] = (Math.random() - 0.5) * 100 // z

      particleSizes[i] = Math.random() * (particleSize * 0.6) + particleSize * 0.6 // Variable size based on prop

      particleVelocities[i3] = (Math.random() - 0.5) * baseVelocity
      particleVelocities[i3 + 1] = (Math.random() - 0.5) * baseVelocity
      particleVelocities[i3 + 2] = (Math.random() - 0.5) * baseVelocity
    }

    const particleGeometry = new THREE.BufferGeometry()
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3))
    particleGeometry.setAttribute('size', new THREE.BufferAttribute(particleSizes, 1))

    // Custom particle shader material
    const particleMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        particleColor: { value: primaryThreeColor },
        particleOpacity: { value: particleOpacity }
      },
      vertexShader: `
        attribute float size;
        uniform vec3 particleColor;
        varying vec3 vColor;

        void main() {
          vColor = particleColor;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (400.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform float particleOpacity;
        varying vec3 vColor;

        void main() {
          vec2 center = gl_PointCoord - vec2(0.5);
          float dist = length(center);

          // Core glow - subtle
          float alpha = smoothstep(0.5, 0.0, dist) * 0.4;

          // Outer halo - gentle
          float halo = smoothstep(0.5, 0.0, dist) * 0.25;

          // Subtle pulse
          float pulse = sin(time * 0.5) * 0.1 + 0.9;

          alpha = (alpha + halo) * pulse * particleOpacity;

          if (alpha < 0.01) discard;

          gl_FragColor = vec4(vColor, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })

    const particles = new THREE.Points(particleGeometry, particleMaterial)
    scene.add(particles)

    // Connection lines
    const maxConnections = particleCount * 10
    const linePositions = new Float32Array(maxConnections * 6) // 2 points per line
    const lineColors = new Float32Array(maxConnections * 6) // RGB for each point

    const lineGeometry = new THREE.BufferGeometry()
    lineGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3))
    lineGeometry.setAttribute('color', new THREE.BufferAttribute(lineColors, 3))

    const lineMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        lineColor: { value: primaryThreeColor },
        lineOpacity: { value: lineOpacity }
      },
      vertexShader: `
        attribute vec3 color;
        uniform vec3 lineColor;
        varying vec3 vColor;
        varying float vAlpha;

        void main() {
          vColor = lineColor;
          vAlpha = color.r; // Store alpha in red channel
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;
        uniform float lineOpacity;

        void main() {
          gl_FragColor = vec4(vColor, vAlpha * lineOpacity);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })

    const lines = new THREE.LineSegments(lineGeometry, lineMaterial)
    scene.add(lines)

    // Store refs
    sceneRef.current = {
      scene,
      camera,
      renderer,
      particles,
      lines,
      particlePositions,
      particleVelocities,
      animationId: null
    }

    // Animation loop
    let time = 0
    const animate = () => {
      if (!sceneRef.current) return

      time += 0.016 // ~60fps

      const {
        camera,
        renderer,
        scene,
        particles,
        lines,
        particlePositions,
        particleVelocities
      } = sceneRef.current

      // Update particle positions
      let lineIndex = 0
      const linePositionsArray = lineGeometry.attributes.position.array as Float32Array
      const lineColorsArray = lineGeometry.attributes.color.array as Float32Array

      for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3

        // Update position
        particlePositions[i3] += particleVelocities[i3]
        particlePositions[i3 + 1] += particleVelocities[i3 + 1]
        particlePositions[i3 + 2] += particleVelocities[i3 + 2]

        // Wrap at boundaries
        if (Math.abs(particlePositions[i3]) > 100) particleVelocities[i3] *= -1
        if (Math.abs(particlePositions[i3 + 1]) > 100) particleVelocities[i3 + 1] *= -1
        if (Math.abs(particlePositions[i3 + 2]) > 50) particleVelocities[i3 + 2] *= -1

        // Check connections with other particles
        for (let j = i + 1; j < particleCount; j++) {
          const j3 = j * 3
          const dx = particlePositions[i3] - particlePositions[j3]
          const dy = particlePositions[i3 + 1] - particlePositions[j3 + 1]
          const dz = particlePositions[i3 + 2] - particlePositions[j3 + 2]
          const distance = Math.sqrt(dx * dx + dy * dy + dz * dz)

          if (distance < connectionDistance && lineIndex < maxConnections) {
            // Add line
            linePositionsArray[lineIndex * 6] = particlePositions[i3]
            linePositionsArray[lineIndex * 6 + 1] = particlePositions[i3 + 1]
            linePositionsArray[lineIndex * 6 + 2] = particlePositions[i3 + 2]
            linePositionsArray[lineIndex * 6 + 3] = particlePositions[j3]
            linePositionsArray[lineIndex * 6 + 4] = particlePositions[j3 + 1]
            linePositionsArray[lineIndex * 6 + 5] = particlePositions[j3 + 2]

            // Fade with distance
            const alpha = 1.0 - (distance / connectionDistance)
            lineColorsArray[lineIndex * 6] = alpha
            lineColorsArray[lineIndex * 6 + 1] = alpha
            lineColorsArray[lineIndex * 6 + 2] = alpha
            lineColorsArray[lineIndex * 6 + 3] = alpha
            lineColorsArray[lineIndex * 6 + 4] = alpha
            lineColorsArray[lineIndex * 6 + 5] = alpha

            lineIndex++
          }
        }
      }

      // Update geometries
      particleGeometry.attributes.position.needsUpdate = true
      lineGeometry.setDrawRange(0, lineIndex * 2)
      lineGeometry.attributes.position.needsUpdate = true
      lineGeometry.attributes.color.needsUpdate = true

      // Camera gentle drift - calm but noticeable
      camera.position.x = Math.sin(time * 0.03) * 10
      camera.position.y = Math.cos(time * 0.022) * 10
      camera.lookAt(scene.position)

      // Particle field slow rotation - calm movement
      particles.rotation.y += 0.00015
      particles.rotation.x += 0.00008

      // Update shader uniforms
      ;(particles.material as THREE.ShaderMaterial).uniforms.time.value = time
      ;(lines.material as THREE.ShaderMaterial).uniforms.time.value = time

      renderer.render(scene, camera)
      sceneRef.current.animationId = requestAnimationFrame(animate)
    }

    animate()

    // Handle resize
    const handleResize = () => {
      if (!containerRef.current || !sceneRef.current) return

      const width = containerRef.current.clientWidth
      const height = containerRef.current.clientHeight

      sceneRef.current.camera.aspect = width / height
      sceneRef.current.camera.updateProjectionMatrix()
      sceneRef.current.renderer.setSize(width, height)
    }

    window.addEventListener('resize', handleResize)

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize)

      if (sceneRef.current) {
        if (sceneRef.current.animationId !== null) {
          cancelAnimationFrame(sceneRef.current.animationId)
        }

        sceneRef.current.renderer.dispose()
        particleGeometry.dispose()
        particleMaterial.dispose()
        lineGeometry.dispose()
        lineMaterial.dispose()

        if (container.contains(sceneRef.current.renderer.domElement)) {
          container.removeChild(sceneRef.current.renderer.domElement)
        }
      }
    }
  }, [particleCount, connectionDistance, primaryColor, secondaryColor, particleOpacity, lineOpacity, particleSize, lineWidth, animationSpeed])

  return (
    <div
      ref={containerRef}
      className="absolute inset-0"
      style={{
        pointerEvents: 'none',
        zIndex: 0,
        isolation: 'isolate'
      }}
    />
  )
}
