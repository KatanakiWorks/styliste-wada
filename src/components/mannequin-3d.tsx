/* eslint-disable react/no-unknown-property -- position, args, intensity… are three.js props that React Three Fiber understands */
// must stay the first import: it patches process before three is evaluated
import '@/lib/polyfill-process';
import { Canvas, useFrame } from '@react-three/fiber/native';
import { useRef, useState } from 'react';
import { PanResponder, View, type ViewStyle } from 'react-native';
import type { Group } from 'three';

import { outfitShape } from '@/components/mannequin';
import { useTheme } from '@/hooks/use-theme';
import type { Item, Outfit } from '@/lib/color';
import type { Body } from '@/lib/store';
import { hexOf } from '@/lib/wada';

// A dress-form mannequin built from simple shapes and dressed in the outfit's colours. Drag to turn it.
// Units are metres: the figure is about 1.75 m tall, feet at y = 0.

type Vec = [number, number, number];

function Part({ geo, args, position, rotation, scale, color, rough = 0.85 }: {
  geo: 'sphere' | 'cylinder' | 'capsule' | 'box' | 'torus';
  args: number[];
  position: Vec;
  rotation?: Vec;
  scale?: Vec;
  color: string;
  rough?: number;
}) {
  return (
    <mesh position={position} rotation={rotation} scale={scale}>
      {geo === 'sphere' ? <sphereGeometry args={args as [number, number, number]} /> : null}
      {geo === 'cylinder' ? <cylinderGeometry args={args as [number, number, number, number]} /> : null}
      {geo === 'capsule' ? <capsuleGeometry args={args as [number, number, number, number]} /> : null}
      {geo === 'box' ? <boxGeometry args={args as [number, number, number]} /> : null}
      {geo === 'torus' ? <torusGeometry args={args as [number, number, number, number]} /> : null}
      <meshStandardMaterial color={color} roughness={rough} metalness={0} />
    </mesh>
  );
}

function Figure({ pick, body, skin, angle }: { pick: Outfit['pick']; body: Body; skin: string; angle: { current: number } }) {
  const group = useRef<Group>(null);
  // the drag sets the target angle; the figure eases towards it
  useFrame(() => {
    if (group.current) group.current.rotation.y += (angle.current - group.current.rotation.y) * 0.2;
  });

  const { top, bottom, shoes, accessory } = pick;
  const { sleeve, legs, accessory: accKind } = outfitShape(pick);
  const m = body === 'homme';
  const sh = m ? 0.2 : 0.16; // shoulder radius
  const wa = m ? 0.165 : 0.125; // waist
  const hp = m ? 0.165 : 0.18; // hip
  const flat: Vec = [1, 1, 0.62]; // bodies are deeper side to side than front to back
  const c = (i: Item | undefined, fallback = skin) => (i ? hexOf(i.color) : fallback);
  const armX = sh + 0.035;
  const legX = m ? 0.085 : 0.09;

  return (
    <group ref={group} position={[0, -0.9, 0]}>
      {/* head and neck */}
      <Part geo="sphere" args={[0.105, 24, 24]} position={[0, 1.63, 0]} scale={[0.92, 1.08, 0.98]} color={skin} />
      <Part geo="cylinder" args={[0.045, 0.05, 0.1, 16]} position={[0, 1.5, 0]} color={skin} />

      {/* torso: chest then abdomen */}
      <Part geo="cylinder" args={[sh, wa, 0.32, 28]} position={[0, 1.3, 0]} scale={flat} color={c(top)} />
      <Part geo="cylinder" args={[wa, hp, 0.24, 28]} position={[0, 1.02, 0]} scale={flat} color={c(top)} />
      <Part geo="sphere" args={[sh, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2]} position={[0, 1.46, 0]} scale={[1, 0.28, 0.62]} color={c(top)} />

      {/* arms (skin), then sleeves over them */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <Part geo="capsule" args={[0.042, 0.5, 8, 16]} position={[s * armX, 1.17, 0]} rotation={[0, 0, s * 0.07]} color={skin} />
          <Part geo="sphere" args={[0.045, 16, 16]} position={[s * (armX + 0.03), 0.86, 0]} color={skin} />
          {sleeve === 'long' ? <Part geo="capsule" args={[0.052, 0.46, 8, 16]} position={[s * armX, 1.19, 0]} rotation={[0, 0, s * 0.07]} color={c(top)} /> : null}
          {sleeve === 'short' ? <Part geo="capsule" args={[0.056, 0.12, 8, 16]} position={[s * (armX - 0.005), 1.36, 0]} rotation={[0, 0, s * 0.07]} color={c(top)} /> : null}
        </group>
      ))}

      {/* hips, legs and bottom */}
      <Part geo="cylinder" args={[hp, hp * 0.92, 0.14, 28]} position={[0, 0.85, 0]} scale={flat} color={legs === 'trousers' || legs === 'shorts' ? c(bottom) : skin} />
      {[-1, 1].map((s) => (
        <group key={s}>
          <Part geo="capsule" args={[0.068, 0.66, 8, 16]} position={[s * legX, 0.45, 0]} color={legs === 'trousers' ? c(bottom) : skin} />
          {legs === 'shorts' ? <Part geo="capsule" args={[0.078, 0.22, 8, 16]} position={[s * legX, 0.68, 0]} color={c(bottom)} /> : null}
          {shoes ? <Part geo="box" args={[0.1, 0.07, 0.25]} position={[s * legX, 0.035, 0.04]} color={c(shoes)} rough={0.6} /> : null}
        </group>
      ))}
      {legs === 'skirt' ? <Part geo="cylinder" args={[hp * 0.95, hp + 0.12, 0.45, 32]} position={[0, 0.66, 0]} scale={[1, 1, 0.75]} color={c(bottom)} /> : null}

      {accessory ? <Accessory3D kind={accKind} color={c(accessory)} armX={armX} hp={hp} sh={sh} /> : null}
    </group>
  );
}

