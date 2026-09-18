import { useEffect, useRef, useState } from 'react'
import { mat4, quat, vec2, vec3 } from 'gl-matrix'
import './InfiniteMenu.css'

const vertexShader = `#version 300 es
uniform mat4 uWorldMatrix;
uniform mat4 uViewMatrix;
uniform mat4 uProjectionMatrix;
uniform vec4 uRotationAxisVelocity;
in vec3 aModelPosition;
in vec2 aModelUvs;
in mat4 aInstanceMatrix;
out vec2 vUvs;
out float vAlpha;
flat out int vInstanceId;
void main() {
  vec4 worldPosition = uWorldMatrix * aInstanceMatrix * vec4(aModelPosition, 1.0);
  vec3 centerPos = (uWorldMatrix * aInstanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  float radius = length(centerPos);
  if (gl_VertexID > 0) {
    vec3 stretchDir = normalize(cross(centerPos, uRotationAxisVelocity.xyz));
    vec3 relativeVertexPos = normalize(worldPosition.xyz - centerPos);
    float strength = dot(stretchDir, relativeVertexPos);
    float invAbsStrength = min(0.0, abs(strength) - 1.0);
    strength = min(0.15, uRotationAxisVelocity.w * 15.0) * sign(strength) * abs(invAbsStrength * invAbsStrength * invAbsStrength + 1.0);
    worldPosition.xyz += stretchDir * strength;
  }
  worldPosition.xyz = radius * normalize(worldPosition.xyz);
  gl_Position = uProjectionMatrix * uViewMatrix * worldPosition;
  vAlpha = smoothstep(0.5, 1.0, normalize(worldPosition.xyz).z) * 0.9 + 0.1;
  vUvs = aModelUvs;
  vInstanceId = gl_InstanceID;
}`

const fragmentShader = `#version 300 es
precision highp float;
uniform sampler2D uTex;
uniform int uItemCount;
uniform int uAtlasSize;
out vec4 outColor;
in vec2 vUvs;
in float vAlpha;
flat in int vInstanceId;
void main() {
  int itemIndex = vInstanceId % uItemCount;
  int cellX = itemIndex % uAtlasSize;
  int cellY = itemIndex / uAtlasSize;
  vec2 cellSize = vec2(1.0) / float(uAtlasSize);
  vec2 st = vec2(vUvs.x, 1.0 - vUvs.y) * cellSize + vec2(float(cellX), float(cellY)) * cellSize;
  outColor = texture(uTex, st);
  outColor.a *= vAlpha;
}`

class Face {
  constructor(a, b, c) { this.a = a; this.b = b; this.c = c }
}

class Vertex {
  constructor(x, y, z) {
    this.position = vec3.fromValues(x, y, z)
    this.normal = vec3.create()
    this.uv = vec2.create()
  }
}

class Geometry {
  constructor() { this.vertices = []; this.faces = [] }
  addVertex(...values) {
    for (let index = 0; index < values.length; index += 3) this.vertices.push(new Vertex(values[index], values[index + 1], values[index + 2]))
    return this
  }
  addFace(...values) {
    for (let index = 0; index < values.length; index += 3) this.faces.push(new Face(values[index], values[index + 1], values[index + 2]))
    return this
  }
  get lastVertex() { return this.vertices[this.vertices.length - 1] }
  getMidPoint(aIndex, bIndex, cache) {
    const key = aIndex < bIndex ? `${bIndex}_${aIndex}` : `${aIndex}_${bIndex}`
    if (Object.prototype.hasOwnProperty.call(cache, key)) return cache[key]
    const a = this.vertices[aIndex].position
    const b = this.vertices[bIndex].position
    const index = this.vertices.length
    cache[key] = index
    this.addVertex((a[0] + b[0]) * .5, (a[1] + b[1]) * .5, (a[2] + b[2]) * .5)
    return index
  }
  subdivide(divisions = 1) {
    let faces = this.faces
    for (let division = 0; division < divisions; division += 1) {
      const cache = {}
      const nextFaces = []
      faces.forEach((face) => {
        const ab = this.getMidPoint(face.a, face.b, cache)
        const bc = this.getMidPoint(face.b, face.c, cache)
        const ca = this.getMidPoint(face.c, face.a, cache)
        nextFaces.push(new Face(face.a, ab, ca), new Face(face.b, bc, ab), new Face(face.c, ca, bc), new Face(ab, bc, ca))
      })
      faces = nextFaces
    }
    this.faces = faces
    return this
  }
  spherize(radius = 1) {
    this.vertices.forEach((vertex) => {
      vec3.normalize(vertex.normal, vertex.position)
      vec3.scale(vertex.position, vertex.normal, radius)
    })
    return this
  }
  get data() {
    return {
      vertices: new Float32Array(this.vertices.flatMap((vertex) => Array.from(vertex.position))),
      uvs: new Float32Array(this.vertices.flatMap((vertex) => Array.from(vertex.uv))),
      indices: new Uint16Array(this.faces.flatMap((face) => [face.a, face.b, face.c])),
    }
  }
}

