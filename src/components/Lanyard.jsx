/* eslint-disable react/no-unknown-property */
import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, extend, useFrame } from '@react-three/fiber'
import { Environment, Lightformer, useGLTF, useTexture } from '@react-three/drei'
import {
  BallCollider,
  CuboidCollider,
  Physics,
  RigidBody,
  useRopeJoint,
  useSphericalJoint,
} from '@react-three/rapier'
import { MeshLineGeometry, MeshLineMaterial } from 'meshline'
import * as THREE from 'three'
import cardGLB from '../assets/lanyard/card.glb'
import defaultLanyard from '../assets/lanyard/lanyard.png'
import './Lanyard.css'

extend({ MeshLineGeometry, MeshLineMaterial })

const BLANK_PIXEL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
const FRONT_UV_RECT = { x: 0, y: 0, w: 0.5, h: 0.755 }
const BACK_UV_RECT = { x: 0.5, y: 0, w: 0.5, h: 0.757 }

function Band({
  maxSpeed = 50,
  minSpeed = 0,
  isMobile = false,
  cardScale = 2.25,
  verticalOffset = 0,
  frontImage = null,
  backImage = null,
  imageFit = 'cover',
  lanyardImage = null,
  lanyardWidth = 1,
  onReady = null,
}) {
  const band = useRef()
  const fixed = useRef()
  const j1 = useRef()
  const j2 = useRef()
  const j3 = useRef()
  const card = useRef()
  const vec = useMemo(() => new THREE.Vector3(), [])
  const ang = useMemo(() => new THREE.Vector3(), [])
  const rot = useMemo(() => new THREE.Vector3(), [])
  const dir = useMemo(() => new THREE.Vector3(), [])
  const segmentProps = {
    type: 'dynamic',
    canSleep: true,
    colliders: false,
    angularDamping: 4,
    linearDamping: 4,
  }
  const { nodes, materials } = useGLTF(cardGLB)
  const texture = useTexture(lanyardImage || defaultLanyard)
  const frontTex = useTexture(frontImage || BLANK_PIXEL)
  const backTex = useTexture(backImage || BLANK_PIXEL)
  const cardScaleRatio = cardScale / 2.25

  const cardMap = useMemo(() => {
    const baseMap = materials.base.map
    if (!frontImage && !backImage) return baseMap

    const baseImg = baseMap.image
    const width = baseImg.width
    const height = baseImg.height
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) return baseMap
    context.drawImage(baseImg, 0, 0, width, height)
    context.imageSmoothingEnabled = false

    const drawFitted = (image, rect) => {
      const rx = rect.x * width
      const ry = rect.y * height
      const rw = rect.w * width
      const rh = rect.h * height
      const pickScale = imageFit === 'contain' ? Math.min : Math.max
      const scale = pickScale(rw / image.width, rh / image.height)
      const drawWidth = image.width * scale
      const drawHeight = image.height * scale
      const dx = rx + (rw - drawWidth) / 2
      const dy = ry + (rh - drawHeight) / 2
      context.save()
      context.beginPath()
      context.rect(rx, ry, rw, rh)
      context.clip()
      context.drawImage(image, dx, dy, drawWidth, drawHeight)
      context.restore()
    }

    if (frontImage && frontTex.image) drawFitted(frontTex.image, FRONT_UV_RECT)
    if (backImage && backTex.image) drawFitted(backTex.image, BACK_UV_RECT)

    const composite = new THREE.CanvasTexture(canvas)
    composite.colorSpace = THREE.SRGBColorSpace
    composite.flipY = baseMap.flipY
    composite.anisotropy = 16
    composite.needsUpdate = true
    return composite
  }, [frontImage, backImage, imageFit, frontTex, backTex, materials.base.map])

  useEffect(
    () => () => {
      if (cardMap !== materials.base.map) cardMap.dispose()
    },
    [cardMap, materials.base.map],
  )

  const [curve] = useState(
    () =>
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(),
        new THREE.Vector3(),
        new THREE.Vector3(),
        new THREE.Vector3(),
      ]),
  )
  const [dragged, setDragged] = useState(false)
  const [hovered, setHovered] = useState(false)

  useRopeJoint(fixed, j1, [[0, 0, 0], [0, 0, 0], 1])
  useRopeJoint(j1, j2, [[0, 0, 0], [0, 0, 0], 1])
  useRopeJoint(j2, j3, [[0, 0, 0], [0, 0, 0], 1])
  useSphericalJoint(j3, card, [[0, 0, 0], [0, 1.5 * cardScaleRatio, 0]])

  useEffect(() => {
    if (!hovered) return undefined
    document.body.style.cursor = dragged ? 'grabbing' : 'grab'
    return () => {
      document.body.style.cursor = 'auto'
    }
  }, [hovered, dragged])

  useEffect(() => {
    onReady?.(true)
  }, [onReady])

  useFrame((state, delta) => {
    if (dragged) {
      vec.set(state.pointer.x, state.pointer.y, 0.5).unproject(state.camera)
      dir.copy(vec).sub(state.camera.position).normalize()
      vec.add(dir.multiplyScalar(state.camera.position.length()))
      ;[card, j1, j2, j3, fixed].forEach((ref) => ref.current?.wakeUp())
      card.current?.setNextKinematicTranslation({
        x: vec.x - dragged.x,
        y: vec.y - dragged.y,
        z: vec.z - dragged.z,
      })
    }

    if (fixed.current) {
      ;[j1, j2].forEach((ref) => {
        if (!ref.current.lerped) {
          ref.current.lerped = new THREE.Vector3().copy(ref.current.translation())
        }
        const distance = ref.current.lerped.distanceTo(ref.current.translation())
        const clampedDistance = Math.max(0.1, Math.min(1, distance))
        ref.current.lerped.lerp(
          ref.current.translation(),
          delta * (minSpeed + clampedDistance * (maxSpeed - minSpeed)),
        )
      })
      curve.points[0].copy(j3.current.translation())
      curve.points[1].copy(j2.current.lerped)
      curve.points[2].copy(j1.current.lerped)
      curve.points[3].copy(fixed.current.translation())
      band.current.geometry.setPoints(curve.getPoints(isMobile ? 16 : 32))
      ang.copy(card.current.angvel())
      rot.copy(card.current.rotation())
      card.current.setAngvel({ x: ang.x, y: ang.y - rot.y * 0.25, z: ang.z })
    }
  })

  curve.curveType = 'chordal'
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping

  return (
    <>
      <group position={[0, 4 + verticalOffset, 0]}>
        <RigidBody ref={fixed} {...segmentProps} type="fixed" />
        <RigidBody position={[0.5, 0, 0]} ref={j1} {...segmentProps}>
          <BallCollider args={[0.1]} />
        </RigidBody>
        <RigidBody position={[1, 0, 0]} ref={j2} {...segmentProps}>
          <BallCollider args={[0.1]} />
        </RigidBody>
        <RigidBody position={[1.5, 0, 0]} ref={j3} {...segmentProps}>
          <BallCollider args={[0.1]} />
        </RigidBody>
        <RigidBody
          position={[2, 0, 0]}
          ref={card}
          {...segmentProps}
          type={dragged ? 'kinematicPosition' : 'dynamic'}
        >
          <CuboidCollider
            args={[0.8 * cardScaleRatio, 1.125 * cardScaleRatio, 0.01 * cardScaleRatio]}
          />
          <group
            scale={cardScale}
            position={[0, -1.2 * cardScaleRatio, -0.05]}
            onPointerOver={() => setHovered(true)}
            onPointerOut={() => setHovered(false)}
            onPointerUp={(event) => {
              event.target.releasePointerCapture(event.pointerId)
              setDragged(false)
            }}
            onPointerDown={(event) => {
              event.target.setPointerCapture(event.pointerId)
              setDragged(
                new THREE.Vector3().copy(event.point).sub(vec.copy(card.current.translation())),
              )
            }}
          >
            <mesh geometry={nodes.card.geometry}>
              <meshPhysicalMaterial
                map={cardMap}
                map-anisotropy={16}
                clearcoat={isMobile ? 0 : 1}
                clearcoatRoughness={0.15}
                roughness={0.72}
                metalness={0.38}
              />
            </mesh>
            <mesh
              geometry={nodes.clip.geometry}
              material={materials.metal}
              material-roughness={0.3}
            />
            <mesh geometry={nodes.clamp.geometry} material={materials.metal} />
          </group>
        </RigidBody>
      </group>
      <mesh ref={band}>
        <meshLineGeometry />
        <meshLineMaterial
          color="#b18cff"
          depthTest={false}
          resolution={isMobile ? [1000, 2000] : [1000, 1000]}
          useMap
          map={texture}
          repeat={[-4, 1]}
          lineWidth={lanyardWidth}
        />
      </mesh>
    </>
  )
}

