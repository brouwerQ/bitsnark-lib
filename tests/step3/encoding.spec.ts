import { deleteDir } from "../../src/encoder-decoder/files-utils";
import { Lamport } from "../../src/encoder-decoder/lamport";
import { Winternitz } from "../../src/encoder-decoder/winternitz";
import { Bitcoin } from "../../src/generator/step3/bitcoin";
import { StackItem } from "../../src/generator/step3/stack";
import { strToBigint, hash, Key, writeBigintToBuffer, bufferToBigints256, bitsToBigint, nibblesToBigint, encodeLamportBits, encodeWinternitz, lamportKeys, winternitzKeys, bufferToBigints256BE } from "../encoding";


const testData32Bits = strToBigint('TEST');
const testData256Bits = strToBigint('TESTING1TESTING2TESTING3TESTING4');


// const lamportKeys: Key[][] = [];
for (let i = 0; i < 256; i++) lamportKeys.push([
    { prvt: hash(BigInt(i), 1), pblc: hash(BigInt(i), 2) },
    { prvt: hash(1000000n + BigInt(i), 1), pblc: hash(1000000n + BigInt(i), 2) }
]);

for (let i = 0; i < 256; i++) winternitzKeys.push({ prvt: hash(BigInt(i)), pblc: hash(BigInt(i), 9) });


function generatLamport(folder: string, bits: number) {
    deleteDir(folder);
    const lamport = new Lamport(folder);
    lamport.generateKeys(bits);
    return lamport;
}


function generatWinternitz(folder: string) {
    deleteDir(folder);
    const winternitz = new Winternitz(folder);
    winternitz.generateKeys(1, 1);
    return winternitz;
}