class IcosahedronGeometry extends Geometry {
  constructor() {
    super()
    const t = Math.sqrt(5) * .5 + .5
    this.addVertex(-1,t,0, 1,t,0, -1,-t,0, 1,-t,0, 0,-1,t, 0,1,t, 0,-1,-t, 0,1,-t, t,0,-1, t,0,1, -t,0,-1, -t,0,1)
      .addFace(0,11,5, 0,5,1, 0,1,7, 0,7,10, 0,10,11, 1,5,9, 5,11,4, 11,10,2, 10,7,6, 7,1,8, 3,9,4, 3,4,2, 3,2,6, 3,6,8, 3,8,9, 4,9,5, 2,4,11, 6,2,10, 8,6,7, 9,8,1)
  }
}

class DiscGeometry extends Geometry {
  constructor(steps = 56, radius = 1) {
    super()
    const alpha = (Math.PI * 2) / steps
    this.addVertex(0, 0, 0)
    this.lastVertex.uv = vec2.fromValues(.5, .5)
    for (let index = 0; index < steps; index += 1) {
      const x = Math.cos(alpha * index)
      const y = Math.sin(alpha * index)
      this.addVertex(radius * x, radius * y, 0)
      this.lastVertex.uv = vec2.fromValues(x * .5 + .5, y * .5 + .5)
      if (index > 0) this.addFace(0, index, index + 1)
    }
    this.addFace(0, steps, 1)
  }
}

const createShader = (gl, type, source) => {
  const shader = gl.createShader(type)
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader
  console.error(gl.getShaderInfoLog(shader))
  gl.deleteShader(shader)
  return null
}

const createProgram = (gl) => {
  const program = gl.createProgram()
  const vertex = createShader(gl, gl.VERTEX_SHADER, vertexShader)
  const fragment = createShader(gl, gl.FRAGMENT_SHADER, fragmentShader)
  if (!vertex || !fragment) return null
  gl.attachShader(program, vertex)
  gl.attachShader(program, fragment)
  gl.bindAttribLocation(program, 0, 'aModelPosition')
  gl.bindAttribLocation(program, 2, 'aModelUvs')
  gl.bindAttribLocation(program, 3, 'aInstanceMatrix')
  gl.linkProgram(program)
  if (gl.getProgramParameter(program, gl.LINK_STATUS)) return program
  console.error(gl.getProgramInfoLog(program))
  gl.deleteProgram(program)
  return null
}

const makeBuffer = (gl, data, usage = gl.STATIC_DRAW) => {
  const buffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
  gl.bufferData(gl.ARRAY_BUFFER, data, usage)
  return buffer
}

class ArcballControl {
  constructor(canvas, onUpdate) {
    this.canvas = canvas
    this.onUpdate = onUpdate
    this.isPointerDown = false
    this.orientation = quat.create()
    this.pointerRotation = quat.create()
    this.rotationVelocity = 0
    this.smoothVelocity = 0
    this.rotationAxis = vec3.fromValues(1, 0, 0)
    this.snapDirection = vec3.fromValues(0, 0, -1)
    this.snapTargetDirection = null
    this.targetOrientation = null
    this.pointerPos = vec2.create()
    this.previousPointerPos = vec2.create()
    this.combinedQuat = quat.create()

    this.onPointerDown = (event) => {
      vec2.set(this.pointerPos, event.clientX, event.clientY)
      vec2.copy(this.previousPointerPos, this.pointerPos)
      this.isPointerDown = true
      this.targetOrientation = null
      canvas.setPointerCapture?.(event.pointerId)
    }
    this.onPointerUp = (event) => {
      this.isPointerDown = false
      canvas.releasePointerCapture?.(event.pointerId)
    }
    this.onPointerMove = (event) => {
      if (this.isPointerDown) vec2.set(this.pointerPos, event.clientX, event.clientY)
    }
    canvas.addEventListener('pointerdown', this.onPointerDown)
    canvas.addEventListener('pointerup', this.onPointerUp)
    canvas.addEventListener('pointercancel', this.onPointerUp)
    canvas.addEventListener('pointermove', this.onPointerMove)
    canvas.style.touchAction = 'none'
  }

