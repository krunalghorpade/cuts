import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
import {Box3, Raycaster, Vector3} from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';

const formats = {
  cassette: {size: [109, 69.6, 16.8], front: [105.25, 65.8], back: [105.1, 27.85]},
  vinyl: {size: [315, 315, 3], front: [315, 315], back: [315, 315]}
};

function checkSize(actual, expected) {
  expected.forEach((mm, axis) => assert.ok(Math.abs(actual.getComponent(axis) * 1000 - mm) < 0.08));
}

for (const [format, expected] of Object.entries(formats)) {
  const bytes = await readFile(new URL('../dist/models/packaging/' + format + '.glb', import.meta.url));
  const {scene} = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.length), '');
  scene.updateMatrixWorld(true);
  for (const lod of ['Detail', 'Shelf']) {
    test(`${lod} ${format} exposes both printed faces at shelf viewing angles`, () => {
      const root = scene.getObjectByName(lod + '_' + format);
      checkSize(new Box3().setFromObject(root).getSize(new Vector3()), expected.size);
      const surfaces = [];
      root.traverse(part => {
        if (part.isMesh && !part.material.transparent) surfaces.push(part);
      });
      for (const [label, side] of [['front', 1], ['back', -1]]) {
        const print = surfaces.find(m => m.material.name === 'MAT_' + label.toUpperCase());
        const bounds = new Box3().setFromObject(print);
        const size = bounds.getSize(new Vector3());
        const center = bounds.getCenter(new Vector3());
        checkSize(size, expected[label]);
        for (const x of [-0.44, -0.08, 0.44]) {
          for (const y of [-0.44, 0, 0.44]) {
            const point = new Vector3(center.x + x * size.x, center.y + y * size.y, center.z);
            for (const angle of [-0.7, 0, 0.7]) {
              const offset = new Vector3(angle, 0.20, side).normalize();
              const ray = new Raycaster(point.clone().add(offset), offset.negate());
              const hits = ray.intersectObjects(surfaces, false);
              assert.equal(hits[0]?.object.material.name, print.material.name);
              const next = hits.find(hit => hit.object !== print);
              // Paper and plastic closer than this z-fight at aisle viewing distances.
              assert.ok(!next || next.distance - hits[0].distance > 0.00030,
                `${label} print is too close to an opaque surface at ${x}, ${y} from ${angle}`);
            }
          }
        }
      }
    });
  }
}
