import * as T from './vendor/three.module.js';

export const probeGrid = {
  width: 136, depth: 109, x: -13.7, z: -12.0, pitch: .22, nearWall: .09,
  columns: 6, layers: [14,14,20], ceiling: [4.2,4.2,6.4],
  sun: [.38,.84,.55]
};
const grid = probeGrid;
const atlasRows = Math.ceil(grid.layers.reduce((sum,n)=>sum+n) / grid.columns);

// The two halves of the atlas store window visibility and the first directional
// moment of the sky. Both are measured against the furnished Blender building.
const fieldGLSL = `
uniform sampler2D windowField;
vec2 windowTileUV(vec2 cell, float slice) {
  vec2 tile = vec2(mod(slice, ${grid.columns}.0), floor(slice / ${grid.columns}.0));
  return (tile + (cell + 0.5) / vec2(${grid.width}.0, ${grid.depth}.0)) / vec2(${2*grid.columns}.0, ${atlasRows}.0);
}
void windowIrradiance(vec3 p, vec3 n, out vec3 sky, out float sun) {
  p += n * 0.135;
  float storey = clamp(floor(p.y / ${grid.ceiling[0]}), 0.0, 2.0);
  float height = storey < 2.0 ? ${grid.ceiling[0]} : ${grid.ceiling[2]};
  float last = storey < 2.0 ? ${grid.layers[0]-1}.0 : ${grid.layers[2]-1}.0;
  float layer = clamp((p.y - storey * ${grid.ceiling[0]} - ${grid.nearWall}) / (height - ${2*grid.nearWall}), 0.0, 1.0) * last;
  vec2 cell = clamp((p.xz - vec2(${grid.x.toFixed(1)}, ${grid.z.toFixed(1)})) / ${grid.pitch}, vec2(0.0), vec2(${grid.width-1}.0, ${grid.depth-1}.0));
  vec2 lo = windowTileUV(cell, ${grid.layers[0]}.0 * storey + floor(layer));
  vec2 hi = windowTileUV(cell, ${grid.layers[0]}.0 * storey + min(floor(layer) + 1.0, last));
  vec2 light = mix(texture2D(windowField, lo).rg, texture2D(windowField, hi).rg, fract(layer));
  vec2 halfAtlas = vec2(0.5, 0.0);
  vec3 incoming = 2.0 * mix(texture2D(windowField, lo + halfAtlas).rgb,
                            texture2D(windowField, hi + halfAtlas).rgb, fract(layer)) - 1.0;
  float flux = 1.8 * light.r * light.r;
  // Some light scatters in the glass and bounces off the reveal and floor.
  sky = vec3(0.91, 1.0, 1.09) * flux * (0.29 + 1.30 * max(dot(n, incoming), 0.0));
  sun = light.g;
}
`;

const windowContribution = `
  vec3 worldPoint = cameraPosition - (vec4(vViewPosition, 0.0) * viewMatrix).xyz;
  vec3 worldNormal = inverseTransformDirection(geometryNormal, viewMatrix);
  vec3 windowSky;
  float admittedSun;
  windowIrradiance(worldPoint, worldNormal, windowSky, admittedSun);
  irradiance += PI * windowSky;
  IncidentLight windowSun;
  windowSun.direction = transformDirection(normalize(vec3(${grid.sun.join(', ')})), viewMatrix);
  windowSun.color = vec3(3.15, 2.85, 2.41) * admittedSun;
  windowSun.visible = true;
  RE_Direct(windowSun, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight);
  #include <lights_fragment_end>
`;

// The original pressed-glass texture supplies the foliage silhouettes. The
// upper part of a pane sees more open sky than the part looking into planting.
const transmittedGlass = `
  #include <emissivemap_fragment>
  float glassY = cameraPosition.y - ((vec4(vViewPosition, 0.0) * viewMatrix).y);
  float glassLevel = clamp(floor(glassY / ${grid.ceiling[0]}), 0.0, 2.0);
  float glassHeight = glassLevel < 2.0 ? ${grid.ceiling[0]} : ${grid.ceiling[2]};
  float skyView = smoothstep(0.12, 0.96, (glassY - glassLevel * ${grid.ceiling[0]}) / glassHeight);
  float clarity = dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));
  totalEmissiveRadiance += (0.12 + 0.57 * skyView) * (0.22 + 2.2 * clarity) * vec3(0.76, 0.88, 0.99);
`;

export function createWindowLighting(worldRenderer) {
  const field = new T.TextureLoader().load(new URL('./art/window-light.png', import.meta.url).href);
  field.flipY = false;
  field.generateMipmaps = false;
  field.minFilter = field.magFilter = T.LinearFilter;
  const prepared = new WeakSet();
  function prepare(material) {
    if (!material?.isMeshStandardMaterial || prepared.has(material)) return;
    prepared.add(material);
    const isGlass = material.name === 'M04 Pressed garden glass' ||
      material.name === 'M04 | Molded glass and transmitted garden light';
    const previousCompile = material.onBeforeCompile;
    const previousKey = material.customProgramCacheKey();
    material.onBeforeCompile = function(shader, renderer) {
      previousCompile.call(this, shader, renderer);
      if (renderer !== worldRenderer) return;
      shader.uniforms.windowField = {value:field};
      shader.fragmentShader = fieldGLSL + shader.fragmentShader.replace('#include <lights_fragment_end>', windowContribution);
      if (isGlass) shader.fragmentShader = shader.fragmentShader.replace('#include <emissivemap_fragment>', transmittedGlass);
    };
    material.customProgramCacheKey = () => previousKey + (isGlass ? '-pressed-glass' : '-aperture-light');
    material.needsUpdate = true;
  }
  return function illuminate(root) {
    root.traverse(node => {
      if (Array.isArray(node.material)) node.material.forEach(prepare);
      else prepare(node.material);
    });
  };
}