  project(position) {
    const radius = 2
    const width = this.canvas.clientWidth
    const height = this.canvas.clientHeight
    const scale = Math.max(width, height) - 1
    const x = (2 * position[0] - width - 1) / scale
    const y = (2 * position[1] - height - 1) / scale
    const xy = x * x + y * y
    const z = xy <= radius * radius / 2 ? Math.sqrt(radius * radius - xy) : radius * radius / Math.sqrt(xy)
    return vec3.fromValues(-x, y, z)
  }

  quatFromVectors(a, b, output, factor = 1) {
    const axis = vec3.normalize(vec3.create(), vec3.cross(vec3.create(), a, b))
    const dot = Math.max(-1, Math.min(1, vec3.dot(a, b)))
    quat.setAxisAngle(output, axis, Math.acos(dot) * factor)
  }

  update(deltaTime, frameDuration = 1000 / 60) {
    const timeScale = deltaTime / frameDuration + .00001
    let angleFactor = timeScale
    const snapRotation = quat.create()
    if (this.isPointerDown) {
      const intensity = .3 * timeScale
      const delta = vec2.sub(vec2.create(), this.pointerPos, this.previousPointerPos)
      vec2.scale(delta, delta, intensity)
      if (vec2.sqrLen(delta) > .1) {
        vec2.add(delta, this.previousPointerPos, delta)
        const a = vec3.normalize(vec3.create(), this.project(delta))
        const b = vec3.normalize(vec3.create(), this.project(this.previousPointerPos))
        vec2.copy(this.previousPointerPos, delta)
        angleFactor *= 5 / timeScale
        this.quatFromVectors(a, b, this.pointerRotation, angleFactor)
      } else quat.slerp(this.pointerRotation, this.pointerRotation, quat.create(), intensity)
    } else {
      quat.slerp(this.pointerRotation, this.pointerRotation, quat.create(), .1 * timeScale)
      if (this.targetOrientation) {
        quat.slerp(this.orientation, this.orientation, this.targetOrientation, Math.min(1, .09 * timeScale))
        if (Math.abs(quat.dot(this.orientation, this.targetOrientation)) > .9998) this.targetOrientation = null
      } else if (this.snapTargetDirection) {
        const distance = vec3.squaredDistance(this.snapTargetDirection, this.snapDirection)
        angleFactor *= .2 * Math.max(.1, 1 - distance * 10)
        this.quatFromVectors(this.snapTargetDirection, this.snapDirection, snapRotation, angleFactor)
      }
    }

    const combined = quat.multiply(quat.create(), snapRotation, this.pointerRotation)
    this.orientation = quat.normalize(this.orientation, quat.multiply(quat.create(), combined, this.orientation))
    quat.slerp(this.combinedQuat, this.combinedQuat, combined, Math.min(1, .8 * timeScale))
    const radians = Math.acos(Math.max(-1, Math.min(1, this.combinedQuat[3]))) * 2
    const sine = Math.sin(radians / 2)
    let velocity = 0
    if (sine > .000001) {
      velocity = radians / (Math.PI * 2)
      vec3.set(this.rotationAxis, this.combinedQuat[0] / sine, this.combinedQuat[1] / sine, this.combinedQuat[2] / sine)
    }
    this.smoothVelocity += (velocity - this.smoothVelocity) * Math.min(1, .5 * timeScale)
    this.rotationVelocity = this.smoothVelocity / timeScale
    this.onUpdate(deltaTime)
  }

  dispose() {
    this.canvas.removeEventListener('pointerdown', this.onPointerDown)
    this.canvas.removeEventListener('pointerup', this.onPointerUp)
    this.canvas.removeEventListener('pointercancel', this.onPointerUp)
    this.canvas.removeEventListener('pointermove', this.onPointerMove)
  }
}