function Accessory3D({ kind, color, armX, hp, sh }: { kind: ReturnType<typeof outfitShape>['accessory']; color: string; armX: number; hp: number; sh: number }) {
  switch (kind) {
    case 'glasses':
      return (
        <>
          <Part geo="box" args={[0.07, 0.035, 0.02]} position={[-0.042, 1.65, 0.1]} color={color} rough={0.3} />
          <Part geo="box" args={[0.07, 0.035, 0.02]} position={[0.042, 1.65, 0.1]} color={color} rough={0.3} />
        </>
      );
    case 'hat':
      return <Part geo="sphere" args={[0.112, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} position={[0, 1.66, 0]} color={color} />;
    case 'bag':
      return <Part geo="box" args={[0.08, 0.26, 0.3]} position={[hp + 0.08, 0.9, 0]} color={color} rough={0.6} />;
    case 'belt':
      return <Part geo="torus" args={[hp + 0.004, 0.018, 8, 40]} position={[0, 0.91, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 0.62, 1]} color={color} rough={0.5} />;
    case 'necklace':
      return <Part geo="torus" args={[0.07, 0.008, 8, 32]} position={[0, 1.43, 0.06]} rotation={[Math.PI / 2.4, 0, 0]} color={color} rough={0.3} />;
    default: // watch on the left wrist
      return <Part geo="torus" args={[0.047, 0.014, 8, 24]} position={[-(armX + 0.026), 0.93, 0]} rotation={[Math.PI / 2, 0, 0]} color={color} rough={0.4} />;
  }
}

export function Mannequin3D({ pick, body, style }: { pick: Outfit['pick']; body: Body; style?: ViewStyle }) {
  const t = useTheme();
  // target angle shared with the render loop; three-quarter view to start
  const [angle] = useState(() => ({ current: 0.45 }));
  const [responder] = useState(() => {
    let start = 0;
    return PanResponder.create({
      // claim the gesture so dragging the figure turns it instead of swiping the card
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        start = angle.current;
      },
      onPanResponderMove: (_, g) => {
        angle.current = start + g.dx * 0.012;
      },
    });
  });

  return (
    <View style={[{ flex: 1 }, style]} {...responder.panHandlers} accessibilityLabel="Silhouette 3D, faites glisser pour la tourner">
      <Canvas camera={{ position: [0, 0.05, 3.1], fov: 34 }} gl={{ antialias: true }}>
        <ambientLight intensity={0.75} />
        <directionalLight position={[2, 3, 4]} intensity={1.6} />
        <directionalLight position={[-3, 1, -2]} intensity={0.5} />
        <Figure pick={pick} body={body} skin={t.textSecondary} angle={angle} />
      </Canvas>
    </View>
  );
}
