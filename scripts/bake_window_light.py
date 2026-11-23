"""From the site checkout: blender -b ../models/MY-ROOM-3F.blend -P scripts/bake_window_light.py.

Bake visible solid angle and soft sun transmission from the architectural openings.
The runtime interpolates the field on floors, furnishings and moving objects alike.
"""
from pathlib import Path
import json
import math
import struct
import subprocess
import zlib

import bpy
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree

ROOT = Path(__file__).resolve().parents[1]
PLAN = json.loads(subprocess.check_output([
    'node', '--input-type=module', '-e',
    "import {rooms,stair,levels,rise,openingsFor} from './dist/plan.js';"
    "import {probeGrid} from './dist/window-light.js';"
    "console.log(JSON.stringify({rooms,stair,rise,probeGrid,openings:levels.map(openingsFor)}))"
], cwd=ROOT))

GRID = PLAN['probeGrid']
NX, NZ = GRID['width'], GRID['depth']
X0, Z0, PITCH = GRID['x'], GRID['z'], GRID['pitch']
COUNTS, HEIGHTS, COLUMNS = GRID['layers'], GRID['ceiling'], GRID['columns']
SUN = np.array(GRID['sun'])
SUN /= np.linalg.norm(SUN)


def build_occluders():
    vertices, triangles, offset = [], [], 0
    for instance in bpy.context.evaluated_depsgraph_get().object_instances:
        obj = instance.object
        if obj.type != 'MESH' or obj.get('catalogId') or obj.hide_render:
            continue
        # The catalog can shuffle. Its fixed cabinets still cast shadows.
        mesh = obj.data
        world = np.asarray(instance.matrix_world)
        bounds = np.asarray(obj.bound_box) @ world[:3, :3].T + world[:3, 3]
        if np.ptp(bounds, axis=0).max() < .18:
            continue
        mesh.calc_loop_triangles()
        points = np.empty(len(mesh.vertices) * 3, dtype=np.float32)
        mesh.vertices.foreach_get('co', points)
        points = points.reshape(-1, 3) @ world[:3, :3].T + world[:3, 3]
        points = points[:, [0, 2, 1]]
        points[:, 2] *= -1  # Web coordinates: X east, Y up, Z south.
        faces = np.empty(len(mesh.loop_triangles) * 3, dtype=np.int32)
        mesh.loop_triangles.foreach_get('vertices', faces)
        vertices.append(points)
        triangles.append(faces.reshape(-1, 3) + offset)
        offset += len(points)
    merged = np.concatenate(triangles)
    print('Window bake occluder triangles', len(merged), flush=True)
    return BVHTree.FromPolygons(np.concatenate(vertices), merged, all_triangles=True)


def sources(level, bounds):
    height = HEIGHTS[level]
    result = []
    for axis, wall, low, high, name, kind in PLAN['openings'][level]:
        if kind != 'glass' and name != 'Entrance':
            continue
        j, t = (0, 2) if axis == 'x' else (2, 0)
        # Locate which side of the exterior aperture is habitable.
        a, b = (0, 1) if j == 0 else (1, 0)
        mid = (low + high) / 2
        signs = {sign for x in bounds for edge, sign in [(x[a], 1), (x[a+2], -1)]
                 if abs(edge-wall) < .001 and x[b] <= mid <= x[b+2]}
        if len(signs) != 1:
            raise ValueError(f'Expected one indoor side at {level+1}/{axis}/{wall}/{mid}')
        sign = signs.pop()
        sill, head = (.36, height-.36) if kind == 'glass' else (.10, 2.19)
        result.append((j, t, wall + sign*.14, sign, low+.05, high-.05, sill, head))
    if level == 0:
        # The cinema has its own recessed garden lightwell and planted sill.
        result.append((2, 0, 5.68, -1, -5.50, -.40, .40, 3.07))
    return result


def unblocked(tree, points, directions, distances):
    return np.fromiter((tree.ray_cast(Vector(p), Vector(d), float(r)-.014)[2] is None
                        for p, d, r in zip(points, directions, distances)), bool, len(points))