class InfiniteGridMenu {
  constructor(canvas, items, onActiveItemChange, onMovementChange, onInit, scale = 1) {
    this.canvas = canvas
    this.items = items
    this.onActiveItemChange = onActiveItemChange
    this.onMovementChange = onMovementChange
    this.scaleFactor = scale
    this.sphereRadius = 2
    this.camera = {
      near: .1,
      far: 40,
      fov: Math.PI / 4,
      aspect: 1,
      position: vec3.fromValues(0, 0, 3 * scale),
      up: vec3.fromValues(0, 1, 0),
      matrix: mat4.create(),
      view: mat4.create(),
      projection: mat4.create(),
    }
    this.time = 0
    this.frames = 0
    this.movementActive = false
    this.destroyed = false
    this.init()
    onInit?.(this)
  }

  init() {
    const gl = this.canvas.getContext('webgl2', { antialias: true, alpha: true })
    if (!gl) throw new Error('WebGL 2 is unavailable')
    this.gl = gl
    this.program = createProgram(gl)
    this.locations = {
      position: gl.getAttribLocation(this.program, 'aModelPosition'),
      uvs: gl.getAttribLocation(this.program, 'aModelUvs'),
      instance: gl.getAttribLocation(this.program, 'aInstanceMatrix'),
      world: gl.getUniformLocation(this.program, 'uWorldMatrix'),
      view: gl.getUniformLocation(this.program, 'uViewMatrix'),
      projection: gl.getUniformLocation(this.program, 'uProjectionMatrix'),
      rotation: gl.getUniformLocation(this.program, 'uRotationAxisVelocity'),
      texture: gl.getUniformLocation(this.program, 'uTex'),
      itemCount: gl.getUniformLocation(this.program, 'uItemCount'),
      atlasSize: gl.getUniformLocation(this.program, 'uAtlasSize'),
    }

    this.discGeometry = new DiscGeometry()
    this.discData = this.discGeometry.data
    this.vao = gl.createVertexArray()
    gl.bindVertexArray(this.vao)
    const positionBuffer = makeBuffer(gl, this.discData.vertices)
    gl.enableVertexAttribArray(this.locations.position)
    gl.vertexAttribPointer(this.locations.position, 3, gl.FLOAT, false, 0, 0)
    const uvBuffer = makeBuffer(gl, this.discData.uvs)
    gl.enableVertexAttribArray(this.locations.uvs)
    gl.vertexAttribPointer(this.locations.uvs, 2, gl.FLOAT, false, 0, 0)
    this.indexBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer)
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.discData.indices, gl.STATIC_DRAW)

    const ico = new IcosahedronGeometry().subdivide(1).spherize(this.sphereRadius)
    this.instancePositions = ico.vertices.map((vertex) => vertex.position)
    this.instanceMatrices = new Float32Array(this.instancePositions.length * 16)
    this.instanceBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, this.instanceMatrices.byteLength, gl.DYNAMIC_DRAW)
    for (let slot = 0; slot < 4; slot += 1) {
      const location = this.locations.instance + slot
      gl.enableVertexAttribArray(location)
      gl.vertexAttribPointer(location, 4, gl.FLOAT, false, 64, slot * 16)
      gl.vertexAttribDivisor(location, 1)
    }
    gl.bindVertexArray(null)

    this.worldMatrix = mat4.create()
    this.initTexture()
    this.control = new ArcballControl(this.canvas, (delta) => this.onControlUpdate(delta))
    this.updateCamera()
    this.resize()
  }

  initTexture() {
    const gl = this.gl
    this.texture = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, this.texture)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([20, 16, 31, 255]))

    this.atlasSize = Math.ceil(Math.sqrt(this.items.length))
    const atlas = document.createElement('canvas')
    const context = atlas.getContext('2d')
    const cellSize = 512
    atlas.width = this.atlasSize * cellSize
    atlas.height = this.atlasSize * cellSize
    context.fillStyle = '#100d19'
    context.fillRect(0, 0, atlas.width, atlas.height)

    Promise.all(this.items.map((item) => new Promise((resolve) => {
      const image = new Image()
      image.onload = () => resolve(image)
      image.onerror = () => resolve(null)
      image.src = item.image
    }))).then((images) => {
      if (this.destroyed) return
      images.forEach((image, index) => {
        if (!image) return
        const crop = this.items[index].crop || { x: 0, y: 0, w: 1, h: 1 }
        const x = (index % this.atlasSize) * cellSize
        const y = Math.floor(index / this.atlasSize) * cellSize
        context.drawImage(image, image.width * crop.x, image.height * crop.y, image.width * crop.w, image.height * crop.h, x, y, cellSize, cellSize)
      })
      gl.bindTexture(gl.TEXTURE_2D, this.texture)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, atlas)
      gl.generateMipmap(gl.TEXTURE_2D)
    })
  }

  resize() {
    const gl = this.gl
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const width = Math.max(1, Math.round(this.canvas.clientWidth * dpr))
    const height = Math.max(1, Math.round(this.canvas.clientHeight * dpr))
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width
      this.canvas.height = height
      gl.viewport(0, 0, width, height)
    }
    this.camera.aspect = this.canvas.clientWidth / Math.max(1, this.canvas.clientHeight)
    const viewHeight = this.sphereRadius * .35
    const distance = this.camera.position[2]
    this.camera.fov = this.camera.aspect > 1 ? 2 * Math.atan(viewHeight / distance) : 2 * Math.atan(viewHeight / this.camera.aspect / distance)
    mat4.perspective(this.camera.projection, this.camera.fov, this.camera.aspect, this.camera.near, this.camera.far)
  }

  updateCamera() {
    mat4.targetTo(this.camera.matrix, this.camera.position, [0, 0, 0], this.camera.up)
    mat4.invert(this.camera.view, this.camera.matrix)
  }

  focusItem(itemIndex) {
    let bestIndex = itemIndex
    let bestDot = -Infinity
    this.instancePositions.forEach((position, index) => {
      if (index % this.items.length !== itemIndex) return
      const current = vec3.normalize(vec3.create(), vec3.transformQuat(vec3.create(), position, this.control.orientation))
      const dot = vec3.dot(current, this.control.snapDirection)
      if (dot > bestDot) { bestDot = dot; bestIndex = index }
    })
    const currentDirection = vec3.normalize(vec3.create(), vec3.transformQuat(vec3.create(), this.instancePositions[bestIndex], this.control.orientation))
    const delta = quat.rotationTo(quat.create(), currentDirection, this.control.snapDirection)
    this.control.targetOrientation = quat.normalize(quat.create(), quat.multiply(quat.create(), delta, this.control.orientation))
  }

  onControlUpdate(deltaTime) {
    const timeScale = deltaTime / (1000 / 60) + .0001
    const moving = this.control.isPointerDown || Math.abs(this.control.rotationVelocity) > .01 || Boolean(this.control.targetOrientation)
    if (moving !== this.movementActive) {
      this.movementActive = moving
      this.onMovementChange(moving)
    }
    if (!this.control.isPointerDown && !this.control.targetOrientation) {
      const inverse = quat.conjugate(quat.create(), this.control.orientation)
      const target = vec3.transformQuat(vec3.create(), this.control.snapDirection, inverse)
      let nearest = 0
      let maxDot = -Infinity
      this.instancePositions.forEach((position, index) => {
        const dot = vec3.dot(target, position)
        if (dot > maxDot) { maxDot = dot; nearest = index }
      })
      this.onActiveItemChange(nearest % this.items.length)
      this.control.snapTargetDirection = vec3.normalize(vec3.create(), vec3.transformQuat(vec3.create(), this.instancePositions[nearest], this.control.orientation))
    }
    const targetZ = 3 * this.scaleFactor + (this.control.isPointerDown ? this.control.rotationVelocity * 70 + 2 : 0)
    this.camera.position[2] += (targetZ - this.camera.position[2]) / (6 / timeScale)
    this.updateCamera()
  }

  animate(deltaTime) {
    this.control.update(deltaTime)
    const gl = this.gl
    this.instancePositions.forEach((position, index) => {
      const transformed = vec3.transformQuat(vec3.create(), position, this.control.orientation)
      const depthScale = (Math.abs(transformed[2]) / this.sphereRadius) * .6 + .4
      const matrix = mat4.create()
      mat4.translate(matrix, matrix, vec3.negate(vec3.create(), transformed))
      mat4.multiply(matrix, matrix, mat4.targetTo(mat4.create(), [0, 0, 0], transformed, [0, 1, 0]))
      mat4.scale(matrix, matrix, [depthScale * .25, depthScale * .25, depthScale * .25])
      mat4.translate(matrix, matrix, [0, 0, -this.sphereRadius])
      this.instanceMatrices.set(matrix, index * 16)
    })
    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer)
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.instanceMatrices)
  }

  render() {
    const gl = this.gl
    gl.useProgram(this.program)
    gl.enable(gl.CULL_FACE)
    gl.enable(gl.DEPTH_TEST)
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
    gl.uniformMatrix4fv(this.locations.world, false, this.worldMatrix)
    gl.uniformMatrix4fv(this.locations.view, false, this.camera.view)
    gl.uniformMatrix4fv(this.locations.projection, false, this.camera.projection)
    gl.uniform4f(this.locations.rotation, this.control.rotationAxis[0], this.control.rotationAxis[1], this.control.rotationAxis[2], this.control.rotationVelocity * 1.1)
    gl.uniform1i(this.locations.itemCount, this.items.length)
    gl.uniform1i(this.locations.atlasSize, this.atlasSize)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, this.texture)
    gl.uniform1i(this.locations.texture, 0)
    gl.bindVertexArray(this.vao)
    gl.drawElementsInstanced(gl.TRIANGLES, this.discData.indices.length, gl.UNSIGNED_SHORT, 0, this.instancePositions.length)
  }

  run = (time = 0) => {
    if (this.destroyed) return
    const delta = Math.min(32, Math.max(1, time - this.time))
    this.time = time
    this.frames += delta / (1000 / 60)
    this.animate(delta)
    this.render()
    this.frameId = requestAnimationFrame(this.run)
  }

  destroy() {
    this.destroyed = true
    cancelAnimationFrame(this.frameId)
    this.control.dispose()
  }
}

