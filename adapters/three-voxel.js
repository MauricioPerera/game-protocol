/**
 * adapters/three-voxel.js — Adaptador de BACKEND: VOXELS (derivado neutral) -> Three.js.
 *
 * NO es parte del protocolo: es la pieza "motor" que mapea el objeto canónico que produce
 * game-export (window.GAME.VOXELS[estructura]) a la API concreta de Three.js. Un backend
 * distinto (Babylon, raytracer, mesher propio) sería otro adaptador como este.
 *
 * THREE se inyecta para que funcione igual en Node (tests, sin GPU) y en el navegador.
 *   voxelsToInstancedMesh(structure, materials, THREE) -> THREE.InstancedMesh
 */
(function (factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.ThreeVoxelAdapter = api;
})(function () {

  // structure: { count, bounds, voxels:[{x,y,z,m}] }  (= window.GAME.VOXELS[nombre])
  // materials:  window.GAME.MATERIALS  ({ NAME: { color:[r,g,b 0..255] } })
  function voxelsToInstancedMesh(structure, materials, THREE) {
    const voxels = (structure && structure.voxels) || [];
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const mat = new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0.0 });
    const mesh = new THREE.InstancedMesh(geo, mat, voxels.length);

    const m4 = new THREE.Matrix4();
    const color = new THREE.Color();
    voxels.forEach((v, i) => {
      m4.makeTranslation(v.x + 0.5, v.y + 0.5, v.z + 0.5); // centrar la caja unidad en la celda
      mesh.setMatrixAt(i, m4);
      const rgb = ((materials || {})[v.m] || {}).color || [255, 0, 255];
      color.setRGB(rgb[0] / 255, rgb[1] / 255, rgb[2] / 255);
      mesh.setColorAt(i, color);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    return mesh;
  }

  return { voxelsToInstancedMesh: voxelsToInstancedMesh };
});
