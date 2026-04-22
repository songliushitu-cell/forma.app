import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, KHRDracoMeshCompression } from '@gltf-transform/extensions';
import draco3d from 'draco3d';

const decoderModule = await draco3d.createDecoderModule({});

// Read-IO: needs decoder only
const readIO = new NodeIO().registerExtensions([...ALL_EXTENSIONS]).registerDependencies({
    'draco3d.decoder': decoderModule,
});

console.log('Reading pelvis.glb …');
const doc = await readIO.read('./pelvis.glb');

// Remove the KHRDracoMeshCompression extension so the writer doesn't need an encoder
const dracoExt = doc.getRoot().listExtensionsUsed().find(e => e.extensionName === 'KHR_draco_mesh_compression');
if (dracoExt) {
    dracoExt.dispose();
    console.log('Draco extension removed from document.');
}

// Write-IO: no Draco extensions registered
const writeIO = new NodeIO();
console.log('Writing pelvis_v2.glb (no Draco) …');
await writeIO.write('./pelvis_v2.glb', doc);

console.log('Done.');
