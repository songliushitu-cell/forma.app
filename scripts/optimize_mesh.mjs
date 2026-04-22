import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { weld, simplify, quantize, prune, dedup, transformMesh } from '@gltf-transform/functions';
import { Accessor } from '@gltf-transform/core';
import { MeshoptSimplifier } from 'meshoptimizer';
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const inputPath  = path.join(__dirname, '../pelvis_v2.glb');
const outputPath = path.join(__dirname, '../pelvis_new.glb');

await MeshoptSimplifier.ready;

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const document = await io.read(inputPath);

console.log('[1/5] weld...');
await document.transform(weld());

console.log('[2/5] simplify (ratio=0.10)...');
await document.transform(
    simplify({ simplifier: MeshoptSimplifier, ratio: 0.10, error: 0.005 })
);

console.log('[2.5/5] strip UV / color / tangent attributes...');
for (const mesh of document.getRoot().listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
        for (const semantic of ['TEXCOORD_0','TEXCOORD_1','COLOR_0','TANGENT']) {
            if (prim.getAttribute(semantic)) prim.setAttribute(semantic, null);
        }
    }
}
// Remove all textures and materials (we'll use a flat bone material)
for (const mat of document.getRoot().listMaterials()) {
    mat.setBaseColorTexture(null);
    mat.setNormalTexture(null);
    mat.setOcclusionTexture(null);
    mat.setEmissiveTexture(null);
    mat.setMetallicRoughnessTexture(null);
}

console.log('[3/5] quantize...');
await document.transform(quantize());

console.log('[4/5] dedup + prune...');
await document.transform(dedup(), prune());

console.log('[5/5] writing pelvis_mini.glb...');
await io.write(outputPath, document);

const { statSync } = await import('fs');
const size = (statSync(outputPath).size / 1024).toFixed(1);
console.log(`✅ Done — pelvis_mini.glb ${size} KB`);