def bake_level(tree, level, atlas, layer_start):
    bounds = [r['bounds'] for r in PLAN['rooms'] if r['floor'] == level+1] + [PLAN['stair']]
    windows = sources(level, bounds)
    base = level * PLAN['rise']
    xz = np.mgrid[0:NZ, 0:NX]
    x = X0 + xz[1]*PITCH
    z = Z0 + xz[0]*PITCH
    inside = np.zeros((NZ, NX), dtype=bool)
    for x0, z0, x1, z1 in bounds:
        inside |= (x >= x0-.23) & (x <= x1+.23) & (z >= z0-.23) & (z <= z1+.23)
    for layer, local_y in enumerate(np.linspace(GRID['nearWall'], HEIGHTS[level]-GRID['nearWall'], COUNTS[level])):
        points = np.column_stack((x[inside], np.full(np.count_nonzero(inside), base+local_y), z[inside]))
        flux = np.zeros(len(points))
        moment = np.zeros_like(points)
        sunlight = np.zeros(len(points))
        for axis, across, plane, sign, low, high, sill, head in windows:
            depth = (points[:, axis] - plane)*sign
            # Include the sample next to the glass, and limit work on distant openings.
            near = (depth > 0) & (depth < 10) & (points[:, across] > low-7) & (points[:, across] < high+7)
            indices = np.flatnonzero(near)
            sample = points[indices]
            area = (high-low)*(head-sill)/12
            for col in range(4):
                for row in range(3):
                    target = np.zeros(3)
                    target[axis] = plane
                    target[across] = low+(col+.5)*(high-low)/4
                    target[1] = base+sill+(row+.5)*(head-sill)/3
                    delta = target - sample
                    r = np.linalg.norm(delta, axis=1)
                    direction = delta/r[:, None]
                    solid = area * depth[indices] / (r*(r*r + .32*area))
                    valid = np.flatnonzero(solid > .0009)
                    clear = unblocked(tree, sample[valid], direction[valid], r[valid])
                    keep = valid[clear]
                    flux[indices[keep]] += solid[keep]
                    moment[indices[keep]] += direction[keep]*solid[keep, None]
            if SUN[axis]*sign >= 0:
                continue
            # Pressed glass spreads the incoming beam. All rooms use the same sun.
            for dx, dz in [(-.105,-.045),(.105,.045),(-.045,.105),(.045,-.105),(0,0)]:
                vec = SUN + [dx,0,dz]
                vec /= np.linalg.norm(vec)
                distance = (plane - points[:,axis])/vec[axis]
                intercept = points + distance[:,None]*vec
                eligible = np.flatnonzero(near & (distance>0) & (intercept[:,across]>=low) &
                    (intercept[:,across]<=high) & (intercept[:,1]>=base+sill) & (intercept[:,1]<=base+head))
                rays = np.broadcast_to(vec, (len(eligible),3))
                clear = unblocked(tree, points[eligible], rays, distance[eligible])
                sunlight[eligible[clear]] += .2
        intensity = np.minimum(flux/math.pi, 1.8)
        direction = moment/np.maximum(flux[:,None], .00001)
        tier = layer_start + layer
        row, col = divmod(tier, COLUMNS)
        tile = atlas[row*NZ:(row+1)*NZ, col*NX:(col+1)*NX]
        tile[inside,0] = np.rint(255*np.sqrt(intensity/1.8))
        tile[inside,1] = np.rint(255*np.minimum(sunlight,1))
        vector_tile = atlas[row*NZ:(row+1)*NZ, (col+COLUMNS)*NX:(col+COLUMNS+1)*NX]
        vector_tile[:] = 128
        vector_tile[inside] = np.rint((.5+.5*direction)*255)
    print('Baked level', level+1, 'from', len(windows), 'apertures', flush=True)


def save_png(path, rgb):
    def chunk(kind, data):
        return struct.pack('>I',len(data))+kind+data+struct.pack('>I',zlib.crc32(kind+data))
    raw = b''.join(b'\0'+row.tobytes() for row in rgb)
    header = struct.pack('>IIBBBBB',rgb.shape[1],rgb.shape[0],8,2,0,0,0)
    path.write_bytes(b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',header)+chunk(b'IDAT',zlib.compress(raw,9))+chunk(b'IEND',b''))


occluders = build_occluders()
atlas = np.zeros((NZ*math.ceil(sum(COUNTS)/COLUMNS), NX*COLUMNS*2, 3), dtype=np.uint8)
for floor in range(3):
    bake_level(occluders, floor, atlas, sum(COUNTS[:floor]))
save_png(ROOT/'dist/art/window-light.png', atlas)
