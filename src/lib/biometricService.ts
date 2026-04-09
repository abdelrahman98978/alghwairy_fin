/**
 * Sovereign Biometric Service
 * Integrates with Windows Hello (WebAuthn) for real physical authentication.
 */

export const biometricService = {
  /**
   * Check if biometrics are supported and available
   */
  isSupported: (): boolean => {
    return !!(window.PublicKeyCredential && navigator.credentials);
  },

  /**
   * Helper: Convert Buffer to Base64
   */
  bufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  },

  /**
   * Helper: Convert Base64 to Buffer
   */
  base64ToBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  },

  /**
   * Enroll a new biometric credential (Windows Hello)
   */
  async enroll(userName: string): Promise<{ id: string; rawId: string }> {
    if (!this.isSupported()) throw new Error('Biometrics not supported');

    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const userID = crypto.getRandomValues(new Uint8Array(16));

    const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
      challenge,
      rp: {
        name: "Alghwairy Sovereign Ledger",
        id: "localhost",
      },
      user: {
        id: userID,
        name: userName,
        displayName: userName,
      },
      pubKeyCredParams: [
        { alg: -7, type: "public-key" }, // ES256
        { alg: -257, type: "public-key" } // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        userVerification: "required",
        residentKey: "required",
      },
      timeout: 60000,
    };

    const credential = (await navigator.credentials.create({
      publicKey: publicKeyCredentialCreationOptions,
    })) as PublicKeyCredential;

    if (!credential) throw new Error('Enrollment cancelled');

    return {
      id: credential.id,
      rawId: this.bufferToBase64(credential.rawId),
    };
  },

  /**
   * Verify identity via existing biometric credential
   */
  async verify(credentialRawIdBase64: string): Promise<boolean> {
    if (!this.isSupported()) return false;

    try {
      const rawIdBuffer = this.base64ToBuffer(credentialRawIdBase64);
      const challenge = crypto.getRandomValues(new Uint8Array(32));

      const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
        challenge,
        allowCredentials: [{
          id: rawIdBuffer,
          type: 'public-key',
        }],
        userVerification: "required",
        timeout: 60000,
      };

      const assertion = await navigator.credentials.get({
        publicKey: publicKeyCredentialRequestOptions,
      });
      
      return !!assertion;
    } catch (err) {
      console.error('Biometric verification failed:', err);
      return false;
    }
  }
};
