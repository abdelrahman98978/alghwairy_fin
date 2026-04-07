// Function to convert a string or number to hex then buffer
function getBuffer(tag: number, value: string): Uint8Array {
  const encoder = new TextEncoder();
  const valueBuffer = encoder.encode(value);
  const buffer = new Uint8Array(2 + valueBuffer.length);
  
  buffer[0] = tag;
  buffer[1] = valueBuffer.length;
  buffer.set(valueBuffer, 2);
  
  return buffer;
}

// Generates Phase 2 Compliant QR Code Base64 encoded TLV sequence
export function generateZatcaQR(
  sellerName: string,
  vatRegistrationNumber: string,
  invoiceDate: string, // ISO format
  invoiceTotalAmount: string, // string representation of float
  vatTotalAmount: string
): string {
  try {
    const buffers = [
      getBuffer(1, sellerName),
      getBuffer(2, vatRegistrationNumber),
      getBuffer(3, invoiceDate),
      getBuffer(4, invoiceTotalAmount),
      getBuffer(5, vatTotalAmount)
    ];

    const totalLength = buffers.reduce((acc, curr) => acc + curr.length, 0);
    const combinedBuffer = new Uint8Array(totalLength);
    
    let offset = 0;
    for (const buffer of buffers) {
      combinedBuffer.set(buffer, offset);
      offset += buffer.length;
    }

    // Convert Uint8Array to base64 string
    const base64String = btoa(String.fromCharCode.apply(null, Array.from(combinedBuffer)));
    return base64String;
  } catch (err) {
    console.error("Zatca QR Error", err);
    return "";
  }
}
