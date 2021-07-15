export type SupportedContentTypes = Uint8Array | ArrayBuffer | string | Blob;
export type ChunkContentType = 0b00000 | 0b01000 | 0b10000 | 0b11000;

class Chunk {
  public contentByteArray: Uint8Array;
  public contentType: number;
  public messageId: number;
  public serialNumber: number;
  public isEndOfMessage: boolean;
  public static HEADER_SIZE: number = 9; // https://github.com/saltyrtc/saltyrtc-meta/blob/master/Chunking.md#long-header
  public static HEADER_BIT_EOM: number = 0b1;
  public static HEADER_BIT_CONTENT_MASK: number = 0b11000;
  public static HEADER_BIT_CONTENT_TYPE_BYTES: ChunkContentType = 0b00000;
  public static HEADER_BIT_CONTENT_TYPE_ARRAY_BUFFER: ChunkContentType = 0b01000;
  public static HEADER_BIT_CONTENT_TYPE_STRING: ChunkContentType = 0b10000;
  public static HEADER_BIT_CONTENT_TYPE_BLOB: ChunkContentType = 0b11000;

  constructor(contentByteArray: Uint8Array, contentType: ChunkContentType, messageId: number, serialNumber: number, isEndOfMessage: boolean = false) {
    this.contentByteArray = contentByteArray;
    this.contentType = contentType;
    this.messageId = messageId;
    this.serialNumber = serialNumber;
    this.isEndOfMessage = isEndOfMessage;
  }

  /**
   * Serialize method 
   */
  toArrayBuffer(): ArrayBuffer {
    const arrayBuffer = new ArrayBuffer(Chunk.HEADER_SIZE + this.contentByteArray.byteLength);
    const dataView = new DataView(arrayBuffer);
    const uint8Array = new Uint8Array(arrayBuffer);
    
    let optionsByte = Chunk.HEADER_BIT_CONTENT_MASK & this.contentType;
    if (this.isEndOfMessage) {
      // TODO: this implementation only supports unreliable/unordered mode, as described in https://github.com/saltyrtc/saltyrtc-meta/blob/master/Chunking.md#long-header
      optionsByte |= 0b1;
    }

    dataView.setUint8(0, optionsByte);
    dataView.setUint32(1, this.messageId);
    dataView.setUint32(5, this.serialNumber);
    uint8Array.set(this.contentByteArray, Chunk.HEADER_SIZE);

    return arrayBuffer;
  }

  /**
   * Unserialize method 
   */
  static fromArrayBuffer(arrayBuffer) {
    const dataView = new DataView(arrayBuffer);
    const options = dataView.getUint8(0);
    const contentType = (options & Chunk.HEADER_BIT_CONTENT_MASK) as ChunkContentType;
    const isEndOfMessage = Boolean((options & 0b1) === 1);
    const messageId = dataView.getUint32(1);
    const serialNumber = dataView.getUint32(5);
    const contentByteArray = arrayBuffer.slice(Chunk.HEADER_SIZE);
    
    return new Chunk(contentByteArray, contentType, messageId, serialNumber, isEndOfMessage);
  }
}

export default Chunk;