import { Canvas } from '@react-three/fiber'
import { OrbitControls, Grid, Stats } from '@react-three/drei'

export default function EditorCanvas() {
  return (
    <Canvas camera={{ position: [10, 10, 10], fov: 50 }}>
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 20, 10]} intensity={0.8} />
      <Grid
        args={[100, 100]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#4b5563"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#6b7280"
        fadeDistance={50}
        fadeStrength={1}
        infiniteGrid
      />
      <OrbitControls makeDefault />
      {import.meta.env.DEV && <Stats />}
    </Canvas>
  )
}
