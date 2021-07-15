import Chunk, { SupportedContentTypes } from './Chunk';

const unblockEventLoop = () =>
  new Promise(resolve => (typeof setImmediate !== 'undefined' ? setImmediate : setTimeout)(resolve));

class Gluer {
  public messageId: number = null;
  private chunks: Map<number, Chunk> = new Map();
  private lastChunk: Chunk = null;

  public addChunk(chunk: Chunk): void {
    if (this.messageId === null) {
      this.messageId = chunk.messageId; // infer `messageId` from the first chunk received
    } else if (this.messageId !== chunk.messageId) {
      throw new Error('Invalid chunk');
    }
    this.chunks.set(chunk.serialNumber, chunk);
    if (chunk.isEndOfMessage) {
      this.lastChunk = chunk;
    }
  }

  public hasAllChunks(): boolean {
    return this.lastChunk
      && this.chunks.size === this.lastChunk.serialNumber + 1;
  }

  public async getContent(): Promise<SupportedContentTypes> {
    const uint8Array = await this.getBytesArrayFromChunks();

    if (this.lastChunk.contentType === Chunk.HEADER_BIT_CONTENT_TYPE_BYTES) {
      return uint8Array;
    } else if (this.lastChunk.contentType === Chunk.HEADER_BIT_CONTENT_TYPE_ARRAY_BUFFER) {
      return uint8Array.buffer;
    } else if (this.lastChunk.contentType === Chunk.HEADER_BIT_CONTENT_TYPE_STRING) {
      return new TextDecoder().decode(uint8Array);
    } else if (this.lastChunk.contentType === Chunk.HEADER_BIT_CONTENT_TYPE_BLOB) {
      return new Blob([uint8Array.buffer], { type: 'octet/stream' }); // TODO may require transporting content-type too
    }
  }

  private async getBytesArrayFromChunks(): Promise<Uint8Array> {
    if (!this.hasAllChunks()) {
      throw new Error('The message is not complete');
    }
    
    const chunkContentSize = this.chunks.get(0).contentByteArray.byteLength; // infer max content chunk size
    const lastChunkContentSize = this.lastChunk.contentByteArray.byteLength;
    const arrayBuffer = new ArrayBuffer((this.chunks.size - 1) * chunkContentSize + lastChunkContentSize);
    const uint8Array = new Uint8Array(arrayBuffer);

    for (let i = 0; i < this.chunks.size; i++) {
      !(i % 10) && await unblockEventLoop(); // unblock event loop every 10 iterations
      const chunk = this.chunks.get(i);
      const offset = i*chunkContentSize;
      uint8Array.set(chunk.contentByteArray, offset);
    }

    return uint8Array;
  }
}

export default Gluer;