export default function Lanyard({
  position = [0, 0, 24],
  gravity = [0, -40, 0],
  fov = 20,
  cardScale = 2.25,
  verticalOffset = 0,
  transparent = true,
  frontImage = null,
  frontImages = null,
  frameDuration = 500,
  backImage = null,
  imageFit = 'cover',
  lanyardImage = null,
  lanyardWidth = 1,
  ariaLabel = '可拖动的身份牌',
}) {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < 768,
  )
  const [frameIndex, setFrameIndex] = useState(0)
  const [playbackReady, setPlaybackReady] = useState(false)
  const expressionFrames = Array.isArray(frontImages) ? frontImages : []
  const activeFrontImage = expressionFrames.length
    ? expressionFrames[frameIndex % expressionFrames.length]
    : frontImage

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    if (!expressionFrames.length) return undefined
    expressionFrames.forEach((frame) => useTexture.preload(frame))
    return undefined
  }, [expressionFrames])

  useEffect(() => {
    if (!expressionFrames.length || !playbackReady) return undefined
    setFrameIndex(0)
    const timer = window.setInterval(() => {
      setFrameIndex((current) => (current + 1) % expressionFrames.length)
    }, frameDuration)
    return () => window.clearInterval(timer)
  }, [expressionFrames, frameDuration, playbackReady])

  return (
    <div className="lanyard-wrapper" aria-label={ariaLabel}>
      <Canvas
        camera={{ position, fov }}
        dpr={[1, isMobile ? 1.35 : 1.75]}
        gl={{ alpha: transparent, antialias: true }}
        onCreated={({ gl }) =>
          gl.setClearColor(new THREE.Color(0x000000), transparent ? 0 : 1)
        }
      >
        <ambientLight intensity={Math.PI} />
        <Physics gravity={gravity} timeStep={isMobile ? 1 / 30 : 1 / 60}>
          <Band
            isMobile={isMobile}
            cardScale={cardScale}
            verticalOffset={verticalOffset}
            frontImage={activeFrontImage}
            backImage={backImage}
            imageFit={imageFit}
            lanyardImage={lanyardImage}
            lanyardWidth={lanyardWidth}
            onReady={setPlaybackReady}
          />
        </Physics>
        <Environment blur={0.75}>
          <Lightformer
            intensity={2}
            color="#c8b5ff"
            position={[0, -1, 5]}
            rotation={[0, 0, Math.PI / 3]}
            scale={[100, 0.1, 1]}
          />
          <Lightformer
            intensity={3}
            color="#ffffff"
            position={[-1, -1, 1]}
            rotation={[0, 0, Math.PI / 3]}
            scale={[100, 0.1, 1]}
          />
          <Lightformer
            intensity={3}
            color="#8d63ff"
            position={[1, 1, 1]}
            rotation={[0, 0, Math.PI / 3]}
            scale={[100, 0.1, 1]}
          />
          <Lightformer
            intensity={10}
            color="#ffffff"
            position={[-10, 0, 14]}
            rotation={[0, Math.PI / 2, Math.PI / 3]}
            scale={[100, 10, 1]}
          />
        </Environment>
      </Canvas>
    </div>
  )
}

useGLTF.preload(cardGLB)
