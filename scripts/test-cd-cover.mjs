import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
import {Box3, Raycaster, Vector3} from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';

const bytes = await readFile(new URL('../dist/models/packaging/cd.glb', import.meta.url));
const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
const {scene} = await new GLTFLoader().parseAsync(buffer, '');
scene.updateMatrixWorld(true);

for (const name of ['Shelf_cd', 'Detail_cd']) {
  test(`${name} exposes the booklet through its lid`, () => {
    const model = scene.getObjectByName(name);
    const opaque = [];
    model.traverse(part => {
      if (part.isMesh && !part.material.transparent) opaque.push(part);
    });
    const booklet = opaque.find(part => part.material.name === 'MAT_FRONT');
    const bounds = new Box3().setFromObject(booklet);
    const center = bounds.getCenter(new Vector3());
    const size = bounds.getSize(new Vector3());
    assert.ok(Math.abs(size.x - 0.12) < 0.0001 && Math.abs(size.y - 0.12) < 0.0001);
    const ray = new Raycaster();
    for (const x of [-0.46, 0, 0.46]) {
      for (const y of [-0.46, 0, 0.46]) {
        const point = new Vector3(center.x + x * size.x, center.y + y * size.y, center.z);
        for (const azimuth of [-0.5, 0, 0.5]) {
          const offset = new Vector3(azimuth, 0.16, 1).normalize();
          ray.set(point.clone().add(offset), offset.negate());
          const first = ray.intersectObjects(opaque, false)[0];
          assert.equal(first?.object, booklet, `Booklet obscured at ${x}, ${y} from ${azimuth}`);
        }
      }
    }
  });
}
