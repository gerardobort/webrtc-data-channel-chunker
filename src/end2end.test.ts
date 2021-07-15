import { Chunker, Gluer, Chunk } from '.';


describe('WebRTC Data Channel Chunker Utility', () => {
  describe('End2End Use Cases', () => {
    describe('Unordered chunks', () => {
      const input = 'Hey 👻!';
      let chunks;

      beforeEach(async () => {
        chunks = await Chunker.getChunks(input, 11);
      });

      it('should chunk and glue the string even when the chunks come unsorted', async () => {
        const gluer = new Gluer();
        for (const chunk of chunks.slice(1).reverse()) {
          gluer.addChunk(chunk);
        }
        gluer.addChunk(chunks[0]);

        expect(await gluer.getContent()).toEqual(input);
      });
    });

    describe('Duplicate chunks', () => {
      const input = 'Hey 👻!';
      let chunks;

      beforeEach(async () => {
        chunks = await Chunker.getChunks(input, 11);
      });

      it('should deduplicate chunks', async () => {
        const gluer = new Gluer();
        for (const chunk of chunks.slice(1)) {
          gluer.addChunk(chunk);
        }
        gluer.addChunk(chunks[0]);
        gluer.addChunk(chunks[0]);
        gluer.addChunk(chunks[0]);

        expect(await gluer.getContent()).toEqual(input);
      });
    });

    describe('Missing chunks', () => {
      const input = 'Hey 👻!';
      let chunks;
      
      beforeEach(async () => {
        chunks = await Chunker.getChunks(input, 11);
      });

      it('should throw an exception, with a clear desription', async () => {
        const gluer = new Gluer();
        for (const chunk of chunks.slice(1)) {
          gluer.addChunk(chunk);
        }

        await expect(gluer.getContent()).rejects.toThrow('The message is not complete');
      });
    });

    describe('Dump chunks', () => {
      const input = 'Hey 👻!';
      let chunks;
      
      beforeEach(async () => {
        Chunker.resetMessageIds();
        chunks = await Chunker.getChunks(input, 11);
      });

      it('should convert chunks into ArrayBuffer instances ready to be sent over the network', async () => {
        const toHexString = bytes => bytes.reduce((str, byte) => str + byte.toString(16).padStart(2, '0'), '');
        const arrayBuffers = chunks.map(chunk => chunk.toArrayBuffer());
        const hexChunks = arrayBuffers.map(arrayBuffer => toHexString(new Uint8Array(arrayBuffer)));

        expect(hexChunks).toEqual([
          '1000000000000000004865',
          '1000000000000000017920',
          '100000000000000002f09f',
          '10000000000000000391bb',
          '11000000000000000421'
        ])
      });
    });

    describe('Byte Content Type', () => {
      const input = new Uint8Array(3);
      input.set([0, 255, 0], 0);
      let chunks;
      
      beforeEach(async () => {
        chunks = await Chunker.getChunks(input, 10);
      });

      it('should chunk and glue the string properly', async () => {
        const gluer = new Gluer();
        for (const chunk of chunks) {
          gluer.addChunk(chunk);
        }

        expect(await gluer.getContent()).toEqual(input);
      });
    });

    describe('ArrayBuffer Content Type', () => {
      const input = new ArrayBuffer(3);
      const dataView = new DataView(input)
      dataView.setUint8(1, 255);
      let chunks;
      
      beforeEach(async () => {
        chunks = await Chunker.getChunks(input, 10);
      });

      it('should chunk and glue the string properly', async () => {
        const gluer = new Gluer();
        for (const chunk of chunks) {
          gluer.addChunk(chunk);
        }

        expect(await gluer.getContent()).toEqual(input);
      });
    });

    describe('String Content Type', () => {
      describe('ASCII', () => {
        const input = 'abcd123';
        let chunks;
        
        beforeEach(async () => {
          chunks = await Chunker.getChunks(input, 11);
        });

        it('should generate 4 chunks, of the following sizes: 2, 2, 2 and 1', async () => {
          expect(chunks).toHaveProperty('length', 4);
          expect(chunks[0]).toHaveProperty('contentByteArray.length', 2);
          expect(chunks[1]).toHaveProperty('contentByteArray.length', 2);
          expect(chunks[2]).toHaveProperty('contentByteArray.length', 2);
          expect(chunks[3]).toHaveProperty('contentByteArray.length', 1);
        });

        it('should chunk and glue the string properly', async () => {
          const gluer = new Gluer();
          for (const chunk of chunks) {
            gluer.addChunk(chunk);
          }

          expect(await gluer.getContent()).toEqual(input);
        });
      });

      describe('Unicode', () => {
        const input = 'Hey 👻!';
        let chunks;
        
        beforeEach(async () => {
          chunks = await Chunker.getChunks(input, 11);
        });

        it('should generate 5 chunks, of the following sizes: 2, 2, 2, 2 and 1', async () => {
          expect(chunks).toHaveProperty('length', 5);
          expect(chunks[0]).toHaveProperty('contentByteArray.length', 2);
          expect(chunks[1]).toHaveProperty('contentByteArray.length', 2);
          expect(chunks[2]).toHaveProperty('contentByteArray.length', 2);
          expect(chunks[3]).toHaveProperty('contentByteArray.length', 2);
          expect(chunks[4]).toHaveProperty('contentByteArray.length', 1);
        });

        it('should chunk and glue the string properly', async () => {
          const gluer = new Gluer();
          for (const chunk of chunks) {
            gluer.addChunk(chunk);
          }

          expect(await gluer.getContent()).toEqual(input);
        });
      });
    });

    describe('Blob Content Type', () => {
      // TODO Blob requires a polyfill in NodeJS
    });

    describe('Edge cases', () => {
      describe('Zero string', () => {
        const input = '';
        let chunks;
        
        beforeEach(async () => {
          chunks = await Chunker.getChunks(input, 11);
        });

        it('should generate no chunks', async () => {
          expect(chunks).toHaveProperty('length', 0);
        });
      });
    

      describe('Very large strings', () => {
        const chunkSize = Chunk.HEADER_SIZE + 16 * 1024;
        const chunksNumber = 9000;
        const input = 'A'.repeat((chunkSize - Chunk.HEADER_SIZE) * chunksNumber);
        let chunks;
      
        beforeEach(async () => {
          chunks = await Chunker.getChunks(input, chunkSize);
        });

        it(`should generate exactly ${chunksNumber} chunks of ${chunkSize} bytes each`, async () => {
          expect(chunks).toHaveProperty('length', chunksNumber);
          expect(chunks[0].toArrayBuffer()).toHaveProperty('byteLength', chunkSize);
        });

        it('should chunk and glue the string properly', async () => {
          const gluer = new Gluer();
          for (const chunk of chunks) {
            gluer.addChunk(chunk);
          }

          expect(await gluer.getContent()).toEqual(input);
        });
      });
    });
  });
});