export default function InfiniteMenu({
  items = [],
  activeIndex = 0,
  scale = 1,
  backgroundColor = 'transparent',
  onActiveItemChange,
  onAction,
}) {
  const canvasRef = useRef(null)
  const sketchRef = useRef(null)
  const focusLockUntilRef = useRef(0)
  const intendedIndexRef = useRef(activeIndex)
  const [displayIndex, setDisplayIndex] = useState(activeIndex)
  const [isMoving, setIsMoving] = useState(false)
  const safeItems = items.length ? items : [{ title: '', description: '', image: '' }]

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined
    let sketch
    try {
      sketch = new InfiniteGridMenu(
        canvas,
        safeItems,
        (index) => {
          if (Date.now() < focusLockUntilRef.current && index !== intendedIndexRef.current) return
          setDisplayIndex(index)
          onActiveItemChange?.(index)
        },
        setIsMoving,
        (instance) => {
          sketchRef.current = instance
          instance.run()
          instance.focusItem(activeIndex)
        },
        scale,
      )
    } catch (error) {
      console.error(error)
    }
    const resize = () => sketch?.resize()
    window.addEventListener('resize', resize)
    return () => {
      window.removeEventListener('resize', resize)
      sketch?.destroy()
      sketchRef.current = null
    }
  }, [items, scale])

  useEffect(() => {
    intendedIndexRef.current = activeIndex
    focusLockUntilRef.current = Date.now() + 1200
    setDisplayIndex(activeIndex)
    sketchRef.current?.focusItem(activeIndex)
  }, [activeIndex])

  const activeItem = safeItems[displayIndex % safeItems.length]

  return (
    <div className="infinite-menu" style={{ '--infinite-menu-background': backgroundColor, backgroundColor }}>
      <canvas className="infinite-menu-canvas" ref={canvasRef} aria-label="可拖动的项目画框球" />
      <div className={`infinite-menu-caption infinite-menu-title ${isMoving ? 'is-moving' : ''}`} aria-live="polite">
        <span>{String((displayIndex % safeItems.length) + 1).padStart(2, '0')} / {String(safeItems.length).padStart(2, '0')}</span>
        <h3>{activeItem.title}</h3>
      </div>
      <p className={`infinite-menu-description ${isMoving ? 'is-moving' : ''}`}>{activeItem.description}</p>
      <button
        type="button"
        className={`infinite-menu-action ${isMoving ? 'is-moving' : ''}`}
        onClick={() => onAction?.(displayIndex % safeItems.length)}
        aria-label={`展开 ${activeItem.title} 的项目详情`}
      >
        <span aria-hidden="true">↗</span>
      </button>
      <span className="infinite-menu-hint" aria-hidden="true">DRAG TO ORBIT</span>
    </div>
  )
}
