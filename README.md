# WebRTC Data Channel Chunker

This package helps sending media content over UDP via WebRTC. The functionality provided is limited to splitting up the media content on the transmitter end and glowing it on the receiver end.

The library aims to abstract the user from coercing its media content types to the underlying transport method, so it provides the most common types out of the box.

## Supported Media Types

1. `Uint8Array`
2. `ArrayBuffer`
3. `String`
4. `Blob`

## Problems that this library solve

1. Chunks deduplication
2. Missing chunks detection
3. Multiple media contents sent over the same connection
4. Encoding: either ASCI or Unicode strings, or Binary buffers the usage is seamless. The encoding used is optimal.

## Usage

You can import as an NPM module, or extract the web-ready bundle from `./dist/web`.

### String

```javascript
// Tx
const chunks = await Chunker.getChunks('This is awesome 🔥', 11);

// Rx
const gluer = new Gluer();
for (const chunk of chunks) {
  gluer.addChunk(chunk); // the order does not matter
}

console.log(await gluer.getContent());
// > 'This is awesome 🔥'
```

### ArrayBuffer

```javascript
// Tx
const input = new ArrayBuffer(3);
const dataView = new DataView(input)
dataView.setUint8(1, 255);
const chunks = await Chunker.getChunks(input, 11);

// Rx
const gluer = new Gluer();
for (const chunk of chunks) {
  gluer.addChunk(chunk); // the order does not matter
}

console.log(await gluer.getContent());
// > ArrayBuffer { [Uint8Contents]: <00 ff 00>, byteLength: 3 }
```

### Blob

```javascript
// Tx
const obj = {hello: 'world'};
const blob = new Blob([JSON.stringify(obj, null, 2)], {type : 'application/json'});
const chunks = await Chunker.getChunks(blob, 11);

// Rx
const gluer = new Gluer();
for (const chunk of chunks) {
  gluer.addChunk(chunk); // the order does not matter
}

console.log(await (await gluer.getContent()).text());
// > "{\n  \"hello\": \"world\"\n}"
```


## Spec

The implementation of this library is based on [this specification](https://github.com/saltyrtc/saltyrtc-meta/blob/master/Chunking.md#long-header). Although with some differences:

1. Does not support te `Reliable/Ordered` mode. It will always use the `Unreliable/Unordered` mechanism. The drawback is always having a 9-bytes header, but it works for all the possible cases.
2. This implementation makes use of 2 reserved bits, the right-most ones in the options byte. These bits are used to transport the media content type, so the receiver knows how to re-generate it on its end.

## Caveats

The `Blob` support was not tested as it lacks of support in Node.JS. If you find any error please report.