describe("encoding schemes", function () {

    let bitcoin: Bitcoin;
    let lamport: Lamport;
    let winternitz: Winternitz;
    let encoded;
    let witness: StackItem[];
    let decodedItems: StackItem[];


    describe('lamport 32 bits', () => {

        let keyItems: bigint[][];

        beforeEach(() => {
            bitcoin = new Bitcoin();

            lamport = generatLamport('lamport32', 32);
            const buffer = Buffer.alloc(4);
            writeBigintToBuffer(buffer, 0, testData32Bits, 4);
            const { encodedData, pubk } = lamport.encodeBufferAddPublic(buffer, 0);
            encoded = encodedData;

            witness = bufferToBigints256BE(encoded).map(n => bitcoin.addWitness(n));


            keyItems = [];
            for (let i = 0; i < 32; i++) {
                keyItems.push(
                    [
                        bufferToBigints256BE(pubk.subarray(i * 64, i * 64 + 32))[0],
                        bufferToBigints256BE(pubk.subarray(i * 64 + 32, (i + 1) * 64))[0]
                    ]);
            }

            decodedItems = [];
            for (let i = 0; i < 32; i++) decodedItems.push(bitcoin.newStackItem(0n));

        });

        it("positive", async () => {

            bitcoin.lamportDecode(decodedItems, witness, keyItems);
            expect(bitcoin.success).toBe(true);
            const result = bitsToBigint(decodedItems.map(si => si.value ? 1 : 0));
            expect(result).toEqual(testData32Bits);

            console.log('32 bits in lamport encoding: ', encoded.length);
            console.log('32 bit lamport decode btc script count', bitcoin.opcodes.length);
            console.log('32 bit lamport decode btc script size', bitcoin.programSizeInBitcoinBytes());
        });

        it("negative", async () => {

            witness[0].value++;

            bitcoin.lamportDecode(decodedItems, witness, keyItems);
            expect(bitcoin.success).toBe(false);
        });
    });

    describe('lamport 256 bits', () => {

        let keyItems: bigint[][];

        beforeEach(() => {
            bitcoin = new Bitcoin();

            lamport = generatLamport('lamport256', 256);
            const buffer = Buffer.alloc(32);
            writeBigintToBuffer(buffer, 0, testData256Bits, 32);
            const { encodedData, pubk } = lamport.encodeBufferAddPublic(buffer, 0);
            encoded = encodedData;

            witness = bufferToBigints256BE(encoded).map(n => bitcoin.addWitness(n));
            keyItems = [];
            for (let i = 0; i < 256; i++) {
                keyItems.push(
                    [
                        bufferToBigints256BE(pubk.subarray(i * 64, i * 64 + 32))[0],
                        bufferToBigints256BE(pubk.subarray(i * 64 + 32, (i + 1) * 64))[0]
                    ]);
            }
            decodedItems = [];
            for (let i = 0; i < 256; i++) decodedItems.push(bitcoin.newStackItem(0n));
        });

        it("positive", async () => {

            bitcoin.lamportDecode(decodedItems, witness, keyItems);
            expect(bitcoin.success).toBe(true);
            const result = bitsToBigint(decodedItems.map(si => si.value ? 1 : 0));
            expect(result).toEqual(testData256Bits);

            console.log('256 bits in lamport encoding: ', encoded.length);
            console.log('256 bit lamport decode btc script count', bitcoin.opcodes.length);
            console.log('256 bit lamport decode btc script', bitcoin.programSizeInBitcoinBytes());
        });

        it("negative", async () => {

            witness[0].value++;

            bitcoin.lamportDecode(decodedItems, witness, keyItems);
            expect(bitcoin.success).toBe(false);
        });
    });

    describe('winternitz 32 bits', () => {
        let keyItems: bigint[];

        beforeEach(() => {
            bitcoin = new Bitcoin();
            winternitz = generatWinternitz('winternitz32');
            const buffer = Buffer.alloc(4);
            writeBigintToBuffer(buffer, 0, testData32Bits, 4);
            const { encodedData, pubk } = winternitz.encodeBuffer4AddPublic(buffer, 0);
            encoded = encodedData;
            witness = bufferToBigints256BE(encoded).map(n => bitcoin.addWitness(n));

            keyItems = [];
            for (let i = 0; i < 11 + 3; i++) {
                keyItems.push(
                    bufferToBigints256BE(pubk.subarray(i * 32, (i + 1) * 32))[0]
                );
            }
            decodedItems = [];
            for (let i = 0; i < 11 + 3; i++) decodedItems.push(bitcoin.newStackItem(0n));
        });

        it("positive", async () => {
            bitcoin.winternitzDecode32(decodedItems, witness, keyItems);
            expect(bitcoin.success).toBe(true);
            const result = nibblesToBigint(decodedItems.slice(0, 11).map(si => Number(si.value)));
            expect(result).toEqual(testData32Bits);

            console.log('32 bits in winternitz encoding: ', encoded.length);
            console.log('32 bit winternitz decode btc script count', bitcoin.opcodes.length);
            console.log('32 bit winternitz decode btc script', bitcoin.programSizeInBitcoinBytes());
        });
        it("negative", async () => {

            witness[0].value++;

            bitcoin.winternitzDecode32(decodedItems, witness, keyItems);
            expect(bitcoin.success).toBe(false);
        });
    });

    describe('winternitz 256 bits', () => {

        let keyItems: bigint[];

        beforeEach(() => {
            bitcoin = new Bitcoin();
            encoded = encodeWinternitz(testData256Bits, 0, 256, 12);
            witness = bufferToBigints256(encoded).map(n => bitcoin.addWitness(n));
            keyItems = [];
            for (let i = 0; i < 86 + 4; i++) {
                keyItems.push(winternitzKeys[i].pblc);
            }
            decodedItems = [];
            for (let i = 0; i < 86 + 4; i++) decodedItems.push(bitcoin.newStackItem(0n));
        });

        it("positive", async () => {
            bitcoin.winternitzCheck256(witness, keyItems);
            expect(bitcoin.success).toBe(true);

            console.log('256 bits in winternitz encoding: ', encoded.length);
            console.log('256 bit winternitz decode btc script count', bitcoin.opcodes.length);
            console.log('256 bit winternitz decode btc script', bitcoin.programSizeInBitcoinBytes());
        });

        it("negative", async () => {

            witness[0].value++;

            bitcoin.winternitzDecode32(decodedItems, witness, keyItems);
            expect(bitcoin.success).toBe(false);
        });
    });
});