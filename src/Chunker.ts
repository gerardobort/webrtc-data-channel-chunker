import Chunk, { SupportedContentTypes, ChunkContentType } from './Chunk';

const unblockEventLoop = () =>
  new Promise(resolve => (typeof setImmediate !== 'undefined' ? setImmediate : setTimeout)(resolve));

class Chunker {
  private static lastMessageId: number = 0;

  public static async getChunks(bytes: Uint8Array, chunkSize: number): Promise<Chunk[]>;
  public static async getChunks(buffer: ArrayBuffer, chunkSize: number): Promise<Chunk[]>;
  public static async getChunks(message: string, chunkSize: number): Promise<Chunk[]>;
  public static async getChunks(blob: Blob, chunkSize: number): Promise<Chunk[]>;
  public static async getChunks(input: SupportedContentTypes, chunkSize: number): Promise<Chunk[]> {
    let uint8Array: Uint8Array;
    let chunkContentType: ChunkContentType;
    
    if (input instanceof Uint8Array) {
      uint8Array = input;
      chunkContentType = Chunk.HEADER_BIT_CONTENT_TYPE_BYTES;
    } else if (input instanceof ArrayBuffer) {
      uint8Array = new Uint8Array(input);
      chunkContentType = Chunk.HEADER_BIT_CONTENT_TYPE_ARRAY_BUFFER;
    } else if (typeof input === 'string') {
      uint8Array = new TextEncoder().encode(input);
      chunkContentType = Chunk.HEADER_BIT_CONTENT_TYPE_STRING;
    } else if (input instanceof Blob) {
      uint8Array = new Uint8Array(await input.arrayBuffer());
      chunkContentType = Chunk.HEADER_BIT_CONTENT_TYPE_BLOB;
    } else {
      throw new Error('Unsupported input type');
    }

    return await Chunker.getChunksFromBytesArray(uint8Array, chunkSize, chunkContentType);
  }

  public static resetMessageIds() {
    Chunker.lastMessageId = 0;
  }

  private static async getChunksFromBytesArray(content: Uint8Array, chunkSize: number, contentType: ChunkContentType): Promise<Chunk[]> {
    const minChunkSize = Chunk.HEADER_SIZE + 1;
    if (chunkSize < minChunkSize) {
      throw new Error(`Invalid chunk size. Must be ${minChunkSize} at minimum.`);
    }
    const messageId = Chunker.lastMessageId++;
    const chunks: Chunk[] = [];
    const contentChunkSize = chunkSize - Chunk.HEADER_SIZE;
    const chunksNumber = Math.ceil(content.length/contentChunkSize);

    for (let i = 0; i < chunksNumber; i++) {
      !(i % 10) && await unblockEventLoop(); // unblock event loop every 10 iterations
      const offsetFrom = i*contentChunkSize;
      const offsetTo = (i+1)*contentChunkSize;
      const chunkContent = content.subarray(offsetFrom, offsetTo);
      const serialNumber = i;
      const isEndOfMessage = i+1 === chunksNumber;
      chunks.push(new Chunk(chunkContent, contentType, messageId, serialNumber, isEndOfMessage));
    }

    return chunks;
  }
}

export default Chunker;