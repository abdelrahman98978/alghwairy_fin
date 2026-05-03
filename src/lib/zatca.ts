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

/**
 * Generates Phase 1 & 2 Compliant QR Code Base64 encoded TLV sequence.
 * In Phase 2, the QR code must also contain the digital signature (tags 6-9).
 * For now, we provide the standard tags 1-5.
 */
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

/**
 * Generates a simplified UBL 2.1 XML for ZATCA Phase 2.
 * Note: A full implementation requires signing and hashing which typically happens on a secure backend or using WASM libs.
 */
export function generateZatcaXML(invoice: any): string {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2" 
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2" 
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
    <cbc:ID>${invoice.reference_number}</cbc:ID>
    <cbc:UUID>${invoice.id}</cbc:UUID>
    <cbc:IssueDate>${invoice.date}</cbc:IssueDate>
    <cbc:InvoiceTypeCode name="0100000">388</cbc:InvoiceTypeCode>
    <cbc:DocumentCurrencyCode>SAR</cbc:DocumentCurrencyCode>
    <cbc:TaxCurrencyCode>SAR</cbc:TaxCurrencyCode>
    <cac:AccountingSupplierParty>
        <cac:Party>
            <cac:PartyIdentification>
                <cbc:ID schemeID="CRN">1234567890</cbc:ID>
            </cac:PartyIdentification>
            <cac:PartyName>
                <cbc:Name>Alghwairy Sovereign Ledger</cbc:Name>
            </cac:PartyName>
            <cac:PartyTaxScheme>
                <cbc:CompanyID>312345678900003</cbc:CompanyID>
                <cac:TaxScheme>
                    <cbc:ID>VAT</cbc:ID>
                </cac:TaxScheme>
            </cac:PartyTaxScheme>
        </cac:Party>
    </cac:AccountingSupplierParty>
    <cac:AccountingCustomerParty>
        <cac:Party>
            <cac:PartyTaxScheme>
                <cbc:CompanyID>${invoice.tax_id || '999999999999999'}</cbc:CompanyID>
                <cac:TaxScheme>
                    <cbc:ID>VAT</cbc:ID>
                </cac:TaxScheme>
            </cac:PartyTaxScheme>
        </cac:Party>
    </cac:AccountingCustomerParty>
    <cac:TaxTotal>
        <cbc:TaxAmount currencyID="SAR">${invoice.vat}</cbc:TaxAmount>
    </cac:TaxTotal>
    <cac:LegalMonetaryTotal>
        <cbc:LineExtensionAmount currencyID="SAR">${invoice.subtotal}</cbc:LineExtensionAmount>
        <cbc:TaxExclusiveAmount currencyID="SAR">${invoice.subtotal}</cbc:TaxExclusiveAmount>
        <cbc:TaxInclusiveAmount currencyID="SAR">${invoice.total}</cbc:TaxInclusiveAmount>
        <cbc:PayableAmount currencyID="SAR">${invoice.total}</cbc:PayableAmount>
    </cac:LegalMonetaryTotal>
</Invoice>`;
  return xml;
}
