declare module 'qrcode-reader' {
    class QRCodeReader {
        decode(
            imageData: {
                data: Buffer | Uint8ClampedArray;
                width: number;
                height: number;
            },
            callback: (err: Error | null, result: { text: string } | null) => void
        ): void;
    }
    export default QRCodeReader;
}
